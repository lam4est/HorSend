import type { MessageTemplate } from '../../api'
import { CHANNELS } from '../../constants/channels'
import { t } from '../../i18n/en'

type TemplatePreviewProps = {
  channel: string
  template: MessageTemplate | null
  emailSubject?: string
  emailFromName?: string
  emailFromAddress?: string
  smsSenderId?: string
}

function stripHtml (html: string): string {
  return html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
}

function isHtmlBody (body: string): boolean {
  return /<[a-z][\s\S]*>/i.test(body)
}

function sanitizeHtml (html: string): string {
  return html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/\son\w+="[^"]*"/gi, '')
    .replace(/\son\w+='[^']*'/gi, '')
}

function PreviewEmpty () {
  return (
    <div className="template-preview template-preview--empty">
      <div className="template-preview__empty-icon" aria-hidden="true">
        <i className="fa-regular fa-eye" />
      </div>
      <p>{t('campaign_workflow.edit_modal.select_template_to_preview')}</p>
    </div>
  )
}

function EmailPreview ({
  template,
  emailSubject,
  emailFromName,
  emailFromAddress
}: {
  template: MessageTemplate
  emailSubject?: string
  emailFromName?: string
  emailFromAddress?: string
}) {
  const body = template.body ?? ''
  const subject = emailSubject?.trim() || template.title || template.name
  const fromName = emailFromName?.trim() || 'Your Brand'
  const fromEmail = emailFromAddress?.trim() || 'hello@company.com'
  const html = isHtmlBody(body)

  return (
    <div className="template-preview template-preview--email">
      <div className="template-preview__label">
        <i className="fa-regular fa-envelope" aria-hidden="true" />
        {t('campaign_workflow.edit_modal.preview_email')}
      </div>
      <div className="email-mockup">
        <div className="email-mockup__chrome">
          <span className="email-mockup__dot email-mockup__dot--red" />
          <span className="email-mockup__dot email-mockup__dot--yellow" />
          <span className="email-mockup__dot email-mockup__dot--green" />
          <span className="email-mockup__title">Mail</span>
        </div>
        <div className="email-mockup__meta">
          <div className="email-mockup__row">
            <span className="email-mockup__key">{t('campaign_workflow.edit_modal.preview_from')}</span>
            <span className="email-mockup__value">
              <strong>{fromName}</strong>
              <span className="email-mockup__email">&lt;{fromEmail}&gt;</span>
            </span>
          </div>
          <div className="email-mockup__row">
            <span className="email-mockup__key">{t('campaign_workflow.edit_modal.preview_subject')}</span>
            <span className="email-mockup__value email-mockup__value--subject">{subject}</span>
          </div>
          <div className="email-mockup__row email-mockup__row--time">
            <span className="email-mockup__key">{t('campaign_workflow.edit_modal.preview_sent')}</span>
            <span className="email-mockup__value">{t('campaign_workflow.edit_modal.preview_now')}</span>
          </div>
        </div>
        <div className="email-mockup__body">
          {html ? (
            <div
              className="email-mockup__html"
              dangerouslySetInnerHTML={{ __html: sanitizeHtml(body) }}
            />
          ) : (
            <p className="email-mockup__text">{body || template.title}</p>
          )}
        </div>
      </div>
    </div>
  )
}

function PhonePreview ({
  template,
  channel,
  smsSenderId
}: {
  template: MessageTemplate
  channel: string
  smsSenderId?: string
}) {
  const body = template.body ?? ''
  const plain = stripHtml(body) || template.title || template.name
  const sender = smsSenderId?.trim() || template.name || 'Messages'
  const isRcs = channel === CHANNELS.RCS || channel === CHANNELS.RBM
  const isVoice = channel === CHANNELS.VOICE || channel === CHANNELS.VOICE_SMS

  if (isVoice) {
    return (
      <div className="template-preview template-preview--phone">
        <div className="template-preview__label">
          <i className="fa-solid fa-phone" aria-hidden="true" />
          {t('campaign_workflow.edit_modal.preview_voice')}
        </div>
        <div className="phone-mockup">
          <div className="phone-mockup__bezel">
            <div className="phone-mockup__screen phone-mockup__screen--call">
              <div className="phone-mockup__status">
                <span>9:41</span>
                <span className="phone-mockup__status-icons">
                  <i className="fa-solid fa-signal" />
                  <i className="fa-solid fa-wifi" />
                  <i className="fa-solid fa-battery-full" />
                </span>
              </div>
              <div className="phone-mockup__call">
                <div className="phone-mockup__avatar">
                  <i className="fa-solid fa-building" />
                </div>
                <p className="phone-mockup__caller">{sender}</p>
                <p className="phone-mockup__call-status">{t('campaign_workflow.edit_modal.preview_calling')}</p>
                <div className="phone-mockup__wave" aria-hidden="true">
                  <span /><span /><span /><span /><span />
                </div>
                <p className="phone-mockup__script">{plain}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="template-preview template-preview--phone">
      <div className="template-preview__label">
        <i className="fa-solid fa-mobile-screen" aria-hidden="true" />
        {isRcs ? t('campaign_workflow.edit_modal.preview_rcs') : t('campaign_workflow.edit_modal.preview_message')}
      </div>
      <div className="phone-mockup">
        <div className="phone-mockup__bezel">
          <div className="phone-mockup__notch" aria-hidden="true" />
          <div className="phone-mockup__screen">
            <div className="phone-mockup__status">
              <span>9:41</span>
              <span className="phone-mockup__status-icons">
                <i className="fa-solid fa-signal" />
                <i className="fa-solid fa-wifi" />
                <i className="fa-solid fa-battery-full" />
              </span>
            </div>
            <div className="phone-mockup__header">
              <i className="fa-solid fa-chevron-left" />
              <div className="phone-mockup__contact">
                <span className="phone-mockup__avatar phone-mockup__avatar--sm">
                  {sender.charAt(0).toUpperCase()}
                </span>
                <span className="phone-mockup__contact-name">{sender}</span>
              </div>
            </div>
            <div className="phone-mockup__chat">
              <span className="phone-mockup__timestamp">{t('campaign_workflow.edit_modal.preview_today')}</span>
              {isRcs ? (
                <div className="phone-mockup__bubble phone-mockup__bubble--rcs">
                  <p className="phone-mockup__bubble-title">{template.title || template.name}</p>
                  <p className="phone-mockup__bubble-text">{plain}</p>
                </div>
              ) : (
                <div className="phone-mockup__bubble phone-mockup__bubble--sms">
                  <p>{plain}</p>
                </div>
              )}
              <span className="phone-mockup__delivered">{t('campaign_workflow.edit_modal.preview_delivered')}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function TemplatePreview ({
  channel,
  template,
  emailSubject,
  emailFromName,
  emailFromAddress,
  smsSenderId
}: TemplatePreviewProps) {
  if (!template) return <PreviewEmpty />

  if (channel === CHANNELS.EMAIL) {
    return (
      <EmailPreview
        template={template}
        emailSubject={emailSubject}
        emailFromName={emailFromName}
        emailFromAddress={emailFromAddress}
      />
    )
  }

  return (
    <PhonePreview
      template={template}
      channel={channel}
      smsSenderId={smsSenderId}
    />
  )
}
