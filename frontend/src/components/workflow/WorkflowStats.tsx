import { useGsapReveal } from '../../hooks/useGsapReveal'
import { t } from '../../i18n/en'

type WorkflowStatsProps = {
  totalWorkflows: number
  activeWorkflows: number
  totalSteps: number
  totalCategories: number
}

export default function WorkflowStats (props: WorkflowStatsProps) {
  const ref = useGsapReveal<HTMLDivElement>()

  const cells = [
    {
      key: 'featured',
      value: props.totalWorkflows,
      label: t('campaign_workflow.stats.total_workflows'),
      span: 'bento-featured'
    },
    {
      key: 'active',
      value: props.activeWorkflows,
      label: t('campaign_workflow.stats.active'),
      span: 'bento-sm'
    },
    {
      key: 'steps',
      value: props.totalSteps,
      label: t('campaign_workflow.stats.total_steps'),
      span: 'bento-sm'
    },
    {
      key: 'categories',
      value: props.totalCategories,
      label: t('campaign_workflow.stats.categories'),
      span: 'bento-wide'
    }
  ]

  return (
    <div ref={ref} className="workflow-bento" aria-label="Workflow statistics">
      {cells.map((cell) => (
        <article
          key={cell.key}
          data-reveal
          className={`bento-cell ${cell.span}`}
        >
          <span className="bento-cell__value tabular-nums">{cell.value}</span>
          <span className="bento-cell__label">{cell.label}</span>
        </article>
      ))}
    </div>
  )
}
