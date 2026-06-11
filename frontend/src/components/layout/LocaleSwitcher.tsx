import { useEffect, useId, useRef, useState } from 'react'
import { useI18n, type Locale } from '../../i18n'

const LOCALES: Array<{ value: Locale; flag: string; label: string }> = [
  { value: 'en', flag: '🇬🇧', label: 'English' },
  { value: 'vi', flag: '🇻🇳', label: 'Tiếng Việt' }
]

export default function LocaleSwitcher () {
  const { t, locale, setLocale } = useI18n()
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)
  const menuId = useId()
  const current = LOCALES.find((item) => item.value === locale) ?? LOCALES[0]

  useEffect(() => {
    if (!open) return

    function onClickOutside (event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false)
      }
    }

    function onKeyDown (event: KeyboardEvent) {
      if (event.key === 'Escape') setOpen(false)
    }

    document.addEventListener('click', onClickOutside)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('click', onClickOutside)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [open])

  function pick (value: Locale) {
    setLocale(value)
    setOpen(false)
  }

  return (
    <div ref={rootRef} className={`locale-menu${open ? ' locale-menu--open' : ''}`}>
      <button
        type="button"
        className="locale-menu__trigger"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={menuId}
        onClick={() => setOpen((v) => !v)}
      >
        <span className="locale-menu__flag" aria-hidden="true">
          {current.flag}
        </span>
        <span className="locale-menu__label">{current.label}</span>
        <i
          className={`fa-solid fa-chevron-down locale-menu__caret${open ? ' locale-menu__caret--open' : ''}`}
          aria-hidden="true"
        />
        <span className="sr-only">{t('layout.language')}</span>
      </button>

      {open ? (
        <div
          id={menuId}
          className="locale-menu__panel"
          role="listbox"
          aria-label={t('layout.language')}
          onMouseDown={(e) => e.stopPropagation()}
        >
          {LOCALES.map((item) => {
            const active = locale === item.value
            return (
              <button
                key={item.value}
                type="button"
                role="option"
                aria-selected={active}
                className={`locale-menu__option${active ? ' locale-menu__option--active' : ''}`}
                onClick={() => pick(item.value)}
              >
                <span className="locale-menu__option-flag" aria-hidden="true">
                  {item.flag}
                </span>
                <span className="locale-menu__option-label">{item.label}</span>
                {active ? (
                  <i className="fa-solid fa-check locale-menu__check" aria-hidden="true" />
                ) : null}
              </button>
            )
          })}
        </div>
      ) : null}
    </div>
  )
}
