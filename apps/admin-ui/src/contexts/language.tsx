'use client'

import {
  createContext, useContext, useState, useEffect,
  type ReactNode,
} from 'react'
import { en, type Translations } from '@/lib/translations/en'
import { ru } from '@/lib/translations/ru'

export type Locale = 'en' | 'ru'

const DICT: Record<Locale, Translations> = { en, ru }

interface LangCtx {
  locale: Locale
  setLocale: (l: Locale) => void
  t: (key: string) => string
}

const Ctx = createContext<LangCtx | null>(null)

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>('en')

  // Restore from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem('lang')
    if (saved === 'en' || saved === 'ru') setLocaleState(saved)
  }, [])

  const setLocale = (l: Locale) => {
    setLocaleState(l)
    localStorage.setItem('lang', l)
  }

  // Deep key lookup: 'analytics.hooks_title' → translated string
  const t = (key: string): string => {
    const parts = key.split('.')
    let val: unknown = DICT[locale]
    for (const p of parts) {
      if (typeof val === 'object' && val !== null) val = (val as Record<string, unknown>)[p]
      else { val = undefined; break }
    }
    if (typeof val === 'string') return val
    // Fallback to EN
    let fallback: unknown = DICT.en
    for (const p of parts) {
      if (typeof fallback === 'object' && fallback !== null) fallback = (fallback as Record<string, unknown>)[p]
      else { fallback = undefined; break }
    }
    return typeof fallback === 'string' ? fallback : key
  }

  return (
    <Ctx.Provider value={{ locale, setLocale, t }}>
      {children}
    </Ctx.Provider>
  )
}

export function useLanguage(): LangCtx {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error('useLanguage must be inside LanguageProvider')
  return ctx
}
