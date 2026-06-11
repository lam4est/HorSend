import { useI18n } from '../../i18n'
import { useGsapHeroImage } from '../../hooks/useGsapReveal'

type WorkflowHeroProps = {
  onAdd: () => void
  onCreateWithAi?: () => void
}

const HERO_IMAGE =
  'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=960&h=720&fit=crop&q=80'

export default function WorkflowHero ({ onAdd, onCreateWithAi }: WorkflowHeroProps) {
  const { t } = useI18n()
  const sectionRef = useGsapHeroImage('.workflow-hero__visual-img')

  return (
    <section
      ref={sectionRef}
      className="workflow-hero workflow-hero--asymmetric"
      aria-labelledby="workflow-hero-title"
    >
      <div className="workflow-hero__ambient" aria-hidden="true" />
      <div className="workflow-hero__content">
        <h1 id="workflow-hero-title" className="workflow-hero__title">
          {t('campaign_workflow.hero_title_before')}
          <span
            className="workflow-hero__inline-img"
            style={{ backgroundImage: `url(${HERO_IMAGE})` }}
            role="img"
            aria-label="Campaign workflow analytics"
          />
          {t('campaign_workflow.hero_title_after')}
        </h1>
        <p className="workflow-hero__lead">{t('campaign_workflow.page_lead')}</p>
        <div className="workflow-hero__actions">
          {onCreateWithAi ? (
            <button
              type="button"
              className="workflow-hero__cta workflow-hero__cta--ai"
              onClick={onCreateWithAi}
            >
              {t('campaign_workflow.create_with_ai')}
            </button>
          ) : null}
          <button type="button" className="workflow-hero__cta workflow-hero__cta--primary" onClick={onAdd}>
            {t('campaign_workflow.add_workflow_campaign')}
          </button>
          <button
            type="button"
            className="workflow-hero__cta workflow-hero__cta--ghost"
            onClick={() => {
              document.querySelector('.workflow-bento')?.scrollIntoView({ behavior: 'smooth' })
            }}
          >
            {t('campaign_workflow.hero_secondary_cta')}
          </button>
        </div>
      </div>
      <div className="workflow-hero__visual">
        <img
          className="workflow-hero__visual-img"
          src={HERO_IMAGE}
          alt="Campaign workflow analytics dashboard"
          width={480}
          height={360}
          loading="eager"
        />
      </div>
    </section>
  )
}
