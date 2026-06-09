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
import TemplatePreview from './TemplatePreview'

type WorkflowStepItemProps = {
  step: WorkflowStepForm
  isExpanded: boolean
  isAiWorkflow: boolean
  templates: MessageTemplate[]
  onToggleExpand: () => void
  onStepChange: (localId: string, patch: Partial<WorkflowStepForm>) => void
  onToggleEnabled: (localId: string, isEnabled: boolean) => void
}

export default function WorkflowStepItem ({
  step,
  isExpanded,
  isAiWorkflow,
  templates,
  onToggleExpand,
  onStepChange,
  onToggleEnabled
}: WorkflowStepItemProps) {
  const [templateError, setTemplateError] = useState<string | null>(null)
  const channelIcon = CHANNEL_ICON_MAP[step.channel] ?? 'fas fa-circle'
  const channelClass = step.channel === 'voice_sms' ? 'voice' : step.channel
  const selected = templates.find((t) => t.id === step.templateId)
  const stepTitle = selected?.title || selected?.name || `${CHANNEL_NAME_MAP[step.channel] ?? step.channel} Message`

  const unitKey =
    step.delayUnit === 'day' ? 'unit_day' : step.delayUnit === 'hour' ? 'unit_hour' : 'unit_minute'

  function handleDelayFieldChange (
    field: 'delayDays' | 'delayHours' | 'delayMinutes',
    value: number
  ) {
    const next = { ...step, [field]: value }
    applyDelayParts(next)
    onStepChange(step.localId, {
      delayDays: next.delayDays,
      delayHours: next.delayHours,
      delayMinutes: next.delayMinutes,
      delayInMinutes: next.delayInMinutes,
      delayUnit: next.delayUnit,
      delayValue: next.delayValue
    })
  }

  return (
    <div className="workflow-step-item-wrapper">
      <div
        className={`workflow-step-item${isExpanded ? ' workflow-step-item--expanded' : ''}${
          !step.isEnabled ? ' workflow-step-item--disabled' : ''
        }${templateError ? ' workflow-step-item--error' : ''}`}
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
          {isAiWorkflow ? (
            <span className="workflow-step-item__ai-badge">
              <i className="fa fa-magic workflow-step-item__ai-icon" />
              {t('campaign_workflow.edit_modal.ai_step_badge')}
            </span>
          ) : null}
          <label className="workflow-step-item__toggle" onClick={(e) => e.stopPropagation()}>
            <input
              type="checkbox"
              checked={step.isEnabled}
              onChange={() => onToggleEnabled(step.localId, step.isEnabled)}
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
                    onStepChange(step.localId, { templateId: e.target.value || null })
                    setTemplateError(null)
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
                      onChange={(e) =>
                        onStepChange(step.localId, { emailSubject: e.target.value })
                      }
                    />
                  </div>
                  <div className="workflow-step-item__form-group">
                    <label>{t('campaign_workflow.edit_modal.email_from_name')}</label>
                    <input
                      className="form-control"
                      value={step.emailFromName}
                      onChange={(e) =>
                        onStepChange(step.localId, { emailFromName: e.target.value })
                      }
                    />
                  </div>
                  <div className="workflow-step-item__form-group">
                    <label>{t('campaign_workflow.edit_modal.email_from_address')}</label>
                    <input
                      className="form-control"
                      value={step.emailFromAddress}
                      onChange={(e) =>
                        onStepChange(step.localId, { emailFromAddress: e.target.value })
                      }
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
                    onChange={(e) =>
                      onStepChange(step.localId, { smsSenderId: e.target.value })
                    }
                  />
                  <small className="workflow-step-item__hint">
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
                      onChange={(e) =>
                        handleDelayFieldChange('delayDays', Number(e.target.value) || 0)
                      }
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
                      onChange={(e) =>
                        handleDelayFieldChange('delayHours', Number(e.target.value) || 0)
                      }
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
                      onChange={(e) =>
                        handleDelayFieldChange('delayMinutes', Number(e.target.value) || 0)
                      }
                    />
                  </div>
                </div>
              </div>
            </div>
            <div className="workflow-step-item__preview-section">
              <TemplatePreview
                key={step.templateId ?? 'empty'}
                channel={step.channel}
                template={selected ?? null}
                emailSubject={step.emailSubject}
                emailFromName={step.emailFromName}
                emailFromAddress={step.emailFromAddress}
                smsSenderId={step.smsSenderId}
              />
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
