import { Languages } from 'lucide-react'
import { useI18n } from '../../i18n/I18nProvider'

export default function LanguageSwitcher({ compact = false }: { compact?: boolean }) {
  const { language, setLanguage, t } = useI18n()
  const nextLanguage = language === 'th' ? 'en' : 'th'

  return (
    <button
      type="button"
      onClick={() => setLanguage(nextLanguage)}
      className={`ds-button ds-button-secondary min-h-0 ${compact ? 'w-[70px] px-3 py-2 text-xs' : 'w-[96px] px-4 py-2 text-sm'}`}
      aria-label={t('language.switch')}
      title={t('language.switch')}
    >
      <Languages className="h-4 w-4" />
      <span>{language === 'th' ? 'TH' : 'EN'}</span>
    </button>
  )
}
