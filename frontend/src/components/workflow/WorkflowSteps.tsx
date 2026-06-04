import { useEffect, useState } from 'react'
import { api } from '../../api'
import { t } from '../../i18n/en'
import type { WorkflowStepForm } from '../../utils/workflowStep'
import WorkflowStepItem from './WorkflowStepItem'

type WorkflowStepsProps = {
  steps: WorkflowStepForm[]
  expandedStepIndex: number | null
  onToggleExpand: (index: number | null) => void
  onDelayChange: (step: WorkflowStepForm) => void
  onFieldsChange: () => void
  onToggleEnabled: (step: WorkflowStepForm) => void
  onConfirm: (step: WorkflowStepForm) => void
}

export default function WorkflowSteps ({
  steps,
  expandedStepIndex,
  onToggleExpand,
  onDelayChange,
  onFieldsChange,
  onToggleEnabled,
  onConfirm
}: WorkflowStepsProps) {
  const [templatesByChannel, setTemplatesByChannel] = useState<Record<string, Awaited<ReturnType<typeof api.templates>>['items']>>({})

  useEffect(() => {
    const channels = [...new Set(steps.map((s) => s.channel))]
    void Promise.all(
      channels.map(async (ch) => {
        const key = ch === 'rbm' ? 'rcs' : ch
        const res = await api.templates(key)
        return [ch, res.items] as const
      })
    ).then((entries) => {
      setTemplatesByChannel(Object.fromEntries(entries))
    })
  }, [steps])

  return (
    <div className="workflow-steps">
      <div className="workflow-steps__header">
        <h3>{t('campaign_workflow.edit_modal.workflow_steps')}</h3>
      </div>
      <div className="workflow-steps__node workflow-steps__node--start">
        <span className="workflow-steps__node-icon">
          <i className="fa fa-play" />
        </span>
        <span>{t('campaign_workflow.edit_modal.start')}</span>
      </div>
      <div className="workflow-steps__list">
        {steps.map((step, index) => (
          <WorkflowStepItem
            key={step.localId}
            step={step}
            isExpanded={expandedStepIndex === index}
            templates={templatesByChannel[step.channel] ?? []}
            onToggleExpand={() =>
              onToggleExpand(expandedStepIndex === index ? null : index)
            }
            onDelayChange={onDelayChange}
            onFieldsChange={onFieldsChange}
            onToggleEnabled={onToggleEnabled}
            onConfirm={onConfirm}
          />
        ))}
      </div>
      <div className="workflow-steps__node workflow-steps__node--end">
        <span className="workflow-steps__node-icon">
          <i className="fa fa-flag-checkered" />
        </span>
        <span>{t('campaign_workflow.edit_modal.end')}</span>
      </div>
    </div>
  )
}
