export const DEFAULT_DELAY_VALUE = 0
export const DEFAULT_DELAY_UNIT = 'minute'

export const TIME_MULTIPLIERS: Record<string, number> = {
  minute: 1,
  hour: 60,
  day: 1440
}

export const CHANNEL_ICON_MAP: Record<string, string> = {
  email: 'fas fa-envelope',
  sms: 'fas fa-comment',
  rcs: 'fas fa-comments',
  rbm: 'fas fa-comments',
  voice: 'fas fa-phone',
  voice_sms: 'fas fa-phone'
}

export const CHANNEL_NAME_MAP: Record<string, string> = {
  email: 'Email',
  sms: 'SMS',
  rcs: 'RCS',
  rbm: 'RCS',
  voice: 'Voice',
  voice_sms: 'Voice'
}
