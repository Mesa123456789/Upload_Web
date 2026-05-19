import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../auth/context/useAuth'
import { listStudentCourses } from '../../courses/services/courses.service'
import { listProjectsByCourseAndOwner } from '../../projects/services/projects.service'
import type { Course, Project } from '../../../lib/database.types'
import PageContainer from '../../../app/layout/PageContainer'
import Card from '../../../shared/components/Card'
import Badge from '../../../shared/components/Badge'
import Spinner from '../../../shared/components/Spinner'

// Map current_step number to a readable label and badge variant
function getStepInfo(step: number): { label: string; variant: 'blue' | 'yellow' | 'purple' | 'green' } {
  switch (step) {
    case 1: return { label: 'Setup', variant: 'blue' }
    case 2: return { label: 'Build', variant: 'yellow' }
    case 3: return { label: 'Guardrail', variant: 'purple' }
    case 4: return { label: 'Output', variant: 'green' }
    default: return { label: 'Setup', variant: 'blue' }
  }
}

// Navigate to the correct step page based on current_step
function getProjectPath(projectId: string, step: number): string {
  switch (step) {
    case 1: return `/project/${projectId}/setup`
    case 2: return `/project/${projectId}/build`
    case 3: return `/project/${projectId}/guardrail`
    case 4: return `/project/${projectId}/output`
    default: return `/project/${projectId}/setup`
  }
}

interface CourseWithProjects {
  course: Course
  projects: Project[]
}

// Sentinel value for the filter dropdown — "show all courses"
const ALL_FILTER = '__ALL__'

export default function StudentDashboardPage() {
  const { user } = useAuth()
  const navigate = useNavigate()

  const [courseData, setCourseData] = useState<CourseWithProjects[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Filter by course — only visible when student is in multiple courses
  const [filterCourseId, setFilterCourseId] = useState<string>(ALL_FILTER)

  async function loadData() {
    if (!user) return
    setLoading(true)
    setError(null)

    try {
      const courses = await listStudentCourses()

      // Fetch each course's projects in parallel — faster than sequential loop
      const results = await Promise.all(
        courses.map(async (course) => {
          const projects = await listProjectsByCourseAndOwner(course.id, user.id)
          return { course, projects }
        })
      )

      setCourseData(results)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load dashboard')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
    // Depend on user.id (stable string) not user object — prevents re-fetch on
    // token refresh events where Supabase creates a new user object reference.
  }, [user?.id])

  if (loading) {
    return (
      <PageContainer>
        <div className="flex items-center justify-center py-20">
          <Spinner size="lg" />
        </div>
      </PageContainer>
    )
  }

  // Apply course filter — if ALL_FILTER, show everything
  const visibleCourseData =
    filterCourseId === ALL_FILTER
      ? courseData
      : courseData.filter((cd) => cd.course.id === filterCourseId)

  // Only show the filter dropdown when enrolled in 2+ courses
  const showFilter = courseData.length >= 2

  return (
    <PageContainer>
      {/* Page header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">My Projects</h1>
          <p className="text-sm text-gray-500 leading-6 mt-1">
            Your enrolled courses and monetization projects
          </p>
        </div>

        {/* Join a Course — primary action */}
        <button
          onClick={() => navigate('/join')}
          className="rounded-full bg-primary px-6 py-2.5 text-sm font-bold text-white hover:bg-primary-light transition-colors"
        >
          + Join a Course
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-2xl p-4 text-sm">
          {error}
        </div>
      )}

      {/* Course filter — only shown when student is in multiple courses */}
      {showFilter && (
        <div className="flex items-center gap-3">
          <label className="text-xs font-bold uppercase tracking-[0.18em] text-primary whitespace-nowrap">
            Filter
          </label>
          <select
            value={filterCourseId}
            onChange={(e) => setFilterCourseId(e.target.value)}
            className="border border-black/10 rounded-full px-4 py-1.5 text-sm bg-background-card focus:outline-none focus:ring-2 focus:ring-primary/30"
          >
            <option value={ALL_FILTER}>All Courses</option>
            {courseData.map(({ course }) => (
              <option key={course.id} value={course.id}>
                {course.title}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Course list */}
      {courseData.length === 0 ? (
        <Card className="text-center py-12">
          <p className="text-gray-500 mb-2 text-sm">You haven't joined any courses yet.</p>
          <p className="text-gray-400 text-sm mb-6">
            Click "Join a Course" to get started.
          </p>
          <button
            onClick={() => navigate('/join')}
            className="rounded-full bg-primary px-6 py-2.5 text-sm font-bold text-white hover:bg-primary-light transition-colors"
          >
            Join a Course
          </button>
        </Card>
      ) : visibleCourseData.length === 0 ? (
        // Filter applied but the selected course has no results
        <Card className="text-center py-10">
          <p className="text-gray-400 text-sm">No data for the selected filter.</p>
        </Card>
      ) : (
        <div className="space-y-8">
          {visibleCourseData.map(({ course, projects }) => (
            <div key={course.id}>
              {/* Course section header */}
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.18em] text-primary mb-1">
                    Course
                  </p>
                  <h2 className="text-lg font-bold tracking-tight text-gray-900">
                    {course.title}
                  </h2>
                  {course.description && (
                    <p className="text-sm text-gray-500 leading-6">{course.description}</p>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {/* View class info button */}
                  <button
                    onClick={() => navigate(`/course/${course.id}`)}
                    className="rounded-full border-2 border-gray-200 px-5 py-2 text-sm font-bold text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    Class Info
                  </button>
                  {/* New Project — primary */}
                  <button
                    onClick={() => navigate(`/project/new?courseId=${course.id}`)}
                    className="rounded-full bg-primary px-5 py-2 text-sm font-bold text-white hover:bg-primary-light transition-colors"
                  >
                    + New Project
                  </button>
                </div>
              </div>

              {/* Project cards grid */}
              {projects.length === 0 ? (
                <div className="border-2 border-dashed border-black/10 rounded-2xl p-8 text-center text-gray-400 text-sm">
                  No projects yet — start one!
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {projects.map((project) => {
                    const stepInfo = getStepInfo(project.current_step)
                    return (
                      <Card
                        key={project.id}
                        onClick={() => navigate(getProjectPath(project.id, project.current_step))}
                        className="hover:border-primary/30"
                      >
                        <div className="flex items-start justify-between mb-3">
                          <h3 className="font-bold text-gray-900 text-sm leading-snug pr-2">
                            {project.title}
                          </h3>
                          <Badge variant={stepInfo.variant}>{stepInfo.label}</Badge>
                        </div>
                        <p className="text-xs text-gray-400">
                          Updated {new Date(project.updated_at).toLocaleDateString()}
                        </p>
                      </Card>
                    )
                  })}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </PageContainer>
  )
}
