export type SendPayload = {
  queue_id: number
  user_id: number
  channel: string
  to: string
  template_id?: string | null
  sender?: string
  message?: string
  subject?: string
  /** Distinguishes Campaign Workflow (n8n) vs Auto Scheduler (backend cron). */
  source?: 'workflow' | 'scheduler'
}

export type SendResult = {
  ok: true
  message_id: string
  channel: string
  to: string
  mode: 'mock' | 'live'
}

/** Dev/stub sender — replace with Octopush / email provider integration. */
export async function sendMessage (payload: SendPayload): Promise<SendResult> {
  const messageId = `mock-${payload.queue_id}-${Date.now()}`
  const tag = payload.source === 'scheduler' ? 'scheduler send' : 'workflow send'
  console.log(`[${tag}]`, {
    message_id: messageId,
    user_id: payload.user_id,
    channel: payload.channel,
    to: payload.to,
    template_id: payload.template_id ?? null,
    sender: payload.sender ?? '',
    subject: payload.subject ?? '',
    preview: (payload.message ?? '').slice(0, 120)
  })
  return {
    ok: true,
    message_id: messageId,
    channel: payload.channel,
    to: payload.to,
    mode: process.env.N8N_SEND_MODE === 'live' ? 'live' : 'mock'
  }
}
