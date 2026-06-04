import { t } from '../../i18n/en'

type WorkflowStatsProps = {
  totalWorkflows: number
  activeWorkflows: number
  totalSteps: number
  totalCategories: number
}

export default function WorkflowStats (props: WorkflowStatsProps) {
  const items = [
    { key: 'stat-total-workflows', value: props.totalWorkflows, label: t('campaign_workflow.stats.total_workflows') },
    { key: 'stat-active', value: props.activeWorkflows, label: t('campaign_workflow.stats.active') },
    { key: 'stat-total-steps', value: props.totalSteps, label: t('campaign_workflow.stats.total_steps') },
    { key: 'stat-categories', value: props.totalCategories, label: t('campaign_workflow.stats.categories') }
  ]

  return (
    <div className="workflow-stats">
      {items.map((item) => (
        <div key={item.key} className={`stat-item ${item.key}`}>
          <span className="stat-icon" aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.6" />
            </svg>
          </span>
          <div className="stat-content">
            <span className="stat-number">{item.value}</span>
            <span className="stat-label">{item.label}</span>
          </div>
        </div>
      ))}
    </div>
  )
}
