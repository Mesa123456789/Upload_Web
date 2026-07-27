import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import en from '../locales/en/common.json'
import th from '../locales/th/common.json'

export type Language = 'th' | 'en'
type Params = Record<string, string | number>
type Dictionary = typeof en

const dictionaries: Record<Language, Dictionary> = { en, th }
const localeMap: Record<Language, string> = { en: 'en-US', th: 'th-TH' }
const storageKey = 'emd-language'

interface I18nContextValue {
  language: Language
  setLanguage: (language: Language) => void
  t: (key: string, params?: Params) => string
  formatDate: (value: string | Date | null | undefined) => string
  formatNumber: (value: number) => string
}

const I18nContext = createContext<I18nContextValue | null>(null)

function getNestedValue(source: unknown, key: string): unknown {
  return key.split('.').reduce<unknown>((current, part) => {
    if (current && typeof current === 'object' && part in current) {
      return (current as Record<string, unknown>)[part]
    }
    return undefined
  }, source)
}

function interpolate(value: string, params?: Params) {
  if (!params) return value
  return value.replace(/\{\{\s*(\w+)\s*\}\}/g, (_, name: string) => String(params[name] ?? ''))
}

function getInitialLanguage(): Language {
  if (typeof window === 'undefined') return 'th'
  const saved = window.localStorage.getItem(storageKey)
  if (saved === 'th' || saved === 'en') return saved
  return 'th'
}

export function I18nProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<Language>(getInitialLanguage)

  useEffect(() => {
    window.localStorage.setItem(storageKey, language)
    document.documentElement.lang = language
  }, [language])

  const value = useMemo<I18nContextValue>(() => {
    const locale = localeMap[language]

    function translate(key: string, params?: Params) {
      const pluralKey = typeof params?.count === 'number' && params.count !== 1 ? `${key}_other` : key
      const raw = getNestedValue(dictionaries[language], pluralKey) ?? getNestedValue(dictionaries[language], key)
      if (typeof raw === 'string') return interpolate(raw, params)
      return key
    }

    return {
      language,
      setLanguage: setLanguageState,
      t: translate,
      formatDate(valueToFormat) {
        if (!valueToFormat) return '-'
        return new Intl.DateTimeFormat(locale, {
          year: 'numeric',
          month: 'numeric',
          day: 'numeric',
        }).format(new Date(valueToFormat))
      },
      formatNumber(valueToFormat) {
        return new Intl.NumberFormat(locale).format(valueToFormat)
      },
    }
  }, [language])

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>
}

export function useI18n() {
  const context = useContext(I18nContext)
  if (!context) throw new Error('useI18n must be used inside I18nProvider')
  return context
}
