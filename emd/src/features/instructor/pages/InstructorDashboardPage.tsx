import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { listInstructorCourses, listEnrolledStudents } from '../../courses/services/courses.service'
import { listCourseProjects } from '../../projects/services/projects.service'
import type { Course, Project, Profile } from '../../../lib/database.types'
import PageContainer from '../../../app/layout/PageContainer'
import Card from '../../../shared/components/Card'
import Badge from '../../../shared/components/Badge'
import Spinner from '../../../shared/components/Spinner'

// Map step number to label for display
function stepLabel(step: number): string {
  return ['', 'Setup', 'Build', 'Guardrail', 'Output'][step] ?? 'Unknown'
}

function stepVariant(step: number): 'blue' | 'yellow' | 'purple' | 'green' {
  return (['blue', 'blue', 'yellow', 'purple', 'green'] as const)[step] ?? 'blue'
}

// Sentinel value — "show all courses" mode
const ALL_COURSES = '__ALL__'

export default function InstructorDashboardPage() {
  const navigate = useNavigate()

  const [courses, setCourses] = useState<Course[]>([])
  const [allProjects, setAllProjects] = useState<Project[]>([])
  const [enrolledStudents, setEnrolledStudents] = useState<Profile[]>([])
  const [studentsLoading, setStudentsLoading] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // selectedCourseId: ALL_COURSES means show stats/projects across all courses
  const [selectedCourseId, setSelectedCourseId] = useState<string>(ALL_COURSES)

  useEffect(() => {
    async function load() {
      try {
        const fetchedCourses = await listInstructorCourses()
        setCourses(fetchedCourses)

        // Load projects across all courses simultaneously
        const projectArrays = await Promise.all(
          fetchedCourses.map((c) => listCourseProjects(c.id))
        )
        setAllProjects(projectArrays.flat())
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  // Load enrolled students whenever a specific course is selected
  useEffect(() => {
    if (selectedCourseId === ALL_COURSES) {
      setEnrolledStudents([])
      return
    }
    async function loadStudents() {
      setStudentsLoading(true)
      try {
        const students = await listEnrolledStudents(selectedCourseId)
        setEnrolledStudents(students)
      } catch {
        // Non-critical — don't block the rest of the page
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

  // Filter projects based on selected course
  const visibleProjects =
    selectedCourseId === ALL_COURSES
      ? allProjects
      : allProjects.filter((p) => p.course_id === selectedCourseId)

  const totalProjects = visibleProjects.length
  const uniqueStudents = new Set(visibleProjects.map((p) => p.owner_id)).size

  return (
    <PageContainer>
      {/* Page header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-primary mb-1">
            Instructor
          </p>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">Dashboard</h1>
          <p className="text-sm text-gray-500 leading-6 mt-1">
            Overview of all courses and student projects
          </p>
        </div>

        {/* Course selector dropdown */}
        {courses.length > 0 && (
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold uppercase tracking-[0.18em] text-primary">
              Viewing
            </label>
            <select
              value={selectedCourseId}
              onChange={(e) => setSelectedCourseId(e.target.value)}
              className="border border-black/10 rounded-xl px-4 py-2 text-sm bg-background-card focus:outline-none focus:ring-2 focus:ring-primary/30"
            >
              <option value={ALL_COURSES}>All Courses</option>
              {courses.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.title}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-2xl p-4 text-sm">
          {error}
        </div>
      )}

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-4">
        <Card className="text-center">
          <p className="text-3xl font-bold text-gray-900">
            {selectedCourseId === ALL_COURSES ? courses.length : 1}
          </p>
          <p className="text-sm text-gray-500 mt-1">
            {selectedCourseId === ALL_COURSES ? 'Courses' : 'Course'}
          </p>
        </Card>
        <Card className="text-center">
          <p className="text-3xl font-bold text-gray-900">{totalProjects}</p>
          <p className="text-sm text-gray-500 mt-1">Active Projects</p>
        </Card>
        <Card className="text-center">
          <p className="text-3xl font-bold text-gray-900">{uniqueStudents}</p>
          <p className="text-sm text-gray-500 mt-1">Students</p>
        </Card>
      </div>

      {/* Recent projects table */}
      <Card>
        <div className="flex items-center justify-between mb-4">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-primary">
            {selectedCourseId === ALL_COURSES
              ? 'All Projects'
              : `Projects — ${courses.find((c) => c.id === selectedCourseId)?.title ?? ''}`}
          </p>
          <button
            onClick={() =>
              navigate(
                selectedCourseId === ALL_COURSES
                  ? '/instructor/projects'
                  : `/instructor/projects?courseId=${selectedCourseId}`
              )
            }
            className="text-xs font-bold text-primary hover:text-primary-light transition-colors"
          >
            View all
          </button>
        </div>

        {visibleProjects.length === 0 ? (
          <p className="text-gray-400 text-sm text-center py-8">
            No student projects yet. Share your course invite code to get started.
          </p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-black/5">
                <th className="text-left text-xs font-bold text-gray-400 pb-2">Project</th>
                <th className="text-left text-xs font-bold text-gray-400 pb-2">Step</th>
                <th className="text-left text-xs font-bold text-gray-400 pb-2">Status</th>
                <th className="text-left text-xs font-bold text-gray-400 pb-2">Last Updated</th>
              </tr>
            </thead>
            <tbody>
              {visibleProjects.slice(0, 10).map((project) => (
                <tr key={project.id} className="border-b border-black/5 last:border-0 hover:bg-black/[0.02]">
                  <td className="py-3 font-medium text-gray-800">{project.title}</td>
                  <td className="py-3">
                    <Badge variant={stepVariant(project.current_step)}>
                      {stepLabel(project.current_step)}
                    </Badge>
                  </td>
                  <td className="py-3">
                    <Badge
                      variant={
                        project.status === 'graded'
                          ? 'green'
                          : project.status === 'submitted'
                          ? 'blue'
                          : 'default'
                      }
                    >
                      {project.status}
                    </Badge>
                  </td>
                  <td className="py-3 text-gray-400 text-xs">
                    {new Date(project.updated_at).toLocaleDateString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>

      {/* Enrolled students — shown only when a specific course is selected */}
      {selectedCourseId !== ALL_COURSES && (
        <Card>
          <div className="flex items-center justify-between mb-4">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-primary">
              Enrolled Students
            </p>
            <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-bold text-primary">
              {enrolledStudents.length}
            </span>
          </div>

          {studentsLoading ? (
            <div className="flex justify-center py-4">
              <Spinner size="sm" />
            </div>
          ) : enrolledStudents.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-4">
              No students enrolled in this course yet.
            </p>
          ) : (
            <div className="divide-y divide-black/5">
              {enrolledStudents.map((student) => (
                <div
                  key={student.id}
                  className="flex items-center justify-between py-2.5 text-sm"
                >
                  <div>
                    <span className="font-medium text-gray-800">
                      {student.display_name ?? 'Unknown'}
                    </span>
                    {student.student_code && (
                      <span className="text-xs text-gray-400 font-mono ml-2">
                        {student.student_code}
                      </span>
                    )}
                  </div>
                  {student.major && (
                    <span className="text-xs text-gray-400">{student.major}</span>
                  )}
                </div>
              ))}
            </div>
          )}
        </Card>
      )}

      {/* Quick links */}
      <div className="grid grid-cols-2 gap-4">
        <Card
          onClick={() => navigate('/instructor/courses')}
          className="text-center hover:border-primary/30"
        >
          <p className="font-bold text-gray-800">Manage Courses</p>
          <p className="text-xs text-gray-400 mt-1.5">Create courses and invite codes</p>
        </Card>
        <Card
          onClick={() => navigate('/instructor/projects')}
          className="text-center hover:border-primary/30"
        >
          <p className="font-bold text-gray-800">Browse Projects</p>
          <p className="text-xs text-gray-400 mt-1.5">Filter by course</p>
        </Card>
      </div>
    </PageContainer>
  )
}
