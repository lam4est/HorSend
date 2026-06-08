import { useEffect, useMemo, useState } from 'react'
import CampaignSendHistory from './components/history/CampaignSendHistory'
import CampaignAutoScheduler from './components/scheduler/CampaignAutoScheduler'
import AdminSidebar from './components/layout/AdminSidebar'
import CrmTopNav from './components/layout/CrmTopNav'
import WorkflowList from './components/workflow/WorkflowList'
import type { SidebarFeatureKey } from './types/sidebar'

type FeatureTab = 'workflow' | 'auto-schedule' | 'send-history'

function readTabFromQuery (): FeatureTab | null {
  const q = new URLSearchParams(window.location.search).get('tab')
  if (q === 'workflow' || q === 'auto-schedule' || q === 'send-history') return q
  if (q === 'campaigns') return 'workflow'
  return null
}

export default function App () {
  const [activeTab, setActiveTab] = useState<FeatureTab>(() => readTabFromQuery() ?? 'workflow')
  const [sidebarMobileOpen, setSidebarMobileOpen] = useState(false)
  const [enrollSignal, setEnrollSignal] = useState(0)

  const activeSidebarFeature = useMemo<SidebarFeatureKey | null>(() => {
    if (activeTab === 'workflow') return 'workflow'
    if (activeTab === 'auto-schedule') return 'auto-schedule'
    if (activeTab === 'send-history') return 'send-history'
    return null
  }, [activeTab])

  const crmPageTitle =
    activeTab === 'workflow'
      ? 'Campaign Workflow'
      : activeTab === 'auto-schedule'
        ? 'Campaign Auto Scheduler'
        : 'Send History'

  useEffect(() => {
    const url = new URL(window.location.href)
    url.searchParams.set('tab', activeTab)
    window.history.replaceState({}, '', url)
  }, [activeTab])

  function onSidebarNavigate (key: SidebarFeatureKey) {
    if (key === 'workflow' || key === 'auto-schedule' || key === 'send-history') {
      setActiveTab(key)
      return
    }
    if (key === 'new-campaign') {
      setActiveTab('workflow')
      setEnrollSignal((n) => n + 1)
      try {
        sessionStorage.setItem('workflow-open-enroll', '1')
      } catch {
        /* ignore */
      }
    }
  }

  useEffect(() => {
    try {
      if (sessionStorage.getItem('workflow-open-enroll')) {
        sessionStorage.removeItem('workflow-open-enroll')
        setEnrollSignal((n) => n + 1)
      }
    } catch {
      /* ignore */
    }
  }, [])

  return (
    <div className="app-root">
      <CrmTopNav
        pageTitle={crmPageTitle}
        onCreateCampaign={() => {
          setActiveTab('workflow')
          setEnrollSignal((n) => n + 1)
        }}
      />

      <div className="app-layout">
        <AdminSidebar
          activeFeature={activeSidebarFeature}
          mobileOpen={sidebarMobileOpen}
          onNavigate={onSidebarNavigate}
          onMobileOpenChange={setSidebarMobileOpen}
        />

        <div className="app-main">
          <header className="app-topbar">
            <button
              type="button"
              className="menu-toggle"
              aria-label="Open menu"
              onClick={() => setSidebarMobileOpen((v) => !v)}
            >
              <i className="fa-solid fa-bars" aria-hidden="true" />
            </button>
            <div className="app-topbar__titles">
              <h1 className="app-title">Campaign Manager</h1>
              <p className="app-subtitle">Workflow, auto schedule, and campaign tools</p>
            </div>
          </header>

          <main className="app-content app-content--motion">
            {activeTab === 'workflow' ? (
              <WorkflowList enrollSignal={enrollSignal} />
            ) : activeTab === 'auto-schedule' ? (
              <CampaignAutoScheduler />
            ) : (
              <CampaignSendHistory />
            )}
          </main>
        </div>
      </div>
    </div>
  )
}
