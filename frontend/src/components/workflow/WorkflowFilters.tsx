import { t } from '../../i18n/en'

export type WorkflowFiltersState = { search: string; category: string }

const CATEGORIES = [
  'activation',
  'qualification',
  'nurturing',
  'loyalty',
  'abandoned_basket',
  'reactivation',
  'onboarding',
  'retention'
] as const

type WorkflowFiltersProps = {
  value: WorkflowFiltersState
  onChange: (next: WorkflowFiltersState) => void
}

export default function WorkflowFilters ({ value, onChange }: WorkflowFiltersProps) {
  return (
    <div className="workflow-filters">
      <div className="search-box">
        <i className="fas fa-search" aria-hidden="true" />
        <input
          type="text"
          className="form-control"
          placeholder={t('campaign_workflow.search_placeholder')}
          value={value.search}
          onChange={(e) => onChange({ ...value, search: e.target.value })}
        />
      </div>
      <div className="category-filter">
        <select
          className="form-select"
          value={value.category}
          onChange={(e) => onChange({ ...value, category: e.target.value })}
        >
          <option value="">{t('campaign_workflow.all_categories')}</option>
          {CATEGORIES.map((key) => (
            <option key={key} value={key}>
              {t(`campaign_workflow.categories.${key}`)}
            </option>
          ))}
        </select>
        <i className="fas fa-chevron-down" aria-hidden="true" />
      </div>
    </div>
  )
}
