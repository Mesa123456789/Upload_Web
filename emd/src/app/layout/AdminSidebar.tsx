import { NavLink, useLocation, useNavigate } from 'react-router-dom'
import { ArrowLeft, LayoutDashboard, ShieldCheck, Users } from 'lucide-react'
import { useI18n } from '../../i18n/I18nProvider'

// Width of the admin sidebar, in px. Static (no collapse/expand like the
// main app's Sidebar) — this is a small, two-item nav, collapsing adds
// complexity with no real benefit here.
export const adminSidebarWidth = 240

export default function AdminSidebar() {
  const { t } = useI18n()
  const location = useLocation()
  const navigate = useNavigate()

  const items = [
    { id: 'dashboard', label: t('adminLayout.dashboard'), to: '/admin/dashboard', icon: LayoutDashboard },
    { id: 'users', label: t('adminLayout.users'), to: '/admin/users', icon: Users },
  ]

  return (
    <aside
      className="no-print fixed bottom-0 left-0 top-0 z-50 flex h-screen flex-col border-r-2 border-[#F48E2E]/70 bg-[var(--ds-sidebar)] px-4 py-6 text-white"
      style={{ width: adminSidebarWidth }}
      aria-label="Admin sidebar"
    >
      <div className="flex items-center gap-2 px-1">
        <ShieldCheck className="h-6 w-6 text-[#F48E2E]" strokeWidth={2.2} />
        <div>
          <p className="text-sm font-black leading-none">EMD</p>
          <p className="text-[10px] font-bold uppercase tracking-wider text-white/50">{t('adminLayout.title')}</p>
        </div>
      </div>

      <nav className="mt-8 flex-1 space-y-1">
        {items.map((item) => {
          const Icon = item.icon
          const active = location.pathname.startsWith(item.to)
          return (
            <NavLink
              key={item.id}
              to={item.to}
              className={`flex h-10 items-center gap-3 rounded-full px-4 text-sm font-semibold transition ${
                active ? 'bg-[#F48E2E]/20 text-[#F48E2E]' : 'text-white/70 hover:bg-white/5 hover:text-white'
              }`}
            >
              <Icon className="h-4.5 w-4.5 shrink-0" strokeWidth={2.1} />
              {item.label}
            </NavLink>
          )
        })}
      </nav>

      <button
        type="button"
        onClick={() => navigate('/')}
        className="flex h-10 items-center gap-3 rounded-full px-4 text-sm font-semibold text-white/60 transition hover:bg-white/5 hover:text-white"
      >
        <ArrowLeft className="h-4.5 w-4.5 shrink-0" strokeWidth={2.1} />
        {t('adminLayout.backToApp')}
      </button>
    </aside>
  )
}
