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

  return (
    <div className="roi-calculator-section" data-reveal>
      <div className="calculator-header">
        <i className="fa fa-calculator calculator-header-icon" aria-hidden="true" />
        <h5 className="calculator-header-title">{t('campaign_auto_scheduler.roi_calculator.title')}</h5>
      </div>

      <div className="calculator-content">
        <div className="recap-summary">
          <p className="recap-title" style={{ fontWeight: 600, marginBottom: 12 }}>
            {t('campaign_auto_scheduler.roi_calculator.recap_title', { count: activeEvents.length })}
          </p>
          <div className="channel-stats">
            {CHANNEL_LIST.map((channel) => {
              const stat = channelStats[channel.key]
              const colors = CHANNEL_COLORS[channel.key]
              return (
                <div
                  key={channel.key}
                  className="channel-item"
                  style={{
                    background: colors?.lightBackground,
                    color: colors?.color
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 700 }}>
                    <i className={channel.icon} aria-hidden="true" />
                    {channel.label}
                  </div>
                  <div className="channel-details">
                    <span>
                      {stat.events} {t('campaign_auto_scheduler.roi_calculator.events')}
                    </span>
                    <span>
                      {stat.contactsCount} {t('campaign_auto_scheduler.roi_calculator.contacts')}
                    </span>
                    <span>
                      {stat.totalCost.toFixed(2)}€
                    </span>
                  </div>
                </div>
              )
            })}
          </div>

          <div className="total-summary-bar">
            <div className="total-stat">
              <div className="total-stat-label">{t('campaign_auto_scheduler.roi_calculator.total_contacts')}</div>
              <div className="total-stat-value">{totalContacts}</div>
            </div>
            <div className="total-stat">
              <div className="total-stat-label">{t('campaign_auto_scheduler.roi_calculator.total_cost')}</div>
              <div className="total-stat-value total-stat-value--accent">{totalCost}€</div>
            </div>
            <div className="total-stat">
              <div className="total-stat-label">{t('campaign_auto_scheduler.roi_calculator.avg_cost')}</div>
              <div className="total-stat-value">{avgCost}€</div>
            </div>
          </div>
        </div>

        <div className="conversion-inputs">
          <h6 style={{ margin: '0 0 12px' }}>{t('campaign_auto_scheduler.roi_calculator.conversion_rates_title')}</h6>
          <div className="input-row">
            {CHANNEL_LIST.map((channel) => (
              <div key={channel.key} className="input-group">
                <label style={{ fontWeight: 700, fontSize: 13 }}>{channel.label} (%)</label>
                <input
                  type="number"
                  className="form-control"
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
        </div>

        <div className="basket-input">
          <label style={{ fontWeight: 700, fontSize: 13 }}>
            {t('campaign_auto_scheduler.roi_calculator.average_basket_title')}
          </label>
          <input
            type="number"
            className="form-control"
            min={0}
            step={1}
            value={averageBasket}
            onChange={(e) => setAverageBasket(Number(e.target.value))}
            style={{ marginTop: 8 }}
          />
        </div>

        <div className="estimated-results" style={{ marginTop: 24 }}>
          <h6 className="estimated-results-title">{t('campaign_auto_scheduler.roi_calculator.estimated_results')}</h6>
          <div className="results-grid">
            <div className="result-item">
              <span className="result-label">{t('campaign_auto_scheduler.roi_calculator.generated_orders')}</span>
              <span className="result-value">{estimated.orders}</span>
            </div>
            <div className="result-item">
              <span className="result-label">{t('campaign_auto_scheduler.roi_calculator.estimated_revenue')}</span>
              <span className="result-value highlight">{estimated.revenue} €</span>
            </div>
            <div className="result-item">
              <span className="result-label">{t('campaign_auto_scheduler.roi_calculator.investment')}</span>
              <span className="result-value">{estimated.investment} €</span>
            </div>
            <div className="result-item">
              <span className="result-label">ROI</span>
              <span className="result-value roi-value">{estimated.roi}%</span>
            </div>
          </div>
          <p className="investment-note">
            {t('campaign_auto_scheduler.roi_calculator.investment_note', {
              revenuePerEuro: estimated.revenuePerEuro
            })}
          </p>
        </div>
      </div>
    </div>
  )
}
