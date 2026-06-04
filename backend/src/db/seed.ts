import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import type pg from 'pg'
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

async function seedWorkflowUser (
  client: DbClient,
  entry: Seed['workflowUsers'][number]
): Promise<void> {
  const wuResult = await client.query<{ id: number }>(
    `INSERT INTO workflow_users (user_id, workflow_id, is_active)
     VALUES ($1, $2, $3)
     ON CONFLICT (user_id, workflow_id) DO UPDATE SET
       is_active = EXCLUDED.is_active
     RETURNING id`,
    [entry.user_id, entry.workflow_id, entry.is_active]
  )
  const workflowUserId = wuResult.rows[0]!.id

  const steps = await client.query<{
    id: number
    channel: string
    delay_in_minutes: number
  }>(
    `SELECT id, channel, delay_in_minutes
     FROM workflow_steps
     WHERE workflow_template_id = $1
     ORDER BY step_order`,
    [entry.workflow_id]
  )

  for (const step of steps.rows) {
    await client.query(
      `INSERT INTO step_users (
         workflow_user_id, workflow_step_id, channel, delay_in_minutes,
         template_id, is_active, is_confirmed_by_user, settings
       ) VALUES ($1, $2, $3, $4, NULL, TRUE, FALSE, NULL)
       ON CONFLICT (workflow_user_id, workflow_step_id) DO NOTHING`,
      [workflowUserId, step.id, step.channel, step.delay_in_minutes]
    )
  }
}

async function seed (): Promise<void> {
  const data = JSON.parse(fs.readFileSync(seedPath, 'utf8')) as Seed
  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    for (const tpl of data.workflowTemplates) {
      await client.query(
        `INSERT INTO workflow_templates (id, name, category, description)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (id) DO UPDATE SET
           name = EXCLUDED.name,
           category = EXCLUDED.category,
           description = EXCLUDED.description`,
        [tpl.id, tpl.name, tpl.category, tpl.description]
      )
      for (const step of tpl.steps) {
        await client.query(
          `INSERT INTO workflow_steps (id, workflow_template_id, step_order, channel, delay_in_minutes)
           VALUES ($1, $2, $3, $4, $5)
           ON CONFLICT (id) DO UPDATE SET
             workflow_template_id = EXCLUDED.workflow_template_id,
             step_order = EXCLUDED.step_order,
             channel = EXCLUDED.channel,
             delay_in_minutes = EXCLUDED.delay_in_minutes`,
          [step.id, tpl.id, step.step_order, step.channel, step.delay_in_minutes]
        )
      }
    }

    for (const entry of data.workflowUsers ?? []) {
      await seedWorkflowUser(client, entry)
    }

    for (const ev of data.schedulerEvents) {
      await client.query(
        `INSERT INTO scheduler_events (id, month, day, title, description)
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT (id) DO UPDATE SET
           month = EXCLUDED.month,
           day = EXCLUDED.day,
           title = EXCLUDED.title,
           description = EXCLUDED.description`,
        [ev.id, ev.month, ev.day, ev.title, ev.description]
      )
    }

    for (const sub of data.schedulerSubscriptions ?? []) {
      await client.query(
        `INSERT INTO scheduler_subscriptions (
           user_id, scheduler_event_id, contact_list_id, is_enabled,
           channel, template_id, hour, minute, days_before, contacts_count
         ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
         ON CONFLICT (user_id, scheduler_event_id) DO UPDATE SET
           contact_list_id = EXCLUDED.contact_list_id,
           is_enabled = EXCLUDED.is_enabled,
           channel = EXCLUDED.channel,
           template_id = EXCLUDED.template_id,
           hour = EXCLUDED.hour,
           minute = EXCLUDED.minute,
           days_before = EXCLUDED.days_before,
           contacts_count = EXCLUDED.contacts_count`,
        [
          sub.user_id,
          sub.scheduler_event_id,
          sub.contact_list_id ?? null,
          sub.is_enabled,
          sub.channel ?? 'sms',
          sub.template_id ?? null,
          sub.hour ?? 9,
          sub.minute ?? 0,
          sub.days_before ?? 0,
          sub.contacts_count ?? 0
        ]
      )
    }

    await client.query('COMMIT')
    console.log('Seed data loaded (templates, enrollments, scheduler).')
  } catch (err) {
    await client.query('ROLLBACK')
    throw err
  } finally {
    client.release()
  }
}

seed()
  .then(() => pool.end())
  .catch((err) => {
    console.error(err)
    pool.end().finally(() => process.exit(1))
  })
