import { useEffect, useState } from 'react'
import type { WorkflowItem } from '../../api'
import { CHANNEL_ICON_MAP } from '../../constants/campaignWorkflow'
import { en, t } from '../../i18n/en'
import WorkflowEditModal, {
  buildWorkflowSavePayload,
  type WorkflowEditData
} from './WorkflowEditModal'

type WorkflowCardProps = {
  workflow: WorkflowItem
  busy: boolean
  onToggle: (workflow: WorkflowItem, isActive: boolean) => void
  onRemove: (workflow: WorkflowItem) => void
  onSave: (workflow: WorkflowItem, data: WorkflowEditData) => void
}

export default function WorkflowCard ({
  workflow,
  busy,
  onToggle,
  onRemove,
  onSave
}: WorkflowCardProps) {
  const [editOpen, setEditOpen] = useState(false)
  const [checked, setChecked] = useState(workflow.is_active)
  const hasDescription = Boolean(workflow.description?.trim())
  const categoryLabel =
    (en.campaign_workflow.categories as Record<string, string>)[workflow.category] ??
    workflow.category

  useEffect(() => {
    setChecked(workflow.is_active)
  }, [workflow.is_active])

  function handleToggle () {
    const next = !checked
    setChecked(next)
    onToggle(workflow, next)
  }

  return (
    <>
      <div className={`workflow-card${checked ? ' is-active' : ''}`}>
        <div className="workflow-header">
          <div className="workflow-category">
            <span className={`category-badge category-${workflow.category}`}>
              {categoryLabel}
            </span>
            <span className="steps-count">
              {t('campaign_workflow.steps', { count: workflow.steps.length })}
            </span>
          </div>
          <div className="workflow-toggle">
            <label className="switch">
              <input
                type="checkbox"
                checked={checked}
                disabled={busy}
                onChange={handleToggle}
              />
              <span className="slider" />
            </label>
            <span className={`status-label${checked ? ' active' : ''}`}>
              {checked ? t('campaign_workflow.active') : t('campaign_workflow.inactive')}
            </span>
          </div>
        </div>

        <div className="workflow-content">
          <h3 className="workflow-title">{workflow.name}</h3>
          <p className={`workflow-description${hasDescription ? '' : ' workflow-description--placeholder'}`}>
            {hasDescription
              ? workflow.description
              : t('campaign_workflow.empty_description')}
          </p>
        </div>

        <hr className="workflow-divider" />

        <div className="workflow-footer">
          <div className="workflow-steps">
            {workflow.steps.map((step) => (
              <span key={step.workflow_step_id} className={`step-icon ${step.channel}`}>
                <i className={CHANNEL_ICON_MAP[step.channel] ?? 'fas fa-circle'} aria-hidden="true" />
              </span>
            ))}
          </div>
          <div className="workflow-footer__actions">
            <button
              type="button"
              className="btn-remove-workflow"
              disabled={busy}
              onClick={() => onRemove(workflow)}
            >
              <i className="fas fa-trash-alt" aria-hidden="true" />
              {t('campaign_workflow.remove_workflow')}
            </button>
            <button type="button" className="btn-edit-steps" onClick={() => setEditOpen(true)}>
              <i className="fas fa-edit" aria-hidden="true" />
              {t('campaign_workflow.edit_steps')}
            </button>
          </div>
        </div>
      </div>

      <WorkflowEditModal
        open={editOpen}
        workflow={workflow}
        onClose={() => setEditOpen(false)}
        onSave={(wf, data) => onSave(wf, data)}
      />
    </>
  )
}
