import { t } from '../../i18n/en'

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

export type WorkflowFiltersState = { search: string; category: string }

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
      <div className="category-accordion" role="group" aria-label={t('campaign_workflow.all_categories')}>
        <button
          type="button"
          className={`category-accordion__slice${value.category === '' ? ' is-active' : ''}`}
          onClick={() => onChange({ ...value, category: '' })}
        >
          <span className="category-accordion__label">{t('campaign_workflow.all_categories')}</span>
        </button>
        {CATEGORIES.map((key) => (
          <button
            key={key}
            type="button"
            className={`category-accordion__slice category-accordion__slice--${key}${value.category === key ? ' is-active' : ''}`}
            onClick={() => onChange({ ...value, category: key })}
          >
            <span className="category-accordion__label">
              {t(`campaign_workflow.categories.${key}`)}
            </span>
          </button>
        ))}
      </div>
    </div>
  )
}
