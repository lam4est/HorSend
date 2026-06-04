import { useEffect, useMemo, useState } from 'react'
import {
  CHANNEL_LIST,
  DEFAULT_HOUR,
  DEFAULT_MINUTE
} from '../../constants/campaignAutoScheduler'
import { CHANNELS } from '../../constants/channels'
import { api, type ContactList, type MessageTemplate } from '../../api'
import { en, t } from '../../i18n/en'
import type { SchedulerEventView } from '../../utils/schedulerCalendar'
import Modal from '../common/Modal'

export type SchedulerSavePayload = {
  channel: string
  templateId: string | null
  contactListId: number | null
  contactListName: string | null
  contactsCount: number
  hour: number
  minute: number
  daysBefore: number
}

type EditCampaignSchedulerModalProps = {
  open: boolean
  event: (SchedulerEventView & { month_key?: string }) | null
  onClose: () => void
  onSaved: (payload: SchedulerSavePayload) => void
}

export default function EditCampaignSchedulerModal ({
  open,
  event,
  onClose,
  onSaved
}: EditCampaignSchedulerModalProps) {
  const [channel, setChannel] = useState(CHANNELS.SMS)
  const [templateId, setTemplateId] = useState<string | null>(null)
  const [useAllContacts, setUseAllContacts] = useState(true)
  const [contactListId, setContactListId] = useState<number | null>(null)
  const [hour, setHour] = useState(DEFAULT_HOUR)
  const [minute, setMinute] = useState(DEFAULT_MINUTE)
  const [daysBefore, setDaysBefore] = useState(0)
  const [templates, setTemplates] = useState<MessageTemplate[]>([])
  const [contactLists, setContactLists] = useState<ContactList[]>([])
  const [totalContacts, setTotalContacts] = useState(0)

  useEffect(() => {
    if (!open) return
    void Promise.all([api.contactLists(), api.templates(channel)]).then(([lists, tpl]) => {
      setContactLists(lists.items)
      setTotalContacts(lists.total_contacts)
      setTemplates(tpl.items)
    })
  }, [open, channel])

  useEffect(() => {
    if (!event) return
    setChannel(event.channel || CHANNELS.SMS)
    setTemplateId(event.templateId)
    setUseAllContacts(!event.contactListId)
    setContactListId(event.contactListId)
    setHour(event.hour ?? DEFAULT_HOUR)
    setMinute(event.minute ?? DEFAULT_MINUTE)
    setDaysBefore(event.daysBefore ?? 0)
  }, [event])

  const showTemplate = ['sms', 'rcs', 'email', 'voice'].includes(channel)

  const canSave =
    Boolean(channel) &&
    (!showTemplate || Boolean(templateId)) &&
    (useAllContacts || contactListId != null)

  const modalTitle = useMemo(() => {
    if (!event) return t('campaign_auto_scheduler.edit_modal.title')
    const month =
      event.month_key != null
        ? (en.global.months as Record<string, string>)[event.month_key] ?? event.month_key
        : ''
    const day = String(event.day).padStart(2, '0')
    const name =
      event.translation_key != null
        ? t(`campaign_auto_scheduler.events.${event.translation_key}`)
        : event.title
    if (name && month) return `${name} - ${month} ${day}`
    return t('campaign_auto_scheduler.edit_modal.title')
  }, [event])

  function save () {
    if (!canSave) return
    let contactsCount = totalContacts
    let contactListName: string | null = null
    if (!useAllContacts && contactListId != null) {
      const list = contactLists.find((l) => l.id === contactListId)
      contactsCount = list?.contacts_count ?? 0
      contactListName = list?.name ?? null
    }
    onSaved({
      channel,
      templateId,
      contactListId: useAllContacts ? null : contactListId,
      contactListName,
      contactsCount,
      hour,
      minute,
      daysBefore
    })
  }

  return (
    <Modal
      open={open}
      title={modalTitle}
      onClose={onClose}
      footer={
        <div className="edit-scheduler-modal__footer">
          <button type="button" className="edit-scheduler-modal__btn-cancel" onClick={onClose}>
            {t('global.buttons.cancel')}
          </button>
          <button
            type="button"
            className="edit-scheduler-modal__btn-save"
            disabled={!canSave}
            onClick={save}
          >
            {t('global.buttons.save')}
          </button>
        </div>
      }
    >
      <div className="edit-scheduler-modal">
        <div className="edit-scheduler-modal__field">
          <label className="edit-scheduler-modal__label">
            {t('campaign_auto_scheduler.edit_modal.channel')}
          </label>
          <select
            className="edit-scheduler-modal__select"
            value={channel}
            onChange={(e) => {
              setChannel(e.target.value)
              setTemplateId(null)
            }}
          >
            <option value="">{t('campaign_auto_scheduler.edit_modal.select_channel')}</option>
            {CHANNEL_LIST.map((ch) => (
              <option key={ch.key} value={ch.key}>
                {ch.label}
              </option>
            ))}
          </select>
        </div>

        {showTemplate ? (
          <div className="edit-scheduler-modal__field">
            <label className="edit-scheduler-modal__label">
              {t('campaign_auto_scheduler.edit_modal.template')}
            </label>
            <select
              className="edit-scheduler-modal__select"
              value={templateId ?? ''}
              onChange={(e) => setTemplateId(e.target.value || null)}
            >
              <option value="">{t('campaign_auto_scheduler.edit_modal.select_template')}</option>
              {templates.map((tpl) => (
                <option key={tpl.id} value={tpl.id}>
                  {tpl.title || tpl.name}
                </option>
              ))}
            </select>
          </div>
        ) : null}

        <div className="edit-scheduler-modal__field">
          <label className="edit-scheduler-modal__label">
            {t('campaign_auto_scheduler.edit_modal.recipients')}
          </label>
          <div className="edit-scheduler-modal__toggle-row">
            <button
              type="button"
              className={`edit-scheduler-modal__toggle${useAllContacts ? ' is-selected' : ''}`}
              onClick={() => {
                setUseAllContacts(true)
                setContactListId(null)
              }}
            >
              <span className="edit-scheduler-modal__toggle-label">
                {t('campaign_auto_scheduler.edit_modal.all_contacts')}
              </span>
              {useAllContacts ? <i className="fa fa-check edit-scheduler-modal__check" /> : null}
            </button>
            <button
              type="button"
              className={`edit-scheduler-modal__toggle${!useAllContacts ? ' is-selected' : ''}`}
              onClick={() => setUseAllContacts(false)}
            >
              <span className="edit-scheduler-modal__toggle-label">
                {t('campaign_auto_scheduler.edit_modal.my_contact_lists')}
              </span>
              {!useAllContacts ? <i className="fa fa-check edit-scheduler-modal__check" /> : null}
            </button>
          </div>
        </div>

        {!useAllContacts ? (
          <div className="edit-scheduler-modal__field edit-scheduler-modal__field--nested">
            <label className="edit-scheduler-modal__label">
              {t('campaign_auto_scheduler.edit_modal.contact_list')}
            </label>
            <select
              className="edit-scheduler-modal__select"
              value={contactListId ?? ''}
              onChange={(e) => setContactListId(e.target.value ? Number(e.target.value) : null)}
            >
              <option value="">{t('campaign_auto_scheduler.edit_modal.select_contact_list')}</option>
              {contactLists.map((list) => (
                <option key={list.id} value={list.id}>
                  {list.name} ({list.contacts_count}{' '}
                  {t('campaign_auto_scheduler.edit_modal.contacts')})
                </option>
              ))}
            </select>
          </div>
        ) : null}

        <div className="edit-scheduler-modal__field">
          <label className="edit-scheduler-modal__label">
            {t('campaign_auto_scheduler.edit_modal.send_date')}
          </label>
          <div className="edit-scheduler-modal__send-date">
            <input
              type="number"
              min={0}
              className="edit-scheduler-modal__days-input"
              value={daysBefore}
              onChange={(e) => setDaysBefore(Number(e.target.value) || 0)}
            />
            <span className="edit-scheduler-modal__send-date-text">
              {t('campaign_auto_scheduler.edit_modal.days_before_at')}
            </span>
            <select
              className="edit-scheduler-modal__select edit-scheduler-modal__select--time"
              value={hour}
              onChange={(e) => setHour(Number(e.target.value))}
            >
              {Array.from({ length: 24 }, (_, i) => (
                <option key={i} value={i}>
                  {String(i).padStart(2, '0')}
                </option>
              ))}
            </select>
            <span className="edit-scheduler-modal__time-sep">:</span>
            <select
              className="edit-scheduler-modal__select edit-scheduler-modal__select--time"
              value={minute}
              onChange={(e) => setMinute(Number(e.target.value))}
            >
              {Array.from({ length: 60 }, (_, i) => (
                <option key={i} value={i}>
                  {String(i).padStart(2, '0')}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>
    </Modal>
  )
}
