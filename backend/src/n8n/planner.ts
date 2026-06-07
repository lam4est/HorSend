import { DEMO_CONTACTS, DEMO_TEMPLATES } from '../demo.js'
import { hasAppDatabaseSchema } from '../db/applySchema.js'
import { pool } from '../db/pool.js'

type PlannerResult = {
  window_minutes: number
  queued: number
  skipped: number
  users: number
}

type DueStep = {
  user_id: number
  workflow_user_id: number
  workflow_step_user_id: number
  channel: string
  template_id: string | null
  message_subject: string
  message_body: string
  sender: string
  scheduled_at: Date
  contact_list_id: number | null
}

type ContactRow = {
  id: number
  email: string | null
  phone: string | null
}

function recipientForChannel (channel: string, contact: ContactRow): string | null {
  const c = channel.toLowerCase()
  if (c === 'email') return contact.email?.trim() || null
  return contact.phone?.trim() || null
}

function settingsSender (settings: unknown): string {
  if (!settings || typeof settings !== 'object') return 'Octopush'
  const s = settings as Record<string, unknown>
  const senderId = s.senderId
  if (typeof senderId === 'string' && senderId.trim()) return senderId.trim()
  const nameFrom = s.nameFrom
  if (typeof nameFrom === 'string' && nameFrom.trim()) return nameFrom.trim()
  return 'Octopush'
}

function settingsSubject (settings: unknown): string {
  if (!settings || typeof settings !== 'object') return ''
  const subject = (settings as Record<string, unknown>).subject
  return typeof subject === 'string' ? subject : ''
}

async function insertQueueRows (
  rows: Array<{
    user_id: number
    workflow_user_id: number
    workflow_step_user_id: number
    contact_id: number
    channel: string
    recipient: string
    template_id: string | null
    message_subject: string
    message_body: string
    sender: string
    scheduled_at: Date
  }>
): Promise<{ queued: number; skipped: number }> {
  if (rows.length === 0) return { queued: 0, skipped: 0 }

  let queued = 0
  let skipped = 0
  for (const row of rows) {
    const result = await pool.query(
      `INSERT INTO workflow_send_queue (
         user_id, workflow_user_id, workflow_step_user_id, contact_id,
         channel, recipient, template_id, message_subject, message_body, sender,
         scheduled_at, status
       ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,'pending')
       ON CONFLICT DO NOTHING
       RETURNING id`,
      [
        row.user_id,
        row.workflow_user_id,
        row.workflow_step_user_id,
        row.contact_id,
        row.channel,
        row.recipient,
        row.template_id,
        row.message_subject,
        row.message_body,
        row.sender,
        row.scheduled_at.toISOString()
      ]
    )
    if ((result.rowCount ?? 0) > 0) queued += 1
    else skipped += 1
  }
  return { queued, skipped }
}

async function loadProductionDueSteps (windowMinutes: number): Promise<DueStep[]> {
  const { rows } = await pool.query<{
    user_id: number
    workflow_user_id: number
    workflow_step_user_id: number
    channel: string
    template_id: string | null
    settings: Record<string, unknown> | null
    segment_id: number | null
    anchor_at: Date
    delay_in_minutes: number | null
    template_subject: string | null
    template_body: string | null
  }>(
    `SELECT
       wu.user_id,
       wu.id AS workflow_user_id,
       wsu.id AS workflow_step_user_id,
       wsu.channel,
       wsu.template_id,
       wsu.settings,
       wu.segment_id,
       COALESCE(wu.updated_at, wu.created_at, NOW()) AS anchor_at,
       wsu.delay_in_minutes,
       ct.subject AS template_subject,
       ct.body AS template_body
     FROM workflow_user wu
     JOIN workflow_step_user wsu ON wsu.workflow_user_id = wu.id
     LEFT JOIN content_template ct
       ON ct.id::text = wsu.template_id AND ct.owner_id = wu.user_id
     WHERE wu.is_active = TRUE
       AND wsu.is_active = TRUE
       AND wsu.is_confirmed_by_user = TRUE
       AND wsu.template_id IS NOT NULL
       AND (
         COALESCE(wu.updated_at, wu.created_at, NOW())
         + (COALESCE(wsu.delay_in_minutes, 0) || ' minutes')::interval
       ) <= NOW() + ($1::text || ' minutes')::interval
       AND (
         COALESCE(wu.updated_at, wu.created_at, NOW())
         + (COALESCE(wsu.delay_in_minutes, 0) || ' minutes')::interval
       ) >= NOW() - ($1::text || ' minutes')::interval`,
    [String(Math.max(1, windowMinutes))]
  )

  return rows.map((row) => {
    const scheduledAt = new Date(row.anchor_at)
    scheduledAt.setMinutes(scheduledAt.getMinutes() + (row.delay_in_minutes ?? 0))
    return {
      user_id: row.user_id,
      workflow_user_id: row.workflow_user_id,
      workflow_step_user_id: row.workflow_step_user_id,
      channel: row.channel,
      template_id: row.template_id,
      message_subject: settingsSubject(row.settings) || row.template_subject || '',
      message_body: row.template_body || '',
      sender: settingsSender(row.settings),
      scheduled_at: scheduledAt,
      contact_list_id: row.segment_id
    }
  })
}

async function loadDemoDueSteps (windowMinutes: number): Promise<DueStep[]> {
  const { rows } = await pool.query<{
    user_id: number
    workflow_user_id: number
    workflow_step_user_id: number
    channel: string
    template_id: string | null
    settings: Record<string, unknown> | null
    delay_in_minutes: number | null
  }>(
    `SELECT
       wu.user_id,
       wu.id AS workflow_user_id,
       su.id AS workflow_step_user_id,
       su.channel,
       su.template_id,
       su.settings,
       su.delay_in_minutes
     FROM workflow_users wu
     JOIN step_users su ON su.workflow_user_id = wu.id
     WHERE wu.is_active = TRUE
       AND su.is_active = TRUE
       AND su.is_confirmed_by_user = TRUE
       AND su.template_id IS NOT NULL
       AND COALESCE(su.delay_in_minutes, 0) <= $1`,
    [windowMinutes]
  )

  const now = new Date()
  return rows.map((row) => {
    const tplList = DEMO_TEMPLATES[row.channel.toLowerCase()] ?? []
    const tpl = tplList.find((t) => t.id === row.template_id)
    return {
      user_id: row.user_id,
      workflow_user_id: row.workflow_user_id,
      workflow_step_user_id: row.workflow_step_user_id,
      channel: row.channel,
      template_id: row.template_id,
      message_subject: settingsSubject(row.settings) || tpl?.title || tpl?.name || '',
      message_body: tpl?.body || '',
      sender: settingsSender(row.settings),
      scheduled_at: now,
      contact_list_id: null
    }
  })
}

async function loadProductionContacts (
  userId: number,
  contactListId: number | null
): Promise<ContactRow[]> {
  const { rows } = await pool.query<ContactRow>(
    `SELECT id, email, phone
     FROM contact
     WHERE owner_id = $1
       AND ($2::int IS NULL OR contact_list_id = $2)
     ORDER BY id
     LIMIT 5000`,
    [userId, contactListId]
  )
  return rows
}

async function buildQueueFromSteps (steps: DueStep[]): Promise<{
  rows: Array<{
    user_id: number
    workflow_user_id: number
    workflow_step_user_id: number
    contact_id: number
    channel: string
    recipient: string
    template_id: string | null
    message_subject: string
    message_body: string
    sender: string
    scheduled_at: Date
  }>
  users: Set<number>
}> {
  const out: Array<{
    user_id: number
    workflow_user_id: number
    workflow_step_user_id: number
    contact_id: number
    channel: string
    recipient: string
    template_id: string | null
    message_subject: string
    message_body: string
    sender: string
    scheduled_at: Date
  }> = []
  const users = new Set<number>()
  const isProduction = await hasAppDatabaseSchema()

  for (const step of steps) {
    users.add(step.user_id)
    const contacts = isProduction
      ? await loadProductionContacts(step.user_id, step.contact_list_id)
      : DEMO_CONTACTS.map((c) => ({
          id: c.id,
          email: c.email,
          phone: c.phone
        }))

    for (const contact of contacts) {
      const recipient = recipientForChannel(step.channel, contact)
      if (!recipient) continue
      out.push({
        user_id: step.user_id,
        workflow_user_id: step.workflow_user_id,
        workflow_step_user_id: step.workflow_step_user_id,
        contact_id: contact.id,
        channel: step.channel,
        recipient,
        template_id: step.template_id,
        message_subject: step.message_subject,
        message_body: step.message_body,
        sender: step.sender,
        scheduled_at: step.scheduled_at
      })
    }
  }

  return { rows: out, users }
}

export async function runPlanner (windowMinutes = 5): Promise<PlannerResult> {
  const window = Math.max(1, Math.min(windowMinutes, 60))
  const isProduction = await hasAppDatabaseSchema()
  const dueSteps = isProduction
    ? await loadProductionDueSteps(window)
    : await loadDemoDueSteps(window)

  const { rows, users } = await buildQueueFromSteps(dueSteps)
  const { queued, skipped } = await insertQueueRows(rows)

  return {
    window_minutes: window,
    queued,
    skipped,
    users: users.size
  }
}
