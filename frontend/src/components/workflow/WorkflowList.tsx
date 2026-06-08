import { useCallback, useEffect, useMemo, useState } from 'react'
import { api, type CatalogItem, type WorkflowItem } from '../../api'
import { t } from '../../i18n/en'
import ApiAlert from '../common/ApiAlert'
import Modal from '../common/Modal'
import WorkflowFilters, { type WorkflowFiltersState } from './WorkflowFilters'
import { buildWorkflowSavePayload } from './WorkflowEditModal'
import WorkflowGrid from './WorkflowGrid'
import type { WorkflowEditData } from './WorkflowEditModal'
import ChannelMarquee from '../common/ChannelMarquee'
import WorkflowHeader from './WorkflowHeader'
import WorkflowAIBuilder from './WorkflowAIBuilder'
import WorkflowHero from './WorkflowHero'
import WorkflowStats from './WorkflowStats'

type WorkflowListProps = {
  enrollSignal?: number
}

export default function WorkflowList ({ enrollSignal = 0 }: WorkflowListProps) {
  const [filters, setFilters] = useState<WorkflowFiltersState>({ search: '', category: '' })
  const [workflows, setWorkflows] = useState<WorkflowItem[]>([])
  const [catalog, setCatalog] = useState<CatalogItem[]>([])
  const [busy, setBusy] = useState(false)
  const [enrollOpen, setEnrollOpen] = useState(false)
  const [catalogLoading, setCatalogLoading] = useState(false)
  const [selectedTemplateId, setSelectedTemplateId] = useState<number | null>(null)
  const [removeTarget, setRemoveTarget] = useState<WorkflowItem | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [aiOpen, setAiOpen] = useState(false)

  const reload = useCallback(async () => {
    setLoadError(null)
    const [wf, cat] = await Promise.all([api.workflows(), api.catalog()])
    setWorkflows(wf)
    setCatalog(cat.items)
  }, [])

  useEffect(() => {
    setLoading(true)
    reload()
      .catch((err: unknown) => {
        setLoadError(err instanceof Error ? err.message : t('global.api_error'))
      })
      .finally(() => setLoading(false))
  }, [reload])

  async function openEnrollModal () {
    setEnrollOpen(true)
    setCatalogLoading(true)
    try {
      const cat = await api.catalog()
      setCatalog(cat.items)
    } finally {
      setCatalogLoading(false)
    }
  }

  useEffect(() => {
    if (enrollSignal > 0) void openEnrollModal()
  }, [enrollSignal])

  const availableTemplates = useMemo(
    () => catalog.filter((item) => !item.workflow_user_id),
    [catalog]
  )

  const filtered = useMemo(() => {
    const q = filters.search.toLowerCase()
    return workflows.filter((w) => {
      const matchSearch =
        !q ||
        w.name.toLowerCase().includes(q) ||
        (w.description ?? '').toLowerCase().includes(q)
      const matchCat = !filters.category || w.category === filters.category
      return matchSearch && matchCat
    })
  }, [workflows, filters])

  const stats = useMemo(() => {
    const active = workflows.filter((w) => w.is_active).length
    const steps = workflows.reduce((s, w) => s + w.steps.length, 0)
    const cats = new Set(workflows.map((w) => w.category).filter(Boolean))
    return {
      totalWorkflows: workflows.length,
      activeWorkflows: active,
      totalSteps: steps,
      totalCategories: cats.size
    }
  }, [workflows])

  async function run (fn: () => Promise<void>) {
    setBusy(true)
    try {
      await fn()
      await reload()
    } finally {
      setBusy(false)
    }
  }

  async function saveWorkflowQuietly (workflow: WorkflowItem, data: WorkflowEditData) {
    const payload = buildWorkflowSavePayload(workflow, data)
    await api.update(workflow.workflow_id, payload)
  }

  function syncWorkflowAfterEdit (workflow: WorkflowItem, data: WorkflowEditData) {
    setWorkflows((prev) =>
      prev.map((w) =>
        w.id === workflow.id ? { ...w, description: data.description } : w
      )
    )
  }

  return (
    <div className="workflow-list">
      <WorkflowHero onAdd={openEnrollModal} onCreateWithAi={() => setAiOpen(true)} />
      <ChannelMarquee />

      <section className="workflow-section workflow-section--interest">
      {loadError ? (
        <ApiAlert
          variant="error"
          message={loadError}
          retryLabel={t('global.api_retry')}
          onRetry={() => {
            setLoading(true)
            reload()
              .catch((err: unknown) => {
                setLoadError(err instanceof Error ? err.message : t('global.api_error'))
              })
              .finally(() => setLoading(false))
          }}
        />
      ) : null}

      <WorkflowStats {...stats} />
      <WorkflowFilters value={filters} onChange={setFilters} />
      <WorkflowHeader filteredCount={filtered.length} total={workflows.length} />
      </section>

      <section className="workflow-section workflow-section--action">
      {loading ? (
        <p className="workflow-list__status">{t('global.loading')}</p>
      ) : !loadError && filtered.length === 0 ? (
        <div className="workflow-list__empty">
          <p>{t('campaign_workflow.grid_empty')}</p>
          <button type="button" className="workflow-list__add-btn" onClick={openEnrollModal}>
            <i className="fas fa-plus" aria-hidden="true" />
            {t('campaign_workflow.grid_empty_cta')}
          </button>
        </div>
      ) : (
        <WorkflowGrid
          workflows={filtered}
          busy={busy}
          onToggle={(w, isActive) =>
            run(async () => {
              await api.update(w.workflow_id, { is_active: isActive })
            })
          }
          onRemove={(w) => setRemoveTarget(w)}
          onSave={(w, data) => saveWorkflowQuietly(w, data)}
          onEditClosed={syncWorkflowAfterEdit}
        />
      )}
      </section>

      <WorkflowAIBuilder
        open={aiOpen}
        onClose={() => setAiOpen(false)}
        onCreated={() => {
          void run(async () => {
            await reload()
          })
        }}
      />

      <Modal
        open={enrollOpen}
        title={t('campaign_workflow.enroll_title')}
        onClose={() => setEnrollOpen(false)}
        footer={
          availableTemplates.length > 0 ? (
            <>
              <button
                type="button"
                className="enroll-btn enroll-btn--secondary"
                onClick={() => setEnrollOpen(false)}
              >
                {t('global.buttons.cancel')}
              </button>
              <button
                type="button"
                className="enroll-btn enroll-btn--primary"
                disabled={busy || !selectedTemplateId}
                onClick={() =>
                  run(async () => {
                    if (!selectedTemplateId) return
                    await api.enroll(selectedTemplateId)
                    setEnrollOpen(false)
                    setSelectedTemplateId(null)
                  })
                }
              >
                {t('campaign_workflow.enroll_add')}
              </button>
            </>
          ) : undefined
        }
      >
        <p style={{ margin: '0 0 12px', color: '#64748b' }}>{t('campaign_workflow.enroll_lead')}</p>
        {catalogLoading ? (
          <p>{t('campaign_workflow.enroll_loading')}</p>
        ) : availableTemplates.length === 0 ? (
          <p>{t('campaign_workflow.enroll_empty')}</p>
        ) : (
          <label style={{ display: 'flex', flexDirection: 'column', gap: 8, fontWeight: 600 }}>
            {t('campaign_workflow.enroll_pick')}
            <select
              className="enroll-select"
              value={selectedTemplateId ?? ''}
              onChange={(e) =>
                setSelectedTemplateId(e.target.value ? Number(e.target.value) : null)
              }
            >
              <option value="">{t('campaign_workflow.enroll_select_placeholder')}</option>
              {availableTemplates.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                  {item.category ? ` — ${item.category}` : ''}
                </option>
              ))}
            </select>
          </label>
        )}
      </Modal>

      <Modal
        open={Boolean(removeTarget)}
        title={t('campaign_workflow.remove_confirm_title')}
        onClose={() => setRemoveTarget(null)}
        footer={
          <>
            <button
              type="button"
              className="enroll-btn enroll-btn--secondary"
              onClick={() => setRemoveTarget(null)}
            >
              {t('global.buttons.cancel')}
            </button>
            <button
              type="button"
              className="enroll-btn enroll-btn--danger"
              disabled={busy}
              onClick={() =>
                run(async () => {
                  if (!removeTarget) return
                  await api.remove(removeTarget.id)
                  setRemoveTarget(null)
                })
              }
            >
              {t('campaign_workflow.remove_workflow')}
            </button>
          </>
        }
      >
        {removeTarget && (
          <p style={{ margin: 0 }}>
            {t('campaign_workflow.confirm_remove_workflow', { name: removeTarget.name })}
          </p>
        )}
      </Modal>
    </div>
  )
}
