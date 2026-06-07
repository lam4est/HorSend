import { DEMO_CONTACTS, DEMO_TEMPLATES } from '../demo.js'
import { hasAppDatabaseSchema } from '../db/applySchema.js'
import { pool } from '../db/pool.js'
import { sendMessage } from '../n8n/send.js'
import { computeSendAt, isSendTimeReached } from './sendAt.js'

export type SchedulerRunResult = {
  due_subscriptions: number
  messages_sent: number
  subscriptions_completed: number
  skipped_already_sent: number
}

type RunFilter = {
  userId?: number
  eventId?: number
}

type ActiveSubscription = {
  user_id: number
  scheduler_event_id: number
  contact_list_id: number | null
  channel: string
  template_id: string
  hour: number
  minute: number
  days_before: number
  event_month: number
  event_day: number
}

type ContactRow = {
  id: number
  email: string | null
  phone: string | null
}

type TemplateRow = {
  subject: string
  body: string
}

function recipientForChannel (channel: string, contact: ContactRow): string | null {
  const c = channel.toLowerCase()
  if (c === 'email') return contact.email?.trim() || null
  return contact.phone?.trim() || null
}

async function loadActiveSubscriptions (): Promise<ActiveSubscription[]> {
  const { rows } = await pool.query<{
    user_id: number
    scheduler_event_id: number
    contact_list_id: number | null
    channel: string
    template_id: string
    hour: number | null
    minute: number | null
    days_before: number
    event_month: number
    event_day: number
  }>(
    `SELECT
       s.user_id,
       s.scheduler_event_id,
       s.contact_list_id,
       s.channel,
       s.template_id,
       s.hour,
       s.minute,
       s.days_before,
       e.month AS event_month,
       e.day AS event_day
     FROM scheduler_event_subscription s
     JOIN scheduler_event e ON e.id = s.scheduler_event_id
     WHERE s.is_active = TRUE
       AND s.template_id IS NOT NULL
       AND TRIM(s.template_id) <> ''`
  )

  return rows.map((row) => ({
    user_id: row.user_id,
    scheduler_event_id: row.scheduler_event_id,
    contact_list_id: row.contact_list_id,
    channel: row.channel,
    template_id: row.template_id,
    hour: row.hour ?? 9,
    minute: row.minute ?? 0,
    days_before: row.days_before ?? 0,
    event_month: row.event_month,
    event_day: row.event_day
  }))
}

async function alreadySent (
  userId: number,
  eventId: number,
  sendAt: Date
): Promise<boolean> {
  const { rows } = await pool.query<{ exists: boolean }>(
    `SELECT EXISTS (
       SELECT 1 FROM scheduler_send_log
       WHERE user_id = $1
         AND scheduler_event_id = $2
         AND scheduled_send_at = $3
     ) AS exists`,
    [userId, eventId, sendAt.toISOString()]
  )
  return rows[0]?.exists === true
}

async function loadContacts (
  userId: number,
  contactListId: number | null
): Promise<ContactRow[]> {
  const isProduction = await hasAppDatabaseSchema()
  if (!isProduction) {
    return DEMO_CONTACTS.map((c) => ({
      id: c.id,
      email: c.email,
      phone: c.phone
    }))
  }

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

async function loadTemplate (
  userId: number,
  templateId: string,
  channel: string
): Promise<TemplateRow> {
  const isProduction = await hasAppDatabaseSchema()
  if (!isProduction) {
    const tplList = DEMO_TEMPLATES[channel.toLowerCase()] ?? []
    const tpl = tplList.find((t) => t.id === templateId)
    return {
      subject: tpl?.title || tpl?.name || '',
      body: tpl?.body || ''
    }
  }

  const { rows } = await pool.query<{ subject: string; body: string | null }>(
    `SELECT subject, body
     FROM content_template
     WHERE owner_id = $1 AND id::text = $2
     LIMIT 1`,
    [userId, templateId]
  )
  const row = rows[0]
  return {
    subject: row?.subject ?? '',
    body: row?.body ?? ''
  }
}

async function recordSend (
  userId: number,
  eventId: number,
  eventYear: number,
  sendAt: Date,
  contactsSent: number
): Promise<void> {
  await pool.query(
    `INSERT INTO scheduler_send_log (
       user_id, scheduler_event_id, event_year, scheduled_send_at, contacts_sent, sent_at
     ) VALUES ($1, $2, $3, $4, $5, NOW())
     ON CONFLICT DO NOTHING`,
    [userId, eventId, eventYear, sendAt.toISOString(), contactsSent]
  )
}

/** Earliest future send time among active, not-yet-sent subscriptions. */
export async function getNextSendAt (): Promise<Date | null> {
  const now = new Date()
  const subscriptions = await loadActiveSubscriptions()
  let next: Date | null = null

  for (const sub of subscriptions) {
    const { sendAt, eventYear } = computeSendAt(
      sub.event_month,
      sub.event_day,
      sub.days_before,
      sub.hour,
      sub.minute,
      now
    )
    if (await alreadySent(sub.user_id, sub.scheduler_event_id, sendAt)) continue
    if (sendAt.getTime() <= now.getTime()) continue
    if (!next || sendAt.getTime() < next.getTime()) next = sendAt
  }

  return next
}

export async function runScheduler (filter?: RunFilter): Promise<SchedulerRunResult> {
  const now = new Date()
  const subscriptions = await loadActiveSubscriptions()

  let dueCount = 0
  let messagesSent = 0
  let completed = 0
  let skippedAlreadySent = 0

  for (const sub of subscriptions) {
    if (filter?.userId != null && sub.user_id !== filter.userId) continue
    if (filter?.eventId != null && sub.scheduler_event_id !== filter.eventId) continue

    const { sendAt, eventYear } = computeSendAt(
      sub.event_month,
      sub.event_day,
      sub.days_before,
      sub.hour,
      sub.minute,
      now
    )

    if (!isSendTimeReached(sendAt, now)) continue
    dueCount += 1

    if (await alreadySent(sub.user_id, sub.scheduler_event_id, sendAt)) {
      skippedAlreadySent += 1
      continue
    }

    const [contacts, template] = await Promise.all([
      loadContacts(sub.user_id, sub.contact_list_id),
      loadTemplate(sub.user_id, sub.template_id, sub.channel)
    ])

    let sentForSub = 0
    for (const contact of contacts) {
      const to = recipientForChannel(sub.channel, contact)
      if (!to) continue

      await sendMessage({
        queue_id: 0,
        user_id: sub.user_id,
        channel: sub.channel,
        to,
        template_id: sub.template_id,
        sender: 'Octopush',
        message: template.body,
        subject: template.subject,
        source: 'scheduler'
      })
      sentForSub += 1
      messagesSent += 1
    }

    await recordSend(sub.user_id, sub.scheduler_event_id, eventYear, sendAt, sentForSub)
    completed += 1
  }

  return {
    due_subscriptions: dueCount,
    messages_sent: messagesSent,
    subscriptions_completed: completed,
    skipped_already_sent: skippedAlreadySent
  }
}

export function runSchedulerForSubscription (
  userId: number,
  eventId: number
): Promise<SchedulerRunResult> {
  return runScheduler({ userId, eventId })
}
