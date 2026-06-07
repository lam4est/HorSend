import { memo, useEffect, useState } from 'react'
import type { WorkflowItem } from '../../api'
import { CHANNEL_ICON_MAP } from '../../constants/campaignWorkflow'
import { en, t } from '../../i18n/en'
import WorkflowEditModal, { type WorkflowEditData } from './WorkflowEditModal'

type WorkflowCardProps = {
  workflow: WorkflowItem
  busy: boolean
  onToggle: (workflow: WorkflowItem, isActive: boolean) => void
  onRemove: (workflow: WorkflowItem) => void
  onSave: (workflow: WorkflowItem, data: WorkflowEditData) => void | Promise<void>
  onEditClosed: (workflow: WorkflowItem, data: WorkflowEditData) => void
}

function WorkflowCard ({
  workflow,
  busy,
  onToggle,
  onRemove,
  onSave,
  onEditClosed
}: WorkflowCardProps) {
  const [editOpen, setEditOpen] = useState(false)
  const [editWorkflow, setEditWorkflow] = useState<WorkflowItem | null>(null)
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

  function openEditor () {
    setEditWorkflow(workflow)
    setEditOpen(true)
  }

  function closeEditor () {
    setEditOpen(false)
    setEditWorkflow(null)
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
            <button type="button" className="btn-edit-steps" onClick={openEditor}>
              <i className="fas fa-edit" aria-hidden="true" />
              {t('campaign_workflow.edit_steps')}
            </button>
          </div>
        </div>
      </div>

      <WorkflowEditModal
        open={editOpen}
        workflow={editWorkflow}
        onClose={closeEditor}
        onSave={onSave}
        onClosed={onEditClosed}
      />
    </>
  )
}

export default memo(WorkflowCard, (prev, next) => {
  if (prev.busy !== next.busy) return false
  if (prev.workflow.id !== next.workflow.id) return false
  return (
    prev.workflow.is_active === next.workflow.is_active &&
    prev.workflow.name === next.workflow.name &&
    prev.workflow.description === next.workflow.description &&
    prev.workflow.category === next.workflow.category &&
    prev.workflow.steps.length === next.workflow.steps.length
  )
})
