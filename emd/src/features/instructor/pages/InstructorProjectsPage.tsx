import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { listInstructorCourses } from '../../courses/services/courses.service'
import {
  listCourseProjects,
  setProjectUnderReview,
} from '../../projects/services/projects.service'
import { getProfile } from '../../profile/services/profiles.service'
import type { Course, Project, Profile } from '../../../lib/database.types'
import PageContainer from '../../../app/layout/PageContainer'
import Card from '../../../shared/components/Card'
import Badge from '../../../shared/components/Badge'
import Spinner from '../../../shared/components/Spinner'

// Project row enriched with the student's profile
type ProjectWithStudent = Project & { studentProfile: Profile | null }

function stepLabel(step: number): string {
  return ['', 'Setup', 'Build', 'Guardrail', 'Output'][step] ?? 'Unknown'
}

function stepVariant(step: number): 'blue' | 'yellow' | 'purple' | 'green' {
  return (['blue', 'blue', 'yellow', 'purple', 'green'] as const)[step] ?? 'blue'
}

// Map status to badge color — covers all 6 statuses
function statusVariant(status: Project['status']): 'default' | 'blue' | 'green' | 'yellow' | 'purple' | 'red' {
  switch (status) {
    case 'submitted': return 'blue'
    case 'resubmitted': return 'yellow'
    case 'under_review': return 'purple'
    case 'returned': return 'red'
    case 'graded': return 'green'
    default: return 'default'
  }
}

export default function InstructorProjectsPage() {
  const navigate = useNavigate()

  // Read ?courseId=xxx from URL — CoursesPage "View Projects" button sets this
  const [searchParams] = useSearchParams()
  const courseIdFromUrl = searchParams.get('courseId')

  const [courses, setCourses] = useState<Course[]>([])
  const [projects, setProjects] = useState<ProjectWithStudent[]>([])
  const [selectedCourseId, setSelectedCourseId] = useState<string>('')
  const [loading, setLoading] = useState(true)
  const [projectsLoading, setProjectsLoading] = useState(false)
  const [bulkLoading, setBulkLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function loadCourses() {
      try {
        const data = await listInstructorCourses()
        setCourses(data)

        if (data.length > 0) {
          // Prefer the courseId from URL if it matches a real course
          const matchedId = courseIdFromUrl && data.some((c) => c.id === courseIdFromUrl)
            ? courseIdFromUrl
            : data[0].id
          setSelectedCourseId(matchedId)
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load courses')
      } finally {
        setLoading(false)
      }
    }
    loadCourses()
    // courseIdFromUrl intentionally omitted from deps — only used for initial selection
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (!selectedCourseId) return

    async function loadProjects() {
      setProjectsLoading(true)
      try {
        const data = await listCourseProjects(selectedCourseId)

        // Enrich each project with its owner's profile — parallel fetches
        const enriched = await Promise.all(
          data.map(async (project) => {
            const studentProfile = await getProfile(project.owner_id).catch(() => null)
            return { ...project, studentProfile }
          })
        )
        setProjects(enriched)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load projects')
      } finally {
        setProjectsLoading(false)
      }
    }
    loadProjects()
  }, [selectedCourseId])

  // Update a single project's status in local state
  function updateProjectInState(projectId: string, updates: Partial<Project>) {
    setProjects((prev) =>
      prev.map((p) => (p.id === projectId ? { ...p, ...updates } : p))
    )
  }

  // Bulk action: set all submitted/resubmitted projects to under_review
  async function handleSetAllUnderReview() {
    const targets = projects.filter(
      (p) => p.status === 'submitted' || p.status === 'resubmitted'
    )
    if (targets.length === 0) return
    setBulkLoading(true)
    try {
      await Promise.all(
        targets.map(async (p) => {
          await setProjectUnderReview(p.id)
          updateProjectInState(p.id, { status: 'under_review' })
        })
      )
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update some projects')
    } finally {
      setBulkLoading(false)
    }
  }

  // Per-row quick action: set project to under_review
  async function handleRowStatusChange(projectId: string, newStatus: string) {
    try {
      if (newStatus === 'under_review') {
        await setProjectUnderReview(projectId)
        updateProjectInState(projectId, { status: 'under_review' })
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update status')
    }
  }

  if (loading) {
    return (
      <PageContainer>
        <div className="flex items-center justify-center py-20">
          <Spinner size="lg" />
        </div>
      </PageContainer>
    )
  }

  return (
    <PageContainer>
      {/* Page header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-primary mb-1">
            Instructor
          </p>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">Student Projects</h1>
          <p className="text-sm text-gray-500 leading-6 mt-1">Browse all projects by course</p>
        </div>

        {/* Bulk action: lock all submitted/resubmitted for review */}
        {projects.some((p) => p.status === 'submitted' || p.status === 'resubmitted') && (
          <button
            onClick={handleSetAllUnderReview}
            disabled={bulkLoading}
            className="rounded-full border-2 border-primary/30 px-5 py-2 text-sm font-bold text-primary hover:bg-primary/5 disabled:opacity-50 transition-colors"
          >
            {bulkLoading ? 'Updating...' : 'Set All Under Review'}
          </button>
        )}
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-2xl p-4 text-sm">
          {error}
        </div>
      )}

      {/* Course filter dropdown */}
      <div>
        <label className="block text-xs font-bold uppercase tracking-[0.18em] text-primary mb-2">
          Filter by Course
        </label>
        {courses.length === 0 ? (
          <p className="text-sm text-gray-400">No courses found. Create a course first.</p>
        ) : (
          <select
            value={selectedCourseId}
            onChange={(e) => setSelectedCourseId(e.target.value)}
            className="border border-black/10 rounded-xl px-4 py-2.5 text-sm bg-background-card focus:outline-none focus:ring-2 focus:ring-primary/30 w-full max-w-sm"
          >
            {courses.map((course) => (
              <option key={course.id} value={course.id}>
                {course.title}
              </option>
            ))}
          </select>
        )}
      </div>

      {/* Projects table */}
      {projectsLoading ? (
        <div className="flex items-center justify-center py-12">
          <Spinner size="md" />
        </div>
      ) : (
        <Card>
          {projects.length === 0 ? (
            <p className="text-gray-400 text-sm text-center py-8">
              No projects in this course yet.
            </p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-black/5">
                  <th className="text-left text-xs font-bold text-gray-400 pb-3">Student</th>
                  <th className="text-left text-xs font-bold text-gray-400 pb-3">Project Title</th>
                  <th className="text-left text-xs font-bold text-gray-400 pb-3">Step</th>
                  <th className="text-left text-xs font-bold text-gray-400 pb-3">Status</th>
                  <th className="text-left text-xs font-bold text-gray-400 pb-3">Last Updated</th>
                  <th className="text-left text-xs font-bold text-gray-400 pb-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {projects.map((project) => (
                  <tr key={project.id} className="border-b border-black/5 last:border-0 hover:bg-black/[0.02]">
                    {/* Student info */}
                    <td className="py-3">
                      <div className="text-gray-800 font-medium text-sm">
                        {project.studentProfile?.display_name ?? 'Unknown'}
                      </div>
                      {project.studentProfile?.student_code && (
                        <div className="text-xs text-gray-400 font-mono">
                          {project.studentProfile.student_code}
                        </div>
                      )}
                    </td>
                    <td className="py-3 font-medium text-gray-800">{project.title}</td>
                    <td className="py-3">
                      <Badge variant={stepVariant(project.current_step)}>
                        {stepLabel(project.current_step)}
                      </Badge>
                    </td>
                    <td className="py-3">
                      <Badge variant={statusVariant(project.status)}>
                        {project.status.replace('_', ' ')}
                      </Badge>
                    </td>
                    <td className="py-3 text-gray-400 text-xs">
                      {new Date(project.updated_at).toLocaleDateString()}
                    </td>
                    <td className="py-3">
                      <div className="flex gap-2 items-center flex-wrap">
                        <button
                          onClick={() => navigate(`/instructor/project/${project.id}`)}
                          className="rounded-full border-2 border-primary/30 px-3 py-1 text-xs font-bold text-primary hover:bg-primary/5 transition-colors"
                        >
                          View
                        </button>
                        <button
                          onClick={() => navigate(`/instructor/student/${project.owner_id}`)}
                          className="rounded-full border-2 border-gray-200 px-3 py-1 text-xs font-bold text-gray-600 hover:bg-gray-50 transition-colors"
                        >
                          Profile
                        </button>
                        {/* Quick action — Under Review only; full grading in ProjectDetail */}
                        {(project.status === 'submitted' || project.status === 'resubmitted') && (
                          <select
                            value=""
                            onChange={(e) => handleRowStatusChange(project.id, e.target.value)}
                            className="border border-black/10 rounded-full px-3 py-1 text-xs bg-background-card focus:outline-none focus:ring-1 focus:ring-primary/30 cursor-pointer"
                          >
                            <option value="" disabled>Action...</option>
                            <option value="under_review">Under Review</option>
                          </select>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Card>
      )}
    </PageContainer>
  )
}
