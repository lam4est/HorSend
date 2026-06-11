import {
  createContext,
  createElement,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode
} from 'react'
import { en, type Locale, type Messages } from './en'
import { vi } from './vi'

export type { Locale, Messages } from './en'

const STORAGE_KEY = 'campaign-manager-locale'

const messagesByLocale: Record<Locale, Messages> = { en, vi }

let globalLocale: Locale = readStoredLocale()

function readStoredLocale (): Locale {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored === 'en' || stored === 'vi') return stored
  } catch {
    /* ignore */
  }
  return 'en'
}

function persistLocale (locale: Locale) {
  try {
    localStorage.setItem(STORAGE_KEY, locale)
  } catch {
    /* ignore */
  }
}

export function translate (
  path: string,
  locale: Locale = globalLocale,
  vars?: Record<string, string | number>
): string {
  const parts = path.split('.')
  let cur: unknown = messagesByLocale[locale]
  for (const p of parts) {
    cur = (cur as Record<string, unknown>)?.[p]
  }
  let out = typeof cur === 'string' ? cur : path
  if (vars) {
    for (const [k, v] of Object.entries(vars)) {
      out = out.replace(`{${k}}`, String(v))
    }
  }
  return out
}

/** @deprecated Use useI18n().t inside React components */
export function t (
  path: string,
  vars?: Record<string, string | number>
): string {
  return translate(path, globalLocale, vars)
}

type I18nContextValue = {
  locale: Locale
  setLocale: (locale: Locale) => void
  t: (path: string, vars?: Record<string, string | number>) => string
  messages: Messages
}

const I18nContext = createContext<I18nContextValue | null>(null)

function applyLocale (locale: Locale) {
  globalLocale = locale
  document.documentElement.lang = locale
}

export function LocaleProvider ({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(() => readStoredLocale())

  const setLocale = useCallback((next: Locale) => {
    applyLocale(next)
    persistLocale(next)
    setLocaleState(next)
  }, [])

  useEffect(() => {
    applyLocale(locale)
  }, [locale])

  const value = useMemo<I18nContextValue>(
    () => ({
      locale,
      setLocale,
      t: (path, vars) => translate(path, locale, vars),
      messages: messagesByLocale[locale]
    }),
    [locale, setLocale]
  )

  return createElement(I18nContext.Provider, { value }, children)
}

export function useI18n (): I18nContextValue {
  const ctx = useContext(I18nContext)
  if (!ctx) {
    throw new Error('useI18n must be used within LocaleProvider')
  }
  return ctx
}
