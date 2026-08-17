import Sidebar, { sidebarCollapsedWidth, sidebarExpandedWidth } from './Sidebar'
import { motion, useReducedMotion } from 'framer-motion'
import { useEffect, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { Home, Languages } from 'lucide-react'
import { useAuth } from '../../features/auth/context/useAuth'
import { useI18n } from '../../i18n/I18nProvider'
import { pageVariants } from '../../shared/motion'

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
  const [sidebarExpanded, setSidebarExpanded] = useState(() => getInitialSidebarExpanded(location.pathname))
  const { profile } = useAuth()
  const { t, language, setLanguage } = useI18n()
  const isInstructor = profile?.role === 'instructor'
  const pageMeta = getPageMeta(location.pathname, t, isInstructor)
  const nextLanguage = language === 'th' ? 'en' : 'th'
  const sidebarSlideTransition = { duration: 0.3, ease: [0.4, 0, 0.2, 1] as const }
  const sidebarWidth = sidebarExpanded ? sidebarExpandedWidth : sidebarCollapsedWidth

  useEffect(() => {
    setSidebarExpanded(getInitialSidebarExpanded(location.pathname))
  }, [location.pathname])

  function setSidebarPreference(nextExpanded: boolean) {
    window.localStorage.setItem(sidebarPreferenceKey, nextExpanded ? 'open' : 'closed')
    setSidebarExpanded(nextExpanded)
  }

  return (
    <div className="min-h-screen bg-[var(--ds-bg)]">
      <Sidebar isOpen={sidebarExpanded} setIsOpen={setSidebarPreference} />
      <motion.section
        initial={false}
        animate={{ left: sidebarWidth }}
        transition={sidebarSlideTransition}
        className="no-print fixed right-0 top-0 z-20 border-b border-slate-200/80 bg-white/92 px-4 py-3 shadow-[0_10px_24px_rgba(17,24,39,0.04)] backdrop-blur-xl sm:px-6 sm:py-3 lg:px-10 2xl:px-14"
      >
        <div className="flex min-w-0 items-start justify-between gap-4">
          <div className="flex min-w-0 items-start gap-4">
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
        initial={reduceMotion ? false : { ...pageVariants.initial, marginLeft: sidebarWidth }}
        animate={reduceMotion ? { marginLeft: sidebarWidth } : { ...pageVariants.animate, marginLeft: sidebarWidth }}
        transition={sidebarSlideTransition}
        className={`min-h-screen space-y-8 px-4 pb-10 pt-[118px] sm:px-6 sm:pb-12 sm:pt-[112px] lg:px-10 lg:pb-8 2xl:px-14 ${className}`}
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
