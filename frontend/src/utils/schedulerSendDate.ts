import { MONTH_KEY_TO_INDEX } from '../constants/campaignAutoScheduler'

/** Mirrors backend computeSendAt — next occurrence minus days_before at hour:minute. */
export function computeSchedulerSendDate (
  monthKey: string | undefined,
  eventDay: number,
  daysBefore: number,
  hour: number,
  minute: number,
  now = new Date()
): Date | null {
  if (!monthKey) return null
  const monthIndex = MONTH_KEY_TO_INDEX[monthKey]
  if (monthIndex === undefined) return null

  const year = now.getFullYear()
  const todayStart = new Date(year, now.getMonth(), now.getDate())
  let eventDate = new Date(year, monthIndex, eventDay)

  if (eventDate < todayStart) {
    eventDate = new Date(year + 1, monthIndex, eventDay)
  }

  const sendAt = new Date(eventDate)
  sendAt.setDate(sendAt.getDate() - Math.max(0, daysBefore))
  sendAt.setHours(hour, minute, 0, 0)
  return sendAt
}

export function formatSchedulerSendDate (date: Date): { date: string; time: string } {
  return {
    date: date.toLocaleDateString('en-GB', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    }),
    time: `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`
  }
}
