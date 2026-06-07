import { useMemo, useState } from 'react'
import { CHANNEL_COLORS, CHANNEL_LIST, COST_PER_MSG } from '../../constants/campaignAutoScheduler'
import { CHANNELS } from '../../constants/channels'
import { t } from '../../i18n/en'
import type { SchedulerEventView } from '../../utils/schedulerCalendar'

type RoiCalculatorSectionProps = {
  activeEvents: SchedulerEventView[]
}

export default function RoiCalculatorSection ({ activeEvents }: RoiCalculatorSectionProps) {
  const [conversionRates, setConversionRates] = useState({
    sms: 0,
    email: 0,
    rcs: 0,
    voice: 0
  })
  const [averageBasket, setAverageBasket] = useState(0)

  const channelStats = useMemo(() => {
    const stats: Record<string, { events: number; contactsCount: number; totalCost: number }> = {
      sms: { events: 0, contactsCount: 0, totalCost: 0 },
      email: { events: 0, contactsCount: 0, totalCost: 0 },
      rcs: { events: 0, contactsCount: 0, totalCost: 0 },
      voice: { events: 0, contactsCount: 0, totalCost: 0 }
    }

    for (const event of activeEvents) {
      let channel = event.channel || CHANNELS.SMS
      if (channel === CHANNELS.VOICE_SMS) channel = CHANNELS.VOICE
      if (!stats[channel]) continue
      const contacts = event.contactsCount || 0
      const cost = event.costPerContact || COST_PER_MSG
      stats[channel].events++
      stats[channel].contactsCount += contacts
      stats[channel].totalCost += contacts * cost
    }

    return stats
  }, [activeEvents])

  const totalContacts = Object.values(channelStats).reduce((s, c) => s + c.contactsCount, 0)
  const totalCost = Object.values(channelStats)
    .reduce((s, c) => s + c.totalCost, 0)
    .toFixed(2)
  const avgCost = totalContacts === 0 ? '0.00' : (parseFloat(totalCost) / totalContacts).toFixed(2)

  const estimated = useMemo(() => {
    let orders = 0
    for (const ch of Object.keys(channelStats)) {
      const contacts = channelStats[ch].contactsCount
      const rate = conversionRates[ch as keyof typeof conversionRates] || 0
      orders += contacts * (rate / 100)
    }
    const revenue = orders * averageBasket
    const investment = parseFloat(totalCost)
    const roi = investment > 0 ? (((revenue - investment) / investment) * 100).toFixed(0) : '0'
    const revenuePerEuro = investment > 0 ? (revenue / investment).toFixed(2) : '0.00'
    return {
      orders: Math.round(orders),
      revenue: revenue.toFixed(2),
      investment: totalCost,
      roi,
      revenuePerEuro
    }
  }, [channelStats, conversionRates, averageBasket, totalCost])

  const roiPositive = parseFloat(estimated.roi) >= 0

  return (
    <div className="roi-calculator-section" data-reveal>
      <header className="roi-calculator-section__header">
        <div className="roi-calculator-section__header-icon">
          <i className="fa fa-calculator" aria-hidden="true" />
        </div>
        <div>
          <h2 className="roi-calculator-section__title">
            {t('campaign_auto_scheduler.roi_calculator.title')}
          </h2>
          <p className="roi-calculator-section__subtitle">
            {t('campaign_auto_scheduler.roi_calculator.recap_title', { count: activeEvents.length })}
          </p>
        </div>
      </header>

      <div className="roi-calculator-section__body">
        <div className="roi-calculator-section__inputs">
          <div className="roi-channel-grid">
            {CHANNEL_LIST.map((channel) => {
              const stat = channelStats[channel.key]
              const colors = CHANNEL_COLORS[channel.key]
              return (
                <article key={channel.key} className="roi-channel-card">
                  <div className="roi-channel-card__head">
                    <span
                      className="roi-channel-card__icon"
                      style={{ background: colors?.background, color: colors?.color }}
                    >
                      <i className={channel.icon} aria-hidden="true" />
                    </span>
                    <span className="roi-channel-card__name">{channel.label}</span>
                  </div>
                  <dl className="roi-channel-card__metrics">
                    <div>
                      <dt>{t('campaign_auto_scheduler.roi_calculator.events')}</dt>
                      <dd className="tabular-nums">{stat.events}</dd>
                    </div>
                    <div>
                      <dt>{t('campaign_auto_scheduler.roi_calculator.contacts')}</dt>
                      <dd className="tabular-nums">{stat.contactsCount}</dd>
                    </div>
                    <div>
                      <dt>Cost</dt>
                      <dd className="tabular-nums">{stat.totalCost.toFixed(2)}€</dd>
                    </div>
                  </dl>
                </article>
              )
            })}
          </div>

          <div className="roi-totals-bar">
            <div className="roi-total-item">
              <span className="roi-total-item__label">
                {t('campaign_auto_scheduler.roi_calculator.total_contacts')}
              </span>
              <span className="roi-total-item__value tabular-nums">{totalContacts}</span>
            </div>
            <div className="roi-total-item">
              <span className="roi-total-item__label">
                {t('campaign_auto_scheduler.roi_calculator.total_cost')}
              </span>
              <span className="roi-total-item__value roi-total-item__value--accent tabular-nums">
                {totalCost}€
              </span>
            </div>
            <div className="roi-total-item">
              <span className="roi-total-item__label">
                {t('campaign_auto_scheduler.roi_calculator.avg_cost')}
              </span>
              <span className="roi-total-item__value tabular-nums">{avgCost}€</span>
            </div>
          </div>

          <div className="roi-input-panel">
            <h3 className="roi-input-panel__title">
              {t('campaign_auto_scheduler.roi_calculator.conversion_rates_title')}
            </h3>
            <div className="roi-conversion-grid">
              {CHANNEL_LIST.map((channel) => (
                <div key={channel.key} className="roi-input-field">
                  <label htmlFor={`roi-rate-${channel.key}`}>{channel.label} (%)</label>
                  <input
                    id={`roi-rate-${channel.key}`}
                    type="number"
                    className="roi-input-field__control"
                    min={0}
                    max={100}
                    step={0.1}
                    value={conversionRates[channel.key as keyof typeof conversionRates]}
                    onChange={(e) =>
                      setConversionRates((r) => ({
                        ...r,
                        [channel.key]: Number(e.target.value)
                      }))
                    }
                  />
                </div>
              ))}
            </div>

            <div className="roi-input-field roi-input-field--basket">
              <label htmlFor="roi-basket">
                {t('campaign_auto_scheduler.roi_calculator.average_basket_title')}
              </label>
              <div className="roi-input-field__basket-wrap">
                <input
                  id="roi-basket"
                  type="number"
                  className="roi-input-field__control"
                  min={0}
                  step={1}
                  value={averageBasket}
                  onChange={(e) => setAverageBasket(Number(e.target.value))}
                />
                <span className="roi-input-field__suffix">€</span>
              </div>
            </div>
          </div>
        </div>

        <aside className="roi-calculator-section__results">
          <h3 className="roi-results-panel__title">
            {t('campaign_auto_scheduler.roi_calculator.estimated_results')}
          </h3>

          <div className={`roi-hero-metric${roiPositive ? ' roi-hero-metric--positive' : ' roi-hero-metric--neutral'}`}>
            <span className="roi-hero-metric__label">ROI</span>
            <span className="roi-hero-metric__value tabular-nums">{estimated.roi}%</span>
          </div>

          <div className="roi-results-grid">
            <div className="roi-result-card">
              <span className="roi-result-card__label">
                {t('campaign_auto_scheduler.roi_calculator.generated_orders')}
              </span>
              <span className="roi-result-card__value tabular-nums">{estimated.orders}</span>
            </div>
            <div className="roi-result-card">
              <span className="roi-result-card__label">
                {t('campaign_auto_scheduler.roi_calculator.estimated_revenue')}
              </span>
              <span className="roi-result-card__value roi-result-card__value--highlight tabular-nums">
                {estimated.revenue} €
              </span>
            </div>
            <div className="roi-result-card">
              <span className="roi-result-card__label">
                {t('campaign_auto_scheduler.roi_calculator.investment')}
              </span>
              <span className="roi-result-card__value tabular-nums">{estimated.investment} €</span>
            </div>
          </div>

          <p className="roi-results-note">
            {t('campaign_auto_scheduler.roi_calculator.investment_note', {
              revenuePerEuro: estimated.revenuePerEuro
            })}
          </p>
        </aside>
      </div>
    </div>
  )
}
