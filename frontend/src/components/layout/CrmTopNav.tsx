import BrandLogo from './BrandLogo'

type CrmTopNavProps = {
  pageTitle: string
  availableCredit?: string
  onCreateCampaign: () => void
}

export default function CrmTopNav ({
  pageTitle,
  availableCredit = '27367.00',
  onCreateCampaign
}: CrmTopNavProps) {
  return (
    <header className="crm-top-nav" role="banner">
      <div className="crm-top-nav__left">
        <BrandLogo />
        <h1 className="page-title">{pageTitle}</h1>
      </div>

      <div className="crm-top-nav__right">
        <div className="credit-group">
          <div className="credit-pill" title="SMS credit balance">
            <i className="fa-solid fa-wallet credit-pill__icon" aria-hidden="true" />
            <span className="credit-pill__text">Available credit : {availableCredit} SMS</span>
            <span className="credit-pill__flag" aria-label="France" title="France">
              FR
            </span>
          </div>
          <button type="button" className="btn-create" onClick={onCreateCampaign}>
            Create campaign
          </button>
        </div>

        <div className="utilities" aria-label="Toolbar">
          <button type="button" className="icon-hit" aria-label="Settings">
            <i className="fa-solid fa-gear utility-icon" aria-hidden="true" />
          </button>
          <button type="button" className="icon-hit" aria-label="Campaigns">
            <i className="fa-solid fa-bullhorn utility-icon" aria-hidden="true" />
          </button>
          <button type="button" className="icon-hit icon-hit--help" aria-label="Help">
            <span className="help-dot" aria-hidden="true">
              ?
            </span>
          </button>
          <button type="button" className="icon-hit icon-hit--profile" aria-label="Account menu">
            <span className="profile-wrap">
              <i className="fa-solid fa-user utility-icon utility-icon--muted" aria-hidden="true" />
              <span className="notif-badge">24</span>
            </span>
          </button>
        </div>
      </div>
    </header>
  )
}
