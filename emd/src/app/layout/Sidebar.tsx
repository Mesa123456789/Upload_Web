import { useEffect, useState } from 'react'
import { NavLink, useLocation, useNavigate } from 'react-router-dom'
import { AnimatePresence, motion, type Transition } from 'framer-motion'
import {
  BookOpen,
  CircleHelp,
  ClipboardList,
  LayoutDashboard,
  Menu,
  Plus,
  Settings,
  ShieldCheck,
  Users,
  type LucideIcon,
} from 'lucide-react'
import { useAuth } from '../../features/auth/context/useAuth'
import { listStudentCourses } from '../../features/courses/services/courses.service'
import CreateProjectCourseDialog from '../../features/student/components/CreateProjectCourseDialog'
import { useI18n } from '../../i18n/I18nProvider'
import type { Course } from '../../lib/database.types'
import CollapsedTooltip from './SidebarTooltip'
import { useIsMobile } from './useIsMobile'

export const sidebarCollapsedWidth = 68
export const sidebarExpandedWidth = 280
const sidebarEase = [0.4, 0, 0.2, 1] as const
const sidebarTransition: Transition = { duration: 0.3, ease: sidebarEase }
const labelTransition: Transition = { duration: 0.18, ease: sidebarEase }

export interface SidebarNavItem {
  id: string
  label: string
  to: string
  icon: LucideIcon
  active: boolean
}

export interface SidebarProps {
  isOpen: boolean
  setIsOpen: (open: boolean) => void
}

export default function Sidebar({ isOpen, setIsOpen }: SidebarProps) {
  const { profile, isAdmin } = useAuth()
  const { t } = useI18n()
  const navigate = useNavigate()
  const location = useLocation()
  const isMobile = useIsMobile()
  const isInstructor = profile?.role === 'instructor'
  const [studentCourses, setStudentCourses] = useState<Course[]>([])
  const [studentCoursesLoading, setStudentCoursesLoading] = useState(false)
  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const width = isOpen ? sidebarExpandedWidth : sidebarCollapsedWidth

  const primaryAction = isInstructor
    ? { label: t('instructorCourses.createNew'), to: '/instructor/courses' }
    : { label: t('projects.createNew'), to: '/project/new' }

  useEffect(() => {
    if (isInstructor || !profile) {
      setStudentCourses([])
      return
    }

    let cancelled = false
    setStudentCoursesLoading(true)

    listStudentCourses()
      .then((courses) => {
        if (!cancelled) setStudentCourses(courses)
      })
      .catch(() => {
        if (!cancelled) setStudentCourses([])
      })
      .finally(() => {
        if (!cancelled) setStudentCoursesLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [isInstructor, profile])

  const roleItems: SidebarNavItem[] = isInstructor
    ? [
        {
          id: 'dashboard',
          label: t('navigation.dashboard'),
          to: '/instructor/dashboard',
          icon: LayoutDashboard,
          active: location.pathname === '/' || location.pathname === '/instructor/dashboard',
        },
        {
          id: 'courses',
          label: t('instructorCourses.title'),
          to: '/instructor/courses',
          icon: BookOpen,
          active: location.pathname.startsWith('/instructor/courses'),
        },
        {
          id: 'projects',
          label: t('navigation.projects'),
          to: '/instructor/projects',
          icon: ClipboardList,
          active: location.pathname.startsWith('/instructor/projects') || location.pathname.startsWith('/instructor/project/'),
        },
        {
          id: 'students',
          label: t('navigation.students'),
          to: '/instructor/students',
          icon: Users,
          active: location.pathname.startsWith('/instructor/students') || location.pathname.startsWith('/instructor/student/'),
        },
      ]
    : [
        {
          id: 'dashboard',
          label: t('navigation.dashboard'),
          to: '/dashboard',
          icon: LayoutDashboard,
          active: location.pathname === '/' || location.pathname === '/dashboard',
        },
        {
          id: 'projects',
          label: t('navigation.projects'),
          to: '/projects',
          icon: ClipboardList,
          active: location.pathname === '/projects' || location.pathname.startsWith('/project/'),
        },
        {
          id: 'join-course',
          label: t('projects.joinCourse'),
          to: '/join',
          icon: BookOpen,
          active: location.pathname === '/join' || location.pathname.startsWith('/course/'),
        },
      ]

  const mainItems: SidebarNavItem[] = [
    ...roleItems,
    ...(isAdmin
      ? [
          {
            id: 'admin',
            label: t('navigation.admin'),
            to: '/admin/dashboard',
            icon: ShieldCheck,
            active: location.pathname.startsWith('/admin'),
          },
        ]
      : []),
  ]

  const utilityItems: SidebarNavItem[] = [
    {
      id: 'help',
      label: 'Help',
      to: isInstructor ? '/instructor/dashboard' : '/dashboard',
      icon: CircleHelp,
      active: false,
    },
    {
      id: 'settings',
      label: 'Settings',
      to: '/profile',
      icon: Settings,
      active: location.pathname.startsWith('/profile'),
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

  const handlePrimaryAction = () => {
    if (isMobile) setIsOpen(false)

    if (isInstructor) {
      navigate(primaryAction.to)
      return
    }

    if (studentCourses.length === 0) {
      navigate('/join')
      return
    }

    setCreateDialogOpen(true)
  }

  const displayName = profile?.display_name ?? profile?.email ?? t('roles.guest')
  const code = profile?.student_code ?? (profile?.role ? t(`roles.${profile.role}`) : 'EMD')
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
        aria-label="Application sidebar"
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
            <img src="/camt-mark.png" alt={t('brand.camt')} className="h-7 w-7 object-contain opacity-100 transition group-hover/logo:opacity-0" />
            <Menu className="absolute left-1/2 top-1/2 h-[22px] w-[22px] -translate-x-1/2 -translate-y-1/2 text-[#7a3414] opacity-0 transition group-hover/logo:opacity-100" strokeWidth={2.3} />
            <span className="pointer-events-none absolute left-[calc(100%+10px)] top-1/2 z-[60] -translate-y-1/2 whitespace-nowrap rounded-lg bg-[#201316] px-2.5 py-1.5 text-xs font-black text-white opacity-0 shadow-[0_10px_24px_rgba(32,19,22,0.22)] transition group-hover/logo:opacity-100">
              {isOpen ? 'Collapse' : 'Expand'}
            </span>
          </button>
        </div>

        <div className="mt-5 shrink-0">
          <CollapsedTooltip label={primaryAction.label} enabled={!isOpen}>
            <button
              type="button"
              onClick={handlePrimaryAction}
              disabled={!isInstructor && studentCoursesLoading}
              className="flex h-11 w-full min-w-0 items-center overflow-hidden rounded-full bg-[#facc15] text-sm font-black text-[#302226] shadow-[0_12px_28px_rgba(250,204,21,0.18)] transition hover:bg-[#f4bd0a] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#F48E2E]/35"
              aria-label={primaryAction.label}
            >
              <span className="relative grid h-11 w-11 shrink-0 place-content-center">
                <Plus className="h-4 w-4 text-[#302226]" strokeWidth={2.35} />
              </span>
              {renderLabel(primaryAction.label)}
            </button>
          </CollapsedTooltip>
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
                  <span className="ds-one-line mt-0.5 block text-xs font-semibold text-slate-500">{code}</span>
                </motion.span>
              )}
            </AnimatePresence>
          </button>
        </CollapsedTooltip>
      </div>
      </motion.aside>
      <CreateProjectCourseDialog
        courses={studentCourses}
        open={createDialogOpen}
        onClose={() => setCreateDialogOpen(false)}
      />
    </>
  )
}
