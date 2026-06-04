import { TIME_MULTIPLIERS } from '../constants/campaignWorkflow'

export type WorkflowStepForm = {
  id: number | null
  localId: string
  workflowStepId: number
  channel: string
  templateId: string | null
  templateName?: string
  delayValue: number
  delayUnit: 'minute' | 'hour' | 'day'
  delayInMinutes: number
  delayDays: number
  delayHours: number
  delayMinutes: number
  isEnabled: boolean
  isConfirmedByUser: boolean
  excludedSegmentIds: number[]
  emailSubject: string
  emailFromName: string
  emailFromAddress: string
  emailingService: string | null
  smsSenderId: string
}

export function convertToMinutes (value: number, unit: string): number {
  return (TIME_MULTIPLIERS[unit] ?? 0) * value
}

export function convertMinutesToDelayUnit (minutes: number) {
  if (minutes >= 1440 && minutes % 1440 === 0) return { value: minutes / 1440, unit: 'day' as const }
  if (minutes >= 60 && minutes % 60 === 0) return { value: minutes / 60, unit: 'hour' as const }
  return { value: minutes, unit: 'minute' as const }
}

export function splitMinutes (total: number) {
  const days = Math.floor(total / 1440)
  const hours = Math.floor((total % 1440) / 60)
  const minutes = total % 60
  return { days, hours, minutes }
}

export function getDelayBadge (step: Pick<WorkflowStepForm, 'delayDays' | 'delayHours' | 'delayMinutes' | 'delayInMinutes'>) {
  const d = step.delayDays || 0
  const h = step.delayHours || 0
  const m = step.delayMinutes || 0
  if (d > 0) return `${d}d`
  if (h > 0) return `${h}h`
  if (m > 0) return `${m}m`
  return '0m'
}

export function applyDelayParts (step: WorkflowStepForm) {
  const d = Math.max(0, Number(step.delayDays) || 0)
  const h = Math.max(0, Number(step.delayHours) || 0)
  const m = Math.max(0, Number(step.delayMinutes) || 0)
  step.delayDays = d
  step.delayHours = h
  step.delayMinutes = m
  step.delayInMinutes = d * 1440 + h * 60 + m
  if (d > 0) {
    step.delayUnit = 'day'
    step.delayValue = d
  } else if (h > 0) {
    step.delayUnit = 'hour'
    step.delayValue = h
  } else {
    step.delayUnit = 'minute'
    step.delayValue = m
  }
}
