import { z } from 'zod'

export const VALID_CHANNELS = ['email', 'sms', 'rcs', 'voice', 'voice_sms'] as const
export const VALID_CATEGORIES = [
  'activation',
  'qualification',
  'nurturing',
  'loyalty',
  'abandoned_basket',
  'reactivation',
  'onboarding',
  'retention'
] as const
export const VALID_DELAY_UNITS = ['minute', 'hour', 'day'] as const

export const templateDraftSchema = z.object({
  name: z.string().min(1).max(200),
  subject: z.string().max(500).default(''),
  body: z.string().max(10000).default('')
})

export const stepDraftSchema = z.object({
  channel: z.enum(VALID_CHANNELS),
  delay_value: z.number().int().min(0).max(365),
  delay_unit: z.enum(VALID_DELAY_UNITS),
  rationale: z.string().max(500).optional(),
  template: templateDraftSchema,
  email_subject: z.string().max(500).optional(),
  email_from_name: z.string().max(200).optional(),
  email_from_address: z.string().max(200).optional(),
  sms_sender_id: z.string().max(20).optional()
})

export const workflowDraftSchema = z.object({
  name: z.string().min(1).max(200),
  category: z.enum(VALID_CATEGORIES),
  description: z.string().max(2000).default(''),
  contact_list_id: z.number().int().positive().nullable().optional(),
  steps: z.array(stepDraftSchema).min(1).max(8)
})

export const aiGenerateRequestSchema = z.object({
  prompt: z.string().min(3).max(4000),
  locale: z.enum(['en', 'vi']).optional()
})

export const aiConfirmRequestSchema = z.object({
  prompt: z.string().min(1).max(4000).optional(),
  draft: workflowDraftSchema,
  draft_id: z.string().uuid().optional()
})

export type TemplateDraft = z.infer<typeof templateDraftSchema>
export type StepDraft = z.infer<typeof stepDraftSchema>
export type WorkflowDraft = z.infer<typeof workflowDraftSchema>

export function delayToMinutes (value: number, unit: string): number {
  if (unit === 'day') return value * 1440
  if (unit === 'hour') return value * 60
  return value
}

export function sanitizeTemplateBody (channel: string, body: string): string {
  let cleaned = body
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/\son\w+="[^"]*"/gi, '')
    .replace(/\son\w+='[^']*'/gi, '')
  if (channel === 'sms' || channel === 'rcs') {
    const plain = cleaned.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
    return plain.length > 160 ? plain.slice(0, 157) + '...' : plain
  }
  return cleaned
}

export function validateWorkflowDraft (draft: WorkflowDraft): string[] {
  const warnings: string[] = []
  for (let i = 0; i < draft.steps.length; i++) {
    const step = draft.steps[i]!
    const body = step.template.body
    if ((step.channel === 'sms' || step.channel === 'rcs') && body.replace(/<[^>]+>/g, '').length > 160) {
      warnings.push(`Step ${i + 1}: SMS/RCS body truncated to 160 characters.`)
    }
    if (step.channel === 'email' && !step.template.subject && !step.email_subject) {
      warnings.push(`Step ${i + 1}: Email subject is empty.`)
    }
  }
  return warnings
}
