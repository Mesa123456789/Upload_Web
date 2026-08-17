import { useNavigate } from 'react-router-dom'
import { FolderPlus } from 'lucide-react'
import { useAuth } from '../../auth/context/useAuth'
import { useI18n } from '../../../i18n/I18nProvider'
import PageContainer from '../../../app/layout/PageContainer'
import { Skeleton } from '../../../shared/components/Skeleton'
import StudentProjectsPanel from '../components/StudentProjectsPanel'
import { useStudentCourseProjects } from '../hooks/useStudentCourseProjects'

function ProjectsSkeleton() {
  return (
    <PageContainer>
      <div className="mb-3 flex items-center justify-between">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-6 w-20" />
      </div>
      <Skeleton className="h-[64px] rounded-[16px]" />
      <div className="rounded-[24px] bg-white p-5 shadow-[0_14px_28px_rgba(17,24,39,0.08)]">
        {Array.from({ length: 7 }).map((_, index) => (
          <div key={index} className="grid grid-cols-3 gap-4 border-b border-black/5 py-4 last:border-0 sm:grid-cols-5">
            {Array.from({ length: 5 }).map((__, cell) => (
              <Skeleton key={cell} className="h-4" />
            ))}
          </div>
        ))}
      </div>
    </PageContainer>
  )
}

export default function StudentProjectsPage() {
  const { user } = useAuth()
  const { t } = useI18n()
  const navigate = useNavigate()
  const {
    courseData,
    visibleCourseData,
    selectedCourse,
    filterCourseId,
    setFilterCourseId,
    loading,
    error,
  } = useStudentCourseProjects(user?.id)
  const addProjectCourseId = selectedCourse?.id ?? courseData[0]?.course.id

  if (loading) return <ProjectsSkeleton />

  return (
    <PageContainer>
      <StudentProjectsPanel
        courseData={courseData}
        visibleCourseData={visibleCourseData}
        selectedCourse={selectedCourse}
        filterCourseId={filterCourseId}
        onFilterCourseChange={setFilterCourseId}
        error={error}
      />

      <div className="flex justify-end">
        <button
          onClick={() => addProjectCourseId && navigate(`/project/new?courseId=${addProjectCourseId}`)}
          disabled={!addProjectCourseId}
          className="ds-button ds-button-secondary min-w-[150px]"
          title={!addProjectCourseId ? t('common.noCoursesYet') : undefined}
        >
          <FolderPlus className="h-4 w-4" />
          {t('dashboard.student.addProject')}
        </button>
      </div>
    </PageContainer>
  )
}
