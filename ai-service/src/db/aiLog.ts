import { randomUUID } from 'node:crypto'
import { pool } from './pool.js'
import type { WorkflowDraft } from '../workflowSchema.js'

export async function logAiGeneration (opts: {
  userId: number
  prompt: string
  draft: WorkflowDraft
  inferenceSource: string
  draftId?: string
  accepted?: boolean
  workflowUserId?: number
}): Promise<string> {
  const id = opts.draftId ?? randomUUID()
  await pool.query(
    `INSERT INTO ai_generation_log (
       user_id, prompt, draft_json, accepted, workflow_user_id, inference_source, created_at
     ) VALUES ($1, $2, $3::jsonb, $4, $5, $6, NOW())`,
    [
      opts.userId,
      opts.prompt,
      JSON.stringify({ draft_id: id, workflow: opts.draft }),
      opts.accepted ?? false,
      opts.workflowUserId ?? null,
      opts.inferenceSource
    ]
  )
  return id
}

export async function markAiGenerationAccepted (
  draftId: string,
  userId: number,
  workflowUserId: number,
  userEdits: WorkflowDraft
): Promise<boolean> {
  const result = await pool.query(
    `UPDATE ai_generation_log
     SET accepted = TRUE,
         workflow_user_id = $3,
         user_edits_json = $4::jsonb
     WHERE user_id = $2
       AND draft_json->>'draft_id' = $1`,
    [draftId, userId, workflowUserId, JSON.stringify(userEdits)]
  )
  return (result.rowCount ?? 0) > 0
}

export async function updateAiGenerationEdits (
  draftId: string,
  userId: number,
  userEdits: unknown
): Promise<boolean> {
  const result = await pool.query(
    `UPDATE ai_generation_log
     SET user_edits_json = $3::jsonb
     WHERE user_id = $2
       AND draft_json->>'draft_id' = $1`,
    [draftId, userId, JSON.stringify(userEdits)]
  )
  return (result.rowCount ?? 0) > 0
}
