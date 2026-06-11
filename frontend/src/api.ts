/** In dev, use Vite proxy (/api → port 3000). In production, use VITE_API_URL or same origin. */
const API_BASE = import.meta.env.DEV
  ? ''
  : ((import.meta.env.VITE_API_URL as string | undefined)?.replace(/\/$/, '') ?? '')

const headers = {
  'Content-Type': 'application/json',
  Accept: 'application/json',
  'X-User-Id': '1'
}

function apiUrl (path: string): string {
  return `${API_BASE}${path}`
}

async function request<T> (path: string, init?: RequestInit): Promise<T> {
  let res: Response
  try {
    res = await fetch(apiUrl(path), { ...init, headers: { ...headers, ...init?.headers } })
  } catch {
    throw new Error(
      'Cannot reach the API server. Start the backend: pnpm --filter backend dev (port 3000).'
    )
  }
  if (!res.ok) {
    let detail = res.statusText
    try {
      const body = (await res.json()) as { error?: string }
      if (body.error) detail = body.error
    } catch {
      /* non-JSON body */
    }
    throw new Error(detail || `Request failed (${res.status})`)
  }
  return res.json() as Promise<T>
}

export type WorkflowItem = {
  id: number
  workflow_id: number
  name: string
  category: string
  description: string
  is_active: boolean
  source: string
  steps: Array<{ workflow_step_id: number; channel: string; step_order: number }>
}

export type CatalogItem = {
  id: number
  name: string
  category: string
  description: string | null
  workflow_user_id?: number | null
}

export type MessageTemplate = { id: string; name: string; title: string; body?: string }
export type ContactList = { id: number; name: string; contacts_count: number }

export type AiTemplateDraft = {
  name: string
  subject: string
  body: string
}

export type AiStepDraft = {
  channel: string
  delay_value: number
  delay_unit: 'minute' | 'hour' | 'day'
  rationale?: string
  template: AiTemplateDraft
  email_subject?: string
  email_from_name?: string
  email_from_address?: string
  sms_sender_id?: string
}

export type AiWorkflowDraft = {
  name: string
  category: string
  description: string
  contact_list_id?: number | null
  steps: AiStepDraft[]
}

export type AiInferenceSource = 'lora' | 'rule_based'

export type AiGenerateResponse = {
  draft_id: string
  workflow: AiWorkflowDraft
  warnings: string[]
  source: AiInferenceSource
}

export type AiHealthResponse = {
  ok: boolean
  inference_available: boolean
  mock_fallback: boolean
  mode: AiInferenceSource | 'unavailable'
  model_loaded: boolean
  warmup_status: 'idle' | 'loading' | 'ready' | 'skipped' | 'failed'
  adapters_available: boolean
}

export type WorkflowDetail = {
  workflow_user_id: number
  original_workflow_id: number
  name: string
  description: string
  segment_id: number | null
  steps: Array<{
    id: number
    workflow_step_id: number
    channel: string
    template_id: string | null
    delay_in_minutes: number
    delay_value: number
    delay_unit: string
    is_active: boolean
    is_confirmed_by_user: boolean
    settings: Record<string, unknown> | null
  }>
}

export const api = {
  health: () => request<{ ok: boolean; database: string }>('/api/health'),
  workflows: () => request<WorkflowItem[]>('/api/workflows'),
  catalog: () => request<{ items: CatalogItem[] }>('/api/workflow-catalog'),
  workflowDetail: (workflowId: number, workflowUserId: number) =>
    request<WorkflowDetail>(
      `/api/workflows/${workflowId}/detail?workflow_user_id=${workflowUserId}`
    ),
  enroll: (workflowId: number) =>
    request<WorkflowItem>('/api/workflow-users', {
      method: 'POST',
      body: JSON.stringify({ workflow_id: workflowId })
    }),
  remove: (id: number) => request<{ ok: boolean }>(`/api/workflow-users/${id}`, { method: 'DELETE' }),
  update: (workflowId: number, body: Record<string, unknown>) =>
    request<WorkflowItem>(`/api/workflows/${workflowId}`, {
      method: 'PUT',
      body: JSON.stringify(body)
    }),
  aiGenerateWorkflow: (body: { prompt: string; locale?: 'en' | 'vi' }) =>
    request<AiGenerateResponse>('/api/workflows/ai/generate', {
      method: 'POST',
      body: JSON.stringify(body)
    }),
  aiConfirmWorkflow: (body: {
    prompt?: string
    draft_id?: string
    draft: AiWorkflowDraft
  }) =>
    request<{ workflow: WorkflowItem; warnings: string[] }>('/api/workflows/ai/confirm', {
      method: 'POST',
      body: JSON.stringify(body)
    }),
  aiFeedback: (body: { draft_id: string; user_edits: AiWorkflowDraft }) =>
    request<{ ok: boolean }>('/api/workflows/ai/feedback', {
      method: 'POST',
      body: JSON.stringify(body)
    }),
  aiHealth: () => request<AiHealthResponse>('/api/workflows/ai/health'),
  templates: (channel: string) =>
    request<{ items: MessageTemplate[] }>(`/api/templates?channel=${encodeURIComponent(channel)}`),
  contactLists: () =>
    request<{ items: ContactList[]; total_contacts: number }>('/api/contact-lists'),
  contacts: (contactListId?: number) => {
    const q = contactListId != null ? `?contact_list_id=${contactListId}` : ''
    return request<{ items: Array<Record<string, unknown>> }>(`/api/contacts${q}`)
  },
  scheduler: () =>
    request<{
      items: Array<{
        month_key: string
        events: Array<{
          id: number
          title: string
          subscribed: boolean
          channel?: string
          template_id?: string | null
          contact_list_id?: number | null
          hour?: number
          minute?: number
          days_before?: number
          contacts_count?: number
        }>
      }>
    }>('/api/campaign/scheduler-subscriptions'),
  saveSchedulerSubscription: (body: Record<string, unknown>) =>
    request<{ ok: boolean }>('/api/campaign/scheduler-subscriptions', {
      method: 'PUT',
      body: JSON.stringify(body)
    }),
  sendHistory: (params?: SendHistoryQuery) => {
    const suffix = buildSendHistoryQuery(params)
    return request<SendHistoryResponse>(`/api/campaign/send-history${suffix}`)
  },
  sendHistoryExport: async (params?: SendHistoryQuery): Promise<Blob> => {
    const suffix = buildSendHistoryQuery(params)
    let res: Response
    try {
      res = await fetch(apiUrl(`/api/campaign/send-history/export${suffix}`), {
        headers: { ...headers, Accept: 'text/csv' }
      })
    } catch {
      throw new Error(
        'Cannot reach the API server. Start the backend: pnpm --filter backend dev (port 3000).'
      )
    }
    if (!res.ok) {
      let detail = res.statusText
      try {
        const body = (await res.json()) as { error?: string }
        if (body.error) detail = body.error
      } catch {
        /* non-JSON body */
      }
      throw new Error(detail || `Export failed (${res.status})`)
    }
    return res.blob()
  }
}

export type SendHistoryQuery = {
  source?: 'all' | 'workflow' | 'scheduler'
  status?: 'all' | 'sent' | 'failed' | 'pending'
  date_from?: string
  date_to?: string
  limit?: number
  offset?: number
}

function buildSendHistoryQuery (params?: SendHistoryQuery): string {
  const q = new URLSearchParams()
  if (params?.source) q.set('source', params.source)
  if (params?.status) q.set('status', params.status)
  if (params?.date_from) q.set('date_from', params.date_from)
  if (params?.date_to) q.set('date_to', params.date_to)
  if (params?.limit != null) q.set('limit', String(params.limit))
  if (params?.offset != null) q.set('offset', String(params.offset))
  const query = q.toString()
  return query ? `?${query}` : ''
}

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

export type SendHistoryResponse = {
  summary: {
    total_messages: number
    sent: number
    failed: number
    pending: number
    processing: number
    batches: number
  }
  batches: SendHistoryBatch[]
}
