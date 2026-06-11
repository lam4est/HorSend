import { useGsapHeroImage } from '../../hooks/useGsapReveal'
import { useI18n, t } from '../../i18n'

const HERO_IMAGE =
  'https://images.unsplash.com/photo-1484480974693-6ca0a78fb36b?w=840&h=630&fit=crop&q=80'

export default function SchedulerHero () {
  const { t } = useI18n()
  const sectionRef = useGsapHeroImage('.scheduler-hero__img')

  return (
    <section ref={sectionRef} className="scheduler-hero scheduler-hero--split">
      <div className="scheduler-hero__text">
        <h1 className="scheduler-hero__title">{t('campaign_auto_scheduler.page_header')}</h1>
        <p className="scheduler-hero__subtitle">{t('campaign_auto_scheduler.page_subtitle')}</p>
      </div>
      <div className="scheduler-hero__media">
        <img
          className="scheduler-hero__img"
          src={HERO_IMAGE}
          alt="Campaign calendar planning"
          width={420}
          height={315}
          loading="eager"
        />
      </div>
    </section>
  )
}
