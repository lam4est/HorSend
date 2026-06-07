import { useCallback, useEffect, useRef, useState } from 'react'
import { api, type ContactList, type WorkflowDetail, type WorkflowItem } from '../../api'
import { CHANNELS } from '../../constants/channels'
import { DEFAULT_DELAY_UNIT, DEFAULT_DELAY_VALUE } from '../../constants/campaignWorkflow'
import { t } from '../../i18n/en'
import {
  convertMinutesToDelayUnit,
  convertToMinutes,
  splitMinutes,
  type WorkflowStepForm
} from '../../utils/workflowStep'
import WorkflowSteps from './WorkflowSteps'

export type WorkflowEditData = {
  workflowId: number | null
  originalWorkflowId: number
  name: string
  description: string
  useAllContacts: boolean
  contactListId: number | null
  steps: WorkflowStepForm[]
}

type SaveStatus = 'idle' | 'pending' | 'saving' | 'saved' | 'error'

type WorkflowEditModalProps = {
  open: boolean
  workflow: WorkflowItem | null
  onClose: () => void
  onSave: (workflow: WorkflowItem, data: WorkflowEditData) => void | Promise<void>
  onClosed?: (workflow: WorkflowItem, data: WorkflowEditData) => void
}

function mapDetailStep (step: WorkflowDetail['steps'][number], index: number): WorkflowStepForm {
  const minutes = Number(step.delay_in_minutes) || 0
  const delayInfo = convertMinutesToDelayUnit(minutes)
  const parts = splitMinutes(minutes)
  const settings = step.settings ?? {}
  return {
    id: Number(step.id),
    localId: `step-${step.id}-${index}`,
    workflowStepId: Number(step.workflow_step_id),
    channel: String(step.channel),
    templateId: step.template_id != null ? String(step.template_id) : null,
    delayValue: Number(step.delay_value ?? delayInfo.value),
    delayUnit: (step.delay_unit as WorkflowStepForm['delayUnit']) ?? delayInfo.unit,
    delayInMinutes: minutes,
    delayDays: parts.days,
    delayHours: parts.hours,
    delayMinutes: parts.minutes,
    isEnabled: step.is_active !== false,
    isConfirmedByUser: Boolean(step.is_confirmed_by_user),
    excludedSegmentIds: [],
    emailSubject: String(settings.subject ?? ''),
    emailFromName: String(settings.nameFrom ?? ''),
    emailFromAddress: String(settings.emailFrom ?? ''),
    emailingService: settings.emailingService != null ? String(settings.emailingService) : null,
    smsSenderId: String(settings.senderId ?? '')
  }
}

function fallbackData (wf: WorkflowItem): WorkflowEditData {
  return {
    workflowId: wf.id,
    originalWorkflowId: wf.workflow_id,
    name: wf.name,
    description: wf.description,
    useAllContacts: true,
    contactListId: null,
    steps: wf.steps.map((step, index) => ({
      id: null,
      localId: `step-${step.workflow_step_id}-${index}`,
      workflowStepId: step.workflow_step_id,
      channel: step.channel,
      templateId: null,
      delayValue: DEFAULT_DELAY_VALUE,
      delayUnit: DEFAULT_DELAY_UNIT,
      delayInMinutes: 0,
      delayDays: 0,
      delayHours: 0,
      delayMinutes: 0,
      isEnabled: true,
      isConfirmedByUser: false,
      excludedSegmentIds: [],
      emailSubject: '',
      emailFromName: '',
      emailFromAddress: '',
      emailingService: null,
      smsSenderId: ''
    }))
  }
}

const SAVE_STATUS_LABEL: Record<Exclude<SaveStatus, 'idle'>, string> = {
  pending: 'campaign_workflow.edit_modal.save_pending',
  saving: 'campaign_workflow.edit_modal.save_saving',
  saved: 'campaign_workflow.edit_modal.save_saved',
  error: 'campaign_workflow.edit_modal.save_error'
}

export default function WorkflowEditModal ({
  open,
  workflow,
  onClose,
  onSave,
  onClosed
}: WorkflowEditModalProps) {
  const [loading, setLoading] = useState(false)
  const [expandedStepLocalId, setExpandedStepLocalId] = useState<string | null>(null)
  const [contactLists, setContactLists] = useState<ContactList[]>([])
  const [data, setData] = useState<WorkflowEditData | null>(null)
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle')
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const saveInFlight = useRef<Promise<void> | null>(null)
  const dataRef = useRef<WorkflowEditData | null>(null)
  const workflowRef = useRef<WorkflowItem | null>(null)
  dataRef.current = data
  workflowRef.current = workflow

  const loadDetail = useCallback(async (wf: WorkflowItem) => {
    setLoading(true)
    try {
      const [detail, lists] = await Promise.all([
        api.workflowDetail(wf.workflow_id, wf.id),
        api.contactLists()
      ])
      setContactLists(lists.items)
      setData({
        workflowId: detail.workflow_user_id,
        originalWorkflowId: detail.original_workflow_id,
        name: detail.name,
        description: detail.description,
        useAllContacts: !detail.segment_id,
        contactListId: detail.segment_id,
        steps: detail.steps
          .map((step, index) => mapDetailStep(step, index))
          .sort((a, b) => a.delayInMinutes - b.delayInMinutes)
      })
    } catch {
      setData(fallbackData(wf))
    } finally {
      setLoading(false)
    }
  }, [])

  const workflowKey = workflow ? `${workflow.id}-${workflow.workflow_id}` : null

  useEffect(() => {
    if (!open) {
      setData(null)
      setExpandedStepLocalId(null)
      setSaveStatus('idle')
      if (saveTimer.current) {
        clearTimeout(saveTimer.current)
        saveTimer.current = null
      }
      return
    }
    if (workflow) void loadDetail(workflow)
  }, [open, workflowKey, loadDetail, workflow])

  async function flushSave () {
    if (saveTimer.current) {
      clearTimeout(saveTimer.current)
      saveTimer.current = null
    }
    const wf = workflowRef.current
    const payload = dataRef.current
    if (!wf || !payload) return

    setSaveStatus('saving')
    const task = Promise.resolve(onSave(wf, payload))
      .then(() => {
        setSaveStatus('saved')
      })
      .catch(() => {
        setSaveStatus('error')
      })
      .finally(() => {
        saveInFlight.current = null
      })
    saveInFlight.current = task
    await task
  }

  function scheduleAutoSave (next?: WorkflowEditData) {
    const wf = workflowRef.current
    if (!wf) return
    if (next) dataRef.current = next
    if (saveTimer.current) clearTimeout(saveTimer.current)
    setSaveStatus('pending')
    saveTimer.current = setTimeout(() => {
      saveTimer.current = null
      void flushSave()
    }, 800)
  }

  function updateData (patch: Partial<WorkflowEditData>) {
    setData((prev) => {
      if (!prev) return prev
      const next = { ...prev, ...patch }
      dataRef.current = next
      scheduleAutoSave(next)
      return next
    })
  }

  function updateStep (localId: string, patch: Partial<WorkflowStepForm>) {
    setData((prev) => {
      if (!prev) return prev
      const steps = prev.steps.map((s) =>
        s.localId === localId ? { ...s, ...patch } : s
      )
      const next = { ...prev, steps }
      dataRef.current = next
      scheduleAutoSave(next)
      return next
    })
  }

  async function handleConfirm (localId: string, stepId: number | null) {
    if (!stepId) return
    await api.confirmStep(stepId)
    updateStep(localId, { isConfirmedByUser: true })
  }

  async function close () {
    if (saveTimer.current) {
      await flushSave()
    } else if (saveInFlight.current) {
      await saveInFlight.current
    }

    const wf = workflowRef.current
    const payload = dataRef.current
    if (wf && payload) onClosed?.(wf, payload)
    onClose()
  }

  if (!open || !workflow) return null

  const showInitialLoading = loading && !data

  return (
    <div className="workflow-edit-modal-overlay" role="presentation" onClick={() => void close()}>
      <div
        className="workflow-edit-modal"
        role="dialog"
        aria-modal="true"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="workflow-modal-header">
          <h2 className="workflow-modal-header__title">{t('campaign_workflow.edit_modal.title')}</h2>
          <button
            type="button"
            className="workflow-modal-header__close"
            onClick={() => void close()}
            aria-label="Close"
          >
            <i className="fa-solid fa-xmark" />
          </button>
        </div>

        <div className="workflow-edit-modal__body">
          {showInitialLoading ? (
            <div className="workflow-edit-modal__loading">
              <div className="workflow-edit-modal__spinner">
                <div className="workflow-edit-modal__spinner-dot" />
              </div>
            </div>
          ) : null}

          {data ? (
            <>
              <div className="workflow-edit-modal__info">
                <div className="workflow-edit-modal__form-group">
                  <label>{t('campaign_workflow.edit_modal.workflow_name')}</label>
                  <input
                    className="form-control"
                    value={data.name}
                    disabled
                  />
                </div>
                <div className="workflow-edit-modal__form-group">
                  <label>{t('campaign_workflow.edit_modal.description')}</label>
                  <textarea
                    className="form-control"
                    rows={3}
                    value={data.description}
                    placeholder={t('campaign_workflow.edit_modal.description_placeholder')}
                    onChange={(e) => updateData({ description: e.target.value })}
                  />
                </div>
                <div className="workflow-edit-modal__form-group">
                  <label>{t('campaign_workflow.edit_modal.recipients')}</label>
                  <div className="edit-scheduler-modal__toggle-row">
                    <button
                      type="button"
                      className={`edit-scheduler-modal__toggle${data.useAllContacts ? ' is-selected' : ''}`}
                      onClick={() => updateData({ useAllContacts: true, contactListId: null })}
                    >
                      {t('campaign_workflow.edit_modal.all_contacts')}
                    </button>
                    <button
                      type="button"
                      className={`edit-scheduler-modal__toggle${!data.useAllContacts ? ' is-selected' : ''}`}
                      onClick={() => updateData({ useAllContacts: false })}
                    >
                      {t('campaign_workflow.edit_modal.my_contact_lists')}
                    </button>
                  </div>
                  {!data.useAllContacts ? (
                    <select
                      className="form-control workflow-edit-modal__contact-select"
                      value={data.contactListId ?? ''}
                      onChange={(e) =>
                        updateData({
                          contactListId: e.target.value ? Number(e.target.value) : null
                        })
                      }
                    >
                      <option value="">{t('campaign_workflow.edit_modal.select_contact_list')}</option>
                      {contactLists.map((list) => (
                        <option key={list.id} value={list.id}>
                          {list.name} ({list.contacts_count}{' '}
                          {t('campaign_workflow.edit_modal.contacts')})
                        </option>
                      ))}
                    </select>
                  ) : null}
                </div>
              </div>

              <div className="workflow-edit-modal__editor">
                <WorkflowSteps
                  steps={data.steps}
                  expandedStepLocalId={expandedStepLocalId}
                  onToggleExpand={setExpandedStepLocalId}
                  onStepChange={updateStep}
                  onToggleEnabled={(localId, isEnabled) =>
                    updateStep(localId, { isEnabled: !isEnabled })
                  }
                  onConfirm={(localId, stepId) => void handleConfirm(localId, stepId)}
                />
              </div>
            </>
          ) : null}
        </div>

        <div className="workflow-edit-modal-footer">
          {saveStatus !== 'idle' ? (
            <span
              className={`workflow-edit-modal__save-status workflow-edit-modal__save-status--${saveStatus}`}
              aria-live="polite"
            >
              {t(SAVE_STATUS_LABEL[saveStatus])}
            </span>
          ) : null}
          <button type="button" className="edit-scheduler-modal__btn-cancel" onClick={() => void close()}>
            {t('campaign_workflow.edit_modal.close')}
          </button>
        </div>
      </div>
    </div>
  )
}

export function buildWorkflowSavePayload (workflow: WorkflowItem, data: WorkflowEditData) {
  return {
    id: workflow.id,
    original_workflow_id: data.originalWorkflowId,
    workflow_id: workflow.workflow_id,
    description: data.description,
    segment_id: data.useAllContacts ? null : data.contactListId,
    is_active: true,
    steps: data.steps.map((step) => {
      const payload: Record<string, unknown> = {
        workflow_step_id: step.workflowStepId,
        channel: step.channel,
        template_id: step.templateId,
        is_active: step.isEnabled,
        delay_in_minutes:
          step.delayInMinutes ??
          convertToMinutes(step.delayValue || DEFAULT_DELAY_VALUE, step.delayUnit || DEFAULT_DELAY_UNIT),
        excluded_contact_ids: step.excludedSegmentIds,
        is_confirmed_by_user: step.isConfirmedByUser,
        settings: null
      }
      if (
        step.channel === CHANNELS.EMAIL &&
        (step.emailSubject || step.emailFromName || step.emailFromAddress)
      ) {
        payload.settings = {
          subject: step.emailSubject || null,
          nameFrom: step.emailFromName || null,
          emailFrom: step.emailFromAddress || null,
          emailingService: step.emailingService
        }
      }
      if (
        (step.channel === CHANNELS.SMS || step.channel === CHANNELS.RCS) &&
        step.smsSenderId.trim()
      ) {
        payload.settings = { senderId: step.smsSenderId.trim() }
      }
      return payload
    })
  }
}
