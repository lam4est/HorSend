import { pool } from '../db/pool.js'

export type SendHistoryRecipient = {
  id: number
  contact_id: number | null
  contact_name: string | null
  recipient: string
  status: string
  sent_at: string | null
  error_message: string | null
  attempts: number
}

export type SendHistoryBatch = {
  id: string
  source: 'workflow' | 'scheduler'
  campaign_name: string
  channel: string
  template_id: string | null
  scheduled_at: string
  completed_at: string | null
  total: number
  sent: number
  failed: number
  pending: number
  processing: number
  recipients: SendHistoryRecipient[]
}

export type SendHistorySummary = {
  total_messages: number
  sent: number
  failed: number
  pending: number
  processing: number
  batches: number
}

export type SendHistoryResult = {
  summary: SendHistorySummary
  batches: SendHistoryBatch[]
}

export type HistoryFilters = {
  source?: 'all' | 'workflow' | 'scheduler'
  status?: 'all' | 'sent' | 'failed' | 'pending'
  dateFrom?: Date | null
  dateTo?: Date | null
  limit?: number
  offset?: number
}

export type HistoryDateRange = {
  dateFrom: Date | null
  dateTo: Date | null
}

export function parseHistoryDateRange (
  dateFromRaw?: string,
  dateToRaw?: string
): HistoryDateRange & { error?: string } {
  const dateRe = /^\d{4}-\d{2}-\d{2}$/

  let dateFrom: Date | null = null
  let dateTo: Date | null = null

  if (dateFromRaw != null && dateFromRaw !== '') {
    if (!dateRe.test(dateFromRaw)) {
      return { dateFrom: null, dateTo: null, error: 'date_from must be YYYY-MM-DD' }
    }
    dateFrom = new Date(`${dateFromRaw}T00:00:00.000`)
    if (Number.isNaN(dateFrom.getTime())) {
      return { dateFrom: null, dateTo: null, error: 'date_from is invalid' }
    }
  }

  if (dateToRaw != null && dateToRaw !== '') {
    if (!dateRe.test(dateToRaw)) {
      return { dateFrom: null, dateTo: null, error: 'date_to must be YYYY-MM-DD' }
    }
    dateTo = new Date(`${dateToRaw}T23:59:59.999`)
    if (Number.isNaN(dateTo.getTime())) {
      return { dateFrom: null, dateTo: null, error: 'date_to is invalid' }
    }
  }

  if (dateFrom && dateTo && dateFrom.getTime() > dateTo.getTime()) {
    return { dateFrom, dateTo, error: 'date_from must be on or before date_to' }
  }

  return { dateFrom, dateTo }
}

type WorkflowBatchRow = {
  batch_key: string
  workflow_user_id: number
  workflow_step_user_id: number
  campaign_name: string
  channel: string
  template_id: string | null
  scheduled_at: Date
  completed_at: Date | null
  total: string
  sent: string
  failed: string
  pending: string
  processing: string
}

type SchedulerBatchRow = {
  batch_key: string
  send_log_id: number
  campaign_name: string
  channel: string
  template_id: string | null
  scheduled_at: Date
  completed_at: Date
  total: string
  sent: string
  failed: string
  pending: string
  processing: string
}

function toIso (value: Date | string | null | undefined): string | null {
  if (value == null) return null
  return value instanceof Date ? value.toISOString() : String(value)
}

async function loadWorkflowBatches (
  userId: number,
  filters: HistoryFilters
): Promise<WorkflowBatchRow[]> {
  const statusFilter = filters.status ?? 'all'
  const having =
    statusFilter === 'all'
      ? ''
      : statusFilter === 'sent'
        ? `HAVING COUNT(*) FILTER (WHERE q.status = 'sent') > 0`
        : statusFilter === 'failed'
          ? `HAVING COUNT(*) FILTER (WHERE q.status = 'failed') > 0`
          : `HAVING COUNT(*) FILTER (WHERE q.status IN ('pending', 'processing')) > 0`

  const { rows } = await pool.query<WorkflowBatchRow>(
    `SELECT
       ('workflow-' || q.workflow_user_id || '-' || q.workflow_step_user_id) AS batch_key,
       q.workflow_user_id,
       q.workflow_step_user_id,
       w.workflow_name AS campaign_name,
       q.channel,
       MAX(q.template_id) AS template_id,
       MIN(q.scheduled_at) AS scheduled_at,
       MAX(COALESCE(q.sent_at, q.updated_at)) AS completed_at,
       COUNT(*)::text AS total,
       COUNT(*) FILTER (WHERE q.status = 'sent')::text AS sent,
       COUNT(*) FILTER (WHERE q.status = 'failed')::text AS failed,
       COUNT(*) FILTER (WHERE q.status = 'pending')::text AS pending,
       COUNT(*) FILTER (WHERE q.status = 'processing')::text AS processing
     FROM workflow_send_queue q
     JOIN workflow_user wu ON wu.id = q.workflow_user_id
     JOIN workflows w ON w.id = wu.workflow_id
     WHERE q.user_id = $1
       AND ($2::timestamptz IS NULL OR q.scheduled_at >= $2)
       AND ($3::timestamptz IS NULL OR q.scheduled_at <= $3)
     GROUP BY q.workflow_user_id, q.workflow_step_user_id, w.workflow_name, q.channel
     ${having}
     ORDER BY MIN(q.scheduled_at) DESC`,
    [userId, filters.dateFrom ?? null, filters.dateTo ?? null]
  )
  return rows
}

async function loadSchedulerBatches (
  userId: number,
  filters: HistoryFilters
): Promise<SchedulerBatchRow[]> {
  const statusFilter = filters.status ?? 'all'
  const having =
    statusFilter === 'all'
      ? ''
      : statusFilter === 'sent'
        ? `HAVING COALESCE(SUM(CASE WHEN d.status = 'sent' THEN 1 ELSE 0 END), l.contacts_sent) > 0`
        : statusFilter === 'failed'
          ? `HAVING COALESCE(SUM(CASE WHEN d.status = 'failed' THEN 1 ELSE 0 END), 0) > 0`
          : `HAVING FALSE`

  const { rows } = await pool.query<SchedulerBatchRow>(
    `SELECT
       ('scheduler-' || l.id) AS batch_key,
       l.id AS send_log_id,
       e.name AS campaign_name,
       COALESCE(s.channel, 'sms') AS channel,
       s.template_id,
       l.scheduled_send_at AS scheduled_at,
       l.sent_at AS completed_at,
       COALESCE(COUNT(d.id), l.contacts_sent)::text AS total,
       COALESCE(SUM(CASE WHEN d.status = 'sent' THEN 1 ELSE 0 END), l.contacts_sent)::text AS sent,
       COALESCE(SUM(CASE WHEN d.status = 'failed' THEN 1 ELSE 0 END), 0)::text AS failed,
       '0'::text AS pending,
       '0'::text AS processing
     FROM scheduler_send_log l
     JOIN scheduler_event e ON e.id = l.scheduler_event_id
     LEFT JOIN scheduler_event_subscription s
       ON s.scheduler_event_id = l.scheduler_event_id AND s.user_id = l.user_id
     LEFT JOIN scheduler_send_detail d ON d.send_log_id = l.id
     WHERE l.user_id = $1
       AND ($2::timestamptz IS NULL OR l.scheduled_send_at >= $2)
       AND ($3::timestamptz IS NULL OR l.scheduled_send_at <= $3)
     GROUP BY l.id, e.name, s.channel, s.template_id, l.scheduled_send_at, l.sent_at, l.contacts_sent
     ${having}
     ORDER BY l.scheduled_send_at DESC`,
    [userId, filters.dateFrom ?? null, filters.dateTo ?? null]
  )
  return rows
}

async function loadWorkflowRecipients (
  userId: number,
  workflowUserId: number,
  workflowStepUserId: number
): Promise<SendHistoryRecipient[]> {
  const { rows } = await pool.query<{
    id: number
    contact_id: number
    contact_name: string | null
    recipient: string
    status: string
    sent_at: Date | null
    error_message: string | null
    attempts: number
  }>(
    `SELECT
       q.id,
       q.contact_id,
       c.display_name AS contact_name,
       q.recipient,
       q.status,
       q.sent_at,
       q.error_message,
       q.attempts
     FROM workflow_send_queue q
     LEFT JOIN contact c ON c.id = q.contact_id
     WHERE q.user_id = $1
       AND q.workflow_user_id = $2
       AND q.workflow_step_user_id = $3
     ORDER BY q.sent_at DESC NULLS LAST, q.id DESC`,
    [userId, workflowUserId, workflowStepUserId]
  )
  return rows.map((row) => ({
    id: row.id,
    contact_id: row.contact_id,
    contact_name: row.contact_name,
    recipient: row.recipient,
    status: row.status,
    sent_at: toIso(row.sent_at),
    error_message: row.error_message,
    attempts: row.attempts
  }))
}

async function loadSchedulerRecipients (sendLogId: number): Promise<SendHistoryRecipient[]> {
  const { rows } = await pool.query<{
    id: number
    contact_id: number | null
    contact_name: string | null
    recipient: string
    status: string
    sent_at: Date
    error_message: string | null
  }>(
    `SELECT
       d.id,
       d.contact_id,
       c.display_name AS contact_name,
       d.recipient,
       d.status,
       d.sent_at,
       d.error_message
     FROM scheduler_send_detail d
     LEFT JOIN contact c ON c.id = d.contact_id
     WHERE d.send_log_id = $1
     ORDER BY d.sent_at DESC, d.id DESC`,
    [sendLogId]
  )
  return rows.map((row) => ({
    id: row.id,
    contact_id: row.contact_id,
    contact_name: row.contact_name,
    recipient: row.recipient,
    status: row.status,
    sent_at: toIso(row.sent_at),
    error_message: row.error_message,
    attempts: 1
  }))
}

function buildSummary (batches: SendHistoryBatch[]): SendHistorySummary {
  return batches.reduce<SendHistorySummary>(
    (acc, batch) => ({
      total_messages: acc.total_messages + batch.total,
      sent: acc.sent + batch.sent,
      failed: acc.failed + batch.failed,
      pending: acc.pending + batch.pending,
      processing: acc.processing + batch.processing,
      batches: acc.batches + 1
    }),
    {
      total_messages: 0,
      sent: 0,
      failed: 0,
      pending: 0,
      processing: 0,
      batches: 0
    }
  )
}

export async function fetchSendHistory (
  userId: number,
  filters: HistoryFilters = {}
): Promise<SendHistoryResult> {
  const source = filters.source ?? 'all'
  const limit = Math.min(Math.max(filters.limit ?? 30, 1), 100)
  const offset = Math.max(filters.offset ?? 0, 0)

  const workflowRows =
    source === 'scheduler' ? [] : await loadWorkflowBatches(userId, filters)
  const schedulerRows =
    source === 'workflow' ? [] : await loadSchedulerBatches(userId, filters)

  const merged = [
    ...workflowRows.map((row) => ({
      sortAt: row.scheduled_at.getTime(),
      kind: 'workflow' as const,
      row
    })),
    ...schedulerRows.map((row) => ({
      sortAt: row.scheduled_at.getTime(),
      kind: 'scheduler' as const,
      row
    }))
  ]
    .sort((a, b) => b.sortAt - a.sortAt)
    .slice(offset, offset + limit)

  const batches: SendHistoryBatch[] = []

  for (const item of merged) {
    if (item.kind === 'workflow') {
      const row = item.row
      const recipients = await loadWorkflowRecipients(
        userId,
        row.workflow_user_id,
        row.workflow_step_user_id
      )
      batches.push({
        id: row.batch_key,
        source: 'workflow',
        campaign_name: row.campaign_name,
        channel: row.channel,
        template_id: row.template_id,
        scheduled_at: toIso(row.scheduled_at) ?? '',
        completed_at: toIso(row.completed_at),
        total: Number(row.total),
        sent: Number(row.sent),
        failed: Number(row.failed),
        pending: Number(row.pending),
        processing: Number(row.processing),
        recipients
      })
    } else {
      const row = item.row
      const recipients = await loadSchedulerRecipients(row.send_log_id)
      batches.push({
        id: row.batch_key,
        source: 'scheduler',
        campaign_name: row.campaign_name,
        channel: row.channel,
        template_id: row.template_id,
        scheduled_at: toIso(row.scheduled_at) ?? '',
        completed_at: toIso(row.completed_at),
        total: Number(row.total),
        sent: Number(row.sent),
        failed: Number(row.failed),
        pending: Number(row.pending),
        processing: Number(row.processing),
        recipients
      })
    }
  }

  return {
    summary: buildSummary(batches),
    batches
  }
}

type CsvRow = {
  source: string
  campaign_name: string
  channel: string
  template_id: string
  scheduled_at: string
  completed_at: string
  contact_name: string
  recipient: string
  status: string
  sent_at: string
  attempts: string
  error_message: string
}

function filterRecipientsByStatus (
  recipients: SendHistoryRecipient[],
  status: HistoryFilters['status']
): SendHistoryRecipient[] {
  if (!status || status === 'all') return recipients
  if (status === 'pending') {
    return recipients.filter((r) => r.status === 'pending' || r.status === 'processing')
  }
  return recipients.filter((r) => r.status === status)
}

function csvEscape (value: string): string {
  if (/[",\n\r]/.test(value)) return `"${value.replace(/"/g, '""')}"`
  return value
}

function csvCell (value: string | number | null | undefined): string {
  if (value == null) return ''
  return csvEscape(String(value))
}

function batchesToCsvRows (
  batches: SendHistoryBatch[],
  status: HistoryFilters['status']
): CsvRow[] {
  const rows: CsvRow[] = []

  for (const batch of batches) {
    const recipients = filterRecipientsByStatus(batch.recipients, status)

    if (recipients.length === 0) {
      if (batch.total === 0) continue
      if (status && status !== 'all') continue
      rows.push({
        source: batch.source,
        campaign_name: batch.campaign_name,
        channel: batch.channel,
        template_id: batch.template_id ?? '',
        scheduled_at: batch.scheduled_at,
        completed_at: batch.completed_at ?? '',
        contact_name: '',
        recipient: '',
        status: batch.failed > 0 ? 'mixed' : 'sent',
        sent_at: batch.completed_at ?? batch.scheduled_at,
        attempts: '',
        error_message: 'Summary only (no per-recipient detail)'
      })
      continue
    }

    for (const recipient of recipients) {
      rows.push({
        source: batch.source,
        campaign_name: batch.campaign_name,
        channel: batch.channel,
        template_id: batch.template_id ?? '',
        scheduled_at: batch.scheduled_at,
        completed_at: batch.completed_at ?? '',
        contact_name: recipient.contact_name ?? '',
        recipient: recipient.recipient,
        status: recipient.status,
        sent_at: recipient.sent_at ?? '',
        attempts: String(recipient.attempts),
        error_message: recipient.error_message ?? ''
      })
    }
  }

  return rows
}

export function buildSendHistoryCsv (batches: SendHistoryBatch[], status?: HistoryFilters['status']): string {
  const header = [
    'source',
    'campaign_name',
    'channel',
    'template_id',
    'scheduled_at',
    'completed_at',
    'contact_name',
    'recipient',
    'status',
    'sent_at',
    'attempts',
    'error_message'
  ]

  const rows = batchesToCsvRows(batches, status)
  const lines = [
    header.join(','),
    ...rows.map((row) =>
      [
        row.source,
        row.campaign_name,
        row.channel,
        row.template_id,
        row.scheduled_at,
        row.completed_at,
        row.contact_name,
        row.recipient,
        row.status,
        row.sent_at,
        row.attempts,
        row.error_message
      ]
        .map(csvCell)
        .join(',')
    )
  ]

  return `${lines.join('\n')}\n`
}

export async function fetchSendHistoryCsv (
  userId: number,
  filters: HistoryFilters = {}
): Promise<string> {
  const result = await fetchSendHistory(userId, {
    ...filters,
    limit: Math.min(Math.max(filters.limit ?? 500, 1), 500),
    offset: 0
  })
  return buildSendHistoryCsv(result.batches, filters.status)
}
