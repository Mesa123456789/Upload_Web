import { useNavigate } from 'react-router-dom'
import { FolderPlus, Plus } from 'lucide-react'
import { useAuth } from '../../auth/context/useAuth'
import { useI18n } from '../../../i18n/I18nProvider'
import PageContainer from '../../../app/layout/PageContainer'
import { Skeleton } from '../../../shared/components/Skeleton'
import StudentBento from '../../../components/animata/bento-grid/student'
import StudentProjectsPanel from '../components/StudentProjectsPanel'
import { useStudentCourseProjects } from '../hooks/useStudentCourseProjects'

function normalizeBars(values: number[], minimum = 18) {
  const max = Math.max(...values, 1)
  return values.map((value) => value === 0 ? 8 : Math.max(minimum, Math.round((value / max) * 100)))
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
  const { t } = useI18n()
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
  const submittedProjects = projects.filter((project) => project.status !== 'draft').length
  const guardrailReady = projects.filter((project) => project.current_step >= 3).length
  const gradedProjects = projects.filter((project) => project.grade != null)
  const gradeAverage = gradedProjects.length > 0
    ? Math.round(gradedProjects.reduce((total, project) => total + (project.grade ?? 0), 0) / gradedProjects.length)
    : null
  const stepCounts = {
    setup: projects.filter((project) => project.current_step <= 1).length,
    build: projects.filter((project) => project.current_step === 2).length,
    output: projects.filter((project) => project.current_step >= 4).length,
  }
  const reportBars = normalizeBars([
    stepCounts.setup,
    stepCounts.build,
    guardrailReady,
    stepCounts.output,
  ], 16)
  const addProjectCourseId = selectedCourse?.id ?? courseData[0]?.course.id

  if (loading) return <DashboardSkeleton />

  return (
    <PageContainer>
      <div className="mb-6 flex flex-wrap justify-end gap-3 sm:mb-8">
        <button
          onClick={() => addProjectCourseId && navigate(`/project/new?courseId=${addProjectCourseId}`)}
          disabled={!addProjectCourseId}
          className="ds-button ds-button-secondary min-w-[150px]"
          title={!addProjectCourseId ? t('common.noCoursesYet') : undefined}
        >
          <FolderPlus className="h-4 w-4" />
          {t('dashboard.student.addProject')}
        </button>
        <button
          onClick={() => navigate('/join')}
          className="ds-button ds-button-yellow min-w-[150px]"
        >
          <Plus className="h-4 w-4" />
          {t('dashboard.student.joinCourse')}
        </button>
      </div>

      <StudentBento
        courses={courseData.length}
        activeProjects={activeProjects}
        submittedReady={submittedProjects}
        gradeAverage={gradeAverage}
        guardrailReady={guardrailReady}
        stepCounts={stepCounts}
        reportBars={reportBars}
      />

      <StudentProjectsPanel
        courseData={courseData}
        visibleCourseData={visibleCourseData}
        selectedCourse={selectedCourse}
        filterCourseId={filterCourseId}
        onFilterCourseChange={setFilterCourseId}
        error={error}
      />
    </PageContainer>
  )
}
