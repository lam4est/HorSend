import { useCallback, useState } from 'react'
import { api, type AiWorkflowDraft, type WorkflowItem } from '../../api'
import { CHANNEL_ICON_MAP, CHANNEL_NAME_MAP } from '../../constants/campaignWorkflow'
import { t } from '../../i18n/en'
import Modal from '../common/Modal'
import TemplatePreview from './TemplatePreview'
import '../../styles/workflow-ai.css'

const QUICK_PROMPTS = [
  { labelKey: 'campaign_workflow.categories.onboarding', promptKey: 'campaign_workflow.ai.quick_onboarding' },
  { labelKey: 'campaign_workflow.categories.abandoned_basket', promptKey: 'campaign_workflow.ai.quick_abandoned' },
  { labelKey: 'campaign_workflow.categories.reactivation', promptKey: 'campaign_workflow.ai.quick_reactivation' },
  { labelKey: 'campaign_workflow.ai.black_friday_label', promptKey: 'campaign_workflow.ai.quick_black_friday' }
] as const

type Step = AiWorkflowDraft['steps'][number]

type WorkflowAIBuilderProps = {
  open: boolean
  onClose: () => void
  onCreated: (workflow: WorkflowItem) => void
}

type BuilderStep = 'describe' | 'preview' | 'confirm'

export default function WorkflowAIBuilder ({ open, onClose, onCreated }: WorkflowAIBuilderProps) {
  const [builderStep, setBuilderStep] = useState<BuilderStep>('describe')
  const [prompt, setPrompt] = useState('')
  const [locale, setLocale] = useState<'en' | 'vi'>('en')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [draftId, setDraftId] = useState<string | null>(null)
  const [draft, setDraft] = useState<AiWorkflowDraft | null>(null)
  const [warnings, setWarnings] = useState<string[]>([])
  const [source, setSource] = useState<string>('mock')
  const [expandedStep, setExpandedStep] = useState(0)

  const reset = useCallback(() => {
    setBuilderStep('describe')
    setPrompt('')
    setError(null)
    setDraftId(null)
    setDraft(null)
    setWarnings([])
    setExpandedStep(0)
  }, [])

  function handleClose () {
    reset()
    onClose()
  }

  async function handleGenerate () {
    if (prompt.trim().length < 3) return
    setBusy(true)
    setError(null)
    try {
      const res = await api.aiGenerateWorkflow({ prompt: prompt.trim(), locale })
      setDraft(res.workflow)
      setDraftId(res.draft_id)
      setWarnings(res.warnings)
      setSource(res.source)
      setBuilderStep('preview')
      setExpandedStep(0)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : t('global.api_error'))
    } finally {
      setBusy(false)
    }
  }

  function updateStep (index: number, patch: Partial<Step>) {
    if (!draft) return
    const steps = draft.steps.map((s, i) => (i === index ? { ...s, ...patch } : s))
    if (patch.template) {
      steps[index] = {
        ...steps[index]!,
        template: { ...steps[index]!.template, ...patch.template }
      }
    }
    setDraft({ ...draft, steps })
  }

  async function handleConfirm () {
    if (!draft) return
    setBusy(true)
    setError(null)
    try {
      const res = await api.aiConfirmWorkflow({
        prompt: prompt.trim(),
        draft_id: draftId ?? undefined,
        draft
      })
      if (draftId) {
        void api.aiFeedback({ draft_id: draftId, user_edits: draft }).catch(() => {})
      }
      onCreated(res.workflow)
      handleClose()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : t('global.api_error'))
    } finally {
      setBusy(false)
    }
  }

  function delayLabel (step: Step): string {
    if (step.delay_value === 0 && step.delay_unit === 'minute') {
      return t('campaign_workflow.ai.immediate')
    }
    const unitKey =
      step.delay_unit === 'day'
        ? 'campaign_workflow.edit_modal.unit_day'
        : step.delay_unit === 'hour'
          ? 'campaign_workflow.edit_modal.unit_hour'
          : 'campaign_workflow.edit_modal.unit_minute'
    return `${step.delay_value} ${t(unitKey)}`
  }

  return (
    <Modal
      open={open}
      title={t('campaign_workflow.ai.title')}
      onClose={handleClose}
      wide
      footer={
        builderStep === 'describe' ? (
          <>
            <button type="button" className="enroll-btn enroll-btn--secondary" onClick={handleClose}>
              {t('global.buttons.cancel')}
            </button>
            <button
              type="button"
              className="enroll-btn enroll-btn--primary"
              disabled={busy || prompt.trim().length < 3}
              onClick={() => void handleGenerate()}
            >
              {busy ? t('campaign_workflow.ai.generating') : t('campaign_workflow.ai.generate')}
            </button>
          </>
        ) : builderStep === 'preview' ? (
          <>
            <button
              type="button"
              className="enroll-btn enroll-btn--secondary"
              onClick={() => setBuilderStep('describe')}
            >
              {t('campaign_workflow.ai.back')}
            </button>
            <button
              type="button"
              className="enroll-btn enroll-btn--primary"
              onClick={() => setBuilderStep('confirm')}
            >
              {t('campaign_workflow.ai.continue')}
            </button>
          </>
        ) : (
          <>
            <button
              type="button"
              className="enroll-btn enroll-btn--secondary"
              onClick={() => setBuilderStep('preview')}
            >
              {t('campaign_workflow.ai.back')}
            </button>
            <button
              type="button"
              className="enroll-btn enroll-btn--primary"
              disabled={busy}
              onClick={() => void handleConfirm()}
            >
              {busy ? t('campaign_workflow.ai.creating') : t('campaign_workflow.ai.confirm_create')}
            </button>
          </>
        )
      }
    >
      <div className="workflow-ai">
        <nav className="workflow-ai__steps" aria-label={t('campaign_workflow.ai.progress')}>
          {(['describe', 'preview', 'confirm'] as const).map((step, i) => (
            <span
              key={step}
              className={`workflow-ai__step-indicator${
                builderStep === step ? ' workflow-ai__step-indicator--active' : ''
              }${i < ['describe', 'preview', 'confirm'].indexOf(builderStep) ? ' workflow-ai__step-indicator--done' : ''}`}
            >
              {i + 1}. {t(`campaign_workflow.ai.step_${step}`)}
            </span>
          ))}
        </nav>

        {error ? <p className="workflow-ai__error">{error}</p> : null}

        {builderStep === 'describe' ? (
          <div className="workflow-ai__describe">
            <p className="workflow-ai__lead">{t('campaign_workflow.ai.lead')}</p>
            <div className="workflow-ai__locale">
              <label>
                {t('campaign_workflow.ai.locale')}
                <select value={locale} onChange={(e) => setLocale(e.target.value as 'en' | 'vi')}>
                  <option value="en">English</option>
                  <option value="vi">Tiếng Việt</option>
                </select>
              </label>
            </div>
            <div className="workflow-ai__chips">
              {QUICK_PROMPTS.map((chip) => (
                <button
                  key={chip.promptKey}
                  type="button"
                  className="workflow-ai__chip"
                  onClick={() => setPrompt(t(chip.promptKey))}
                >
                  {t(chip.labelKey)}
                </button>
              ))}
            </div>
            <textarea
              className="workflow-ai__prompt"
              rows={5}
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder={t('campaign_workflow.ai.prompt_placeholder')}
            />
          </div>
        ) : null}

        {builderStep === 'preview' && draft ? (
          <div className="workflow-ai__preview">
            <header className="workflow-ai__draft-header">
              <h3>{draft.name}</h3>
              <p>{draft.description}</p>
              <span className="workflow-ai__badge">
                {t('campaign_workflow.ai.source')}: {source}
              </span>
            </header>
            {warnings.length > 0 ? (
              <ul className="workflow-ai__warnings">
                {warnings.map((w) => (
                  <li key={w}>{w}</li>
                ))}
              </ul>
            ) : null}
            <div className="workflow-ai__timeline">
              {draft.steps.map((step, i) => (
                <div
                  key={i}
                  className={`workflow-ai__step-card${expandedStep === i ? ' workflow-ai__step-card--open' : ''}`}
                >
                  <button
                    type="button"
                    className="workflow-ai__step-head"
                    onClick={() => setExpandedStep(expandedStep === i ? -1 : i)}
                  >
                    <i className={CHANNEL_ICON_MAP[step.channel] ?? 'fas fa-circle'} aria-hidden="true" />
                    <span>
                      {CHANNEL_NAME_MAP[step.channel] ?? step.channel} — {delayLabel(step)}
                    </span>
                    {step.rationale ? (
                      <span className="workflow-ai__rationale">{step.rationale}</span>
                    ) : null}
                  </button>
                  {expandedStep === i ? (
                    <div className="workflow-ai__step-body">
                      {step.channel === 'email' ? (
                        <label className="workflow-ai__field">
                          {t('campaign_workflow.edit_modal.email_subject')}
                          <input
                            type="text"
                            value={step.email_subject ?? step.template.subject}
                            onChange={(e) =>
                              updateStep(i, {
                                email_subject: e.target.value,
                                template: { ...step.template, subject: e.target.value }
                              })
                            }
                          />
                        </label>
                      ) : null}
                      <label className="workflow-ai__field">
                        {t('campaign_workflow.ai.template_body')}
                        <textarea
                          rows={4}
                          value={step.template.body}
                          onChange={(e) =>
                            updateStep(i, {
                              template: { ...step.template, body: e.target.value }
                            })
                          }
                        />
                      </label>
                      <TemplatePreview
                        channel={step.channel}
                        template={{
                          id: `ai-${i}`,
                          name: step.template.name,
                          title: step.template.subject || step.template.name,
                          body: step.template.body
                        }}
                        emailSubject={step.email_subject ?? step.template.subject}
                        emailFromName={step.email_from_name}
                        emailFromAddress={step.email_from_address}
                        smsSenderId={step.sms_sender_id}
                      />
                    </div>
                  ) : null}
                </div>
              ))}
            </div>
          </div>
        ) : null}

        {builderStep === 'confirm' && draft ? (
          <div className="workflow-ai__confirm">
            <p>{t('campaign_workflow.ai.confirm_lead')}</p>
            <dl className="workflow-ai__summary">
              <div>
                <dt>{t('campaign_workflow.edit_modal.workflow_name')}</dt>
                <dd>{draft.name}</dd>
              </div>
              <div>
                <dt>{t('campaign_workflow.edit_modal.description')}</dt>
                <dd>{draft.description}</dd>
              </div>
              <div>
                <dt>{t('campaign_workflow.steps', { count: draft.steps.length })}</dt>
                <dd>
                  {draft.steps
                    .map((s) => `${CHANNEL_NAME_MAP[s.channel] ?? s.channel} (${delayLabel(s)})`)
                    .join(' → ')}
                </dd>
              </div>
            </dl>
            <p className="workflow-ai__note">{t('campaign_workflow.ai.inactive_note')}</p>
          </div>
        ) : null}
      </div>
    </Modal>
  )
}
