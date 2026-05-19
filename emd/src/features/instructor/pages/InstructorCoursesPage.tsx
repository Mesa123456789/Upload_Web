import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  listInstructorCourses,
  createCourse,
  updateCourse,
  deleteCourse,
} from '../../courses/services/courses.service'
import type { Course } from '../../../lib/database.types'
import PageContainer from '../../../app/layout/PageContainer'
import Card from '../../../shared/components/Card'
import Badge from '../../../shared/components/Badge'
import Spinner from '../../../shared/components/Spinner'

// Generate a random invite code like "DG-A4F2"
function generateInviteCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  const part = Array.from({ length: 4 }, () =>
    chars[Math.floor(Math.random() * chars.length)]
  ).join('')
  return `DG-${part}`
}

// ── Edit Modal ──────────────────────────────────────────────────────────────
interface EditModalProps {
  course: Course
  onClose: () => void
  onSaved: (updated: Course) => void
  onDeleted: (courseId: string) => void
}

function EditModal({ course, onClose, onSaved, onDeleted }: EditModalProps) {
  const [title, setTitle] = useState(course.title)
  const [description, setDescription] = useState(course.description ?? '')
  const [isActive, setIsActive] = useState(course.is_active)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleDelete() {
    const confirmed = window.confirm(
      `Delete "${course.title}"? This will remove all enrollments and projects in this course. This cannot be undone.`
    )
    if (!confirmed) return

    setDeleting(true)
    setError(null)
    try {
      await deleteCourse(course.id)
      onDeleted(course.id)
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete course')
    } finally {
      setDeleting(false)
    }
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    if (!title.trim()) return

    setSaving(true)
    setError(null)

    // Optimistic update: build the expected result immediately
    const optimistic: Course = {
      ...course,
      title: title.trim(),
      description: description.trim() || null,
      is_active: isActive,
    }
    onSaved(optimistic)

    try {
      const actual = await updateCourse(course.id, {
        title: title.trim(),
        description: description.trim() || null,
        is_active: isActive,
      })
      onSaved(actual)
      onClose()
    } catch (err) {
      // Revert on failure
      onSaved(course)
      setError(err instanceof Error ? err.message : 'Failed to update')
    } finally {
      setSaving(false)
    }
  }

  const inputCls = 'w-full border border-black/10 rounded-xl px-4 py-2.5 text-sm bg-background-main focus:outline-none focus:ring-2 focus:ring-primary/30 placeholder:text-gray-400'

  return (
    // Dark overlay — clicking outside closes the modal
    <div
      className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-background-card rounded-2xl shadow-xl w-full max-w-md p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-lg font-bold text-gray-900 mb-5">Edit Course</h2>

        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-[0.18em] text-primary mb-2">
              Course Title <span className="text-red-500">*</span>
            </label>
            <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} className={inputCls} />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-[0.18em] text-primary mb-2">
              Description
            </label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Optional description"
              className={inputCls}
            />
          </div>

          {/* Toggle active status */}
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setIsActive((v) => !v)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                isActive ? 'bg-green-500' : 'bg-gray-300'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                  isActive ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
            <span className="text-sm text-gray-700">
              {isActive ? 'Active (students can join)' : 'Closed (no new students)'}
            </span>
          </div>

          {error && <p className="text-red-600 text-sm">{error}</p>}

          <div className="flex gap-3 pt-2">
            <button
              type="submit"
              disabled={saving || deleting || !title.trim()}
              className="flex-1 rounded-full bg-primary py-2.5 text-sm font-bold text-white hover:bg-primary-light disabled:opacity-50 transition-colors"
            >
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
            <button
              type="button"
              onClick={onClose}
              disabled={saving || deleting}
              className="rounded-full border-2 border-gray-200 px-5 py-2.5 text-sm font-bold text-gray-700 hover:bg-gray-50 disabled:opacity-50 transition-colors"
            >
              Cancel
            </button>
          </div>

          {/* Delete course — separate section to prevent accidental clicks */}
          <div className="pt-3 border-t border-black/5">
            <button
              type="button"
              onClick={handleDelete}
              disabled={saving || deleting}
              className="w-full rounded-full bg-red-500 py-2.5 text-sm font-bold text-white hover:bg-red-600 disabled:opacity-50 transition-colors"
            >
              {deleting ? 'Deleting...' : 'Delete Course'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ── Main Page ───────────────────────────────────────────────────────────────

export default function InstructorCoursesPage() {
  const navigate = useNavigate()
  const [courses, setCourses] = useState<Course[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Edit modal state — null means closed
  const [editingCourse, setEditingCourse] = useState<Course | null>(null)

  // Create form state
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [newTitle, setNewTitle] = useState('')
  const [newDescription, setNewDescription] = useState('')
  const [newInviteCode, setNewInviteCode] = useState(generateInviteCode())
  const [creating, setCreating] = useState(false)
  const [createError, setCreateError] = useState<string | null>(null)

  async function loadCourses() {
    setLoading(true)
    try {
      const data = await listInstructorCourses()
      setCourses(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load courses')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadCourses()
  }, [])

  async function handleCreateCourse(e: React.FormEvent) {
    e.preventDefault()
    if (!newTitle.trim()) return

    setCreating(true)
    setCreateError(null)
    try {
      const created = await createCourse({
        title: newTitle.trim(),
        description: newDescription.trim() || undefined,
        invite_code: newInviteCode,
      })
      // Prepend optimistically — no full reload needed
      setCourses((prev) => [created, ...prev])
      setNewTitle('')
      setNewDescription('')
      setNewInviteCode(generateInviteCode())
      setShowCreateForm(false)
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : 'Failed to create course')
    } finally {
      setCreating(false)
    }
  }

  function handleCourseUpdated(updated: Course) {
    setCourses((prev) =>
      prev.map((c) => (c.id === updated.id ? updated : c))
    )
  }

  function handleCourseDeleted(courseId: string) {
    setCourses((prev) => prev.filter((c) => c.id !== courseId))
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

  const inputCls = 'w-full border border-black/10 rounded-xl px-4 py-2.5 text-sm bg-background-main focus:outline-none focus:ring-2 focus:ring-primary/30 placeholder:text-gray-400'

  return (
    <PageContainer>
      {/* Edit modal */}
      {editingCourse && (
        <EditModal
          course={editingCourse}
          onClose={() => setEditingCourse(null)}
          onSaved={(updated) => handleCourseUpdated(updated)}
          onDeleted={(id) => handleCourseDeleted(id)}
        />
      )}

      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-primary mb-1">
            Instructor
          </p>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">Courses</h1>
          <p className="text-sm text-gray-500 leading-6 mt-1">
            Manage your courses and invite codes
          </p>
        </div>
        <button
          onClick={() => setShowCreateForm((v) => !v)}
          className="rounded-full bg-primary px-6 py-2.5 text-sm font-bold text-white hover:bg-primary-light transition-colors"
        >
          {showCreateForm ? 'Cancel' : '+ Add Course'}
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-2xl p-4 text-sm">
          {error}
        </div>
      )}

      {/* Course List — shown first so instructor sees their courses immediately */}
      {courses.length === 0 ? (
        <Card className="text-center py-10">
          <p className="text-gray-400 text-sm">No courses yet. Click "+ Add Course" to create one.</p>
        </Card>
      ) : (
        <div className="space-y-4">
          {courses.map((course) => (
            <Card key={course.id}>
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-1.5">
                    <h3 className="font-bold text-gray-900 truncate">{course.title}</h3>
                    <Badge variant={course.is_active ? 'green' : 'default'}>
                      {course.is_active ? 'Active' : 'Closed'}
                    </Badge>
                  </div>
                  {course.description && (
                    <p className="text-sm text-gray-500 leading-6 mb-2">{course.description}</p>
                  )}
                  <p className="text-xs text-gray-400">
                    Created {new Date(course.created_at).toLocaleDateString()}
                  </p>
                </div>

                {/* Right: invite code + action buttons */}
                <div className="flex items-center gap-3 ml-4 shrink-0">
                  {/* Invite code badge */}
                  <div className="text-right">
                    <p className="text-xs text-gray-400 mb-1.5">Invite Code</p>
                    <code className="rounded-full bg-primary/10 px-3 py-1 text-xs font-bold text-primary font-mono">
                      {course.invite_code}
                    </code>
                  </div>

                  <button
                    onClick={() => navigate(`/instructor/projects?courseId=${course.id}`)}
                    className="rounded-full border-2 border-gray-200 px-4 py-1.5 text-xs font-bold text-gray-700 hover:bg-gray-50 transition-colors whitespace-nowrap"
                  >
                    View Projects
                  </button>

                  <button
                    onClick={() => setEditingCourse(course)}
                    className="rounded-full border-2 border-primary/30 px-4 py-1.5 text-xs font-bold text-primary hover:bg-primary/5 transition-colors"
                  >
                    Edit
                  </button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Create Course Form — hidden behind "Add Course" button */}
      {showCreateForm && (
        <Card>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-primary mb-5">
            Create New Course
          </p>
          <form onSubmit={handleCreateCourse} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Course Title <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                placeholder="e.g. Game Monetization Design 2026"
                className={inputCls}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Description
              </label>
              <input
                type="text"
                value={newDescription}
                onChange={(e) => setNewDescription(e.target.value)}
                placeholder="Optional description"
                className={inputCls}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Invite Code
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newInviteCode}
                  onChange={(e) => setNewInviteCode(e.target.value.toUpperCase())}
                  className={`flex-1 ${inputCls} font-mono`}
                />
                <button
                  type="button"
                  onClick={() => setNewInviteCode(generateInviteCode())}
                  className="rounded-xl border-2 border-gray-200 px-4 py-2 text-sm font-bold text-gray-600 hover:bg-gray-50 transition-colors"
                >
                  Regenerate
                </button>
              </div>
              <p className="text-xs text-gray-400 mt-1.5">
                Students use this code to join your course
              </p>
            </div>

            {createError && (
              <p className="text-red-600 text-sm">{createError}</p>
            )}

            <button
              type="submit"
              disabled={creating || !newTitle.trim()}
              className="rounded-full bg-primary px-6 py-2.5 text-sm font-bold text-white hover:bg-primary-light disabled:opacity-50 transition-colors"
            >
              {creating ? 'Creating...' : 'Create Course'}
            </button>
          </form>
        </Card>
      )}
    </PageContainer>
  )
}
