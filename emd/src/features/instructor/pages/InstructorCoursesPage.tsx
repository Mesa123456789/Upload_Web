import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import {
  listInstructorCourses,
  createCourse,
  updateCourse,
  deleteCourse,
} from '../../courses/services/courses.service'
import type { Course } from '../../../lib/database.types'
import PageContainer from '../../../app/layout/PageContainer'
import Card from '../../../shared/components/Card'
import FadeInCard from '../../../shared/components/FadeInCard'
import Badge from '../../../shared/components/Badge'
import { Skeleton, SkeletonCard } from '../../../shared/components/Skeleton'
import { notify } from '../../../shared/lib/toast'
import { useI18n } from '../../../i18n/I18nProvider'
import { dialogBackdropVariants, dialogVariants, transitions } from '../../../shared/motion'

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
  const { t } = useI18n()
  const reduceMotion = useReducedMotion()
  const [title, setTitle] = useState(course.title)
  const [description, setDescription] = useState(course.description ?? '')
  const [isActive, setIsActive] = useState(course.is_active)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleDelete() {
    const confirmed = window.confirm(
      t('instructorCourses.deleteConfirm', { title: course.title })
    )
    if (!confirmed) return

    setDeleting(true)
    setError(null)
    try {
      await deleteCourse(course.id)
      onDeleted(course.id)
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : t('instructorCourses.deleteFailed'))
      notify.error(t('instructorCourses.deleteFailedToast'))
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
      notify.success(t('instructorCourses.updateSuccess'))
    } catch (err) {
      // Revert on failure
      onSaved(course)
      setError(err instanceof Error ? err.message : t('instructorCourses.updateFailed'))
      notify.error(t('instructorCourses.updateFailedToast'))
    } finally {
      setSaving(false)
    }
  }

  const inputCls = 'ds-input'

  return (
    // Dark overlay — clicking outside closes the modal
    <motion.div
      initial={reduceMotion ? false : 'initial'}
      animate={reduceMotion ? undefined : 'animate'}
      exit={reduceMotion ? undefined : 'exit'}
      variants={dialogBackdropVariants}
      transition={transitions.fast}
      className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <motion.div
        initial={reduceMotion ? false : 'initial'}
        animate={reduceMotion ? undefined : 'animate'}
        exit={reduceMotion ? undefined : 'exit'}
        variants={dialogVariants}
        transition={transitions.base}
        className="bg-background-card rounded-2xl shadow-xl w-full max-w-md p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-lg font-bold text-gray-900 mb-5">{t('instructorCourses.edit')}</h2>

        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-[0.18em] text-primary mb-2">
              {t('instructorCourses.courseTitle')} <span className="text-red-500">*</span>
            </label>
            <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} className={inputCls} />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-[0.18em] text-primary mb-2">
              {t('instructorCourses.description')}
            </label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={t('instructorCourses.descriptionPlaceholder')}
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
              {isActive ? t('instructorCourses.activeHelp') : t('instructorCourses.closedHelp')}
            </span>
          </div>

          {error && <p className="text-red-600 text-sm">{error}</p>}

          <div className="flex gap-3 pt-2">
            <button
              type="submit"
              disabled={saving || deleting || !title.trim()}
              className="flex-1 rounded-full bg-primary py-2.5 text-sm font-bold text-white hover:bg-primary-light disabled:opacity-50 transition-colors"
            >
              {saving ? t('common.saving') : t('instructorCourses.saveChanges')}
            </button>
            <button
              type="button"
              onClick={onClose}
              disabled={saving || deleting}
              className="rounded-full border-2 border-gray-200 px-5 py-2.5 text-sm font-bold text-gray-700 hover:bg-gray-50 disabled:opacity-50 transition-colors"
            >
              {t('common.cancel')}
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
              {deleting ? t('output.buttons.deleting') : t('instructorCourses.deleteCourse')}
            </button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  )
}

// ── Main Page ───────────────────────────────────────────────────────────────

export default function InstructorCoursesPage() {
  const navigate = useNavigate()
  const { t, formatDate } = useI18n()
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
      setError(err instanceof Error ? err.message : t('instructorCourses.loadFailed'))
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
      notify.success(t('instructorCourses.createSuccess'))
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : t('instructorCourses.createFailed'))
      notify.error(t('instructorCourses.createFailedToast'))
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
        <div className="flex items-center justify-between">
          <Skeleton className="h-9 w-40" />
          <Skeleton className="h-10 w-32 rounded-full" />
        </div>
        <SkeletonCard />
        <SkeletonCard />
        <SkeletonCard />
      </PageContainer>
    )
  }

  const inputCls = 'ds-input'

  return (
    <PageContainer>
      {/* Edit modal */}
      <AnimatePresence>
        {editingCourse && (
          <EditModal
            course={editingCourse}
            onClose={() => setEditingCourse(null)}
            onSaved={(updated) => handleCourseUpdated(updated)}
            onDeleted={(id) => handleCourseDeleted(id)}
          />
        )}
      </AnimatePresence>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-2xl p-4 text-sm">
          {error}
        </div>
      )}

      {/* Course List — shown first so instructor sees their courses immediately */}
      {courses.length === 0 ? (
        <FadeInCard index={0}>
        <Card className="text-center py-10">
          <p className="text-gray-400 text-sm">{t('instructorCourses.empty')}</p>
        </Card>
        </FadeInCard>
      ) : (
        <div className="space-y-5">
          {courses.map((course, index) => (
            <FadeInCard key={course.id} index={index}>
            <Card className="px-6 py-6 sm:px-8">
              <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-1.5">
                    <h3 className="font-bold text-gray-900 truncate">{course.title}</h3>
                    <Badge variant={course.is_active ? 'green' : 'default'}>
                      {course.is_active ? t('common.active') : t('common.closed')}
                    </Badge>
                  </div>
                  {course.description && (
                    <p className="text-sm text-gray-500 leading-6 mb-2">{course.description}</p>
                  )}
                  <p className="text-xs text-gray-400">
                    {t('instructorCourses.createdAt', { date: formatDate(course.created_at) })}
                  </p>
                </div>

                {/* Right: invite code + action buttons */}
                <div className="flex flex-wrap items-center gap-3 lg:ml-4 lg:shrink-0 lg:justify-end">
                  {/* Invite code badge */}
                  <div className="text-right">
                    <p className="text-xs text-gray-400 mb-1.5">{t('joinCourse.inviteCode')}</p>
                    <code className="rounded-full bg-primary/10 px-3 py-1 text-xs font-bold text-primary font-mono">
                      {course.invite_code}
                    </code>
                  </div>

                  <button
                    onClick={() => navigate(`/instructor/projects?courseId=${course.id}`)}
                    className="rounded-full border-2 border-gray-200 px-4 py-1.5 text-xs font-bold text-gray-700 hover:bg-gray-50 transition-colors whitespace-nowrap"
                  >
                    {t('instructorCourses.viewProjects')}
                  </button>

                  <button
                    onClick={() => setEditingCourse(course)}
                    className="rounded-full border-2 border-primary/30 px-4 py-1.5 text-xs font-bold text-primary hover:bg-primary/5 transition-colors"
                  >
                    {t('common.edit')}
                  </button>
                </div>
              </div>
            </Card>
            </FadeInCard>
          ))}
        </div>
      )}

      {/* Create Course Form — hidden behind "Add Course" button */}
      <div className="flex justify-end">
        <button
          onClick={() => setShowCreateForm((v) => !v)}
          className="rounded-full bg-[#ffd032] px-6 py-3 text-sm font-bold text-black shadow-sm transition-colors hover:bg-[#f2bd18]"
        >
          {showCreateForm ? t('common.cancel') : t('instructorCourses.add')}
        </button>
      </div>

      {showCreateForm && (
        <FadeInCard index={0}>
        <Card>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-primary mb-5">
            {t('instructorCourses.createNew')}
          </p>
          <form onSubmit={handleCreateCourse} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                {t('instructorCourses.courseTitle')} <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                placeholder={t('instructorCourses.titlePlaceholder')}
                className={inputCls}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                {t('instructorCourses.description')}
              </label>
              <input
                type="text"
                value={newDescription}
                onChange={(e) => setNewDescription(e.target.value)}
                placeholder={t('instructorCourses.descriptionPlaceholder')}
                className={inputCls}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                {t('joinCourse.inviteCode')}
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
                  {t('instructorCourses.regenerate')}
                </button>
              </div>
              <p className="text-xs text-gray-400 mt-1.5">
                {t('instructorCourses.inviteHelp')}
              </p>
            </div>

            {createError && (
              <p className="text-red-600 text-sm">{createError}</p>
            )}

            <button
              type="submit"
              disabled={creating || !newTitle.trim()}
              className="rounded-full bg-[#ffd032] px-6 py-2.5 text-sm font-bold text-black transition-colors hover:bg-[#f2bd18] disabled:opacity-50"
            >
              {creating ? t('instructorCourses.creating') : t('instructorCourses.create')}
            </button>
          </form>
        </Card>
        </FadeInCard>
      )}
    </PageContainer>
  )
}
