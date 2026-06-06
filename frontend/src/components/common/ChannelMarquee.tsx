import { CHANNEL_LIST } from '../../constants/campaignAutoScheduler'

const ITEMS = [...CHANNEL_LIST, ...CHANNEL_LIST]

export default function ChannelMarquee () {
  return (
    <div className="channel-marquee" aria-hidden="true">
      <div className="channel-marquee__track">
        {ITEMS.map((ch, i) => (
          <span key={`${ch.key}-${i}`} className="channel-marquee__item">
            <i className={`${ch.icon} channel-marquee__icon`} />
            {ch.label}
          </span>
        ))}
      </div>
    </div>
  )
}
