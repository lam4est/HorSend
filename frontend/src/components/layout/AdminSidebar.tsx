import { useState } from 'react'
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
  const [aiOpen, setAiOpen] = useState(true)

  function navigate (key: SidebarFeatureKey) {
    onNavigate(key)
    if (window.matchMedia('(max-width: 768px)').matches) {
      onMobileOpenChange(false)
    }
  }

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
              <span className="pill__text">New campaign</span>
              <i className="fa-solid fa-chevron-right pill__arrow" aria-hidden="true" />
            </button>
            <button type="button" className="pill pill--ghost" onClick={() => navigate('contacts')}>
              <i className="fa-solid fa-address-book pill__icon" aria-hidden="true" />
              <span className="pill__text">Contacts</span>
            </button>
            <button type="button" className="pill pill--ghost" onClick={() => navigate('conversations')}>
              <i className="fa-solid fa-comments pill__icon" aria-hidden="true" />
              <span className="pill__text">Conversations</span>
            </button>
            <button type="button" className="pill pill--ghost" onClick={() => navigate('order')}>
              <i className="fa-solid fa-cart-shopping pill__icon" aria-hidden="true" />
              <span className="pill__text">Order</span>
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
                <span className="nav-row__text nav-row__text--dark">AI &amp; automation</span>
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
                    Campaign Auto Scheduler
                  </button>
                  <button
                    type="button"
                    className={`submenu__item${activeFeature === 'workflow' ? ' submenu__item--active' : ''}`}
                    onClick={() => navigate('workflow')}
                  >
                    Campaign Workflow
                  </button>
                </div>
              )}
            </div>

            {[
              ['fa-wand-magic-sparkles', 'Marketing Tools'],
              ['fa-inbox', 'Inbox'],
              ['fa-phone', 'My virtual numbers'],
              ['fa-chart-column', 'Reporting'],
              ['fa-layer-group', 'Multichannel'],
              ['fa-plug', 'API & Integrations'],
              ['fa-user-group', 'Sub-accounts'],
              ['fa-envelope', 'Email Management'],
              ['fa-message', 'Live Chat'],
              ['fa-puzzle-piece', 'Add-ons']
            ].map(([icon, label]) => (
              <button key={label} type="button" className="nav-row">
                <i className={`fa-solid ${icon} nav-row__icon`} aria-hidden="true" />
                <span className="nav-row__text">{label}</span>
              </button>
            ))}
          </nav>
        </div>
      </aside>
    </div>
  )
}
