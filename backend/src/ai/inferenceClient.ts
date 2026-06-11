import type { WorkflowDraft } from './workflowSchema.js'
import { workflowDraftSchema } from './workflowSchema.js'
import { generateMockWorkflow } from './mockGenerator.js'
import { expandWorkflowSteps } from './workflowExpand.js'

const INFERENCE_URL = (process.env.ML_INFERENCE_URL ?? 'http://127.0.0.1:8001').replace(/\/$/, '')
const TIMEOUT_MS = Number(process.env.ML_INFERENCE_TIMEOUT_MS ?? 60000)
const USE_MOCK = process.env.ML_USE_MOCK === 'true'

export type InferenceSource = 'lora' | 'rule_based'

export type InferenceContext = {
  channels: string[]
  categories: string[]
  contact_lists: Array<{ id: number; name: string; contacts_count: number }>
}

export type GenerateResult = {
  draft: WorkflowDraft
  source: InferenceSource
  warnings: string[]
}

export type InferenceHealth = {
  available: boolean
  mock_fallback: boolean
  mode: InferenceSource | 'unavailable'
  model_loaded: boolean
  warmup_status: 'idle' | 'loading' | 'ready' | 'skipped' | 'failed'
  adapters_available: boolean
}

type MlHealthBody = {
  ok?: boolean
  mode?: string
  model_loaded?: boolean
  warmup_status?: string
  adapters_available?: boolean
}

type MlGenerateBody = {
  workflow?: unknown
  source?: string
}

async function callInference (
  prompt: string,
  context: InferenceContext,
  locale: string
): Promise<{ draft: WorkflowDraft; source: InferenceSource } | null> {
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
    const body = (await res.json()) as MlGenerateBody
    if (!body.workflow) return null
    const parsed = workflowDraftSchema.safeParse(body.workflow)
    if (!parsed.success) return null
    const source: InferenceSource = body.source === 'lora' ? 'lora' : 'rule_based'
    return { draft: parsed.data, source }
  } catch {
    return null
  } finally {
    clearTimeout(timer)
  }
}

function ruleBasedFallback (prompt: string, locale: string, warnings: string[]): GenerateResult {
  warnings.push('Inference service unavailable — using rule-based generator.')
  return {
    draft: expandWorkflowSteps(generateMockWorkflow(prompt, locale), prompt, locale),
    source: 'rule_based',
    warnings
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
        draft: expandWorkflowSteps(inferred.draft, prompt, locale),
        source: inferred.source,
        warnings
      }
    }
    return ruleBasedFallback(prompt, locale, warnings)
  }

  return {
    draft: expandWorkflowSteps(generateMockWorkflow(prompt, locale), prompt, locale),
    source: 'rule_based',
    warnings
  }
}

function parseWarmupStatus (value: unknown): InferenceHealth['warmup_status'] {
  if (
    value === 'idle' ||
    value === 'loading' ||
    value === 'ready' ||
    value === 'skipped' ||
    value === 'failed'
  ) {
    return value
  }
  return 'idle'
}

export async function getInferenceHealth (): Promise<InferenceHealth> {
  if (USE_MOCK) {
    return {
      available: false,
      mock_fallback: true,
      mode: 'unavailable',
      model_loaded: false,
      warmup_status: 'skipped',
      adapters_available: false
    }
  }

  try {
    const res = await fetch(`${INFERENCE_URL}/health`, { signal: AbortSignal.timeout(3000) })
    if (!res.ok) {
      return {
        available: false,
        mock_fallback: true,
        mode: 'unavailable',
        model_loaded: false,
        warmup_status: 'failed',
        adapters_available: false
      }
    }

    const body = (await res.json()) as MlHealthBody
    const adaptersAvailable = body.adapters_available === true
    const modelLoaded = body.model_loaded === true
    const warmup = parseWarmupStatus(body.warmup_status)
    const mode: InferenceHealth['mode'] =
      body.mode === 'lora' ? 'lora' : body.mode === 'rule_based' ? 'rule_based' : 'unavailable'

    return {
      available: true,
      mock_fallback: false,
      mode,
      model_loaded: modelLoaded,
      warmup_status: warmup,
      adapters_available: adaptersAvailable
    }
  } catch {
    return {
      available: false,
      mock_fallback: true,
      mode: 'unavailable',
      model_loaded: false,
      warmup_status: 'failed',
      adapters_available: false
    }
  }
}

/** @deprecated Use getInferenceHealth() for full status. */
export async function checkInferenceHealth (): Promise<boolean> {
  const health = await getInferenceHealth()
  return health.available
}
