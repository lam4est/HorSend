import { useCallback, useEffect, useRef, useState } from 'react'
import { api, type ContactList, type WorkflowDetail, type WorkflowItem } from '../../api'
import { CHANNELS } from '../../constants/channels'
import { DEFAULT_DELAY_UNIT, DEFAULT_DELAY_VALUE } from '../../constants/campaignWorkflow'
import { t } from '../../i18n/en'
import {
  applyDelayParts,
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

type WorkflowEditModalProps = {
  open: boolean
  workflow: WorkflowItem | null
  onClose: () => void
  onSave: (workflow: WorkflowItem, data: WorkflowEditData) => void
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

export default function WorkflowEditModal ({
  open,
  workflow,
  onClose,
  onSave
}: WorkflowEditModalProps) {
  const [loading, setLoading] = useState(false)
  const [expandedStepIndex, setExpandedStepIndex] = useState<number | null>(null)
  const [contactLists, setContactLists] = useState<ContactList[]>([])
  const [data, setData] = useState<WorkflowEditData | null>(null)
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const dataRef = useRef<WorkflowEditData | null>(null)
  dataRef.current = data

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
      setData({
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
      })
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (open && workflow) void loadDetail(workflow)
    if (!open) {
      setData(null)
      setExpandedStepIndex(null)
    }
  }, [open, workflow, loadDetail])

  function scheduleAutoSave (next?: WorkflowEditData) {
    if (!workflow) return
    if (saveTimer.current) clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(() => {
      const payload = next ?? dataRef.current
      if (payload) onSave(workflow, payload)
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

  function handleDelayChange (step: WorkflowStepForm) {
    setData((prev) => {
      if (!prev) return prev
      const steps = [...prev.steps].sort((a, b) => a.delayInMinutes - b.delayInMinutes)
      return { ...prev, steps }
    })
    scheduleAutoSave()
  }

  async function handleConfirm (step: WorkflowStepForm) {
    if (!step.id) return
    await api.confirmStep(step.id)
    step.isConfirmedByUser = true
    setData((prev) => (prev ? { ...prev, steps: [...prev.steps] } : prev))
    scheduleAutoSave()
  }

  function close () {
    if (saveTimer.current) clearTimeout(saveTimer.current)
    if (workflow && data) onSave(workflow, data)
    onClose()
  }

  if (!open || !workflow) return null

  return (
    <div className="workflow-edit-modal-overlay" role="presentation" onClick={close}>
      <div
        className="workflow-edit-modal"
        role="dialog"
        aria-modal="true"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="workflow-modal-header">
          <h2 className="workflow-modal-header__title">{t('campaign_workflow.edit_modal.title')}</h2>
          <button type="button" className="workflow-modal-header__close" onClick={close} aria-label="Close">
            <i className="fa-solid fa-xmark" />
          </button>
        </div>

        <div className="workflow-edit-modal__body">
          {loading ? (
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
                  expandedStepIndex={expandedStepIndex}
                  onToggleExpand={setExpandedStepIndex}
                  onDelayChange={handleDelayChange}
                  onFieldsChange={scheduleAutoSave}
                  onToggleEnabled={(step) => {
                    step.isEnabled = !step.isEnabled
                    setData((prev) => (prev ? { ...prev, steps: [...prev.steps] } : prev))
                    scheduleAutoSave()
                  }}
                  onConfirm={(step) => void handleConfirm(step)}
                />
              </div>
            </>
          ) : null}
        </div>

        <div className="workflow-edit-modal-footer">
          <button type="button" className="edit-scheduler-modal__btn-cancel" onClick={close}>
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
