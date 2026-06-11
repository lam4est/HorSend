import { useEffect, useState } from 'react'
import { api } from '../../api'
import { useI18n, t } from '../../i18n'
import type { WorkflowStepForm } from '../../utils/workflowStep'
import WorkflowStepItem from './WorkflowStepItem'

type WorkflowStepsProps = {
  steps: WorkflowStepForm[]
  expandedStepLocalId: string | null
  isAiWorkflow: boolean
  onToggleExpand: (localId: string | null) => void
  onStepChange: (localId: string, patch: Partial<WorkflowStepForm>) => void
  onToggleEnabled: (localId: string, isEnabled: boolean) => void
}

export default function WorkflowSteps ({
  steps,
  expandedStepLocalId,
  isAiWorkflow,
  onToggleExpand,
  onStepChange,
  onToggleEnabled
}: WorkflowStepsProps) {
  const { t } = useI18n()
  const [templatesByChannel, setTemplatesByChannel] = useState<Record<string, Awaited<ReturnType<typeof api.templates>>['items']>>({})
  const channelKey = [...new Set(steps.map((s) => s.channel))].sort().join(',')

  useEffect(() => {
    const channels = channelKey ? channelKey.split(',') : []
    if (channels.length === 0) return
    let cancelled = false
    void Promise.all(
      channels.map(async (ch) => {
        const key = ch === 'rbm' ? 'rcs' : ch
        const res = await api.templates(key)
        return [ch, res.items] as const
      })
    ).then((entries) => {
      if (!cancelled) setTemplatesByChannel(Object.fromEntries(entries))
    })
    return () => {
      cancelled = true
    }
  }, [channelKey])

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
        {steps.map((step) => (
          <WorkflowStepItem
            key={step.localId}
            step={step}
            isExpanded={expandedStepLocalId === step.localId}
            isAiWorkflow={isAiWorkflow}
            templates={templatesByChannel[step.channel] ?? []}
            onToggleExpand={() =>
              onToggleExpand(expandedStepLocalId === step.localId ? null : step.localId)
            }
            onStepChange={onStepChange}
            onToggleEnabled={onToggleEnabled}
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
