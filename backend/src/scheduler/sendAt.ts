export type SendWindow = {
  sendAt: Date
  eventYear: number
}

/** Next upcoming occurrence of a calendar event (month/day). */
export function nextEventOccurrence (
  eventMonth: number,
  eventDay: number,
  now = new Date()
): { eventDate: Date; eventYear: number } {
  const year = now.getFullYear()
  const todayStart = new Date(year, now.getMonth(), now.getDate())
  let eventDate = new Date(year, eventMonth - 1, eventDay)

  if (eventDate < todayStart) {
    eventDate = new Date(year + 1, eventMonth - 1, eventDay)
    return { eventDate, eventYear: year + 1 }
  }

  return { eventDate, eventYear: year }
}

/** Send date = event date minus days_before at hour:minute. */
export function computeSendAt (
  eventMonth: number,
  eventDay: number,
  daysBefore: number,
  hour: number,
  minute: number,
  now = new Date()
): SendWindow {
  const { eventDate, eventYear } = nextEventOccurrence(eventMonth, eventDay, now)
  const sendAt = new Date(eventDate)
  sendAt.setDate(sendAt.getDate() - Math.max(0, daysBefore))
  sendAt.setHours(hour, minute, 0, 0)
  return { sendAt, eventYear }
}

/** True once the configured send date/time has been reached. */
export function isSendTimeReached (sendAt: Date, now: Date): boolean {
  return sendAt.getTime() <= now.getTime()
}
