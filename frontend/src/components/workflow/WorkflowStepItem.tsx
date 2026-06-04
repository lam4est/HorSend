import { useState } from 'react'
import { CHANNELS } from '../../constants/channels'
import { CHANNEL_ICON_MAP, CHANNEL_NAME_MAP } from '../../constants/campaignWorkflow'
import type { MessageTemplate } from '../../api'
import { t } from '../../i18n/en'
import {
  applyDelayParts,
  getDelayBadge,
  type WorkflowStepForm
} from '../../utils/workflowStep'

type WorkflowStepItemProps = {
  step: WorkflowStepForm
  isExpanded: boolean
  templates: MessageTemplate[]
  onToggleExpand: () => void
  onDelayChange: (step: WorkflowStepForm) => void
  onFieldsChange: () => void
  onToggleEnabled: (step: WorkflowStepForm) => void
  onConfirm: (step: WorkflowStepForm) => void
}

export default function WorkflowStepItem ({
  step,
  isExpanded,
  templates,
  onToggleExpand,
  onDelayChange,
  onFieldsChange,
  onToggleEnabled,
  onConfirm
}: WorkflowStepItemProps) {
  const [templateError, setTemplateError] = useState<string | null>(null)
  const channelIcon = CHANNEL_ICON_MAP[step.channel] ?? 'fas fa-circle'
  const channelClass = step.channel === 'voice_sms' ? 'voice' : step.channel
  const selected = templates.find((t) => t.id === step.templateId)
  const stepTitle = selected?.title || selected?.name || `${CHANNEL_NAME_MAP[step.channel] ?? step.channel} Message`

  const unitKey =
    step.delayUnit === 'day' ? 'unit_day' : step.delayUnit === 'hour' ? 'unit_hour' : 'unit_minute'

  function handleDelayPartsChange () {
    applyDelayParts(step)
    onDelayChange(step)
  }

  return (
    <div className="workflow-step-item-wrapper">
      <div
        className={`workflow-step-item${isExpanded ? ' workflow-step-item--expanded' : ''}${
          !step.isEnabled ? ' workflow-step-item--disabled' : ''
        }${!step.isConfirmedByUser ? ' workflow-step-item--unconfirmed' : ''}${
          templateError ? ' workflow-step-item--error' : ''
        }`}
      >
        <div className="workflow-step-item__content" onClick={onToggleExpand} role="button" tabIndex={0}>
          <span className="workflow-step-item__delay-badge">{getDelayBadge(step)}</span>
          <span className={`workflow-step-item__channel-icon workflow-step-item__channel-icon--${channelClass}`}>
            <i className={channelIcon} aria-hidden="true" />
          </span>
          <div className="workflow-step-item__info">
            <div className="workflow-step-item__title-row">
              <span className="workflow-step-item__title">{stepTitle}</span>
            </div>
            <span className="workflow-step-item__subtitle">
              {t('campaign_workflow.edit_modal.wait')} {step.delayValue || 0}{' '}
              {t(`campaign_workflow.edit_modal.${unitKey}`)}
            </span>
          </div>
        </div>
        <div className="workflow-step-item__actions">
          {!step.isConfirmedByUser ? (
            <span className="workflow-step-item__ai-badge">
              <i className="fa fa-magic workflow-step-item__ai-icon" />
              {t('campaign_workflow.edit_modal.generated_by_ai')}
            </span>
          ) : null}
          {!step.isConfirmedByUser ? (
            <button
              type="button"
              className="workflow-step-item__validate-btn"
              onClick={(e) => {
                e.stopPropagation()
                onConfirm(step)
              }}
            >
              <i className="fa fa-check" />
            </button>
          ) : null}
          <label className="workflow-step-item__toggle" onClick={(e) => e.stopPropagation()}>
            <input
              type="checkbox"
              checked={step.isEnabled}
              onChange={() => onToggleEnabled(step)}
            />
            <span className="workflow-step-item__toggle-slider" />
          </label>
        </div>
      </div>

      {isExpanded ? (
        <div className="workflow-step-item__detail">
          <div className="workflow-step-item__detail-content">
            <div className="workflow-step-item__form-section">
              <div className="workflow-step-item__form-group">
                <label>{t('campaign_workflow.edit_modal.template')}</label>
                <select
                  className="form-control"
                  value={step.templateId ?? ''}
                  onChange={(e) => {
                    step.templateId = e.target.value || null
                    setTemplateError(null)
                    onFieldsChange()
                  }}
                >
                  <option value="">{t('campaign_workflow.edit_modal.select_template')}</option>
                  {templates.map((tpl) => (
                    <option key={tpl.id} value={tpl.id}>
                      {tpl.title || tpl.name}
                    </option>
                  ))}
                </select>
                {templateError ? <p className="workflow-step-item__error">{templateError}</p> : null}
              </div>

              {step.channel === CHANNELS.EMAIL ? (
                <>
                  <div className="workflow-step-item__form-group">
                    <label>{t('campaign_workflow.edit_modal.email_subject')}</label>
                    <input
                      className="form-control"
                      value={step.emailSubject}
                      onChange={(e) => {
                        step.emailSubject = e.target.value
                        onFieldsChange()
                      }}
                    />
                  </div>
                  <div className="workflow-step-item__form-group">
                    <label>{t('campaign_workflow.edit_modal.email_from_name')}</label>
                    <input
                      className="form-control"
                      value={step.emailFromName}
                      onChange={(e) => {
                        step.emailFromName = e.target.value
                        onFieldsChange()
                      }}
                    />
                  </div>
                  <div className="workflow-step-item__form-group">
                    <label>{t('campaign_workflow.edit_modal.email_from_address')}</label>
                    <input
                      className="form-control"
                      value={step.emailFromAddress}
                      onChange={(e) => {
                        step.emailFromAddress = e.target.value
                        onFieldsChange()
                      }}
                    />
                  </div>
                </>
              ) : null}

              {(step.channel === CHANNELS.SMS || step.channel === CHANNELS.RCS) && (
                <div className="workflow-step-item__form-group">
                  <label>{t('campaign_workflow.edit_modal.sms_sender_id')}</label>
                  <input
                    className="form-control"
                    value={step.smsSenderId}
                    onChange={(e) => {
                      step.smsSenderId = e.target.value
                      onFieldsChange()
                    }}
                  />
                  <small style={{ color: '#6b7280' }}>
                    {t('campaign_workflow.edit_modal.sms_sender_id_hint')}
                  </small>
                </div>
              )}

              <div className="workflow-step-item__form-group">
                <label>{t('campaign_workflow.edit_modal.delay')}</label>
                <div className="workflow-step-item__delay-inputs-3">
                  <div>
                    <div className="workflow-step-item__delay-label">
                      {t('campaign_workflow.edit_modal.days')}
                    </div>
                    <input
                      type="number"
                      min={0}
                      className="form-control"
                      value={step.delayDays}
                      onChange={(e) => {
                        step.delayDays = Number(e.target.value) || 0
                        handleDelayPartsChange()
                      }}
                    />
                  </div>
                  <div>
                    <div className="workflow-step-item__delay-label">
                      {t('campaign_workflow.edit_modal.hours')}
                    </div>
                    <input
                      type="number"
                      min={0}
                      className="form-control"
                      value={step.delayHours}
                      onChange={(e) => {
                        step.delayHours = Number(e.target.value) || 0
                        handleDelayPartsChange()
                      }}
                    />
                  </div>
                  <div>
                    <div className="workflow-step-item__delay-label">
                      {t('campaign_workflow.edit_modal.minutes')}
                    </div>
                    <input
                      type="number"
                      min={0}
                      className="form-control"
                      value={step.delayMinutes}
                      onChange={(e) => {
                        step.delayMinutes = Number(e.target.value) || 0
                        handleDelayPartsChange()
                      }}
                    />
                  </div>
                </div>
              </div>
            </div>
            <div className="workflow-step-item__preview-section">
              {selected ? (
                <div className="workflow-step-item__preview">
                  <p style={{ margin: 0, fontSize: 14, color: '#374151' }}>
                    {selected.body?.replace(/<[^>]+>/g, ' ') || selected.title}
                  </p>
                </div>
              ) : (
                <div className="workflow-step-item__preview-placeholder">
                  {t('campaign_workflow.edit_modal.select_template_to_preview')}
                </div>
              )}
            </div>
          </div>
        </div>
      ) : null}
      <span className="workflow-step-item__connector" />
    </div>
  )
}

// validate on save from parent
export function validateStepTemplate (step: WorkflowStepForm): boolean {
  return !step.isEnabled || Boolean(step.templateId)
}
