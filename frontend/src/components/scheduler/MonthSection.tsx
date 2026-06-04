import { CHANNEL_COLORS, CHANNEL_LIST } from '../../constants/campaignAutoScheduler'
import { en, t } from '../../i18n/en'
import type { SchedulerEventView, SchedulerMonthView } from '../../utils/schedulerCalendar'
import ToggleButton from './ToggleButton'

type MonthSectionProps = {
  month: SchedulerMonthView
  onEdit: (event: SchedulerEventView) => void
  onToggle: (event: SchedulerEventView, enabled: boolean) => void
}

export default function MonthSection ({ month, onEdit, onToggle }: MonthSectionProps) {
  return (
    <div className="month-section">
      <div className="month-header">
        <h5 className="month-header-title">
          {(en.global.months as Record<string, string>)[month.month_key] ?? month.month_key}
        </h5>
      </div>
      <div className="month-events">
        {month.events.map((event) => (
          <EventCard key={event.id} event={event} onEdit={onEdit} onToggle={onToggle} />
        ))}
      </div>
    </div>
  )
}

function EventCard ({
  event,
  onEdit,
  onToggle
}: {
  event: SchedulerEventView
  onEdit: (event: SchedulerEventView) => void
  onToggle: (event: SchedulerEventView, enabled: boolean) => void
}) {
  const channelKey = event.channel === 'voice_sms' ? 'voice' : event.channel
  const channelMeta = CHANNEL_LIST.find((c) => c.key === channelKey) ?? CHANNEL_LIST[0]
  const colors = CHANNEL_COLORS[channelKey] ?? CHANNEL_COLORS.sms
  const eventTitle =
    event.title ||
    (event.translation_key != null
      ? t(`campaign_auto_scheduler.events.${event.translation_key}`)
      : event.name_key)

  return (
    <div className={`event-card${event.isActive ? '' : ' event-inactive'}`}>
      <div className="event-row">
        <div className="event-left">
          <div className="event-title-row">
            <span className="event-day">{String(event.day).padStart(2, '0')}</span>
            <span className="event-name">{eventTitle}</span>
          </div>
          <span
            className={`channel-badge channel-${channelKey}`}
            style={{ background: colors.background, color: colors.color }}
          >
            <i className={`${channelMeta.icon} channel-badge-icon`} aria-hidden="true" />
            {channelMeta.label.toUpperCase()}
          </span>
        </div>
        <div className="event-actions">
          <button
            type="button"
            className={`action-btn${event.isActive ? '' : ' disabled'}`}
            title={t('campaign_auto_scheduler.edit')}
            disabled={!event.isActive}
            onClick={() => onEdit(event)}
          >
            <i className="fa fa-pencil action-btn-icon" aria-hidden="true" />
          </button>
          <button
            type="button"
            className={`action-btn${event.isActive ? '' : ' disabled'}`}
            disabled={!event.isActive}
            aria-hidden="true"
          >
            <i className="fa fa-bell action-btn-icon" aria-hidden="true" />
          </button>
          <ToggleButton
            checked={event.isActive}
            onChange={(enabled) => onToggle(event, enabled)}
          />
        </div>
      </div>
    </div>
  )
}
