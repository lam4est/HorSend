import { pool } from './db/pool.js'
import type { WorkflowDraft } from './ai/workflowSchema.js'
import { delayToMinutes, sanitizeTemplateBody } from './ai/workflowSchema.js'

const MONTH_KEYS = [
  'january', 'february', 'march', 'april', 'may', 'june',
  'july', 'august', 'september', 'october', 'november', 'december'
] as const

const TIME_MULTIPLIERS: Record<string, number> = { minute: 1, hour: 60, day: 1440 }

const STEP_DELAY_MINUTES_SQL = `CASE
  WHEN ws.delay_unit = 'day' THEN COALESCE(ws.delay_value, 0) * 1440
  WHEN ws.delay_unit = 'hour' THEN COALESCE(ws.delay_value, 0) * 60
  ELSE COALESCE(ws.delay_value, 0)
END`

function splitMinutes (total: number) {
  const days = Math.floor(total / 1440)
  const hours = Math.floor((total % 1440) / 60)
  const minutes = total % 60
  return { days, hours, minutes }
}

function convertMinutesToDelayUnit (minutes: number) {
  if (minutes >= 1440 && minutes % 1440 === 0) return { value: minutes / 1440, unit: 'day' as const }
  if (minutes >= 60 && minutes % 60 === 0) return { value: minutes / 60, unit: 'hour' as const }
  return { value: minutes, unit: 'minute' as const }
}

function normalizeChannel (channel: string): string {
  const c = channel.toLowerCase()
  if (c === 'rbm') return 'rcs'
  return c
}

type WorkflowUserRow = {
  id: number
  workflow_id: number
  is_active: boolean
  name: string
  category: string | null
  description: string
  source: string
}

type StepUserRow = {
  workflow_step_id: number
  step_order: number
  channel: string
  delay_in_minutes: number | null
  template_channel: string
  template_delay: number
  is_active: boolean
  is_confirmed_by_user: boolean
}

async function serializeWorkflow (wu: WorkflowUserRow, stepRows: StepUserRow[]) {
  const byStep = new Map(stepRows.map((s) => [s.workflow_step_id, s]))
  const steps = [...stepRows]
    .sort((a, b) => a.step_order - b.step_order)
    .map((step) => {
      const su = byStep.get(step.workflow_step_id)
      const delay = su?.delay_in_minutes ?? step.template_delay
      const delayInfo = convertMinutesToDelayUnit(delay ?? 0)
      return {
        workflow_step_id: step.workflow_step_id,
        step_order: step.step_order,
        channel: su?.channel ?? step.template_channel,
        delay_in_minutes: delay,
        delay_value: delayInfo.value,
        delay_unit: delayInfo.unit,
        is_active: su?.is_active ?? true,
        is_confirmed_by_user: su?.is_confirmed_by_user ?? false
      }
    })
  return {
    id: wu.id,
    workflow_id: wu.workflow_id,
    name: wu.name,
    category: wu.category ?? '',
    description: wu.description,
    is_active: wu.is_active,
    source: wu.source,
    steps
  }
}

async function loadWorkflowUser (userId: number, workflowUserId: number) {
  const wuResult = await pool.query<WorkflowUserRow>(
    `SELECT wu.id, wu.workflow_id, wu.is_active,
            w.workflow_name AS name,
            w.category,
            COALESCE(w.description, '') AS description,
            COALESCE(w.source, 'system') AS source
     FROM workflow_user wu
     JOIN workflows w ON w.id = wu.workflow_id
     WHERE wu.id = $1 AND wu.user_id = $2`,
    [workflowUserId, userId]
  )
  const wu = wuResult.rows[0]
  if (!wu) return null

  const stepsResult = await pool.query<StepUserRow>(
    `SELECT
       ws.id AS workflow_step_id,
       ws.step_order,
       COALESCE(wsu.channel, ws.channel) AS channel,
       wsu.delay_in_minutes,
       ws.channel AS template_channel,
       ${STEP_DELAY_MINUTES_SQL} AS template_delay,
       COALESCE(wsu.is_active, FALSE) AS is_active,
       COALESCE(wsu.is_confirmed_by_user, FALSE) AS is_confirmed_by_user
     FROM workflow_step ws
     LEFT JOIN workflow_step_user wsu
       ON wsu.workflow_step_id = ws.id AND wsu.workflow_user_id = $1
     WHERE ws.workflow_id = $2
     ORDER BY ws.step_order`,
    [workflowUserId, wu.workflow_id]
  )
  return serializeWorkflow(wu, stepsResult.rows)
}

export const db = {
  async listWorkflows (userId: number) {
    const { rows } = await pool.query<{ id: number }>(
      'SELECT id FROM workflow_user WHERE user_id = $1 ORDER BY id',
      [userId]
    )
    const items = await Promise.all(rows.map((r) => loadWorkflowUser(userId, r.id)))
    return items.filter((x): x is NonNullable<typeof x> => x !== null)
  },

  async workflowCatalog (userId: number) {
    const enrolled = await pool.query<{ original_workflow_id: number; id: number }>(
      'SELECT original_workflow_id, id FROM workflow_user WHERE user_id = $1',
      [userId]
    )
    const enrolledMap = new Map(
      enrolled.rows.map((r) => [r.original_workflow_id, r.id])
    )
    const { rows } = await pool.query<{
      id: number
      name: string
      category: string | null
      description: string | null
    }>(
      `SELECT id, workflow_name AS name, category, description
       FROM workflows
       WHERE owner_id IS NULL OR owner_id = $1
       ORDER BY id`,
      [userId]
    )
    return {
      items: rows.map((t) => ({
        id: t.id,
        name: t.name,
        category: t.category ?? '',
        description: t.description,
        workflow_user_id: enrolledMap.get(t.id) ?? null
      }))
    }
  },

  async enrollWorkflow (userId: number, workflowId: number) {
    const tpl = await pool.query('SELECT id FROM workflows WHERE id = $1', [workflowId])
    if (tpl.rowCount === 0) return { error: 'not_found' as const }

    const existing = await pool.query(
      'SELECT id FROM workflow_user WHERE user_id = $1 AND original_workflow_id = $2',
      [userId, workflowId]
    )
    if ((existing.rowCount ?? 0) > 0) return { error: 'conflict' as const }

    const steps = await pool.query<{
      id: number
      channel: string
      delay_in_minutes: number
    }>(
      `SELECT id, channel, ${STEP_DELAY_MINUTES_SQL} AS delay_in_minutes
       FROM workflow_step ws
       WHERE ws.workflow_id = $1
       ORDER BY ws.step_order`,
      [workflowId]
    )

    const client = await pool.connect()
    try {
      await client.query('BEGIN')
      const wuInsert = await client.query<{ id: number }>(
        `INSERT INTO workflow_user (
           user_id, workflow_id, original_workflow_id, is_active, created_at, updated_at
         ) VALUES ($1, $2, $2, FALSE, NOW(), NOW())
         RETURNING id`,
        [userId, workflowId]
      )
      const workflowUserId = wuInsert.rows[0]!.id
      for (const step of steps.rows) {
        await client.query(
          `INSERT INTO workflow_step_user (
             user_id, workflow_user_id, workflow_step_id, channel, delay_in_minutes,
             template_id, is_active, is_confirmed_by_user, settings, created_at, updated_at
           ) VALUES ($1, $2, $3, $4, $5, NULL, FALSE, FALSE, NULL, NOW(), NOW())`,
          [userId, workflowUserId, step.id, step.channel, step.delay_in_minutes]
        )
      }
      await client.query('COMMIT')
      const data = await loadWorkflowUser(userId, workflowUserId)
      return { data: data! }
    } catch (err) {
      await client.query('ROLLBACK')
      throw err
    } finally {
      client.release()
    }
  },

  async deleteWorkflowUser (userId: number, id: number) {
    const result = await pool.query(
      'DELETE FROM workflow_user WHERE id = $1 AND user_id = $2',
      [id, userId]
    )
    if ((result.rowCount ?? 0) === 0) return { error: 'not_found' as const }
    return { ok: true }
  },

  async getWorkflowDetail (
    userId: number,
    workflowId: number,
    workflowUserId?: number
  ) {
    const wuResult = await pool.query<{
      id: number
      workflow_id: number
      original_workflow_id: number
      segment_id: number | null
      name: string
      description: string
    }>(
      `SELECT wu.id, wu.workflow_id, wu.original_workflow_id, wu.segment_id,
              w.workflow_name AS name,
              COALESCE(w.description, '') AS description
       FROM workflow_user wu
       JOIN workflows w ON w.id = wu.workflow_id
       WHERE wu.user_id = $1 AND wu.workflow_id = $2
         AND ($3::int IS NULL OR wu.id = $3)`,
      [userId, workflowId, workflowUserId ?? null]
    )
    const wu = wuResult.rows[0]
    if (!wu) return { error: 'not_found' as const }

    const stepsResult = await pool.query<{
      id: number
      workflow_step_id: number
      channel: string
      template_id: string | null
      delay_in_minutes: number | null
      is_active: boolean
      is_confirmed_by_user: boolean
      settings: Record<string, unknown> | null
      step_order: number
    }>(
      `SELECT wsu.id, wsu.workflow_step_id, wsu.channel, wsu.template_id, wsu.delay_in_minutes,
              wsu.is_active, wsu.is_confirmed_by_user, wsu.settings, ws.step_order
       FROM workflow_step_user wsu
       JOIN workflow_step ws ON ws.id = wsu.workflow_step_id
       WHERE wsu.workflow_user_id = $1
       ORDER BY wsu.delay_in_minutes NULLS LAST, ws.step_order`,
      [wu.id]
    )

    const steps = stepsResult.rows.map((step) => {
      const minutes = step.delay_in_minutes ?? 0
      const delayInfo = convertMinutesToDelayUnit(minutes)
      const settings = step.settings ?? {}
      return {
        id: step.id,
        workflow_step_id: step.workflow_step_id,
        channel: step.channel,
        template_id: step.template_id,
        delay_in_minutes: minutes,
        delay_value: delayInfo.value,
        delay_unit: delayInfo.unit,
        is_active: step.is_active,
        is_confirmed_by_user: step.is_confirmed_by_user,
        excluded_contact_ids: [],
        settings,
        step_order: step.step_order
      }
    })

    return {
      workflow_user_id: wu.id,
      original_workflow_id: wu.original_workflow_id,
      name: wu.name,
      description: wu.description,
      segment_id: wu.segment_id,
      steps
    }
  },

  async updateWorkflow (userId: number, workflowId: number, body: Record<string, unknown>) {
    const wu = await pool.query<{ id: number }>(
      'SELECT id FROM workflow_user WHERE user_id = $1 AND workflow_id = $2',
      [userId, workflowId]
    )
    if ((wu.rowCount ?? 0) === 0) return { error: 'not_found' as const }
    const workflowUserId = wu.rows[0]!.id

    if (Array.isArray(body.steps)) {
      const segmentId =
        body.segment_id === null || body.segment_id === undefined
          ? null
          : Number(body.segment_id)
      const isActive = 'is_active' in body ? Boolean(body.is_active) : true

      const client = await pool.connect()
      try {
        await client.query('BEGIN')
        await client.query(
          `UPDATE workflow_user
           SET segment_id = $2, is_active = $3, updated_at = NOW()
           WHERE id = $1`,
          [workflowUserId, segmentId, isActive]
        )

        for (const raw of body.steps as Array<Record<string, unknown>>) {
          const stepId = Number(raw.workflow_step_id)
          if (!stepId) continue
          const settings =
            raw.settings && typeof raw.settings === 'object'
              ? JSON.stringify(raw.settings)
              : null
          await client.query(
            `UPDATE workflow_step_user SET
               channel = COALESCE($3, channel),
               template_id = $4,
               delay_in_minutes = $5,
               is_active = $6,
               is_confirmed_by_user = $7,
               settings = COALESCE($8::json, settings),
               updated_at = NOW()
             WHERE workflow_user_id = $1 AND workflow_step_id = $2`,
            [
              workflowUserId,
              stepId,
              typeof raw.channel === 'string' ? raw.channel : null,
              raw.template_id != null ? String(raw.template_id) : null,
              raw.delay_in_minutes != null ? Number(raw.delay_in_minutes) : null,
              raw.is_active !== false,
              Boolean(raw.is_confirmed_by_user),
              settings
            ]
          )
        }
        await client.query('COMMIT')
      } catch (err) {
        await client.query('ROLLBACK')
        throw err
      } finally {
        client.release()
      }
    } else if ('is_active' in body) {
      await pool.query(
        'UPDATE workflow_user SET is_active = $2, updated_at = NOW() WHERE id = $1',
        [workflowUserId, Boolean(body.is_active)]
      )
    }

    const data = await loadWorkflowUser(userId, workflowUserId)
    return { data: data! }
  },

  async confirmStepUser (userId: number, stepUserId: number) {
    const result = await pool.query(
      `UPDATE workflow_step_user wsu SET is_confirmed_by_user = TRUE, updated_at = NOW()
       FROM workflow_user wu
       WHERE wsu.id = $1 AND wsu.workflow_user_id = wu.id AND wu.user_id = $2
       RETURNING wsu.id`,
      [stepUserId, userId]
    )
    if ((result.rowCount ?? 0) === 0) return { error: 'not_found' as const }
    return { ok: true }
  },

  async listTemplates (userId: number, channel: string) {
    const key = normalizeChannel(channel)
    const { rows } = await pool.query<{
      id: string
      name: string
      title: string
      body: string | null
    }>(
      `SELECT id::text AS id, name,
              COALESCE(NULLIF(TRIM(subject), ''), name) AS title,
              body
       FROM content_template
       WHERE owner_id = $1 AND LOWER(channel) = $2
       ORDER BY id`,
      [userId, key]
    )
    return { items: rows }
  },

  async listContactLists (userId: number) {
    const lists = await pool.query<{ id: number; name: string; contacts_count: number }>(
      `SELECT id, name, contacts_count
       FROM contact_list
       WHERE owner_id = $1
       ORDER BY id`,
      [userId]
    )
    const total = await pool.query<{ total: string }>(
      `SELECT COALESCE(SUM(contacts_count), 0)::text AS total
       FROM contact_list
       WHERE owner_id = $1`,
      [userId]
    )
    return {
      items: lists.rows,
      total_contacts: Number(total.rows[0]?.total ?? 0)
    }
  },

  async listContacts (userId: number, contactListId?: number | null) {
    const { rows } = await pool.query<{
      id: number
      display_name: string | null
      email: string | null
      phone: string | null
      contact_list_id: number | null
    }>(
      `SELECT id, display_name, email, phone, contact_list_id
       FROM contact
       WHERE owner_id = $1
         AND ($2::int IS NULL OR contact_list_id = $2)
       ORDER BY id
       LIMIT 500`,
      [userId, contactListId ?? null]
    )
    return {
      items: rows.map((c) => {
        const parts = (c.display_name ?? '').trim().split(/\s+/)
        const first = parts[0] ?? ''
        const last = parts.slice(1).join(' ')
        return {
          id: c.id,
          first_name: first,
          last_name: last,
          email: c.email,
          phone: c.phone,
          contact_list_id: c.contact_list_id
        }
      })
    }
  },

  async schedulerCalendar (userId: number) {
    const { rows } = await pool.query<{
      id: number
      month: number
      title: string
      subscribed: boolean
      channel: string | null
      template_id: string | null
      contact_list_id: number | null
      hour: number | null
      minute: number | null
      days_before: number | null
      contacts_count: number | null
    }>(
      `SELECT
         e.id,
         e.month,
         e.name AS title,
         COALESCE(s.is_active, FALSE) AS subscribed,
         s.channel,
         s.template_id,
         s.contact_list_id,
         s.hour,
         s.minute,
         s.days_before,
         s.estimated_number_of_contacts AS contacts_count
       FROM scheduler_event e
       LEFT JOIN scheduler_event_subscription s
         ON s.scheduler_event_id = e.id AND s.user_id = $1
       ORDER BY e.month, e.day, e.id`,
      [userId]
    )
    const byMonth = new Map<
      number,
      Array<{
        id: number
        title: string
        subscribed: boolean
        channel: string
        template_id: string | null
        contact_list_id: number | null
        hour: number
        minute: number
        days_before: number
        contacts_count: number
      }>
    >()
    for (const ev of rows) {
      const list = byMonth.get(ev.month) ?? []
      list.push({
        id: ev.id,
        title: ev.title,
        subscribed: ev.subscribed,
        channel: ev.channel ?? 'sms',
        template_id: ev.template_id,
        contact_list_id: ev.contact_list_id,
        hour: ev.hour ?? 9,
        minute: ev.minute ?? 0,
        days_before: ev.days_before ?? 0,
        contacts_count: ev.subscribed ? (ev.contacts_count ?? 0) : 0
      })
      byMonth.set(ev.month, list)
    }
    return {
      items: [...byMonth.entries()]
        .sort(([a], [b]) => a - b)
        .map(([monthNum, events]) => ({
          month_key: MONTH_KEYS[monthNum - 1] ?? 'january',
          events
        }))
    }
  },

  async putSchedulerSubscription (userId: number, body: Record<string, unknown>) {
    const eventId = Number(body.scheduler_event_id)
    if (!eventId) return { error: 'bad_request' as const }

    const event = await pool.query('SELECT id FROM scheduler_event WHERE id = $1', [eventId])
    if ((event.rowCount ?? 0) === 0) return { error: 'not_found' as const }

    const isEnabled = 'is_enabled' in body ? Boolean(body.is_enabled) : true
    const channel = typeof body.channel === 'string' ? body.channel : 'sms'
    const templateId =
      body.templateId != null
        ? String(body.templateId)
        : body.template_id != null
          ? String(body.template_id)
          : null
    const contactListId =
      body.contactListId != null
        ? Number(body.contactListId)
        : body.contact_list_id != null
          ? Number(body.contact_list_id)
          : null
    const hour = Number(body.hour ?? 9)
    const minute = Number(body.minute ?? 0)
    const daysBefore = Number(body.daysBefore ?? body.days_before ?? 0)
    const contactsCount = Number(body.contactsCount ?? body.contacts_count ?? 0)

    const existing = await pool.query<{ id: number }>(
      `SELECT id FROM scheduler_event_subscription
       WHERE user_id = $1 AND scheduler_event_id = $2`,
      [userId, eventId]
    )

    if ((existing.rowCount ?? 0) > 0) {
      await pool.query(
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
        [
          userId,
          eventId,
          contactListId,
          isEnabled,
          channel,
          templateId,
          hour,
          minute,
          daysBefore,
          contactsCount
        ]
      )
    } else {
      await pool.query(
        `INSERT INTO scheduler_event_subscription (
           user_id, scheduler_event_id, contact_list_id, is_active,
           channel, template_id, hour, minute, days_before,
           estimated_number_of_contacts, cost_per_contact, created_at, updated_at
         ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 0.02, NOW(), NOW())`,
        [
          userId,
          eventId,
          contactListId,
          isEnabled,
          channel,
          templateId,
          hour,
          minute,
          daysBefore,
          contactsCount
        ]
      )
    }
    return { ok: true }
  },

  async createContentTemplate (
    client: import('pg').PoolClient,
    userId: number,
    channel: string,
    name: string,
    subject: string,
    body: string
  ): Promise<number> {
    const key = normalizeChannel(channel)
    const cleanBody = sanitizeTemplateBody(key, body)
    const result = await client.query<{ id: number }>(
      `INSERT INTO content_template (name, channel, subject, body, owner_id, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
       RETURNING id`,
      [name, key, subject, cleanBody, userId]
    )
    return result.rows[0]!.id
  },

  async createWorkflowFromDraft (userId: number, draft: WorkflowDraft) {
    if (!draft.steps.length) return { error: 'Workflow must have at least one step' as const }

    const client = await pool.connect()
    try {
      await client.query('BEGIN')

      const nextWorkflowId = await client.query<{ id: number }>(
        'SELECT COALESCE(MAX(id), 0) + 1 AS id FROM workflows'
      )
      const workflowId = nextWorkflowId.rows[0]!.id

      const nextStepBase = await client.query<{ id: number }>(
        'SELECT COALESCE(MAX(id), 0) AS id FROM workflow_step'
      )
      let nextStepId = nextStepBase.rows[0]!.id

      await client.query(
        `INSERT INTO workflows (
           id, workflow_key, workflow_name, category, description,
           owner_id, source, created_at, updated_at
         ) VALUES ($1, $2, $3, $4, $5, $6, 'ai', NOW(), NOW())`,
        [
          workflowId,
          `ai-workflow-${workflowId}`,
          draft.name,
          draft.category,
          draft.description,
          userId
        ]
      )

      const stepIds: number[] = []
      for (let i = 0; i < draft.steps.length; i++) {
        const step = draft.steps[i]!
        nextStepId += 1
        stepIds.push(nextStepId)
        await client.query(
          `INSERT INTO workflow_step (
             id, workflow_id, status, step_order, channel, delay_value, delay_unit, created_at, updated_at
           ) VALUES ($1, $2, 1, $3, $4, $5, $6, NOW(), NOW())`,
          [nextStepId, workflowId, i + 1, step.channel, step.delay_value, step.delay_unit]
        )
      }

      const wuInsert = await client.query<{ id: number }>(
        `INSERT INTO workflow_user (
           user_id, workflow_id, original_workflow_id, is_active, segment_id, created_at, updated_at
         ) VALUES ($1, $2, $2, FALSE, $3, NOW(), NOW())
         RETURNING id`,
        [userId, workflowId, draft.contact_list_id ?? null]
      )
      const workflowUserId = wuInsert.rows[0]!.id

      for (let i = 0; i < draft.steps.length; i++) {
        const step = draft.steps[i]!
        const workflowStepId = stepIds[i]!
        const subject =
          step.channel === 'email'
            ? (step.email_subject ?? step.template.subject ?? step.template.name)
            : ''
        const templateId = await db.createContentTemplate(
          client,
          userId,
          step.channel,
          step.template.name,
          subject,
          step.template.body
        )

        const delayMinutes = delayToMinutes(step.delay_value, step.delay_unit)
        let settings: string | null = null
        if (step.channel === 'email') {
          settings = JSON.stringify({
            subject: step.email_subject ?? step.template.subject ?? null,
            nameFrom: step.email_from_name ?? null,
            emailFrom: step.email_from_address ?? null,
            emailingService: null
          })
        } else if (step.channel === 'sms' || step.channel === 'rcs') {
          if (step.sms_sender_id?.trim()) {
            settings = JSON.stringify({ senderId: step.sms_sender_id.trim() })
          }
        }

        await client.query(
          `INSERT INTO workflow_step_user (
             user_id, workflow_user_id, workflow_step_id, channel, delay_in_minutes,
             template_id, is_active, is_confirmed_by_user, settings, created_at, updated_at
           ) VALUES ($1, $2, $3, $4, $5, $6, TRUE, TRUE, $7::json, NOW(), NOW())`,
          [
            userId,
            workflowUserId,
            workflowStepId,
            step.channel,
            delayMinutes,
            String(templateId),
            settings
          ]
        )
      }

      await client.query('COMMIT')
      const data = await loadWorkflowUser(userId, workflowUserId)
      return { data: data!, workflowUserId }
    } catch (err) {
      await client.query('ROLLBACK')
      throw err
    } finally {
      client.release()
    }
  }
}
