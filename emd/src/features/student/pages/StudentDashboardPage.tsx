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

function getStepInfo(step: number): { label: string; variant: 'blue' | 'yellow' | 'purple' | 'green' } {
  switch (step) {
    case 1: return { label: 'Setup', variant: 'blue' }
    case 2: return { label: 'Build', variant: 'yellow' }
    case 3: return { label: 'Guardrail', variant: 'purple' }
    case 4: return { label: 'Output', variant: 'green' }
    default: return { label: 'Setup', variant: 'blue' }
  }
}

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

const ALL_FILTER = '__ALL__'

export default function StudentDashboardPage() {
  const { user } = useAuth()
  const navigate = useNavigate()

  const [courseData, setCourseData] = useState<CourseWithProjects[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filterCourseId, setFilterCourseId] = useState<string>(ALL_FILTER)

  async function loadData() {
    if (!user) return
    setLoading(true)
    setError(null)

    try {
      const courses = await listStudentCourses()
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

  const visibleCourseData =
    filterCourseId === ALL_FILTER
      ? courseData
      : courseData.filter((cd) => cd.course.id === filterCourseId)
  const projects = visibleCourseData.flatMap((item) => item.projects)
  const activeProjects = projects.length
  const readyProjects = projects.filter((project) => project.current_step >= 4).length
  const submittedProjects = projects.filter((project) => project.status !== 'draft').length
  const showFilter = courseData.length >= 2

  return (
    <PageContainer>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="mb-2 text-xs font-black uppercase tracking-[0.18em] text-primary">Student Workspace</p>
          <h1 className="text-3xl font-black tracking-tight text-slate-950">Dashboard</h1>
          <p className="mt-2 text-sm leading-6 text-slate-500">
            Overview of your courses, projects, and guardrail progress.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {showFilter && (
            <select
              value={filterCourseId}
              onChange={(event) => setFilterCourseId(event.target.value)}
              className="rounded-lg border border-line bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
            >
              <option value={ALL_FILTER}>All Courses</option>
              {courseData.map(({ course }) => (
                <option key={course.id} value={course.id}>{course.title}</option>
              ))}
            </select>
          )}
          <button
            onClick={() => navigate('/join')}
            className="rounded-lg border border-line bg-white px-4 py-2 text-sm font-bold text-slate-700 shadow-sm transition hover:bg-slate-50"
          >
            Join Course
          </button>
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <p className="text-sm font-semibold text-slate-500">Active Projects</p>
          <p className="mt-3 text-4xl font-black text-slate-950">{activeProjects}</p>
        </Card>
        <Card>
          <p className="text-sm font-semibold text-slate-500">Output Ready</p>
          <p className="mt-3 text-4xl font-black text-emerald-700">{readyProjects}</p>
        </Card>
        <Card>
          <p className="text-sm font-semibold text-slate-500">Submitted</p>
          <p className="mt-3 text-4xl font-black text-sky-700">{submittedProjects}</p>
        </Card>
        <Card>
          <p className="text-sm font-semibold text-slate-500">Courses</p>
          <p className="mt-3 text-4xl font-black text-slate-950">{visibleCourseData.length}</p>
        </Card>
      </div>

      {courseData.length === 0 ? (
        <Card className="text-center">
          <div className="mx-auto max-w-md py-8">
            <h2 className="text-xl font-black text-slate-950">No courses yet</h2>
            <p className="mt-2 text-sm leading-6 text-slate-500">
              Join a course to start creating monetization plans.
            </p>
            <button
              onClick={() => navigate('/join')}
              className="mt-6 rounded-lg bg-primary px-5 py-2.5 text-sm font-bold text-white transition hover:bg-primary-light"
            >
              Join a Course
            </button>
          </div>
        </Card>
      ) : (
        <Card className="overflow-hidden p-0">
          <div className="flex items-center justify-between border-b border-line px-5 py-4">
            <div>
              <h2 className="text-lg font-black text-slate-950">Projects</h2>
              <p className="text-sm text-slate-500">Continue a draft or create a new plan.</p>
            </div>
          </div>

          <div className="divide-y divide-line">
            {visibleCourseData.map(({ course, projects }) => (
              <section key={course.id} className="p-5">
                <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-xs font-black uppercase tracking-[0.16em] text-primary">Course</p>
                    <h3 className="mt-1 text-base font-black text-slate-950">{course.title}</h3>
                    {course.description && (
                      <p className="mt-1 text-sm leading-6 text-slate-500">{course.description}</p>
                    )}
                  </div>
                  <button
                    onClick={() => navigate(`/project/new?courseId=${course.id}`)}
                    className="rounded-lg bg-primary px-4 py-2 text-sm font-bold text-white transition hover:bg-primary-light"
                  >
                    Create New Project
                  </button>
                </div>

                {projects.length === 0 ? (
                  <div className="rounded-lg border border-dashed border-line bg-slate-50 p-6 text-center text-sm text-slate-500">
                    No projects in this course yet.
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[720px] text-sm">
                      <thead>
                        <tr className="border-b border-line text-left text-xs font-black uppercase tracking-[0.12em] text-slate-400">
                          <th className="pb-3">Project Name</th>
                          <th className="pb-3">Status</th>
                          <th className="pb-3">Current Step</th>
                          <th className="pb-3">Last Updated</th>
                          <th className="pb-3 text-right">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-line">
                        {projects.map((project) => {
                          const stepInfo = getStepInfo(project.current_step)
                          return (
                            <tr key={project.id} className="hover:bg-slate-50">
                              <td className="py-3 font-bold text-slate-900">{project.title}</td>
                              <td className="py-3"><Badge>{project.status}</Badge></td>
                              <td className="py-3"><Badge variant={stepInfo.variant}>{stepInfo.label}</Badge></td>
                              <td className="py-3 text-slate-500">{new Date(project.updated_at).toLocaleDateString()}</td>
                              <td className="py-3 text-right">
                                <button
                                  onClick={() => navigate(getProjectPath(project.id, project.current_step))}
                                  className="rounded-md border border-line bg-white px-3 py-1.5 text-xs font-bold text-slate-700 transition hover:border-primary/30 hover:text-primary"
                                >
                                  Open
                                </button>
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </section>
            ))}
          </div>
        </Card>
      )}
    </PageContainer>
  )
}
