import type { WorkflowDraft } from './workflowSchema.js'

const AI_SERVICE_URL = (process.env.AI_SERVICE_URL ?? 'http://127.0.0.1:8002').replace(/\/$/, '')
const AI_SERVICE_KEY = process.env.AI_SERVICE_KEY?.trim() ?? ''
const TIMEOUT_MS = Number(process.env.AI_SERVICE_TIMEOUT_MS ?? 90000)

export type AiGenerateResponse = {
  draft_id: string
  workflow: WorkflowDraft
  warnings: string[]
  source: 'lora' | 'rule_based'
}

export type AiHealthResponse = {
  ok: boolean
  service?: string
  database?: string
  inference_available: boolean
  mock_fallback: boolean
  mode: 'lora' | 'rule_based' | 'unavailable'
  model_loaded: boolean
  warmup_status: 'idle' | 'loading' | 'ready' | 'skipped' | 'failed'
  adapters_available: boolean
}

type ContactListContext = {
  id: number
  name: string
  contacts_count: number
}

async function serviceFetch<T> (
  path: string,
  options: RequestInit & { userId?: number } = {}
): Promise<{ ok: true; data: T } | { ok: false; status: number; body: unknown }> {
  const { userId, ...init } = options
  const headers: Record<string, string> = {
    Accept: 'application/json',
    ...(init.headers as Record<string, string> | undefined)
  }
  if (AI_SERVICE_KEY) headers['X-Service-Key'] = AI_SERVICE_KEY
  if (userId != null) headers['X-User-Id'] = String(userId)

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS)
  try {
    const res = await fetch(`${AI_SERVICE_URL}${path}`, {
      ...init,
      headers,
      signal: controller.signal
    })
    const body = await res.json().catch(() => ({}))
    if (!res.ok) return { ok: false, status: res.status, body }
    return { ok: true, data: body as T }
  } catch (err) {
    return { ok: false, status: 503, body: { error: String(err) } }
  } finally {
    clearTimeout(timer)
  }
}

export async function aiServiceGenerate (
  userId: number,
  payload: {
    prompt: string
    locale?: 'en' | 'vi'
    contact_list_id?: number | null
    context: {
      channels: string[]
      categories: string[]
      contact_lists: ContactListContext[]
    }
  }
): Promise<{ ok: true; data: AiGenerateResponse } | { ok: false; status: number; body: unknown }> {
  return serviceFetch<AiGenerateResponse>('/generate', {
    method: 'POST',
    userId,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  })
}

export async function aiServiceFeedback (
  userId: number,
  draftId: string,
  userEdits: unknown
): Promise<{ ok: true } | { ok: false; status: number; body: unknown }> {
  const result = await serviceFetch<{ ok: boolean }>('/feedback', {
    method: 'POST',
    userId,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ draft_id: draftId, user_edits: userEdits })
  })
  if (!result.ok) return result
  return { ok: true }
}

export async function aiServiceMarkAccepted (
  userId: number,
  payload: {
    draft_id?: string
    workflow_user_id: number
    user_edits: WorkflowDraft
    prompt?: string
  }
): Promise<{ ok: true } | { ok: false; status: number; body: unknown }> {
  const result = await serviceFetch<{ ok: boolean }>('/internal/mark-accepted', {
    method: 'POST',
    userId,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  })
  if (!result.ok) return result
  return { ok: true }
}

export async function aiServiceHealth (): Promise<AiHealthResponse> {
  try {
    const res = await fetch(`${AI_SERVICE_URL}/health`, { signal: AbortSignal.timeout(5000) })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    return (await res.json()) as AiHealthResponse
  } catch {
    return {
      ok: false,
      inference_available: false,
      mock_fallback: true,
      mode: 'unavailable',
      model_loaded: false,
      warmup_status: 'failed',
      adapters_available: false
    }
  }
}
