import { useNavigate } from 'react-router-dom'
import { Plus } from 'lucide-react'
import { useAuth } from '../../auth/context/useAuth'
import { useI18n } from '../../../i18n/I18nProvider'
import PageContainer from '../../../app/layout/PageContainer'
import { Skeleton } from '../../../shared/components/Skeleton'
import StudentProjectsPanel from '../components/StudentProjectsPanel'
import { useStudentCourseProjects } from '../hooks/useStudentCourseProjects'

type Accent = 'blue' | 'green' | 'orange' | 'yellow'

function StatCard({
  label,
  value,
  accent,
  watermark,
}: {
  label: string
  value: string
  accent: Accent
  watermark: string
}) {
  return (
    <div className={`relative h-[156px] overflow-hidden rounded-[24px] px-5 py-5 text-white shadow-sm sm:h-[172px] sm:rounded-[28px] sm:px-7 sm:py-6 xl:h-[166px] 2xl:h-[188px] 2xl:rounded-[30px] 2xl:px-8 2xl:py-7 ds-stat-${accent}`}>
      <p className="ds-stat-card-label text-[18px] font-medium drop-shadow-md sm:text-[22px] 2xl:text-[24px]">{label}</p>
      <p className="ds-stat-card-value text-center text-[52px] font-black leading-none text-[#fff3e4] drop-shadow-[0_8px_8px_rgba(48,34,38,0.35)] sm:text-[64px] 2xl:text-[72px]">
        {value}
      </p>
      <span className="ds-stat-card-watermark pointer-events-none absolute -bottom-5 right-0 text-[150px] font-black leading-none text-white/20 sm:-bottom-6 sm:text-[190px] 2xl:-bottom-7 2xl:text-[220px]">
        {watermark}
      </span>
    </div>
  )
}

function DashboardSkeleton() {
  return (
    <PageContainer>
      <Skeleton className="mb-10 h-9 w-44" />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <Skeleton key={index} className="h-[150px] rounded-[24px]" />
        ))}
      </div>
      <div className="rounded-[24px] bg-white p-5 shadow-[0_14px_28px_rgba(17,24,39,0.08)]">
        {Array.from({ length: 7 }).map((_, index) => (
          <div key={index} className="grid grid-cols-3 gap-4 border-b border-black/5 py-3 last:border-0 sm:grid-cols-5">
            {Array.from({ length: 5 }).map((__, cell) => (
              <Skeleton key={cell} className="h-4" />
            ))}
          </div>
        ))}
      </div>
    </PageContainer>
  )
}

export default function StudentDashboardPage() {
  const { user } = useAuth()
  const { t, formatNumber } = useI18n()
  const navigate = useNavigate()
  const {
    courseData,
    visibleCourseData,
    projects,
    selectedCourse,
    filterCourseId,
    setFilterCourseId,
    loading,
    error,
  } = useStudentCourseProjects(user?.id)

  const activeProjects = projects.length
  const readyProjects = projects.filter((project) => project.current_step >= 4).length
  const submittedProjects = projects.filter((project) => project.status !== 'draft').length
  const guardrailReady = projects.filter((project) => project.current_step >= 3).length

  if (loading) return <DashboardSkeleton />

  return (
    <PageContainer>
      <div className="mb-6 flex justify-end sm:mb-8">
        <button
          onClick={() => navigate('/join')}
          className="ds-button ds-button-yellow min-w-[150px]"
        >
          <Plus className="h-4 w-4" />
          {t('dashboard.student.joinCourse')}
        </button>
      </div>

      <div className="grid auto-rows-fr gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label={t('dashboard.student.stats.activeProjects')} value={formatNumber(activeProjects)} accent="blue" watermark="C" />
        <StatCard label={t('dashboard.student.stats.outputReady')} value={formatNumber(readyProjects)} accent="green" watermark="A" />
        <StatCard label={t('dashboard.student.stats.submitted')} value={formatNumber(submittedProjects)} accent="orange" watermark="M" />
        <StatCard label={t('dashboard.student.stats.guardrailReady')} value={formatNumber(guardrailReady)} accent="yellow" watermark="T" />
      </div>

      <StudentProjectsPanel
        courseData={courseData}
        visibleCourseData={visibleCourseData}
        projects={projects}
        selectedCourse={selectedCourse}
        filterCourseId={filterCourseId}
        onFilterCourseChange={setFilterCourseId}
        error={error}
      />
    </PageContainer>
  )
}
