import { BRAND_LOGO_SRC, BRAND_NAME } from '../../constants/brand'

type BrandLogoProps = {
  showName?: boolean
  size?: 'nav' | 'compact'
}

export default function BrandLogo ({ showName = true, size = 'nav' }: BrandLogoProps) {
  return (
    <div
      className={`brand brand--${size}`}
      aria-label={BRAND_NAME}
    >
      <div className="brand__logo-wrap">
        <img
          className="brand__logo"
          src={BRAND_LOGO_SRC}
          alt=""
          width={48}
          height={48}
          decoding="async"
        />
      </div>
      {showName ? (
        <div className="brand__col">
          <span className="brand__name">{BRAND_NAME}</span>
          <span className="brand__badge">CRM</span>
        </div>
      ) : null}
    </div>
  )
}
