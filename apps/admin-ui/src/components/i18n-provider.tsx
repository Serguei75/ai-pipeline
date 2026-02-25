'use client'
import { createContext, useContext, useState, useEffect, type ReactNode } from 'react'
import { DEFAULT_LOCALE, type Locale } from '@/lib/i18n'
import { getDictionary } from '@/lib/dictionaries'

type Dict = ReturnType<typeof getDictionary>

interface I18nContextValue {
  locale: Locale
  t: Dict
  setLocale: (l: Locale) => void
}

const I18nContext = createContext<I18nContextValue | null>(null)

export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(DEFAULT_LOCALE)

  // Restore from localStorage on mount
  useEffect(() => {
    const stored = window.localStorage.getItem('locale') as Locale | null
    if (stored === 'en' || stored === 'ru') {
      setLocaleState(stored)
    }
  }, [])

  const setLocale = (l: Locale) => {
    setLocaleState(l)
    window.localStorage.setItem('locale', l)
  }

  return (
    <I18nContext.Provider value={{ locale, t: getDictionary(locale), setLocale }}>
      {children}
    </I18nContext.Provider>
  )
}

export function useI18n() {
  const ctx = useContext(I18nContext)
  if (!ctx) throw new Error('useI18n must be used within I18nProvider')
  return ctx
}
