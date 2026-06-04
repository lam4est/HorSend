import { CAMPAIGN_CALENDAR, COST_PER_MSG, DEFAULT_HOUR, DEFAULT_MINUTE } from '../constants/campaignAutoScheduler'
import { CHANNELS } from '../constants/channels'
import { t } from '../i18n/en'

export type SchedulerEventView = {
  id: number
  day: number
  name_key: string
  translation_key: string
  title: string
  isActive: boolean
  channel: string
  templateId: string | null
  contactListId: number | null
  hour: number
  minute: number
  daysBefore: number
  contactsCount: number
  costPerContact: number
}

export type SchedulerMonthView = {
  month_key: string
  events: SchedulerEventView[]
}

type ApiSchedulerEvent = {
  id: number
  title: string
  subscribed: boolean
  channel?: string
  template_id?: string | null
  contact_list_id?: number | null
  hour?: number
  minute?: number
  days_before?: number
  contacts_count?: number
}

type ApiScheduler = {
  items: Array<{
    month_key: string
    events: ApiSchedulerEvent[]
  }>
}

export function buildSchedulerCalendar (api: ApiScheduler): SchedulerMonthView[] {
  const apiById = new Map<number, ApiSchedulerEvent>()

  for (const month of api.items) {
    for (const ev of month.events) {
      apiById.set(ev.id, ev)
    }
  }

  return CAMPAIGN_CALENDAR.map((month) => ({
    month_key: month.month_key,
    events: month.events.map((event) => {
      const key = event.translation_key ?? event.name_key
      const fallbackTitle = t(`campaign_auto_scheduler.events.${key}`)
      const apiEv = apiById.get(event.id)
      return {
        id: event.id,
        day: event.day,
        name_key: event.name_key,
        translation_key: key,
        title: apiEv?.title ?? fallbackTitle,
        isActive: apiEv?.subscribed ?? false,
        channel: apiEv?.channel ?? CHANNELS.SMS,
        templateId: apiEv?.template_id ?? null,
        contactListId: apiEv?.contact_list_id ?? null,
        hour: apiEv?.hour ?? DEFAULT_HOUR,
        minute: apiEv?.minute ?? DEFAULT_MINUTE,
        daysBefore: apiEv?.days_before ?? 0,
        contactsCount: apiEv?.subscribed ? (apiEv?.contacts_count ?? 0) : 0,
        costPerContact: COST_PER_MSG
      }
    })
  }))
}
