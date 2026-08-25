import { useLayoutEffect, useRef, useState } from 'react'
import { Link, Outlet, useLocation } from 'react-router-dom'
import { motion, useReducedMotion } from 'framer-motion'
import { Home, Menu } from 'lucide-react'
import AdminSidebar from './AdminSidebar'
import { sidebarCollapsedWidth, sidebarExpandedWidth } from './Sidebar'
import { useI18n } from '../../i18n/I18nProvider'
import { useIsMobile } from './useIsMobile'

const sidebarPreferenceKey = 'emd-admin-sidebar-expanded'
const sidebarSlideTransition = { duration: 0.3, ease: [0.4, 0, 0.2, 1] as const }

function getInitialSidebarExpanded() {
  const savedPreference = window.localStorage.getItem(sidebarPreferenceKey)
  return savedPreference ? savedPreference === 'open' : true
}

function getAdminPageMeta(pathname: string, t: (key: string) => string) {
  if (pathname.startsWith('/admin/users')) {
    return { title: t('adminUsers.title'), subtitle: t('adminUsers.subtitle'), breadcrumb: t('adminLayout.users'), breadcrumbTo: '/admin/users' }
  }
  if (pathname.startsWith('/admin/roles')) {
    return { title: t('adminRoles.title'), subtitle: t('adminRoles.subtitle'), breadcrumb: t('adminLayout.roles'), breadcrumbTo: '/admin/roles' }
  }
  return { title: t('adminDashboard.title'), subtitle: t('adminDashboard.subtitle'), breadcrumb: t('adminLayout.dashboard'), breadcrumbTo: '/admin/dashboard' }
}

// Shares Sidebar's collapse mechanics and widths, and PageContainer's fixed
// breadcrumb header, with the main app shell so the admin panel behaves and
// looks identical instead of being a visually separate experience.
export default function AdminLayout() {
  const reduceMotion = useReducedMotion()
  const location = useLocation()
  const { t } = useI18n()
  const isMobile = useIsMobile()
  const [sidebarExpanded, setSidebarExpanded] = useState(() => isMobile ? false : getInitialSidebarExpanded())
  // The drawer overlays content on mobile instead of pushing it, so the
  // header/main never reserve space for it there.
  const sidebarWidth = isMobile ? 0 : (sidebarExpanded ? sidebarExpandedWidth : sidebarCollapsedWidth)
  const pageMeta = getAdminPageMeta(location.pathname, t)

  // The fixed header's height varies (the subtitle can wrap to more lines
  // on a narrow phone), so main's top offset is measured from the real
  // header instead of a guessed constant that could overlap content.
  const headerRef = useRef<HTMLElement>(null)
  // Fallback matches the old static guess, so if the measurement below ever
  // fails to land, layout degrades to the previous (mostly-correct)
  // behavior instead of collapsing toward 0 and hiding content under the
  // header entirely.
  const [headerHeight, setHeaderHeight] = useState(128)

  useLayoutEffect(() => {
    const el = headerRef.current
    if (!el) return
    const updateHeight = () => setHeaderHeight(el.offsetHeight)
    updateHeight()
    const observer = new ResizeObserver(updateHeight)
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  function setSidebarPreference(nextExpanded: boolean) {
    window.localStorage.setItem(sidebarPreferenceKey, nextExpanded ? 'open' : 'closed')
    setSidebarExpanded(nextExpanded)
  }

  return (
    <div className="min-h-screen bg-[var(--ds-bg)]">
      <AdminSidebar isOpen={sidebarExpanded} setIsOpen={setSidebarPreference} />
      <motion.section
        ref={headerRef}
        initial={false}
        animate={{ left: sidebarWidth }}
        transition={reduceMotion ? { duration: 0 } : sidebarSlideTransition}
        className="no-print fixed right-0 top-0 z-20 border-b border-slate-200/80 bg-white/92 px-4 py-3 shadow-[0_10px_24px_rgba(17,24,39,0.04)] backdrop-blur-xl sm:px-6 sm:py-3 lg:px-10 2xl:px-14"
      >
        <div className="flex min-w-0 items-start gap-3">
          <button
            type="button"
            onClick={() => setSidebarPreference(true)}
            className="grid h-9 w-9 shrink-0 place-content-center rounded-full text-[#7a3414] transition hover:bg-[#F48E2E]/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#F48E2E]/35 md:hidden"
            aria-label="Open navigation menu"
          >
            <Menu className="h-5 w-5" />
          </button>
          <div className="min-w-0">
            <div className="flex min-w-0 items-center gap-2 text-xs font-bold text-slate-400">
              <Home className="h-3.5 w-3.5 shrink-0" />
              <Link to="/" className="shrink-0 transition hover:text-[#f97316]">
                Home
              </Link>
              <span className="text-slate-300">/</span>
              <Link to={pageMeta.breadcrumbTo} className="ds-one-line text-slate-500 transition hover:text-[#f97316]">
                {pageMeta.breadcrumb}
              </Link>
            </div>
            <h1 className="mt-1 text-[24px] font-black leading-tight tracking-tight text-[var(--ds-ink)] sm:text-[28px]">
              {pageMeta.title}
            </h1>
            <p className="mt-0.5 max-w-2xl text-sm leading-5 text-slate-500">{pageMeta.subtitle}</p>
          </div>
        </div>
      </motion.section>
      <motion.main
        initial={false}
        animate={{ marginLeft: sidebarWidth, paddingTop: headerHeight + 20 }}
        transition={reduceMotion ? { duration: 0 } : sidebarSlideTransition}
        className="min-h-screen space-y-8 px-4 pb-10 sm:px-6 sm:pb-12 lg:px-10 lg:pb-8 2xl:px-14"
      >
        <Outlet />
      </motion.main>
    </div>
  )
}
