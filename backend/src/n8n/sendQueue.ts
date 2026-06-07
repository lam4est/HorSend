import { pool } from '../db/pool.js'

export type QueueItem = {
  id: number
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
  scheduled_at: string
  status: string
  attempts: number
}

type FetchPendingOptions = {
  limit?: number
  claim?: boolean
  dueBefore?: Date
}

export async function fetchPending (
  options: FetchPendingOptions = {}
): Promise<{ items: QueueItem[] }> {
  const limit = Math.min(Math.max(options.limit ?? 50, 1), 500)
  const dueBefore = options.dueBefore ?? new Date()
  const claim = options.claim === true

  if (!claim) {
    const select = await pool.query<QueueItem>(
      `SELECT
         id, user_id, workflow_user_id, workflow_step_user_id, contact_id,
         channel, recipient, template_id, message_subject, message_body, sender,
         scheduled_at, status, attempts
       FROM workflow_send_queue
       WHERE status = 'pending'
         AND scheduled_at <= $1
       ORDER BY scheduled_at, id
       LIMIT $2`,
      [dueBefore.toISOString(), limit]
    )
    return { items: select.rows }
  }

  const client = await pool.connect()
  try {
    await client.query('BEGIN')

    const select = await client.query<QueueItem>(
      `SELECT
         id, user_id, workflow_user_id, workflow_step_user_id, contact_id,
         channel, recipient, template_id, message_subject, message_body, sender,
         scheduled_at, status, attempts
       FROM workflow_send_queue
       WHERE status = 'pending'
         AND scheduled_at <= $1
       ORDER BY scheduled_at, id
       LIMIT $2
       FOR UPDATE SKIP LOCKED`,
      [dueBefore.toISOString(), limit]
    )

    if (select.rowCount && select.rowCount > 0) {
      const ids = select.rows.map((r) => r.id)
      await client.query(
        `UPDATE workflow_send_queue
         SET status = 'processing',
             attempts = attempts + 1,
             updated_at = NOW()
         WHERE id = ANY($1::bigint[])`,
        [ids]
      )
    }

    await client.query('COMMIT')
    return { items: select.rows }
  } catch (err) {
    await client.query('ROLLBACK')
    throw err
  } finally {
    client.release()
  }
}

export async function markSent (
  id: number,
  providerResponse?: unknown
): Promise<{ ok: true } | { error: 'not_found' }> {
  const result = await pool.query(
    `UPDATE workflow_send_queue
     SET status = 'sent',
         sent_at = NOW(),
         error_message = NULL,
         updated_at = NOW()
     WHERE id = $1 AND status IN ('pending', 'processing')
     RETURNING id`,
    [id]
  )
  if ((result.rowCount ?? 0) === 0) return { error: 'not_found' }
  if (providerResponse !== undefined) {
    console.log(`[send-queue] #${id} sent`, providerResponse)
  }
  return { ok: true }
}

export async function markFailed (
  id: number,
  error: string
): Promise<{ ok: true } | { error: 'not_found' }> {
  const result = await pool.query(
    `UPDATE workflow_send_queue
     SET status = 'failed',
         error_message = $2,
         updated_at = NOW()
     WHERE id = $1 AND status IN ('pending', 'processing')
     RETURNING id`,
    [id, error.slice(0, 2000)]
  )
  if ((result.rowCount ?? 0) === 0) return { error: 'not_found' }
  return { ok: true }
}

export async function requeueStale (
  olderThanMinutes = 10
): Promise<{ requeued: number }> {
  const result = await pool.query(
    `UPDATE workflow_send_queue
     SET status = 'pending',
         updated_at = NOW()
     WHERE status = 'processing'
       AND updated_at < NOW() - ($1::text || ' minutes')::interval
     RETURNING id`,
    [String(Math.max(1, olderThanMinutes))]
  )
  return { requeued: result.rowCount ?? 0 }
}
