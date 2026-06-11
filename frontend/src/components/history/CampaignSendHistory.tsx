import { useCallback, useEffect, useState } from 'react'
import { api, type SendHistoryBatch, type SendHistoryResponse } from '../../api'
import ApiAlert from '../common/ApiAlert'
import { useGsapReveal } from '../../hooks/useGsapReveal'
import { useI18n, t } from '../../i18n'

type SourceFilter = 'all' | 'workflow' | 'scheduler'
type StatusFilter = 'all' | 'sent' | 'failed' | 'pending'

const REFRESH_INTERVAL_MS = 10_000

function formatDateTime (iso: string | null): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

function statusLabel (status: string, translate: (path: string) => string): string {
  const key = `send_history.status_${status}` as const
  const translated = translate(key)
  return translated === key ? status : translated
}

function statusClass (status: string): string {
  if (status === 'sent') return 'history-status history-status--sent'
  if (status === 'failed') return 'history-status history-status--failed'
  if (status === 'processing') return 'history-status history-status--processing'
  return 'history-status history-status--pending'
}

function sourceLabel (
  source: SendHistoryBatch['source'],
  translate: (path: string) => string
): string {
  return source === 'workflow'
    ? translate('send_history.source_workflow')
    : translate('send_history.source_scheduler')
}

function HistoryStats ({ summary }: { summary: SendHistoryResponse['summary'] }) {
  const { t } = useI18n()
  const ref = useGsapReveal<HTMLDivElement>()
  const cells = [
    { key: 'batches', value: summary.batches, label: t('send_history.stats.batches'), span: 'bento-featured' },
    { key: 'total', value: summary.total_messages, label: t('send_history.stats.total_messages'), span: 'bento-sm' },
    { key: 'sent', value: summary.sent, label: t('send_history.stats.sent'), span: 'bento-sm' },
    { key: 'failed', value: summary.failed, label: t('send_history.stats.failed'), span: 'bento-sm' },
    { key: 'pending', value: summary.pending + summary.processing, label: t('send_history.stats.pending'), span: 'bento-wide' }
  ]

  return (
    <div ref={ref} className="workflow-bento history-bento" aria-label="Send history statistics">
      {cells.map((cell) => (
        <article key={cell.key} data-reveal className={`bento-cell ${cell.span}`}>
          <span className="bento-cell__value tabular-nums">{cell.value}</span>
          <span className="bento-cell__label">{cell.label}</span>
        </article>
      ))}
    </div>
  )
}

function BatchCard ({ batch }: { batch: SendHistoryBatch }) {
  const { t } = useI18n()
  const [open, setOpen] = useState(false)

  return (
    <article className="history-batch">
      <header className="history-batch__header">
        <div className="history-batch__main">
          <div className="history-batch__title-row">
            <h3 className="history-batch__title">{batch.campaign_name}</h3>
            <span className={`history-batch__source history-batch__source--${batch.source}`}>
              {sourceLabel(batch.source, t)}
            </span>
          </div>
          <dl className="history-batch__meta">
            <div>
              <dt>{t('send_history.scheduled_at')}</dt>
              <dd>{formatDateTime(batch.scheduled_at)}</dd>
            </div>
            <div>
              <dt>{t('send_history.completed_at')}</dt>
              <dd>{formatDateTime(batch.completed_at)}</dd>
            </div>
            <div>
              <dt>{t('send_history.channel')}</dt>
              <dd className="history-batch__channel">{batch.channel.toUpperCase()}</dd>
            </div>
            {batch.template_id ? (
              <div>
                <dt>{t('send_history.template')}</dt>
                <dd className="history-batch__template">{batch.template_id}</dd>
              </div>
            ) : null}
          </dl>
        </div>
        <div className="history-batch__counts">
          <span className="history-count history-count--sent tabular-nums">
            {batch.sent} {t('send_history.stats.sent').toLowerCase()}
          </span>
          {batch.failed > 0 ? (
            <span className="history-count history-count--failed tabular-nums">
              {batch.failed} {t('send_history.stats.failed').toLowerCase()}
            </span>
          ) : null}
          {batch.pending + batch.processing > 0 ? (
            <span className="history-count history-count--pending tabular-nums">
              {batch.pending + batch.processing} {t('send_history.stats.pending').toLowerCase()}
            </span>
          ) : null}
          <span className="history-count history-count--total tabular-nums">
            {batch.total} {t('send_history.recipients').toLowerCase()}
          </span>
        </div>
      </header>

      {batch.recipients.length === 0 && batch.total > 0 ? (
        <p className="history-batch__legacy-note">
          {t('send_history.legacy_batch_note', { count: batch.total })}
        </p>
      ) : null}

      {batch.recipients.length > 0 ? (
        <>
          <button
            type="button"
            className="history-batch__toggle"
            aria-expanded={open}
            onClick={() => setOpen((v) => !v)}
          >
            <i className={`fa-solid fa-chevron-${open ? 'up' : 'down'}`} aria-hidden="true" />
            {open ? t('send_history.collapse') : t('send_history.expand')}
            <span className="history-batch__toggle-count tabular-nums">({batch.recipients.length})</span>
          </button>

          {open ? (
            <div className="history-table-wrap">
              <table className="history-table">
                <thead>
                  <tr>
                    <th>{t('send_history.contact')}</th>
                    <th>{t('send_history.recipient')}</th>
                    <th>{t('send_history.status')}</th>
                    <th>{t('send_history.sent_at')}</th>
                    <th>{t('send_history.attempts')}</th>
                    <th>{t('send_history.error')}</th>
                  </tr>
                </thead>
                <tbody>
                  {batch.recipients.map((row) => (
                    <tr key={row.id}>
                      <td>{row.contact_name?.trim() || '—'}</td>
                      <td className="history-table__mono">{row.recipient}</td>
                      <td>
                        <span className={statusClass(row.status)}>{statusLabel(row.status, t)}</span>
                      </td>
                      <td className="tabular-nums">{formatDateTime(row.sent_at)}</td>
                      <td className="tabular-nums">{row.attempts}</td>
                      <td className="history-table__error">{row.error_message || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}
        </>
      ) : null}
    </article>
  )
}

function downloadBlob (blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.click()
  URL.revokeObjectURL(url)
}

export default function CampaignSendHistory () {
  const { t } = useI18n()
  const heroRef = useGsapReveal<HTMLDivElement>()
  const [data, setData] = useState<SendHistoryResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [autoRefresh, setAutoRefresh] = useState(true)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)
  const [exporting, setExporting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [exportError, setExportError] = useState<string | null>(null)
  const [source, setSource] = useState<SourceFilter>('all')
  const [status, setStatus] = useState<StatusFilter>('all')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')

  const historyQuery = {
    source,
    status,
    ...(dateFrom ? { date_from: dateFrom } : {}),
    ...(dateTo ? { date_to: dateTo } : {})
  }

  const load = useCallback(async (options?: { silent?: boolean }) => {
    const silent = options?.silent === true
    if (silent) {
      setRefreshing(true)
    } else {
      setLoading(true)
      setError(null)
    }

    try {
      const result = await api.sendHistory({ ...historyQuery, limit: 50 })
      setData(result)
      setLastUpdated(new Date())
      if (silent) setError(null)
    } catch (err) {
      if (!silent) {
        setError(err instanceof Error ? err.message : t('global.api_error'))
        setData(null)
      }
    } finally {
      if (silent) setRefreshing(false)
      else setLoading(false)
    }
  }, [source, status, dateFrom, dateTo])

  useEffect(() => {
    void load()
  }, [load])

  useEffect(() => {
    if (!autoRefresh) return

    const id = window.setInterval(() => {
      if (document.visibilityState === 'hidden') return
      void load({ silent: true })
    }, REFRESH_INTERVAL_MS)

    return () => window.clearInterval(id)
  }, [autoRefresh, load])

  async function handleExport () {
    setExporting(true)
    setExportError(null)
    try {
      const blob = await api.sendHistoryExport(historyQuery)
      const stamp = new Date().toISOString().slice(0, 10)
      downloadBlob(blob, `send-history-${stamp}.csv`)
    } catch (err) {
      setExportError(err instanceof Error ? err.message : t('send_history.export_error'))
    } finally {
      setExporting(false)
    }
  }

  return (
    <div className="history-page">
      <header ref={heroRef} className="history-hero" data-reveal>
        <div className="history-hero__row">
          <div>
            <h2 className="history-hero__title">{t('send_history.page_title')}</h2>
            <p className="history-hero__lead">{t('send_history.page_lead')}</p>
          </div>
          <div className="history-hero__status">
            {refreshing ? (
              <span className="history-refresh-indicator">
                <i className="fa-solid fa-arrows-rotate fa-spin" aria-hidden="true" />
                {t('send_history.refreshing')}
              </span>
            ) : lastUpdated ? (
              <span className="history-last-updated">
                {t('send_history.last_updated', {
                  time: lastUpdated.toLocaleTimeString(undefined, {
                    hour: '2-digit',
                    minute: '2-digit',
                    second: '2-digit'
                  })
                })}
              </span>
            ) : null}
          </div>
        </div>
      </header>

      <div className="history-toolbar">
        <div className="history-filters">
        <div className="history-filters__group" role="group" aria-label="Source filter">
          {([
            ['all', t('send_history.filters.source_all')],
            ['workflow', t('send_history.filters.source_workflow')],
            ['scheduler', t('send_history.filters.source_scheduler')]
          ] as const).map(([value, label]) => (
            <button
              key={value}
              type="button"
              className={`history-filter-btn${source === value ? ' history-filter-btn--active' : ''}`}
              onClick={() => setSource(value)}
            >
              {label}
            </button>
          ))}
        </div>
        <div className="history-filters__group" role="group" aria-label="Status filter">
          {([
            ['all', t('send_history.filters.status_all')],
            ['sent', t('send_history.filters.status_sent')],
            ['failed', t('send_history.filters.status_failed')],
            ['pending', t('send_history.filters.status_pending')]
          ] as const).map(([value, label]) => (
            <button
              key={value}
              type="button"
              className={`history-filter-btn${status === value ? ' history-filter-btn--active' : ''}`}
              onClick={() => setStatus(value)}
            >
              {label}
            </button>
          ))}
        </div>
        <div className="history-filters__group history-filters__group--dates" role="group" aria-label="Date range filter">
          <label className="history-date-field">
            <span className="history-date-field__label">{t('send_history.filters.date_from')}</span>
            <input
              type="date"
              className="history-date-input"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
            />
          </label>
          <label className="history-date-field">
            <span className="history-date-field__label">{t('send_history.filters.date_to')}</span>
            <input
              type="date"
              className="history-date-input"
              value={dateTo}
              min={dateFrom || undefined}
              onChange={(e) => setDateTo(e.target.value)}
            />
          </label>
          {dateFrom || dateTo ? (
            <button
              type="button"
              className="history-filter-btn history-filter-btn--ghost"
              onClick={() => {
                setDateFrom('')
                setDateTo('')
              }}
            >
              {t('send_history.filters.clear_dates')}
            </button>
          ) : null}
        </div>
        </div>

        <div className="history-toolbar__actions">
          <button
            type="button"
            className={`history-refresh-toggle${autoRefresh ? ' history-refresh-toggle--on' : ''}`}
            aria-pressed={autoRefresh}
            onClick={() => setAutoRefresh((v) => !v)}
          >
            <i className={`fa-solid ${autoRefresh ? 'fa-arrows-rotate' : 'fa-pause'}`} aria-hidden="true" />
            {autoRefresh ? t('send_history.auto_refresh_on') : t('send_history.auto_refresh_off')}
          </button>
          <button
            type="button"
            className="history-export-btn"
            disabled={exporting || (loading && !data)}
            onClick={() => void handleExport()}
          >
            <i className="fa-solid fa-file-arrow-down" aria-hidden="true" />
            {exporting ? t('send_history.exporting') : t('send_history.export_csv')}
          </button>
        </div>
      </div>

      {exportError ? (
        <ApiAlert variant="warning" message={exportError} onRetry={() => void handleExport()} retryLabel={t('global.api_retry')} />
      ) : null}

      {error ? (
        <ApiAlert variant="error" message={error} onRetry={() => void load()} retryLabel={t('global.api_retry')} />
      ) : null}

      {loading && !data ? (
        <p className="history-loading">{t('global.loading')}</p>
      ) : null}

      {data ? (
        <>
          <HistoryStats summary={data.summary} />
          {data.batches.length === 0 ? (
            <p className="history-empty">{t('send_history.empty')}</p>
          ) : (
            <div className="history-batch-list">
              {data.batches.map((batch) => (
                <BatchCard key={batch.id} batch={batch} />
              ))}
            </div>
          )}
        </>
      ) : null}
    </div>
  )
}
