import type { WorkflowDraft, StepDraft } from './workflowSchema.js'
import { sanitizeTemplateBody } from './workflowSchema.js'

const CATEGORY_KEYWORDS: Array<{ keys: RegExp; category: WorkflowDraft['category'] }> = [
  { keys: /abandon|cart|basket|giỏ/i, category: 'abandoned_basket' },
  { keys: /welcome|onboard|chào mừng|mới/i, category: 'onboarding' },
  { keys: /reactivat|win.?back|quay lại|inactive/i, category: 'reactivation' },
  { keys: /loyal|vip|thân thiết/i, category: 'loyalty' },
  { keys: /retain|giữ chân/i, category: 'retention' },
  { keys: /nurtur|nuôi dưỡng/i, category: 'nurturing' },
  { keys: /activ/i, category: 'activation' },
  { keys: /qualif/i, category: 'qualification' }
]

function detectCategory (prompt: string): WorkflowDraft['category'] {
  for (const entry of CATEGORY_KEYWORDS) {
    if (entry.keys.test(prompt)) return entry.category
  }
  return 'onboarding'
}

function detectChannels (prompt: string): Array<StepDraft['channel']> {
  const channels: Array<StepDraft['channel']> = []
  if (/email|mail|thư/i.test(prompt)) channels.push('email')
  if (/sms|text message|tin nhắn/i.test(prompt)) channels.push('sms')
  if (/rcs/i.test(prompt)) channels.push('rcs')
  if (/voice|call|gọi/i.test(prompt)) channels.push('voice')
  if (channels.length === 0) {
    if (/welcome|chào/i.test(prompt)) return ['email', 'sms']
    if (/cart|giỏ/i.test(prompt)) return ['email', 'sms']
    return ['email']
  }
  return channels
}

function parseDelays (prompt: string, stepCount: number): Array<{ value: number; unit: StepDraft['delay_unit'] }> {
  const delays: Array<{ value: number; unit: StepDraft['delay_unit'] }> = []
  const dayMatch = [...prompt.matchAll(/(\d+)\s*(ngày|days?)/gi)]
  const hourMatch = [...prompt.matchAll(/(\d+)\s*(giờ|hours?)/gi)]
  const minMatch = [...prompt.matchAll(/(\d+)\s*(phút|minutes?)/gi)]

  for (let i = 0; i < stepCount; i++) {
    if (i === 0) {
      delays.push({ value: 0, unit: 'minute' })
      continue
    }
    const day = dayMatch[i - 1]
    const hour = hourMatch[i - 1]
    const min = minMatch[i - 1]
    if (day) delays.push({ value: Number(day[1]), unit: 'day' })
    else if (hour) delays.push({ value: Number(hour[1]), unit: 'hour' })
    else if (min) delays.push({ value: Number(min[1]), unit: 'minute' })
    else delays.push({ value: i, unit: 'day' })
  }
  return delays
}

function buildTemplate (
  channel: StepDraft['channel'],
  category: WorkflowDraft['category'],
  stepIndex: number,
  locale: string
): StepDraft['template'] {
  const vi = locale === 'vi'
  if (channel === 'email') {
    const subjects: Record<string, string[]> = {
      onboarding: vi
        ? ['Chào mừng bạn đến với chúng tôi!', 'Bắt đầu hành trình của bạn']
        : ['Welcome aboard!', 'Get started with us'],
      abandoned_basket: vi
        ? ['Bạn quên gì trong giỏ hàng?', 'Hoàn tất đơn hàng của bạn']
        : ['You left something behind', 'Complete your order'],
      reactivation: vi
        ? ['Chúng tôi nhớ bạn!', 'Quay lại và nhận ưu đãi']
        : ['We miss you!', 'Come back for a special offer']
    }
    const bodies: Record<string, string[]> = {
      onboarding: vi
        ? ['<p>Cảm ơn bạn đã tham gia. Khám phá sản phẩm và ưu đãi dành riêng cho bạn.</p>']
        : ['<p>Thanks for joining. Explore products and offers picked for you.</p>'],
      abandoned_basket: vi
        ? ['<p>Sản phẩm trong giỏ vẫn đang chờ bạn. Hoàn tất đơn hàng trước khi hết hàng.</p>']
        : ['<p>Items in your cart are waiting. Checkout before they sell out.</p>'],
      reactivation: vi
        ? ['<p>Đã lâu bạn chưa ghé thăm. Dùng mã <strong>COMEBACK10</strong> cho đơn tiếp theo.</p>']
        : ['<p>It has been a while. Use code <strong>COMEBACK10</strong> on your next order.</p>']
    }
    const pool = subjects[category] ?? subjects.onboarding!
    const bodyPool = bodies[category] ?? bodies.onboarding!
    return {
      name: vi ? `Email bước ${stepIndex + 1}` : `Email step ${stepIndex + 1}`,
      subject: pool[stepIndex % pool.length]!,
      body: bodyPool[stepIndex % bodyPool.length]!
    }
  }

  const smsTexts: Record<string, string[]> = {
    onboarding: vi
      ? ['Chào mừng! Truy cập ứng dụng để nhận ưu đãi chào mới.']
      : ['Welcome! Open the app to claim your new-user offer.'],
    abandoned_basket: vi
      ? ['Giỏ hàng của bạn đang chờ — hoàn tất đơn ngay nhé!']
      : ['Your cart is waiting — complete checkout now!'],
    reactivation: vi
      ? ['Chúng tôi nhớ bạn! Mã COMEBACK10 cho đơn tiếp theo.']
      : ['We miss you! Use COMEBACK10 on your next order.']
  }
  const pool = smsTexts[category] ?? smsTexts.onboarding!
  const body = pool[stepIndex % pool.length]!
  return {
    name: vi ? `SMS bước ${stepIndex + 1}` : `SMS step ${stepIndex + 1}`,
    subject: '',
    body: sanitizeTemplateBody(channel, body)
  }
}

function buildName (category: WorkflowDraft['category'], locale: string): string {
  const vi = locale === 'vi'
  const names: Record<string, string> = {
    onboarding: vi ? 'Hành trình chào mừng' : 'Welcome Journey',
    abandoned_basket: vi ? 'Nhắc giỏ hàng bỏ quên' : 'Abandoned Cart Recovery',
    reactivation: vi ? 'Kích hoạt lại khách hàng' : 'Win-back Campaign',
    loyalty: vi ? 'Chăm sóc khách VIP' : 'Loyalty Nurture',
    retention: vi ? 'Giữ chân khách hàng' : 'Retention Flow',
    nurturing: vi ? 'Nuôi dưỡng lead' : 'Lead Nurturing',
    activation: vi ? 'Kích hoạt người dùng' : 'User Activation',
    qualification: vi ? 'Đánh giá lead' : 'Lead Qualification'
  }
  return names[category] ?? (vi ? 'Workflow AI' : 'AI Workflow')
}

function buildDescription (category: WorkflowDraft['category'], locale: string): string {
  const vi = locale === 'vi'
  if (category === 'abandoned_basket') {
    return vi
      ? 'Nhắc khách hoàn tất đơn hàng qua email và SMS theo thời gian.'
      : 'Remind shoppers to complete checkout via timed email and SMS.'
  }
  if (category === 'reactivation') {
    return vi
      ? 'Liên hệ lại khách không hoạt động với ưu đãi quay lại.'
      : 'Re-engage inactive customers with a comeback offer.'
  }
  return vi
    ? 'Workflow tự động được tạo bởi AI cho hành trình khách hàng.'
    : 'AI-generated automated customer journey workflow.'
}

export function generateMockWorkflow (
  prompt: string,
  locale = 'en'
): WorkflowDraft {
  const category = detectCategory(prompt)
  const channels = detectChannels(prompt)
  const delays = parseDelays(prompt, channels.length)

  const steps: StepDraft[] = channels.map((channel, i) => {
    const template = buildTemplate(channel, category, i, locale)
    const step: StepDraft = {
      channel,
      delay_value: delays[i]!.value,
      delay_unit: delays[i]!.unit,
      rationale:
        locale === 'vi'
          ? `Bước ${i + 1}: gửi qua ${channel} sau ${delays[i]!.value} ${delays[i]!.unit}.`
          : `Step ${i + 1}: send via ${channel} after ${delays[i]!.value} ${delays[i]!.unit}.`,
      template
    }
    if (channel === 'email') {
      step.email_subject = template.subject
      step.email_from_name = locale === 'vi' ? 'Thương hiệu' : 'Your Brand'
      step.email_from_address = 'hello@company.com'
    }
    if (channel === 'sms' || channel === 'rcs') {
      step.sms_sender_id = 'BRAND'
    }
    return step
  })

  return {
    name: buildName(category, locale),
    category,
    description: buildDescription(category, locale),
    contact_list_id: null,
    steps
  }
}
