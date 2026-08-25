import { NavLink, useLocation, useNavigate } from 'react-router-dom'
import { AnimatePresence, motion, type Transition } from 'framer-motion'
import { ArrowLeft, LayoutDashboard, Menu, Shield, ShieldCheck, Users } from 'lucide-react'
import { useAuth } from '../../features/auth/context/useAuth'
import { useI18n } from '../../i18n/I18nProvider'
import CollapsedTooltip from './SidebarTooltip'
import { sidebarCollapsedWidth, sidebarExpandedWidth, type SidebarNavItem } from './Sidebar'
import { useIsMobile } from './useIsMobile'

const sidebarEase = [0.4, 0, 0.2, 1] as const
const sidebarTransition: Transition = { duration: 0.3, ease: sidebarEase }
const labelTransition: Transition = { duration: 0.18, ease: sidebarEase }

export interface AdminSidebarProps {
  isOpen: boolean
  setIsOpen: (open: boolean) => void
}

// Mirrors Sidebar.tsx (the main app shell) so the admin panel shares the
// same look, collapse behavior, and interaction patterns instead of being a
// visually separate dark-themed nav.
export default function AdminSidebar({ isOpen, setIsOpen }: AdminSidebarProps) {
  const { profile } = useAuth()
  const { t } = useI18n()
  const navigate = useNavigate()
  const location = useLocation()
  const isMobile = useIsMobile()
  const width = isOpen ? sidebarExpandedWidth : sidebarCollapsedWidth

  const mainItems: SidebarNavItem[] = [
    {
      id: 'dashboard',
      label: t('adminLayout.dashboard'),
      to: '/admin/dashboard',
      icon: LayoutDashboard,
      active: location.pathname === '/admin/dashboard',
    },
    {
      id: 'users',
      label: t('adminLayout.users'),
      to: '/admin/users',
      icon: Users,
      active: location.pathname.startsWith('/admin/users'),
    },
    {
      id: 'roles',
      label: t('adminLayout.roles'),
      to: '/admin/roles',
      icon: Shield,
      active: location.pathname.startsWith('/admin/roles'),
    },
  ]

  const utilityItems: SidebarNavItem[] = [
    {
      id: 'back-to-app',
      label: t('adminLayout.backToApp'),
      to: '/',
      icon: ArrowLeft,
      active: false,
    },
  ]

  const renderLabel = (label: string, className = '') => (
    <AnimatePresence initial={false}>
      {isOpen && (
        <motion.span
          key="nav-label"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={labelTransition}
          className={`min-w-0 overflow-hidden whitespace-nowrap ${className}`}
        >
          {label}
        </motion.span>
      )}
    </AnimatePresence>
  )

  const displayName = profile?.display_name ?? profile?.email ?? t('roles.admin')
  const initials = displayName
    .split(' ')
    .map((word) => word[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()

  const renderItem = (item: SidebarNavItem) => {
    const Icon = item.icon
    return (
      <CollapsedTooltip key={item.id} label={item.label} enabled={!isOpen}>
        <div className="w-full overflow-hidden">
          <NavLink
            to={item.to}
            end={item.id === 'back-to-app'}
            onClick={() => { if (isMobile) setIsOpen(false) }}
            className={`group/item relative flex h-10 w-full min-w-0 items-center overflow-hidden whitespace-nowrap rounded-full text-sm font-semibold ${
              item.active ? 'border border-[#F48E2E]/45 bg-[#F48E2E]/12 text-[#7a3414] shadow-[0_8px_18px_rgba(244,142,46,0.14)]' : 'text-slate-600 hover:bg-[#F48E2E]/8 hover:text-[#7a3414]'
            }`}
            title={isOpen ? item.label : undefined}
          >
            <span className="relative z-10 grid h-10 w-11 shrink-0 place-content-center">
              <Icon className="h-4.5 w-4.5 shrink-0" strokeWidth={2.1} />
            </span>
            {renderLabel(item.label, 'relative z-10')}
          </NavLink>
        </div>
      </CollapsedTooltip>
    )
  }

  return (
    <>
      <AnimatePresence>
        {isMobile && isOpen && (
          <motion.div
            key="sidebar-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={() => setIsOpen(false)}
            className="no-print fixed inset-0 z-40 bg-black/40"
            aria-hidden="true"
          />
        )}
      </AnimatePresence>
      <motion.aside
        initial={false}
        animate={isMobile ? { x: isOpen ? 0 : -sidebarExpandedWidth } : { width }}
        transition={sidebarTransition}
        style={isMobile ? { width: sidebarExpandedWidth } : { width }}
        className="no-print fixed bottom-0 left-0 top-0 z-50 flex h-screen flex-col overflow-visible border-r-2 border-[#F48E2E]/70 bg-white px-3 py-3 text-slate-900 shadow-[14px_0_34px_rgba(244,142,46,0.12)]"
        aria-label="Admin sidebar"
      >
      <div className="flex h-full min-h-0 flex-col overflow-hidden">
        <div className="flex shrink-0 items-center justify-between">
          <button
            type="button"
            onClick={() => setIsOpen(!isOpen)}
            className="group/logo relative grid h-10 w-10 place-content-center rounded-full transition hover:cursor-ew-resize hover:bg-[#F48E2E]/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#F48E2E]/35"
            aria-label={isOpen ? 'Collapse navigation' : 'Expand navigation'}
            aria-expanded={isOpen}
          >
            <ShieldCheck className="h-6 w-6 text-[#F48E2E] opacity-100 transition group-hover/logo:opacity-0" strokeWidth={2.2} />
            <Menu className="absolute left-1/2 top-1/2 h-[22px] w-[22px] -translate-x-1/2 -translate-y-1/2 text-[#7a3414] opacity-0 transition group-hover/logo:opacity-100" strokeWidth={2.3} />
            <span className="pointer-events-none absolute left-[calc(100%+10px)] top-1/2 z-[60] -translate-y-1/2 whitespace-nowrap rounded-lg bg-[#201316] px-2.5 py-1.5 text-xs font-black text-white opacity-0 shadow-[0_10px_24px_rgba(32,19,22,0.22)] transition group-hover/logo:opacity-100">
              {isOpen ? 'Collapse' : 'Expand'}
            </span>
          </button>
          <AnimatePresence initial={false}>
            {isOpen && (
              <motion.div
                key="admin-brand"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={labelTransition}
                className="min-w-0 overflow-hidden whitespace-nowrap pr-2 text-right"
              >
                <p className="ds-one-line text-sm font-black leading-none text-slate-900">EMD</p>
                <p className="ds-one-line mt-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">{t('adminLayout.title')}</p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <nav className="mt-5 shrink-0 space-y-1 overflow-hidden">
          {mainItems.map((item) => renderItem(item))}
        </nav>

        <div className="min-h-0 flex-1" />

        <nav className="shrink-0 space-y-1 overflow-hidden border-t border-[#F48E2E]/18 pt-3">
          {utilityItems.map((item) => renderItem(item))}
        </nav>

        <CollapsedTooltip label={displayName} enabled={!isOpen}>
          <button
            type="button"
            onClick={() => { if (isMobile) setIsOpen(false); navigate('/profile') }}
            className="mt-3 flex h-12 w-full min-w-0 items-center overflow-hidden rounded-full text-left transition hover:bg-[#F48E2E]/8 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#F48E2E]/35"
            title={isOpen ? displayName : undefined}
          >
            <span className="grid h-12 w-11 shrink-0 place-content-center">
              <span className="grid h-9 w-9 place-content-center rounded-full border border-[#F48E2E]/35 bg-[#F48E2E]/10 text-sm font-black text-[#8a3d1d] shadow-[0_10px_18px_rgba(244,142,46,0.12)]">
                {initials || 'EM'}
              </span>
            </span>
            <AnimatePresence initial={false}>
              {isOpen && (
                <motion.span
                  key="profile-label"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={labelTransition}
                  className="min-w-0 overflow-hidden whitespace-nowrap"
                >
                  <span className="ds-one-line block text-sm font-black text-slate-900">{displayName}</span>
                  <span className="ds-one-line mt-0.5 block text-xs font-semibold text-slate-500">{t('roles.admin')}</span>
                </motion.span>
              )}
            </AnimatePresence>
          </button>
        </CollapsedTooltip>
      </div>
      </motion.aside>
    </>
  )
}
