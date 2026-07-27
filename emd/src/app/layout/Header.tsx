import { NavLink, useLocation, useNavigate } from 'react-router-dom'
import { AnimatePresence, LayoutGroup, motion, useReducedMotion } from 'framer-motion'
import {
  BookOpen,
  ClipboardList,
  LayoutDashboard,
  Menu,
  PanelLeftOpen,
  X,
  type LucideIcon,
} from 'lucide-react'
import { useState } from 'react'
import { useAuth } from '../../features/auth/context/useAuth'
import { useI18n } from '../../i18n/I18nProvider'
import { transitions } from '../../shared/motion'

interface HeaderProps {
  sidebarExpanded: boolean
  onSidebarExpandedChange: (expanded: boolean) => void
}

export default function Header({ sidebarExpanded, onSidebarExpandedChange }: HeaderProps) {
  const { profile } = useAuth()
  const { t } = useI18n()
  const navigate = useNavigate()
  const location = useLocation()
  const reduceMotion = useReducedMotion()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const isInstructor = profile?.role === 'instructor'
  const sidebarNavItems = isInstructor
    ? [
        {
          to: '/instructor/dashboard',
          label: t('navigation.dashboard'),
          icon: LayoutDashboard,
          active: location.pathname === '/' || location.pathname === '/instructor/dashboard',
        },
        {
          to: '/instructor/courses',
          label: t('instructorCourses.title'),
          icon: BookOpen,
          active: location.pathname.startsWith('/instructor/courses'),
        },
        {
          to: '/instructor/projects',
          label: t('navigation.projects'),
          icon: ClipboardList,
          active: location.pathname.startsWith('/instructor/projects') || location.pathname.startsWith('/instructor/project/'),
        },
      ]
    : [
        {
          to: '/dashboard',
          label: t('navigation.dashboard'),
          icon: LayoutDashboard,
          active: location.pathname === '/' || location.pathname === '/dashboard',
        },
        {
          to: '/join',
          label: t('common.courses'),
          icon: BookOpen,
          active: location.pathname === '/join' || location.pathname.startsWith('/course/'),
        },
        {
          to: '/projects',
          label: t('navigation.projects'),
          icon: ClipboardList,
          active: location.pathname === '/projects' || location.pathname.startsWith('/project/'),
        },
      ]

  const displayName = profile?.display_name ?? profile?.email ?? t('roles.guest')
  const code = profile?.student_code ?? (profile?.role ? t(`roles.${profile.role}`) : 'EMD')
  const initials = displayName
    .split(' ')
    .map((word) => word[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()

  const sidebarWidth = sidebarExpanded || mobileMenuOpen ? 300 : 88
  const sidebarTransition = reduceMotion ? { duration: 0 } : transitions.spring
  const mobileSidebarTransformClass = mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
  const renderNavLink = (to: string, label: string, Icon: LucideIcon, active: boolean, compact = false) => {
    return (
      <motion.div key={to} layout transition={reduceMotion ? { duration: 0 } : transitions.spring}>
        <NavLink
          to={to}
          onClick={() => setMobileMenuOpen(false)}
          className={`relative flex h-11 min-w-0 items-center overflow-hidden rounded-2xl text-sm font-black transition-colors ${
            compact ? 'justify-center px-0' : 'gap-1 px-0'
          } ${active ? 'text-[#302226]' : 'text-white/68 hover:bg-white/10 hover:text-white'}`}
          title={label}
        >
          {active && (
            <motion.span
              layoutId="sidebar-active-pill"
              transition={reduceMotion ? { duration: 0 } : transitions.spring}
              className="absolute inset-0 rounded-2xl bg-[#facc15]"
            />
          )}
          <motion.span
            layout
            transition={reduceMotion ? { duration: 0 } : transitions.spring}
            className="relative z-10 grid h-full w-11 shrink-0 place-content-center"
          >
            <Icon className="h-5 w-5" strokeWidth={2.5} />
          </motion.span>
          <AnimatePresence initial={false}>
          {!compact && (
            <motion.span
              key="nav-label"
              layout
              initial={reduceMotion ? false : { opacity: 0, x: -8, filter: 'blur(3px)' }}
              animate={reduceMotion ? undefined : { opacity: 1, x: 0, filter: 'blur(0px)' }}
              exit={reduceMotion ? undefined : { opacity: 0, x: -8, filter: 'blur(3px)' }}
              transition={reduceMotion ? { duration: 0 } : transitions.fast}
              className="ds-one-line relative z-10 min-w-0 pr-3"
            >
              {label}
            </motion.span>
          )}
          </AnimatePresence>
          {active && (
            <motion.span
              layoutId="sidebar-active-indicator"
      transition={sidebarTransition}
              className={`absolute top-1/2 z-20 h-11 w-1.5 -translate-y-1/2 rounded-r-full bg-[#f97316] ${
              compact ? '-left-8' : '-left-6'
            }`}
            />
          )}
        </NavLink>
      </motion.div>
    )
  }
  const renderSidebarToggle = (compact = false) => (
    <motion.button
      layout
      type="button"
      onClick={() => onSidebarExpandedChange(!sidebarExpanded)}
      className={`relative flex h-11 min-w-0 items-center overflow-hidden rounded-2xl text-sm font-black text-white/72 transition-colors hover:bg-white/10 hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-[#f97316]/45 ${
        compact ? 'w-11 justify-center px-0' : 'w-full gap-1 px-0'
      }`}
      aria-label={sidebarExpanded ? 'Collapse navigation' : 'Expand navigation'}
      title={sidebarExpanded ? 'Collapse navigation' : 'Expand navigation'}
    >
      <motion.span
        layout
        transition={reduceMotion ? { duration: 0 } : transitions.spring}
        className="relative z-10 grid h-full w-11 shrink-0 place-content-center"
      >
        <PanelLeftOpen
          className={`h-5 w-5 transition-transform ${sidebarExpanded ? 'rotate-180' : 'rotate-0'}`}
          strokeWidth={2.5}
        />
      </motion.span>
      <AnimatePresence initial={false}>
      {!compact && (
        <motion.span
          key="toggle-label"
          layout
          initial={reduceMotion ? false : { opacity: 0, x: -8, filter: 'blur(3px)' }}
          animate={reduceMotion ? undefined : { opacity: 1, x: 0, filter: 'blur(0px)' }}
          exit={reduceMotion ? undefined : { opacity: 0, x: -8, filter: 'blur(3px)' }}
          transition={reduceMotion ? { duration: 0 } : transitions.fast}
          className="ds-one-line relative z-10 min-w-0 pr-3"
        >
          {sidebarExpanded ? 'Hide' : 'Show'}
        </motion.span>
      )}
      </AnimatePresence>
    </motion.button>
  )

  return (
    <>
      {mobileMenuOpen && (
        <button
          type="button"
          aria-label="Close navigation"
          className="fixed inset-0 z-30 bg-black/20 backdrop-blur-[2px] lg:hidden"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      <motion.aside
        layout
        initial={false}
        animate={{ width: sidebarWidth }}
        transition={sidebarTransition}
        className={`fixed bottom-0 left-0 top-0 z-40 flex max-w-[82vw] flex-col overflow-visible rounded-r-[34px] bg-[#302226] text-white shadow-[0_28px_80px_rgba(48,34,38,0.28)] ring-1 ring-[#4a363a] transition-transform duration-300 lg:z-30 lg:translate-x-0 ${mobileSidebarTransformClass}`}
      >
        <button
          type="button"
          onClick={() => setMobileMenuOpen(false)}
          className="absolute right-5 top-5 flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white/70 lg:hidden"
          aria-label="Close navigation"
        >
          <X className="h-5 w-5" />
        </button>

        <motion.div
          layout
          animate={{ paddingLeft: sidebarExpanded ? 28 : 16, paddingRight: sidebarExpanded ? 28 : 16 }}
          transition={sidebarTransition}
          className="pt-8"
        >
          <AnimatePresence initial={false} mode="popLayout">
          {sidebarExpanded ? (
            <motion.div
              key="profile-expanded"
              layout
              initial={reduceMotion ? false : { opacity: 0, x: -10, filter: 'blur(3px)' }}
              animate={reduceMotion ? undefined : { opacity: 1, x: 0, filter: 'blur(0px)' }}
              exit={reduceMotion ? undefined : { opacity: 0, x: -10, filter: 'blur(3px)' }}
              transition={reduceMotion ? { duration: 0 } : transitions.fast}
              className="flex min-w-0 items-start gap-2"
            >
              <button
                onClick={() => navigate('/profile')}
                className="flex min-w-0 flex-1 items-center gap-3 rounded-2xl px-1 py-1 text-left hover:bg-white/10"
              >
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white/12 p-1 shadow-sm">
                  <div className="flex h-full w-full items-center justify-center rounded-full bg-[#facc15] text-sm font-black text-[#302226] shadow-inner">
                    {initials || 'EM'}
                  </div>
                </div>
                <motion.span
                  layout
                  initial={reduceMotion ? false : { opacity: 0, x: -8, filter: 'blur(3px)' }}
                  animate={reduceMotion ? undefined : { opacity: 1, x: 0, filter: 'blur(0px)' }}
                  transition={reduceMotion ? { duration: 0 } : transitions.fast}
                  className="min-w-0"
                >
                  <span className="ds-one-line block text-sm font-black text-white">{displayName}</span>
                  <span className="ds-one-line mt-0.5 block text-xs font-semibold text-white/54">{code}</span>
                </motion.span>
              </button>
              <div className="mt-1 shrink-0">{renderSidebarToggle(true)}</div>
            </motion.div>
          ) : (
            <motion.div
              key="profile-collapsed"
              layout
              initial={reduceMotion ? false : { opacity: 0, scale: 0.94 }}
              animate={reduceMotion ? undefined : { opacity: 1, scale: 1 }}
              exit={reduceMotion ? undefined : { opacity: 0, scale: 0.94 }}
              transition={reduceMotion ? { duration: 0 } : transitions.fast}
              className="flex flex-col items-center gap-3"
            >
              {renderSidebarToggle(true)}
              <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-full bg-[#facc15] text-sm font-black text-[#302226]">
                {initials || 'EM'}
              </div>
            </motion.div>
          )}
          </AnimatePresence>
        </motion.div>

        <LayoutGroup id="sidebar-navigation">
          <motion.nav
            layout
            initial={false}
            animate={sidebarExpanded ? 'expanded' : 'collapsed'}
            transition={sidebarTransition}
            style={{
              paddingLeft: sidebarExpanded ? 28 : 24,
              paddingRight: sidebarExpanded ? 28 : 24,
            }}
            className="mt-8 space-y-3"
          >
            {sidebarNavItems.map((item) => renderNavLink(item.to, item.label, item.icon, item.active, !sidebarExpanded))}
          </motion.nav>
        </LayoutGroup>

        <motion.div
          layout
          animate={{ paddingLeft: sidebarExpanded ? 28 : 20, paddingRight: sidebarExpanded ? 28 : 20 }}
          transition={sidebarTransition}
          className="mt-auto pb-7"
        >
          <AnimatePresence initial={false} mode="popLayout">
          {sidebarExpanded ? (
            <motion.div
              key="sidebar-card"
              layout
              initial={reduceMotion ? false : { opacity: 0, y: 10, scale: 0.98, filter: 'blur(3px)' }}
              animate={reduceMotion ? undefined : { opacity: 1, y: 0, scale: 1, filter: 'blur(0px)' }}
              exit={reduceMotion ? undefined : { opacity: 0, y: 8, scale: 0.98, filter: 'blur(3px)' }}
              transition={reduceMotion ? { duration: 0 } : transitions.fast}
              className="overflow-hidden rounded-[28px] bg-white/8 p-5 ring-1 ring-white/10"
            >
              <p className="text-sm font-black text-white">EMD Frameworks</p>
              <p className="mt-1 text-xs font-semibold leading-5 text-white/58">Design ethical monetization plans.</p>
              <div className="mt-5 flex justify-center">
                <img
                  src="/camt-mark.png"
                  alt={t('brand.camt')}
                  className="ds-brand-lock h-16 w-20 object-contain drop-shadow-lg"
                />
              </div>
            </motion.div>
          ) : (
            <motion.img
              key="sidebar-mark"
              layout
              initial={reduceMotion ? false : { opacity: 0, scale: 0.86 }}
              animate={reduceMotion ? undefined : { opacity: 1, scale: 1 }}
              exit={reduceMotion ? undefined : { opacity: 0, scale: 0.86 }}
              transition={reduceMotion ? { duration: 0 } : transitions.fast}
              src="/camt-mark.png"
              alt={t('brand.camt')}
              className="ds-brand-lock mx-auto h-10 w-12 object-contain drop-shadow-lg"
            />
          )}
          </AnimatePresence>
        </motion.div>
      </motion.aside>

      <button
        type="button"
        onClick={() => setMobileMenuOpen(true)}
        className="fixed left-4 top-4 z-30 flex h-11 w-11 items-center justify-center rounded-2xl bg-white text-slate-700 shadow-lg ring-1 ring-orange-100 lg:hidden"
        aria-label="Open navigation"
      >
        <Menu className="h-5 w-5" />
      </button>
    </>
  )
}
