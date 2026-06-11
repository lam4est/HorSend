import { useState } from 'react'
import { useI18n } from '../../i18n'
import type { SidebarFeatureKey } from '../../types/sidebar'

type AdminSidebarProps = {
  activeFeature: SidebarFeatureKey | null
  mobileOpen: boolean
  onNavigate: (key: SidebarFeatureKey) => void
  onMobileOpenChange: (open: boolean) => void
}

export default function AdminSidebar ({
  activeFeature,
  mobileOpen,
  onNavigate,
  onMobileOpenChange
}: AdminSidebarProps) {
  const { t } = useI18n()
  const [aiOpen, setAiOpen] = useState(true)

  function navigate (key: SidebarFeatureKey) {
    onNavigate(key)
    if (window.matchMedia('(max-width: 768px)').matches) {
      onMobileOpenChange(false)
    }
  }

  const navItems = [
    ['fa-wand-magic-sparkles', 'layout.sidebar.marketing_tools'],
    ['fa-inbox', 'layout.sidebar.inbox'],
    ['fa-phone', 'layout.sidebar.virtual_numbers'],
    ['fa-chart-column', 'layout.sidebar.reporting'],
    ['fa-layer-group', 'layout.sidebar.multichannel'],
    ['fa-plug', 'layout.sidebar.api_integrations'],
    ['fa-user-group', 'layout.sidebar.sub_accounts'],
    ['fa-envelope', 'layout.sidebar.email_management'],
    ['fa-message', 'layout.sidebar.live_chat'],
    ['fa-puzzle-piece', 'layout.sidebar.addons']
  ] as const

  return (
    <div className="sidebar-wrap">
      {mobileOpen && (
        <div
          className="sidebar-backdrop"
          aria-hidden="true"
          onClick={() => onMobileOpenChange(false)}
        />
      )}
      <aside
        className={`admin-sidebar${mobileOpen ? ' admin-sidebar--mobile-open' : ''}`}
        aria-label="Main navigation"
      >
        <div className="sidebar-inner">
          <div className="sidebar-pills">
            <button type="button" className="pill pill--primary" onClick={() => navigate('new-campaign')}>
              <i className="fa-solid fa-plus pill__icon" aria-hidden="true" />
              <span className="pill__text">{t('layout.sidebar.new_campaign')}</span>
              <i className="fa-solid fa-chevron-right pill__arrow" aria-hidden="true" />
            </button>
            <button type="button" className="pill pill--ghost" onClick={() => navigate('contacts')}>
              <i className="fa-solid fa-address-book pill__icon" aria-hidden="true" />
              <span className="pill__text">{t('layout.sidebar.contacts')}</span>
            </button>
            <button type="button" className="pill pill--ghost" onClick={() => navigate('conversations')}>
              <i className="fa-solid fa-comments pill__icon" aria-hidden="true" />
              <span className="pill__text">{t('layout.sidebar.conversations')}</span>
            </button>
            <button type="button" className="pill pill--ghost" onClick={() => navigate('order')}>
              <i className="fa-solid fa-cart-shopping pill__icon" aria-hidden="true" />
              <span className="pill__text">{t('layout.sidebar.order')}</span>
            </button>
          </div>

          <nav className="sidebar-nav">
            <div className="nav-group">
              <button
                type="button"
                className="nav-row nav-row--parent"
                aria-expanded={aiOpen}
                onClick={() => setAiOpen((v) => !v)}
              >
                <i className="fa-solid fa-users nav-row__icon nav-row__icon--dark" aria-hidden="true" />
                <span className="nav-row__text nav-row__text--dark">{t('layout.sidebar.ai_automation')}</span>
                <i
                  className={`fa-solid fa-chevron-down nav-row__caret${aiOpen ? ' nav-row__caret--open' : ''}`}
                  aria-hidden="true"
                />
              </button>
              {aiOpen && (
                <div className="submenu">
                  <button
                    type="button"
                    className={`submenu__item${activeFeature === 'auto-schedule' ? ' submenu__item--active' : ''}`}
                    onClick={() => navigate('auto-schedule')}
                  >
                    {t('layout.sidebar.auto_schedule')}
                  </button>
                  <button
                    type="button"
                    className={`submenu__item${activeFeature === 'workflow' ? ' submenu__item--active' : ''}`}
                    onClick={() => navigate('workflow')}
                  >
                    {t('layout.sidebar.workflow')}
                  </button>
                  <button
                    type="button"
                    className={`submenu__item${activeFeature === 'send-history' ? ' submenu__item--active' : ''}`}
                    onClick={() => navigate('send-history')}
                  >
                    {t('layout.sidebar.send_history')}
                  </button>
                </div>
              )}
            </div>

            {navItems.map(([icon, labelKey]) => (
              <button key={labelKey} type="button" className="nav-row">
                <i className={`fa-solid ${icon} nav-row__icon`} aria-hidden="true" />
                <span className="nav-row__text">{t(labelKey)}</span>
              </button>
            ))}
          </nav>
        </div>
      </aside>
    </div>
  )
}
