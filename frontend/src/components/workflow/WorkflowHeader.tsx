import { useI18n } from '../../i18n'

type WorkflowHeaderProps = {
  filteredCount: number
  total: number
}

export default function WorkflowHeader ({ filteredCount, total }: WorkflowHeaderProps) {
  const { t } = useI18n()
  return (
    <div className="workflows-header">
      <p className="workflows-count">
        {t('campaign_workflow.page_subtitle', { count: filteredCount, total })}
      </p>
    </div>
  )
}
