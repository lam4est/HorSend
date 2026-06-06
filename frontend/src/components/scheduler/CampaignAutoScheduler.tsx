import { useCallback, useEffect, useMemo, useState } from 'react'
import { api } from '../../api'
import { t } from '../../i18n/en'
import { useGsapPinSplit, useGsapReveal } from '../../hooks/useGsapReveal'
import ApiAlert from '../common/ApiAlert'
import ChannelMarquee from '../common/ChannelMarquee'
import {
  buildSchedulerCalendar,
  type SchedulerEventView,
  type SchedulerMonthView
} from '../../utils/schedulerCalendar'
import EditCampaignSchedulerModal, {
  type SchedulerSavePayload
} from './EditCampaignSchedulerModal'
import MonthSection from './MonthSection'
import RoiCalculatorSection from './RoiCalculatorSection'
import SchedulerHero from './SchedulerHero'

export default function CampaignAutoScheduler () {
  const pinRef = useGsapPinSplit('.scheduler-pin__aside', '.scheduler-pin__scroll')
  const roiRef = useGsapReveal<HTMLElement>()
  const [calendar, setCalendar] = useState<SchedulerMonthView[]>([])
  const [busy, setBusy] = useState(false)
  const [loading, setLoading] = useState(true)
  const [apiWarning, setApiWarning] = useState<string | null>(null)
  const [editEvent, setEditEvent] = useState<
    (SchedulerEventView & { month_key: string }) | null
  >(null)

  const reload = useCallback(async () => {
    setApiWarning(null)
    const data = await api.scheduler()
    setCalendar(buildSchedulerCalendar(data))
  }, [])

  useEffect(() => {
    setLoading(true)
    reload()
      .catch((err) => {
        setCalendar(buildSchedulerCalendar({ items: [] }))
        setApiWarning(err instanceof Error ? err.message : t('global.api_error'))
      })
      .finally(() => setLoading(false))
  }, [reload])

  const activeEvents = useMemo(
    () => calendar.flatMap((m) => m.events.filter((e) => e.isActive)),
    [calendar]
  )

  function patchEvent (eventId: number, patch: Partial<SchedulerEventView>) {
    setCalendar((prev) =>
      prev.map((month) => ({
        ...month,
        events: month.events.map((ev) => (ev.id === eventId ? { ...ev, ...patch } : ev))
      }))
    )
  }

  async function saveSubscription (
    eventId: number,
    enabled: boolean,
    extra?: Partial<SchedulerSavePayload>
  ) {
    await api.saveSchedulerSubscription({
      scheduler_event_id: eventId,
      is_enabled: enabled,
      channel: extra?.channel,
      templateId: extra?.templateId,
      contactListId: extra?.contactListId,
      hour: extra?.hour,
      minute: extra?.minute,
      daysBefore: extra?.daysBefore,
      contactsCount: extra?.contactsCount
    })
    await reload()
  }

  async function handleToggle (event: SchedulerEventView, enabled: boolean) {
    if (enabled) {
      const month = calendar.find((m) => m.events.some((e) => e.id === event.id))
      setEditEvent({ ...event, month_key: month?.month_key ?? 'january' })
      return
    }
    setBusy(true)
    patchEvent(event.id, { isActive: false, contactsCount: 0 })
    try {
      await saveSubscription(event.id, false, { channel: event.channel })
    } catch {
      await reload()
    } finally {
      setBusy(false)
    }
  }

  async function handleSaved (payload: SchedulerSavePayload) {
    if (!editEvent) return
    setBusy(true)
    setEditEvent(null)
    patchEvent(editEvent.id, {
      isActive: true,
      channel: payload.channel,
      templateId: payload.templateId,
      contactListId: payload.contactListId,
      hour: payload.hour,
      minute: payload.minute,
      daysBefore: payload.daysBefore,
      contactsCount: payload.contactsCount
    })
    try {
      await saveSubscription(editEvent.id, true, payload)
    } catch {
      patchEvent(editEvent.id, { isActive: false })
      await reload()
    } finally {
      setBusy(false)
    }
  }

  function handleEdit (event: SchedulerEventView) {
    const month = calendar.find((m) => m.events.some((e) => e.id === event.id))
    setEditEvent({ ...event, month_key: month?.month_key ?? 'january' })
  }

  return (
    <div className="campaign-auto-scheduler">
      <SchedulerHero />
      <ChannelMarquee />

      {apiWarning ? (
        <ApiAlert
          variant="warning"
          message={`${apiWarning} — ${t('campaign_auto_scheduler.api_offline_hint')}`}
          retryLabel={t('global.api_retry')}
          onRetry={() => {
            setLoading(true)
            reload().finally(() => setLoading(false))
          }}
        />
      ) : null}

      {loading ? (
        <p className="workflow-list__status">{t('global.loading')}</p>
      ) : null}

      <section ref={pinRef} className="scheduler-pin workflow-section workflow-section--desire">
        <aside className="scheduler-pin__aside">
          <h2 className="scheduler-pin__title">{t('campaign_auto_scheduler.calendar_pin_title')}</h2>
          <p className="scheduler-pin__lead">{t('campaign_auto_scheduler.calendar_pin_lead')}</p>
        </aside>
        <div className="scheduler-pin__scroll">
          <div className="campaign-calendar">
            <div className="month-cells-grid">
              {calendar.map((month) => (
                <div key={month.month_key} className="month-cell">
                  <MonthSection
                    month={month}
                    onEdit={handleEdit}
                    onToggle={(ev, enabled) => {
                      if (!busy) void handleToggle(ev, enabled)
                    }}
                  />
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section ref={roiRef} className="workflow-section workflow-section--action">
        <RoiCalculatorSection activeEvents={activeEvents} />
      </section>

      <EditCampaignSchedulerModal
        open={editEvent != null}
        event={editEvent}
        onClose={() => {
          if (editEvent) patchEvent(editEvent.id, { isActive: false })
          setEditEvent(null)
        }}
        onSaved={(payload) => void handleSaved(payload)}
      />
    </div>
  )
}
