import Sidebar, { sidebarCollapsedWidth, sidebarExpandedWidth } from './Sidebar'
import { motion, useReducedMotion } from 'framer-motion'
import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { Home, Languages, Menu } from 'lucide-react'
import { useAuth } from '../../features/auth/context/useAuth'
import { useI18n } from '../../i18n/I18nProvider'
import { pageVariants } from '../../shared/motion'
import { useIsMobile } from './useIsMobile'

interface PageContainerProps {
  children: React.ReactNode
  className?: string
}

const sidebarPreferenceKey = 'emd-sidebar-expanded'

function isDashboardPath(pathname: string) {
  return pathname === '/dashboard' || pathname === '/instructor/dashboard'
}

function getInitialSidebarExpanded(pathname: string) {
  const savedPreference = window.localStorage.getItem(sidebarPreferenceKey)
  if (savedPreference) return savedPreference === 'open'
  return isDashboardPath(pathname)
}

export default function PageContainer({ children, className = '' }: PageContainerProps) {
  const reduceMotion = useReducedMotion()
  const location = useLocation()
  const isMobile = useIsMobile()
  const [sidebarExpanded, setSidebarExpanded] = useState(() => isMobile ? false : getInitialSidebarExpanded(location.pathname))
  const { profile } = useAuth()
  const { t, language, setLanguage } = useI18n()
  const isInstructor = profile?.role === 'instructor'
  const pageMeta = getPageMeta(location.pathname, t, isInstructor)
  const nextLanguage = language === 'th' ? 'en' : 'th'
  const sidebarSlideTransition = { duration: 0.3, ease: [0.4, 0, 0.2, 1] as const }
  // The drawer overlays content on mobile instead of pushing it, so the
  // header/main never reserve space for it there.
  const sidebarWidth = isMobile ? 0 : (sidebarExpanded ? sidebarExpandedWidth : sidebarCollapsedWidth)

  // The fixed header's height varies (the subtitle can wrap to 2-3 lines on
  // a narrow phone, or when Thai/English text lengths differ), so main's
  // top offset is measured from the real header instead of a guessed
  // constant — a guessed constant overlapped content whenever the header
  // grew taller than that guess.
  const headerRef = useRef<HTMLElement>(null)
  // Fallback matches the old static guess, so if the measurement below ever
  // fails to land, layout degrades to the previous (mostly-correct)
  // behavior instead of collapsing toward 0 and hiding content under the
  // header entirely.
  const [headerHeight, setHeaderHeight] = useState(112)

  useLayoutEffect(() => {
    const el = headerRef.current
    if (!el) return
    const updateHeight = () => setHeaderHeight(el.offsetHeight)
    updateHeight()
    const observer = new ResizeObserver(updateHeight)
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    setSidebarExpanded(isMobile ? false : getInitialSidebarExpanded(location.pathname))
  }, [location.pathname, isMobile])

  function setSidebarPreference(nextExpanded: boolean) {
    window.localStorage.setItem(sidebarPreferenceKey, nextExpanded ? 'open' : 'closed')
    setSidebarExpanded(nextExpanded)
  }

  return (
    <div className="min-h-screen bg-[var(--ds-bg)]">
      <Sidebar isOpen={sidebarExpanded} setIsOpen={setSidebarPreference} />
      <motion.section
        ref={headerRef}
        initial={false}
        animate={{ left: sidebarWidth }}
        transition={sidebarSlideTransition}
        className="no-print fixed right-0 top-0 z-20 border-b border-slate-200/80 bg-white/92 px-4 py-3 shadow-[0_10px_24px_rgba(17,24,39,0.04)] backdrop-blur-xl sm:px-6 sm:py-3 lg:px-10 2xl:px-14"
      >
        <div className="flex min-w-0 items-start justify-between gap-4">
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
          <button
            type="button"
            onClick={() => setLanguage(nextLanguage)}
            className="flex h-10 w-[74px] shrink-0 items-center justify-center gap-1.5 rounded-2xl bg-[#302226] text-xs font-black text-white shadow-sm ring-1 ring-[#4a363a] transition hover:bg-[#3b2a2e]"
            aria-label={t('language.switch')}
            title={t('language.switch')}
          >
            <Languages className="h-4 w-4 shrink-0" />
            <span className="w-5 text-center [font-family:Arial,sans-serif]">{language === 'th' ? 'TH' : 'EN'}</span>
          </button>
        </div>
      </motion.section>
      <motion.main
        initial={reduceMotion ? false : { ...pageVariants.initial, marginLeft: sidebarWidth, paddingTop: headerHeight + 20 }}
        animate={reduceMotion ? { marginLeft: sidebarWidth, paddingTop: headerHeight + 20 } : { ...pageVariants.animate, marginLeft: sidebarWidth, paddingTop: headerHeight + 20 }}
        transition={sidebarSlideTransition}
        className={`min-h-screen space-y-8 px-4 pb-10 sm:px-6 sm:pb-12 lg:px-10 lg:pb-8 2xl:px-14 ${className}`}
      >
        {children}
      </motion.main>
    </div>
  )
}

function getPageMeta(pathname: string, t: (key: string) => string, isInstructor: boolean) {
  if (pathname.includes('/profile')) {
    return { title: t('profile.title'), subtitle: t('profile.subtitle'), breadcrumb: t('navigation.profile'), breadcrumbTo: '/profile' }
  }
  if (pathname.includes('/join')) {
    return { title: t('joinCourse.title'), subtitle: t('joinCourse.subtitle'), breadcrumb: t('joinCourse.title'), breadcrumbTo: '/join' }
  }
  if (pathname.includes('/instructor/projects')) {
    return { title: t('instructorProjects.title'), subtitle: t('instructorProjects.subtitle'), breadcrumb: t('navigation.projects'), breadcrumbTo: '/instructor/projects' }
  }
  if (pathname.includes('/instructor/students')) {
    return { title: t('instructorStudents.title'), subtitle: t('instructorStudents.subtitle'), breadcrumb: t('navigation.students'), breadcrumbTo: '/instructor/students' }
  }
  if (pathname.includes('/instructor/courses')) {
    return { title: t('instructorCourses.title'), subtitle: t('instructorCourses.subtitle'), breadcrumb: t('common.courses'), breadcrumbTo: '/instructor/courses' }
  }
  if (pathname.includes('/projects')) {
    return { title: t('projects.myProjects'), subtitle: t('dashboard.student.subtitle'), breadcrumb: t('navigation.projects'), breadcrumbTo: '/projects' }
  }
  if (pathname.includes('/project/')) {
    return { title: t('projects.myProjects'), subtitle: t('dashboard.student.subtitle'), breadcrumb: t('navigation.projects'), breadcrumbTo: '/projects' }
  }
  if (isInstructor) {
    return { title: t('dashboard.instructor.title'), subtitle: t('dashboard.student.subtitle'), breadcrumb: t('navigation.dashboard'), breadcrumbTo: '/instructor/dashboard' }
  }
  return { title: t('dashboard.student.title'), subtitle: t('dashboard.student.subtitle'), breadcrumb: t('navigation.dashboard'), breadcrumbTo: '/dashboard' }
}
