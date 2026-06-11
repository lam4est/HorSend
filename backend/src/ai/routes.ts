import { randomUUID } from 'node:crypto'
import type { Request, Response } from 'express'
import { db } from '../store.js'
import { generateWorkflowDraft } from './inferenceClient.js'
import {
  aiConfirmRequestSchema,
  aiGenerateRequestSchema,
  sanitizeTemplateBody,
  validateWorkflowDraft,
  VALID_CATEGORIES,
  VALID_CHANNELS
} from './workflowSchema.js'

export async function handleAiGenerate (req: Request, res: Response, userId: number): Promise<void> {
  const parsed = aiGenerateRequestSchema.safeParse(req.body ?? {})
  if (!parsed.success) {
    res.status(400).json({ error: 'Invalid request', details: parsed.error.flatten() })
    return
  }

  const { prompt, locale = 'en', contact_list_id: contactListId = null } = parsed.data
  const contactLists = await db.listContactLists(userId)

  if (contactListId != null) {
    const found = contactLists.items.some((list) => list.id === contactListId)
    if (!found) {
      res.status(400).json({ error: 'Contact list not found' })
      return
    }
  }

  const result = await generateWorkflowDraft(
    prompt,
    {
      channels: [...VALID_CHANNELS],
      categories: [...VALID_CATEGORIES],
      contact_lists: contactLists.items
    },
    locale
  )

  const draft = {
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

  await db.logAiGeneration({
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

export async function handleAiConfirm (req: Request, res: Response, userId: number): Promise<void> {
  const parsed = aiConfirmRequestSchema.safeParse(req.body ?? {})
  if (!parsed.success) {
    res.status(400).json({ error: 'Invalid draft', details: parsed.error.flatten() })
    return
  }

  const { draft, prompt, draft_id: draftId } = parsed.data
  const sanitized = {
    ...draft,
    steps: draft.steps.map((step) => ({
      ...step,
      template: {
        ...step.template,
        body: sanitizeTemplateBody(step.channel, step.template.body)
      }
    }))
  }

  const warnings = validateWorkflowDraft(sanitized)
  const result = await db.createWorkflowFromDraft(userId, sanitized)
  if (result.error) {
    res.status(400).json({ error: result.error })
    return
  }

  if (draftId && prompt) {
    await db.markAiGenerationAccepted(draftId, userId, result.workflowUserId!, sanitized)
  } else if (prompt) {
    await db.logAiGeneration({
      userId,
      prompt,
      draft: sanitized,
      inferenceSource: 'confirm',
      accepted: true,
      workflowUserId: result.workflowUserId
    })
  }

  res.status(201).json({
    workflow: result.data,
    warnings
  })
}

export async function handleAiFeedback (req: Request, res: Response, userId: number): Promise<void> {
  const draftId = typeof req.body?.draft_id === 'string' ? req.body.draft_id : null
  const userEdits = req.body?.user_edits
  if (!draftId || !userEdits) {
    res.status(400).json({ error: 'draft_id and user_edits are required' })
    return
  }
  const ok = await db.updateAiGenerationEdits(draftId, userId, userEdits)
  if (!ok) {
    res.status(404).json({ error: 'Generation log not found' })
    return
  }
  res.json({ ok: true })
}
