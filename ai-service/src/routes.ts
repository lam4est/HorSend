import { randomUUID } from 'node:crypto'
import type { Request, Response } from 'express'
import { userIdFromRequest } from './auth.js'
import * as aiLog from './db/aiLog.js'
import { generateWorkflowDraft, getInferenceHealth } from './inferenceClient.js'
import {
  sanitizeTemplateBody,
  validateWorkflowDraft,
  VALID_CATEGORIES,
  VALID_CHANNELS,
  type WorkflowDraft
} from './workflowSchema.js'
import { z } from 'zod'

const generateRequestSchema = z.object({
  prompt: z.string().min(3).max(4000),
  locale: z.enum(['en', 'vi']).optional(),
  contact_list_id: z.number().int().positive().nullable().optional(),
  context: z.object({
    channels: z.array(z.string()).optional(),
    categories: z.array(z.string()).optional(),
    contact_lists: z.array(z.object({
      id: z.number(),
      name: z.string(),
      contacts_count: z.number()
    })).optional()
  }).optional()
})

const feedbackRequestSchema = z.object({
  draft_id: z.string().uuid(),
  user_edits: z.unknown()
})

const markAcceptedSchema = z.object({
  draft_id: z.string().uuid().optional(),
  prompt: z.string().min(1).max(4000).optional(),
  workflow_user_id: z.number().int().positive(),
  user_edits: z.unknown()
})

function requireUserId (req: Request, res: Response): number | null {
  const uid = userIdFromRequest(req)
  if (!uid) {
    res.status(400).json({ error: 'X-User-Id header is required' })
    return null
  }
  return uid
}

export async function handleHealth (_req: Request, res: Response): Promise<void> {
  const database = await import('./db/pool.js').then((m) => m.checkDatabase())
  const inference = await getInferenceHealth()
  res.json({
    ok: true,
    service: 'ai-service',
    database: database ? 'connected' : 'disconnected',
    inference_available: inference.available,
    mock_fallback: inference.mock_fallback,
    mode: inference.mode,
    model_loaded: inference.model_loaded,
    warmup_status: inference.warmup_status,
    adapters_available: inference.adapters_available
  })
}

export async function handleGenerate (req: Request, res: Response): Promise<void> {
  const userId = requireUserId(req, res)
  if (userId == null) return

  const parsed = generateRequestSchema.safeParse(req.body ?? {})
  if (!parsed.success) {
    res.status(400).json({ error: 'Invalid request', details: parsed.error.flatten() })
    return
  }

  const { prompt, locale = 'en', contact_list_id: contactListId = null, context = {} } = parsed.data
  const contactLists = context.contact_lists ?? []

  if (contactListId != null) {
    const found = contactLists.some((list) => list.id === contactListId)
    if (!found) {
      res.status(400).json({ error: 'Contact list not found' })
      return
    }
  }

  const result = await generateWorkflowDraft(
    prompt,
    {
      channels: context.channels?.length ? context.channels : [...VALID_CHANNELS],
      categories: context.categories?.length ? context.categories : [...VALID_CATEGORIES],
      contact_lists: contactLists
    },
    locale
  )

  const draft: WorkflowDraft = {
    ...result.draft,
    contact_list_id: contactListId,
    steps: result.draft.steps.map((step) => ({
      ...step,
      template: {
        ...step.template,
        body: sanitizeTemplateBody(step.channel, step.template.body)
      }
    }))
  }

  const validationWarnings = validateWorkflowDraft(draft)
  const warnings = [...result.warnings, ...validationWarnings]
  const draftId = randomUUID()

  await aiLog.logAiGeneration({
    userId,
    prompt,
    draft,
    inferenceSource: result.source,
    draftId
  })

  res.json({
    draft_id: draftId,
    workflow: draft,
    warnings,
    source: result.source
  })
}

export async function handleFeedback (req: Request, res: Response): Promise<void> {
  const userId = requireUserId(req, res)
  if (userId == null) return

  const parsed = feedbackRequestSchema.safeParse(req.body ?? {})
  if (!parsed.success) {
    res.status(400).json({ error: 'draft_id and user_edits are required' })
    return
  }

  const ok = await aiLog.updateAiGenerationEdits(
    parsed.data.draft_id,
    userId,
    parsed.data.user_edits
  )
  if (!ok) {
    res.status(404).json({ error: 'Generation log not found' })
    return
  }
  res.json({ ok: true })
}

export async function handleMarkAccepted (req: Request, res: Response): Promise<void> {
  const userId = requireUserId(req, res)
  if (userId == null) return

  const parsed = markAcceptedSchema.safeParse(req.body ?? {})
  if (!parsed.success) {
    res.status(400).json({ error: 'Invalid request', details: parsed.error.flatten() })
    return
  }

  const { draft_id: draftId, workflow_user_id: workflowUserId, user_edits: userEdits, prompt } = parsed.data
  const edits = userEdits as WorkflowDraft

  if (draftId) {
    const updated = await aiLog.markAiGenerationAccepted(
      draftId,
      userId,
      workflowUserId,
      edits
    )
    if (!updated && prompt) {
      await aiLog.logAiGeneration({
        userId,
        prompt,
        draft: edits,
        inferenceSource: 'confirm',
        accepted: true,
        workflowUserId,
        draftId
      })
    }
  } else if (prompt) {
    await aiLog.logAiGeneration({
      userId,
      prompt,
      draft: edits,
      inferenceSource: 'confirm',
      accepted: true,
      workflowUserId
    })
  } else {
    res.status(400).json({ error: 'draft_id or prompt is required' })
    return
  }

  res.json({ ok: true })
}
