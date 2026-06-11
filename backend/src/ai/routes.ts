import type { Request, Response } from 'express'
import { db } from '../store.js'
import {
  aiServiceFeedback,
  aiServiceGenerate,
  aiServiceMarkAccepted
} from './aiServiceClient.js'
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

  const result = await aiServiceGenerate(userId, {
    prompt,
    locale,
    contact_list_id: contactListId,
    context: {
      channels: [...VALID_CHANNELS],
      categories: [...VALID_CATEGORIES],
      contact_lists: contactLists.items
    }
  })

  if (!result.ok) {
    res.status(result.status).json(result.body)
    return
  }

  res.json(result.data)
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
    const markResult = await aiServiceMarkAccepted(userId, {
      draft_id: draftId,
      workflow_user_id: result.workflowUserId!,
      user_edits: sanitized
    })
    if (!markResult.ok) {
      console.warn('[ai confirm] mark-accepted failed:', markResult.body)
    }
  } else if (prompt) {
    const markResult = await aiServiceMarkAccepted(userId, {
      workflow_user_id: result.workflowUserId!,
      user_edits: sanitized,
      prompt
    })
    if (!markResult.ok) {
      console.warn('[ai confirm] mark-accepted failed:', markResult.body)
    }
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

  const result = await aiServiceFeedback(userId, draftId, userEdits)
  if (!result.ok) {
    res.status(result.status).json(result.body)
    return
  }
  res.json({ ok: true })
}
