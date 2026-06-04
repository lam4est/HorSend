import { t } from '../../i18n/en'

type WorkflowHeaderProps = {
  filteredCount: number
  total: number
}

export default function WorkflowHeader ({ filteredCount, total }: WorkflowHeaderProps) {
  return (
    <div className="workflows-header">
      <p className="workflows-count">
        {t('campaign_workflow.page_subtitle', { count: filteredCount, total })}
      </p>
    </div>
  )
}
