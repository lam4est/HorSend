import type { WorkflowDraft } from './workflowSchema.js'
import { workflowDraftSchema } from './workflowSchema.js'
import { generateMockWorkflow } from './mockGenerator.js'
import { expandWorkflowSteps } from './workflowExpand.js'

const INFERENCE_URL = (process.env.ML_INFERENCE_URL ?? 'http://127.0.0.1:8001').replace(/\/$/, '')
const TIMEOUT_MS = Number(process.env.ML_INFERENCE_TIMEOUT_MS ?? 60000)
const USE_MOCK = process.env.ML_USE_MOCK === 'true'

export type InferenceContext = {
  channels: string[]
  categories: string[]
  contact_lists: Array<{ id: number; name: string; contacts_count: number }>
}

export type GenerateResult = {
  draft: WorkflowDraft
  source: 'mock' | 'inference'
  warnings: string[]
}

async function callInference (prompt: string, context: InferenceContext, locale: string): Promise<WorkflowDraft | null> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS)
  try {
    const res = await fetch(`${INFERENCE_URL}/generate/workflow`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ prompt, context, locale }),
      signal: controller.signal
    })
    if (!res.ok) return null
    const body = (await res.json()) as { workflow?: unknown }
    if (!body.workflow) return null
    const parsed = workflowDraftSchema.safeParse(body.workflow)
    return parsed.success ? parsed.data : null
  } catch {
    return null
  } finally {
    clearTimeout(timer)
  }
}

export async function generateWorkflowDraft (
  prompt: string,
  context: InferenceContext,
  locale = 'en'
): Promise<GenerateResult> {
  const warnings: string[] = []

  if (!USE_MOCK) {
    const inferred = await callInference(prompt, context, locale)
    if (inferred) {
      return {
        draft: expandWorkflowSteps(inferred, prompt, locale),
        source: 'inference',
        warnings
      }
    }
    warnings.push('Inference service unavailable — using rule-based generator.')
  }

  return {
    draft: expandWorkflowSteps(generateMockWorkflow(prompt, locale), prompt, locale),
    source: 'mock',
    warnings
  }
}

export async function checkInferenceHealth (): Promise<boolean> {
  if (USE_MOCK) return false
  try {
    const res = await fetch(`${INFERENCE_URL}/health`, { signal: AbortSignal.timeout(3000) })
    return res.ok
  } catch {
    return false
  }
}
