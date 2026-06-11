import type { StepDraft, WorkflowDraft } from './workflowSchema.js'

type StepSpec = Pick<StepDraft, 'channel' | 'delay_value' | 'delay_unit'>

const CATEGORY_DEFAULTS: Record<string, StepSpec[]> = {
  onboarding: [
    { channel: 'email', delay_value: 0, delay_unit: 'minute' },
    { channel: 'sms', delay_value: 1, delay_unit: 'day' }
  ],
  abandoned_basket: [
    { channel: 'email', delay_value: 1, delay_unit: 'hour' },
    { channel: 'sms', delay_value: 1, delay_unit: 'day' }
  ],
  reactivation: [
    { channel: 'email', delay_value: 0, delay_unit: 'minute' },
    { channel: 'sms', delay_value: 7, delay_unit: 'day' }
  ],
  loyalty: [
    { channel: 'email', delay_value: 0, delay_unit: 'minute' },
    { channel: 'email', delay_value: 3, delay_unit: 'day' }
  ],
  retention: [
    { channel: 'email', delay_value: 0, delay_unit: 'minute' },
    { channel: 'sms', delay_value: 2, delay_unit: 'day' }
  ],
  nurturing: [
    { channel: 'email', delay_value: 0, delay_unit: 'minute' },
    { channel: 'email', delay_value: 2, delay_unit: 'day' }
  ],
  activation: [
    { channel: 'email', delay_value: 0, delay_unit: 'minute' },
    { channel: 'sms', delay_value: 1, delay_unit: 'day' }
  ],
  qualification: [
    { channel: 'email', delay_value: 0, delay_unit: 'minute' },
    { channel: 'email', delay_value: 1, delay_unit: 'day' }
  ]
}

const JOURNEY_RE = /journey|campaign|workflow|series|reminder|recovery|win.?back|hành trình|chuỗi|chiến dịch/i

function detectChannel (text: string): StepDraft['channel'] | null {
  const t = text.toLowerCase()
  if (/\b(email|mail|thư)\b/.test(t)) return 'email'
  if (/\b(sms|text message|tin nhắn)\b/.test(t)) return 'sms'
  if (/\brcs\b/.test(t)) return 'rcs'
  if (/\b(voice|call|gọi)\b/.test(t)) return 'voice'
  return null
}

function normalizeUnit (raw: string): StepDraft['delay_unit'] {
  const u = raw.toLowerCase()
  if (u.startsWith('hour') || u === 'giờ') return 'hour'
  if (u.startsWith('minute') || u === 'phút') return 'minute'
  return 'day'
}

function parseStepCount (prompt: string): number | null {
  const m = prompt.toLowerCase().match(/(\d+)[\s-]*(?:step|steps|bước)/)
  if (!m) return null
  return Math.max(2, Math.min(8, Number(m[1])))
}

function parseExplicitSteps (prompt: string): StepSpec[] {
  const parts = prompt.split(/[,;]|\bthen\b|sau đó|tiếp theo|rồi/i)
  const steps: StepSpec[] = []

  for (const part of parts) {
    const channel = detectChannel(part)
    if (!channel) continue

    let delay_value = 0
    let delay_unit: StepDraft['delay_unit'] = 'minute'

    if (/immediately|right away|ngay|lập tức/i.test(part)) {
      delay_value = 0
      delay_unit = 'minute'
    } else {
      const after = part.match(
        /(?:after|sau)\s+(\d+)\s*(hour|hours|day|days|minute|minutes|giờ|ngày|phút)/i
      )
      const inline = part.match(/(\d+)\s*(hour|hours|day|days|minute|minutes|giờ|ngày|phút)/i)
      const match = after ?? inline
      if (match) {
        delay_value = Number(match[1])
        delay_unit = normalizeUnit(match[2]!)
      }
    }

    steps.push({ channel, delay_value, delay_unit })
  }

  return steps
}

function buildTargetSteps (prompt: string, category: WorkflowDraft['category']): StepSpec[] | null {
  const explicit = parseExplicitSteps(prompt)
  if (explicit.length >= 2) return explicit

  const requested = parseStepCount(prompt)
  if (requested) {
    const channels: StepDraft['channel'][] = []
    for (const part of prompt.split(/[,;]|\band\b|và/i)) {
      const ch = detectChannel(part)
      if (ch && !channels.includes(ch)) channels.push(ch)
    }
    const pool = channels.length > 0 ? channels : (['email', 'sms'] as const)
    return Array.from({ length: requested }, (_, i) => ({
      channel: pool[i % pool.length]!,
      delay_value: i === 0 ? 0 : i,
      delay_unit: (i === 0 ? 'minute' : 'day') as StepDraft['delay_unit']
    }))
  }

  if (JOURNEY_RE.test(prompt)) {
    return CATEGORY_DEFAULTS[category] ?? null
  }

  if (explicit.length === 1) {
    const defaults = CATEGORY_DEFAULTS[category]
    const first = explicit[0]!
    let follow = defaults?.[1] ?? { channel: 'sms' as const, delay_value: 1, delay_unit: 'day' as const }
    if (first.channel === follow.channel) {
      follow = first.channel === 'email'
        ? { channel: 'sms', delay_value: 1, delay_unit: 'day' }
        : { channel: 'email', delay_value: 1, delay_unit: 'day' }
    }
    return [first, follow]
  }

  return null
}

function makeTemplate (
  channel: StepDraft['channel'],
  category: WorkflowDraft['category'],
  stepIndex: number,
  locale: string,
  existing?: StepDraft['template']
): StepDraft['template'] {
  if (existing?.body) {
    return {
      name: existing.name || `Step ${stepIndex + 1}`,
      subject: existing.subject ?? '',
      body: existing.body
    }
  }

  const vi = locale === 'vi'
  if (channel === 'email') {
    const subjects: Record<string, string[]> = {
      onboarding: vi ? ['Chào mừng!', 'Bắt đầu ngay'] : ['Welcome aboard!', 'Get started with us'],
      abandoned_basket: vi ? ['Giỏ hàng đang chờ', 'Hoàn tất đơn'] : ['You left something behind', 'Complete your order'],
      reactivation: vi ? ['Chúng tôi nhớ bạn!', 'Quay lại nhận ưu đãi'] : ['We miss you!', 'Come back for an offer']
    }
    const pool = subjects[category] ?? subjects.onboarding!
    return {
      name: vi ? `Email bước ${stepIndex + 1}` : `Email step ${stepIndex + 1}`,
      subject: pool[stepIndex % pool.length]!,
      body: vi ? '<p>Cảm ơn bạn đã đồng hành.</p>' : '<p>Thanks for being with us.</p>'
    }
  }

  return {
    name: vi ? `SMS bước ${stepIndex + 1}` : `SMS step ${stepIndex + 1}`,
    subject: '',
    body: vi ? 'Cập nhật dành cho bạn.' : 'Your update is ready.'
  }
}

export function expandWorkflowSteps (
  workflow: WorkflowDraft,
  prompt: string,
  locale = 'en'
): WorkflowDraft {
  const steps = workflow.steps ?? []
  let target = buildTargetSteps(prompt, workflow.category)

  if (!target) {
    if (steps.length >= 2) return workflow
    target = CATEGORY_DEFAULTS[workflow.category] ?? null
    if (!target || steps.length >= target.length) return workflow
  }

  if (steps.length >= target.length) return workflow

  const expanded: StepDraft[] = target.map((spec, i) => {
    const existing = steps[i]
    if (existing) {
      const template = makeTemplate(
        spec.channel,
        workflow.category,
        i,
        locale,
        existing.template
      )
      return {
        ...existing,
        channel: spec.channel,
        delay_value: spec.delay_value,
        delay_unit: spec.delay_unit,
        template: existing.template?.body ? existing.template : template,
        ...(spec.channel === 'email'
          ? { email_subject: existing.email_subject ?? template.subject }
          : {})
      }
    }

    const template = makeTemplate(spec.channel, workflow.category, i, locale)
    const step: StepDraft = {
      channel: spec.channel,
      delay_value: spec.delay_value,
      delay_unit: spec.delay_unit,
      template
    }
    if (spec.channel === 'email') {
      step.email_subject = template.subject
    }
    return step
  })

  return { ...workflow, steps: expanded }
}
