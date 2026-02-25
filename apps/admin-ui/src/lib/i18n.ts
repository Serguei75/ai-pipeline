export type Locale = 'en' | 'ru'

// Russian is default — stored in localStorage on first visit
export const DEFAULT_LOCALE: Locale = 'ru'

export const LOCALES: { code: Locale; label: string }[] = [
  { code: 'ru', label: 'RU' },
  { code: 'en', label: 'EN' },
]
