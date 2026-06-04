import { CHANNELS } from './channels'

export const DEFAULT_HOUR = 9
export const DEFAULT_MINUTE = 0
export const COST_PER_MSG = 0.02

export const CHANNEL_LIST = [
  { key: CHANNELS.SMS, label: 'SMS', icon: 'fa fa-comment' },
  { key: CHANNELS.RCS, label: 'RCS', icon: 'fa fa-comments' },
  { key: CHANNELS.EMAIL, label: 'Email', icon: 'fa fa-envelope' },
  { key: CHANNELS.VOICE, label: 'Voice', icon: 'fa fa-phone' }
]

/** Pastel cards + badge tones aligned with ROI / schedule mockups */
export const CHANNEL_COLORS: Record<string, { background: string, color: string, lightBackground: string }> = {
  sms: { background: '#d1fae5', color: '#047857', lightBackground: '#ecfdf5' },
  email: { background: '#dbeafe', color: '#1d4ed8', lightBackground: '#eff6ff' },
  rcs: { background: '#ede9fe', color: '#5b21b6', lightBackground: '#f5f3ff' },
  voice: { background: '#fef3c7', color: '#b45309', lightBackground: '#fffbeb' }
}

export const MONTH_KEY_TO_INDEX: Record<string, number> = {
  january: 0,
  february: 1,
  march: 2,
  april: 3,
  may: 4,
  june: 5,
  july: 6,
  august: 7,
  september: 8,
  october: 9,
  november: 10,
  december: 11
}

export const CAMPAIGN_CALENDAR = [
  {
    month_key: 'january',
    events: [
      { id: 1, day: 1, name_key: 'new_year', translation_key: 'new_year' },
      { id: 2, day: 10, name_key: 'winter_sales', translation_key: 'winter_sales' },
      { id: 3, day: 20, name_key: 'winter_sales_2', translation_key: 'winter_sales' }
    ]
  },
  {
    month_key: 'february',
    events: [
      { id: 4, day: 13, name_key: 'mardi_gras', translation_key: 'mardi_gras' },
      { id: 5, day: 14, name_key: 'valentine', translation_key: 'valentine' },
      { id: 6, day: 8, name_key: 'womens_day', translation_key: 'womens_day' }
    ]
  },
  {
    month_key: 'march',
    events: [
      { id: 7, day: 17, name_key: 'st_patrick', translation_key: 'st_patrick' },
      { id: 8, day: 20, name_key: 'spring', translation_key: 'spring' },
      { id: 9, day: 31, name_key: 'easter_monday', translation_key: 'easter_monday' }
    ]
  },
  {
    month_key: 'april',
    events: [
      { id: 10, day: 1, name_key: 'april_fools', translation_key: 'april_fools' },
      { id: 11, day: 15, name_key: 'spring_sales', translation_key: 'spring_sales' },
      { id: 12, day: 22, name_key: 'earth_day', translation_key: 'earth_day' }
    ]
  },
  {
    month_key: 'may',
    events: [
      { id: 13, day: 1, name_key: 'labor_day', translation_key: 'labor_day' },
      { id: 14, day: 8, name_key: 'mothers_day', translation_key: 'mothers_day' },
      { id: 15, day: 25, name_key: 'spring_clearance', translation_key: 'spring_clearance' }
    ]
  },
  {
    month_key: 'june',
    events: [
      { id: 16, day: 1, name_key: 'summer_kickoff', translation_key: 'summer_kickoff' },
      { id: 17, day: 15, name_key: 'fathers_day', translation_key: 'fathers_day' },
      { id: 18, day: 21, name_key: 'summer_solstice', translation_key: 'summer_solstice' }
    ]
  },
  {
    month_key: 'july',
    events: [
      { id: 19, day: 4, name_key: 'summer_sales', translation_key: 'summer_sales' },
      { id: 20, day: 14, name_key: 'bastille', translation_key: 'bastille' },
      { id: 21, day: 30, name_key: 'mid_summer', translation_key: 'mid_summer' }
    ]
  },
  {
    month_key: 'august',
    events: [
      { id: 22, day: 15, name_key: 'summer_promo', translation_key: 'summer_promo' },
      { id: 23, day: 20, name_key: 'back_to_school', translation_key: 'back_to_school' },
      { id: 24, day: 31, name_key: 'end_summer', translation_key: 'end_summer' }
    ]
  },
  {
    month_key: 'september',
    events: [
      { id: 25, day: 1, name_key: 'fall_launch', translation_key: 'fall_launch' },
      { id: 26, day: 15, name_key: 'mid_autumn', translation_key: 'mid_autumn' },
      { id: 27, day: 22, name_key: 'autumn_equinox', translation_key: 'autumn_equinox' }
    ]
  },
  {
    month_key: 'october',
    events: [
      { id: 28, day: 1, name_key: 'halloween_prep', translation_key: 'halloween_prep' },
      { id: 29, day: 31, name_key: 'halloween', translation_key: 'halloween' },
      { id: 30, day: 20, name_key: 'fall_sales', translation_key: 'fall_sales' }
    ]
  },
  {
    month_key: 'november',
    events: [
      { id: 31, day: 1, name_key: 'black_friday_prep', translation_key: 'black_friday_prep' },
      { id: 32, day: 28, name_key: 'black_friday', translation_key: 'black_friday' },
      { id: 33, day: 30, name_key: 'cyber_monday', translation_key: 'cyber_monday' }
    ]
  },
  {
    month_key: 'december',
    events: [
      { id: 34, day: 6, name_key: 'st_nicholas', translation_key: 'st_nicholas' },
      { id: 35, day: 24, name_key: 'christmas_eve', translation_key: 'christmas_eve' },
      { id: 36, day: 31, name_key: 'new_year_eve', translation_key: 'new_year_eve' }
    ]
  }
]
