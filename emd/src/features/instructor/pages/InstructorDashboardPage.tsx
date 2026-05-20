import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { listInstructorCourses, listEnrolledStudents } from '../../courses/services/courses.service'
import { listCourseProjects } from '../../projects/services/projects.service'
import type { Course, Project, Profile } from '../../../lib/database.types'
import PageContainer from '../../../app/layout/PageContainer'
import Card from '../../../shared/components/Card'
import Badge from '../../../shared/components/Badge'
import Spinner from '../../../shared/components/Spinner'

const ALL_COURSES = '__ALL__'

export default function InstructorDashboardPage() {
  const navigate = useNavigate()

  const [courses, setCourses] = useState<Course[]>([])
  const [allProjects, setAllProjects] = useState<Project[]>([])
  const [enrolledStudents, setEnrolledStudents] = useState<Profile[]>([])
  const [studentsLoading, setStudentsLoading] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedCourseId, setSelectedCourseId] = useState<string>(ALL_COURSES)

  useEffect(() => {
    async function load() {
      try {
        const fetchedCourses = await listInstructorCourses()
        setCourses(fetchedCourses)
        const projectArrays = await Promise.all(fetchedCourses.map((course) => listCourseProjects(course.id)))
        setAllProjects(projectArrays.flat())
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  useEffect(() => {
    if (selectedCourseId === ALL_COURSES) {
      setEnrolledStudents([])
      return
    }

    async function loadStudents() {
      setStudentsLoading(true)
      try {
        setEnrolledStudents(await listEnrolledStudents(selectedCourseId))
      } catch {
        setEnrolledStudents([])
      } finally {
        setStudentsLoading(false)
      }
    }
    loadStudents()
  }, [selectedCourseId])

  if (loading) {
    return (
      <PageContainer>
        <div className="flex items-center justify-center py-20">
          <Spinner size="lg" />
        </div>
      </PageContainer>
    )
  }

  const visibleProjects =
    selectedCourseId === ALL_COURSES
      ? allProjects
      : allProjects.filter((project) => project.course_id === selectedCourseId)
  const uniqueStudents = new Set(visibleProjects.map((project) => project.owner_id)).size
  const submitted = visibleProjects.filter((project) => project.status !== 'draft').length
  const guardrailReady = visibleProjects.filter((project) => project.current_step >= 3).length

  return (
    <PageContainer>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="mb-2 text-xs font-black uppercase tracking-[0.18em] text-primary">Instructor Admin</p>
          <h1 className="text-3xl font-black tracking-tight text-slate-950">Platform Administration</h1>
          <p className="mt-2 text-sm leading-6 text-slate-500">
            Monitor class projects, guardrail readiness, and course activity.
          </p>
        </div>
        {courses.length > 0 && (
          <select
            value={selectedCourseId}
            onChange={(event) => setSelectedCourseId(event.target.value)}
            className="rounded-lg border border-line bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
          >
            <option value={ALL_COURSES}>All Courses</option>
            {courses.map((course) => (
              <option key={course.id} value={course.id}>{course.title}</option>
            ))}
          </select>
        )}
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <p className="text-sm font-semibold text-slate-500">Courses</p>
          <p className="mt-3 text-4xl font-black text-slate-950">{selectedCourseId === ALL_COURSES ? courses.length : 1}</p>
        </Card>
        <Card>
          <p className="text-sm font-semibold text-slate-500">Active Projects</p>
          <p className="mt-3 text-4xl font-black text-slate-950">{visibleProjects.length}</p>
        </Card>
        <Card>
          <p className="text-sm font-semibold text-slate-500">Submitted</p>
          <p className="mt-3 text-4xl font-black text-sky-700">{submitted}</p>
        </Card>
        <Card>
          <p className="text-sm font-semibold text-slate-500">Guardrail Ready</p>
          <p className="mt-3 text-4xl font-black text-emerald-700">{guardrailReady}</p>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <div className="space-y-6">
          <Card className="overflow-hidden p-0">
            <div className="flex items-center justify-between border-b border-line px-5 py-4">
              <div>
                <h2 className="text-lg font-black text-slate-950">Projects</h2>
                <p className="text-sm text-slate-500">Class overview and review status.</p>
              </div>
              <button onClick={() => navigate('/instructor/projects')} className="rounded-md border border-line px-3 py-2 text-xs font-bold text-slate-700 hover:border-primary/30 hover:text-primary">
                View all
              </button>
            </div>
            {visibleProjects.length === 0 ? (
              <p className="p-8 text-center text-sm text-slate-500">No student projects yet.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[680px] text-sm">
                  <thead>
                    <tr className="border-b border-line bg-slate-50 text-left text-xs font-black uppercase tracking-[0.12em] text-slate-400">
                      <th className="px-5 py-3">Project</th>
                      <th className="px-5 py-3">Status</th>
                      <th className="px-5 py-3">Step</th>
                      <th className="px-5 py-3">Updated</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line">
                    {visibleProjects.slice(0, 10).map((project) => (
                      <tr key={project.id} className="hover:bg-slate-50">
                        <td className="px-5 py-3 font-bold text-slate-900">{project.title}</td>
                        <td className="px-5 py-3"><Badge>{project.status}</Badge></td>
                        <td className="px-5 py-3"><Badge variant={project.current_step >= 3 ? 'green' : 'yellow'}>{project.current_step}/4</Badge></td>
                        <td className="px-5 py-3 text-slate-500">{new Date(project.updated_at).toLocaleDateString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>

          <Card>
            <h2 className="text-lg font-black text-slate-950">My Courses</h2>
            <div className="mt-4 divide-y divide-line">
              {courses.map((course) => (
                <div key={course.id} className="flex items-center justify-between gap-4 py-3">
                  <div>
                    <p className="font-bold text-slate-900">{course.title}</p>
                    <p className="text-sm text-slate-500">Invite code: {course.invite_code}</p>
                  </div>
                  <button onClick={() => navigate('/instructor/courses')} className="rounded-md border border-line px-3 py-1.5 text-xs font-bold text-slate-700 hover:border-primary/30 hover:text-primary">
                    Edit
                  </button>
                </div>
              ))}
            </div>
          </Card>
        </div>

        <aside className="space-y-4">
          <Card>
            <h2 className="font-black text-slate-950">Popular Topics</h2>
            <div className="mt-4 space-y-3 text-sm">
              {[
                ['Fairness Principles', 120],
                ['Monetization Flow Mapping', 110],
                ['Ad Placement Strategy', 95],
                ['User Autonomy Ethics', 80],
              ].map(([label, value]) => (
                <div key={label} className="flex justify-between gap-4">
                  <span className="font-semibold text-slate-600">{label}</span>
                  <span className="font-black text-slate-950">{value}</span>
                </div>
              ))}
            </div>
          </Card>

          <Card>
            <h2 className="font-black text-slate-950">Users</h2>
            {selectedCourseId === ALL_COURSES ? (
              <p className="mt-4 text-sm leading-6 text-slate-500">Select a course to view enrolled students.</p>
            ) : studentsLoading ? (
              <div className="mt-4 flex justify-center"><Spinner size="sm" /></div>
            ) : (
              <div className="mt-4 divide-y divide-line">
                {enrolledStudents.map((student) => (
                  <div key={student.id} className="py-3">
                    <p className="font-bold text-slate-900">{student.display_name ?? student.email}</p>
                    <p className="text-sm text-slate-500">{student.student_code ?? 'Student'} {student.major ? `- ${student.major}` : ''}</p>
                  </div>
                ))}
                {enrolledStudents.length === 0 && <p className="text-sm text-slate-500">No students enrolled yet.</p>}
              </div>
            )}
          </Card>

          <Card>
            <h2 className="font-black text-slate-950">Review Load</h2>
            <dl className="mt-4 space-y-3 text-sm">
              <div className="flex justify-between gap-4"><dt className="text-slate-500">Unique Students</dt><dd className="font-black">{uniqueStudents}</dd></div>
              <div className="flex justify-between gap-4"><dt className="text-slate-500">Drafts</dt><dd className="font-black">{visibleProjects.length - submitted}</dd></div>
              <div className="flex justify-between gap-4"><dt className="text-slate-500">Ready to Review</dt><dd className="font-black">{submitted}</dd></div>
            </dl>
          </Card>
        </aside>
      </div>
    </PageContainer>
  )
}
