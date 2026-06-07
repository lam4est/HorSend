import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import type pg from 'pg'
import { applyDatabaseSchema } from './applySchema.js'
import { pool } from './pool.js'

type DbClient = pg.PoolClient

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const seedPath = path.join(__dirname, '../../data/seed.json')

type Seed = {
  workflowTemplates: Array<{
    id: number
    name: string
    category: string
    description: string
    steps: Array<{ id: number; step_order: number; channel: string; delay_in_minutes: number }>
  }>
  workflowUsers: Array<{
    user_id: number
    workflow_id: number
    is_active: boolean
  }>
  schedulerEvents: Array<{
    id: number
    month: number
    day: number
    title: string
    description: string
  }>
  schedulerSubscriptions: Array<{
    user_id: number
    scheduler_event_id: number
    is_enabled: boolean
    channel?: string
    template_id?: string | null
    contact_list_id?: number | null
    hour?: number
    minute?: number
    days_before?: number
    contacts_count?: number
  }>
}

function toDelayFields (minutes: number): { value: number; unit: string } {
  if (minutes >= 1440 && minutes % 1440 === 0) {
    return { value: minutes / 1440, unit: 'day' }
  }
  if (minutes >= 60 && minutes % 60 === 0) {
    return { value: minutes / 60, unit: 'hour' }
  }
  return { value: minutes, unit: 'minute' }
}

async function upsertWorkflowUser (
  client: DbClient,
  entry: Seed['workflowUsers'][number]
): Promise<number> {
  const existing = await client.query<{ id: number }>(
    `SELECT id FROM workflow_user
     WHERE user_id = $1 AND original_workflow_id = $2`,
    [entry.user_id, entry.workflow_id]
  )
  if ((existing.rowCount ?? 0) > 0) {
    const workflowUserId = existing.rows[0]!.id
    await client.query(
      `UPDATE workflow_user
       SET is_active = $2, updated_at = NOW()
       WHERE id = $1`,
      [workflowUserId, entry.is_active]
    )
    return workflowUserId
  }
  const inserted = await client.query<{ id: number }>(
    `INSERT INTO workflow_user (
       user_id, workflow_id, original_workflow_id, is_active, created_at, updated_at
     ) VALUES ($1, $2, $2, $3, NOW(), NOW())
     RETURNING id`,
    [entry.user_id, entry.workflow_id, entry.is_active]
  )
  return inserted.rows[0]!.id
}

async function seedWorkflowUser (
  client: DbClient,
  entry: Seed['workflowUsers'][number]
): Promise<void> {
  const workflowUserId = await upsertWorkflowUser(client, entry)

  const steps = await client.query<{
    id: number
    channel: string
    delay_in_minutes: number
  }>(
    `SELECT
       ws.id,
       ws.channel,
       CASE
         WHEN ws.delay_unit = 'day' THEN COALESCE(ws.delay_value, 0) * 1440
         WHEN ws.delay_unit = 'hour' THEN COALESCE(ws.delay_value, 0) * 60
         ELSE COALESCE(ws.delay_value, 0)
       END AS delay_in_minutes
     FROM workflow_step ws
     WHERE ws.workflow_id = $1
     ORDER BY ws.step_order`,
    [entry.workflow_id]
  )

  for (const step of steps.rows) {
    const existingStep = await client.query(
      `SELECT id FROM workflow_step_user
       WHERE workflow_user_id = $1 AND workflow_step_id = $2`,
      [workflowUserId, step.id]
    )
    if ((existingStep.rowCount ?? 0) > 0) continue
    await client.query(
      `INSERT INTO workflow_step_user (
         user_id, workflow_user_id, workflow_step_id, channel, delay_in_minutes,
         template_id, is_active, is_confirmed_by_user, settings, created_at, updated_at
       ) VALUES ($1, $2, $3, $4, $5, NULL, TRUE, FALSE, NULL, NOW(), NOW())`,
      [entry.user_id, workflowUserId, step.id, step.channel, step.delay_in_minutes]
    )
  }
}

async function seed (): Promise<void> {
  await applyDatabaseSchema()
  const data = JSON.parse(fs.readFileSync(seedPath, 'utf8')) as Seed
  const client = await pool.connect()
  try {
    await client.query('BEGIN')

    const demoUser = await client.query('SELECT id FROM users WHERE id = 1')
    if ((demoUser.rowCount ?? 0) === 0) {
      const userCols = await client.query<{ column_name: string }>(
        `SELECT column_name
         FROM information_schema.columns
         WHERE table_schema = 'public' AND table_name = 'users'`
      )
      const columns = new Set(userCols.rows.map((r) => r.column_name))
      if (columns.size === 1 && columns.has('id')) {
        await client.query('INSERT INTO users (id) VALUES (1)')
      } else {
        throw new Error('Demo user id=1 is missing in users table; create it before running db:seed')
      }
    }

    await client.query(
      `INSERT INTO contact_list (id, owner_id, name, contacts_count, created_at, updated_at)
       VALUES (1, 1, 'Demo contacts', 2500, NOW(), NOW())
       ON CONFLICT (id) DO UPDATE SET
         name = EXCLUDED.name,
         contacts_count = EXCLUDED.contacts_count,
         updated_at = NOW()`
    )

    for (const tpl of data.workflowTemplates) {
      await client.query(
        `INSERT INTO workflows (id, workflow_key, workflow_name, category, description, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
         ON CONFLICT (id) DO UPDATE SET
           workflow_key = EXCLUDED.workflow_key,
           workflow_name = EXCLUDED.workflow_name,
           category = EXCLUDED.category,
           description = EXCLUDED.description,
           updated_at = NOW()`,
        [tpl.id, `workflow-${tpl.id}`, tpl.name, tpl.category, tpl.description]
      )
      for (const step of tpl.steps) {
        const delay = toDelayFields(step.delay_in_minutes)
        await client.query(
          `INSERT INTO workflow_step (
             id, workflow_id, status, step_order, channel, delay_value, delay_unit, created_at, updated_at
           ) VALUES ($1, $2, 1, $3, $4, $5, $6, NOW(), NOW())
           ON CONFLICT (id) DO UPDATE SET
             workflow_id = EXCLUDED.workflow_id,
             step_order = EXCLUDED.step_order,
             channel = EXCLUDED.channel,
             delay_value = EXCLUDED.delay_value,
             delay_unit = EXCLUDED.delay_unit,
             updated_at = NOW()`,
          [step.id, tpl.id, step.step_order, step.channel, delay.value, delay.unit]
        )
      }
    }

    for (const entry of data.workflowUsers ?? []) {
      await seedWorkflowUser(client, entry)
    }

    for (const ev of data.schedulerEvents) {
      const eventKey = `event-${ev.id}`
      await client.query(
        `INSERT INTO scheduler_event (
           id, month, day, name, language, translation_key, name_key, created_at, updated_at
         ) VALUES ($1, $2, $3, $4, 'en', $5, $5, NOW(), NOW())
         ON CONFLICT (id) DO UPDATE SET
           month = EXCLUDED.month,
           day = EXCLUDED.day,
           name = EXCLUDED.name,
           translation_key = EXCLUDED.translation_key,
           name_key = EXCLUDED.name_key,
           updated_at = NOW()`,
        [ev.id, ev.month, ev.day, ev.title, eventKey]
      )
    }

    for (const sub of data.schedulerSubscriptions ?? []) {
      const existing = await client.query<{ id: number }>(
        `SELECT id FROM scheduler_event_subscription
         WHERE user_id = $1 AND scheduler_event_id = $2`,
        [sub.user_id, sub.scheduler_event_id]
      )
      const values = [
        sub.contact_list_id ?? 1,
        sub.is_enabled,
        sub.channel ?? 'sms',
        sub.template_id ?? null,
        sub.hour ?? 9,
        sub.minute ?? 0,
        sub.days_before ?? 0,
        sub.contacts_count ?? 0
      ]
      if ((existing.rowCount ?? 0) > 0) {
        await client.query(
          `UPDATE scheduler_event_subscription SET
             contact_list_id = $3,
             is_active = $4,
             channel = $5,
             template_id = $6,
             hour = $7,
             minute = $8,
             days_before = $9,
             estimated_number_of_contacts = $10,
             updated_at = NOW()
           WHERE user_id = $1 AND scheduler_event_id = $2`,
          [sub.user_id, sub.scheduler_event_id, ...values]
        )
      } else {
        await client.query(
          `INSERT INTO scheduler_event_subscription (
             user_id, scheduler_event_id, contact_list_id, is_active,
             channel, template_id, hour, minute, days_before,
             estimated_number_of_contacts, cost_per_contact, created_at, updated_at
           ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 0, NOW(), NOW())`,
          [sub.user_id, sub.scheduler_event_id, ...values]
        )
      }
    }

    await client.query('COMMIT')
    console.log('Seed data loaded (workflows, enrollments, scheduler).')
  } catch (err) {
    try {
      await client.query('ROLLBACK')
    } catch {
      // transaction may not have started
    }
    throw err
  } finally {
    client.release()
  }
}

function seedFailureHint (err: unknown): string | null {
  const message = err instanceof Error ? err.message : String(err)
  if (message.includes('ECONNREFUSED') || message.includes('connect')) {
    return 'PostgreSQL is not reachable. Run: docker compose up -d'
  }
  if (message.includes('password authentication failed')) {
    return 'Check DATABASE_URL and POSTGRES_PASSWORD in .env match each other.'
  }
  if (message.includes('does not exist') || message.includes('42P01')) {
    return 'Database schema is missing. Run: pnpm db:migrate (or pnpm db:setup).'
  }
  if (message.includes('Demo user id=1 is missing')) {
    return 'Insert user id=1 into users, or reset DB: docker compose down -v && docker compose up -d'
  }
  return null
}

seed()
  .then(() => pool.end())
  .catch((err) => {
    console.error(err)
    const hint = seedFailureHint(err)
    if (hint) console.error(`Hint: ${hint}`)
    pool.end().finally(() => process.exit(1))
  })
