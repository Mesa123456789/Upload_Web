import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  getProject,
  getAdsConfig,
  listAdPlacements,
  getIapConfig,
  listIapItems,
  setProjectUnderReview,
  returnProject,
  gradeProject,
} from '../../projects/services/projects.service'
import { getProfile } from '../../profile/services/profiles.service'
import type { Project, AdsConfig, AdPlacement, IapConfig, IapItem, Profile } from '../../../lib/database.types'
import PageContainer from '../../../app/layout/PageContainer'
import Card from '../../../shared/components/Card'
import FadeInCard from '../../../shared/components/FadeInCard'
import Badge from '../../../shared/components/Badge'
import { ProjectDetailSkeleton } from '../../../shared/components/Skeleton'
import { useI18n } from '../../../i18n/I18nProvider'

// Read-only view of a student project shown to instructors.
export default function InstructorProjectDetailPage() {
  const { projectId } = useParams<{ projectId: string }>()
  const navigate = useNavigate()
  const { t, formatDate, formatNumber } = useI18n()

  const [project, setProject] = useState<Project | null>(null)
  const [studentProfile, setStudentProfile] = useState<Profile | null>(null)
  const [adsConfig, setAdsConfig] = useState<AdsConfig | null>(null)
  const [adPlacements, setAdPlacements] = useState<AdPlacement[]>([])
  const [iapConfig, setIapConfig] = useState<IapConfig | null>(null)
  const [iapItems, setIapItems] = useState<IapItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Instructor review form state
  const [sendBackComment, setSendBackComment] = useState<string>('')
  const [gradeValue, setGradeValue] = useState<string>('')
  const [gradeComment, setGradeComment] = useState<string>('')
  const [reviewLoading, setReviewLoading] = useState(false)
  const [reviewError, setReviewError] = useState<string | null>(null)

  // Pre-fill grade/comment fields when project loads
  useEffect(() => {
    if (project) {
      setGradeValue(project.grade != null ? String(project.grade) : '')
      setGradeComment(project.instructor_comment ?? '')
      setSendBackComment(
        project.status === 'returned' ? (project.instructor_comment ?? '') : ''
      )
    }
  }, [project])

  async function handleMarkUnderReview() {
    if (!projectId) return
    setReviewLoading(true)
    setReviewError(null)
    try {
      const updated = await setProjectUnderReview(projectId)
      setProject(updated)
    } catch (err) {
      setReviewError(err instanceof Error ? err.message : t('instructorProjectDetail.updateStatusFailed'))
    } finally {
      setReviewLoading(false)
    }
  }

  async function handleReturn() {
    if (!projectId) return
    if (!sendBackComment.trim()) {
      setReviewError(t('instructorProjectDetail.commentRequired'))
      return
    }
    setReviewLoading(true)
    setReviewError(null)
    try {
      const updated = await returnProject(projectId, sendBackComment.trim())
      setProject(updated)
    } catch (err) {
      setReviewError(err instanceof Error ? err.message : t('instructorProjectDetail.returnFailed'))
    } finally {
      setReviewLoading(false)
    }
  }

  async function handleGrade() {
    if (!projectId) return
    const gradeNum = parseInt(gradeValue, 10)
    if (isNaN(gradeNum) || gradeNum < 0 || gradeNum > 100) {
      setReviewError(t('instructorProjectDetail.gradeValidation'))
      return
    }
    setReviewLoading(true)
    setReviewError(null)
    try {
      const updated = await gradeProject(projectId, gradeNum, gradeComment.trim())
      setProject(updated)
    } catch (err) {
      setReviewError(err instanceof Error ? err.message : t('instructorProjectDetail.gradeFailed'))
    } finally {
      setReviewLoading(false)
    }
  }

  useEffect(() => {
    async function load() {
      if (!projectId) return
      try {
        const p = await getProject(projectId)
        setProject(p)

        const sp = await getProfile(p.owner_id).catch(() => null)
        setStudentProfile(sp)

        const ac = await getAdsConfig(projectId)
        if (ac) {
          setAdsConfig(ac)
          const placements = await listAdPlacements(ac.id)
          setAdPlacements(placements)
        }

        const ic = await getIapConfig(projectId)
        if (ic) {
          setIapConfig(ic)
          const items = await listIapItems(ic.id)
          setIapItems(items)
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : t('instructorProjectDetail.loadFailed'))
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [projectId, t])

  if (loading) {
    return (
      <PageContainer>
        <ProjectDetailSkeleton />
      </PageContainer>
    )
  }

  if (!project) {
    return (
      <PageContainer>
        <p className="text-red-600 text-sm">{error ?? t('instructorProjectDetail.notFound')}</p>
        <button
          onClick={() => navigate(-1)}
          className="mt-4 rounded-full border-2 border-gray-200 px-6 py-2.5 text-sm font-bold text-gray-700 hover:bg-gray-50 transition-colors"
        >
          {t('common.goBack')}
        </button>
      </PageContainer>
    )
  }

  const stepLabelKeys = ['', 'steps.setup', 'steps.build', 'steps.guardrail', 'steps.output']
  const currentStepLabel = t(stepLabelKeys[project.current_step] ?? 'common.unknown')

  function statusVariant(status: Project['status']): 'default' | 'blue' | 'yellow' | 'green' | 'red' | 'purple' {
    switch (status) {
      case 'submitted': return 'blue'
      case 'resubmitted': return 'yellow'
      case 'under_review': return 'purple'
      case 'returned': return 'red'
      case 'graded': return 'green'
      default: return 'default'
    }
  }

  const textareaCls = 'ds-input resize-none'
  const inputCls = 'ds-input'

  return (
    <PageContainer>
      {/* Page header */}
      <div className="flex items-start gap-4">
        <button
          onClick={() => navigate(-1)}
          className="mt-1 rounded-full border-2 border-gray-200 px-4 py-1.5 text-sm font-bold text-gray-700 hover:bg-gray-50 transition-colors shrink-0"
        >
          &larr; {t('common.back')}
        </button>
        <div>
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl font-bold tracking-tight text-gray-900">{project.title}</h1>
            <Badge variant={statusVariant(project.status)}>
              {t(`status.${project.status}`)}
            </Badge>
          </div>
          <p className="text-sm text-gray-500 mt-0.5">
            {t('instructorProjectDetail.stepWithValue', { step: currentStepLabel })}
            {' · '}{t('instructorProjectDetail.updated', { date: formatDate(project.updated_at) })}
          </p>
        </div>
      </div>

      {/* Read-only notice */}
      <div className="bg-blue-50 border border-blue-200 text-blue-700 rounded-2xl p-3 text-sm">
        {t('instructorProjectDetail.readOnlyNotice')}
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-2xl p-4 text-sm">
          {error}
        </div>
      )}

      {/* Student Info */}
      <FadeInCard index={0}>
      <Card>
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-primary mb-4">
          {t('instructorProjectDetail.studentInfo')}
        </p>
        {!studentProfile ? (
          <p className="text-sm text-gray-400">{t('instructorProjectDetail.profileUnavailable')}</p>
        ) : (
          <div className="grid gap-4 text-sm sm:grid-cols-2">
            <div>
              <span className="text-gray-500 block mb-1">{t('common.name')}</span>
              <span className="font-bold text-gray-900">
                {studentProfile.display_name ?? '—'}
              </span>
            </div>
            {studentProfile.student_code && (
              <div>
                <span className="text-gray-500 block mb-1">{t('common.studentCode')}</span>
                <span className="font-mono text-gray-900">{studentProfile.student_code}</span>
              </div>
            )}
            {studentProfile.major && (
              <div>
                <span className="text-gray-500 block mb-1">{t('profile.major')}</span>
                <span className="text-gray-900">{studentProfile.major}</span>
              </div>
            )}
            {studentProfile.year != null && (
              <div>
                <span className="text-gray-500 block mb-1">{t('profile.year')}</span>
                <span className="text-gray-900">{t('profile.yearOption', { year: formatNumber(studentProfile.year) })}</span>
              </div>
            )}
            <div>
              <span className="text-gray-500 block mb-1">{t('common.email')}</span>
              <span className="text-gray-900">{studentProfile.email}</span>
            </div>
            <div>
              <button
                onClick={() => navigate(`/instructor/student/${project.owner_id}`)}
                className="rounded-full border-2 border-gray-200 px-4 py-1.5 text-xs font-bold text-gray-600 hover:bg-gray-50 transition-colors"
              >
                {t('instructorProjectDetail.viewFullProfile')}
              </button>
            </div>
          </div>
        )}
      </Card>
      </FadeInCard>

      {/* Game Overview (Setup) */}
      <FadeInCard index={1}>
      <Card>
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-primary mb-4">
          {t('instructorProjectDetail.gameOverview')}
        </p>
        {project.current_step < 1 ? (
          <p className="text-sm text-gray-400">{t('instructorProjectDetail.setupIncomplete')}</p>
        ) : (
          <div className="grid gap-4 text-sm sm:grid-cols-2">
            <div>
              <span className="text-gray-500 block mb-1">{t('setup.gameTitle')}</span>
              <span className="font-bold text-gray-900 text-base">{project.title}</span>
            </div>

            {project.genre && project.genre.length > 0 && (
              <div>
                <span className="text-gray-500 block mb-1">{t('setup.genre')}</span>
                <div className="flex flex-wrap gap-1">
                  {project.genre.map((g) => (
                    <Badge key={g} variant="blue">{g}</Badge>
                  ))}
                </div>
              </div>
            )}

            {project.platform && project.platform.length > 0 && (
              <div>
                <span className="text-gray-500 block mb-1">{t('setup.platform')}</span>
                <div className="flex flex-wrap gap-1">
                  {project.platform.map((p) => (
                    <Badge key={p} variant="default">{p}</Badge>
                  ))}
                </div>
              </div>
            )}

            {project.target_audience && (
              <div>
                <span className="text-gray-500 block mb-1">{t('setup.targetAudience')}</span>
                <span className="text-gray-900">{project.target_audience}</span>
              </div>
            )}

            {project.core_mechanic && (
              <div>
                <span className="text-gray-500 block mb-1">{t('setup.coreLoop')}</span>
                <span className="text-gray-900">{project.core_mechanic}</span>
              </div>
            )}

            {project.session_length && (
              <div>
                <span className="text-gray-500 block mb-1">{t('setup.sessionLength')}</span>
                <span className="text-gray-900">{project.session_length}</span>
              </div>
            )}
          </div>
        )}
      </Card>
      </FadeInCard>

      {/* Ads Strategy (Build) */}
      <FadeInCard index={2}>
      <Card>
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-primary mb-4">
          {t('instructorProjectDetail.adsStrategy')}
        </p>
        {project.current_step < 2 || !adsConfig ? (
          <p className="text-sm text-gray-400">
            {t('instructorProjectDetail.adsIncomplete')}
          </p>
        ) : (
          <>
            <div className="mb-4 grid gap-4 text-sm sm:grid-cols-2">
              {adsConfig.ad_network && (
                <div>
                  <span className="text-gray-500">{t('build.adNetwork')}:</span>{' '}
                  <span className="text-gray-900 font-medium">{adsConfig.ad_network}</span>
                </div>
              )}
              {adsConfig.revenue_model && (
                <div>
                  <span className="text-gray-500">{t('build.revenueModel')}:</span>{' '}
                  <span className="text-gray-900 font-medium uppercase">
                    {adsConfig.revenue_model}
                  </span>
                </div>
              )}
            </div>

            {adPlacements.length === 0 ? (
              <p className="text-sm text-gray-400">{t('instructorProjectDetail.noAdPlacements')}</p>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-black/5">
                    <th className="text-left text-xs font-bold text-gray-400 pb-2">{t('common.type')}</th>
                    <th className="text-left text-xs font-bold text-gray-400 pb-2">{t('instructorProjectDetail.trigger')}</th>
                    <th className="text-left text-xs font-bold text-gray-400 pb-2">{t('instructorProjectDetail.freqCap')}</th>
                  </tr>
                </thead>
                <tbody>
                  {adPlacements.map((placement) => (
                    <tr key={placement.id} className="border-b border-black/5 last:border-0">
                      <td className="py-2.5">
                        <Badge
                          variant={
                            placement.placement_type === 'rewarded'
                              ? 'green'
                              : placement.placement_type === 'interstitial'
                              ? 'yellow'
                              : 'blue'
                          }
                        >
                          {placement.placement_type}
                        </Badge>
                      </td>
                      <td className="py-2.5 text-gray-700">{placement.trigger_point ?? '—'}</td>
                      <td className="py-2.5 text-gray-500">
                        {placement.frequency_cap ?? t('build.noCap')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </>
        )}
      </Card>
      </FadeInCard>

      {/* IAP Catalog (Build) */}
      <FadeInCard index={3}>
      <Card>
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-primary mb-4">
          {t('instructorProjectDetail.iapCatalog')}
        </p>
        {project.current_step < 2 || !iapConfig ? (
          <p className="text-sm text-gray-400">
            {t('instructorProjectDetail.iapIncomplete')}
          </p>
        ) : (
          <>
            {iapConfig.store && (
              <p className="text-sm text-gray-500 mb-3">
                {t('build.selectStore')}:{' '}
                <span className="font-bold text-gray-700">
                  {iapConfig.store.replace('_', ' ')}
                </span>
                {iapConfig.currency && ` · ${t('instructorProjectDetail.currency')}: ${iapConfig.currency}`}
              </p>
            )}

            {iapItems.length === 0 ? (
              <p className="text-sm text-gray-400">{t('instructorProjectDetail.noIapItems')}</p>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-black/5">
                    <th className="text-left text-xs font-bold text-gray-400 pb-2">{t('common.name')}</th>
                    <th className="text-left text-xs font-bold text-gray-400 pb-2">{t('common.type')}</th>
                    <th className="text-left text-xs font-bold text-gray-400 pb-2">{t('build.price')}</th>
                    <th className="text-left text-xs font-bold text-gray-400 pb-2">{t('instructorCourses.description')}</th>
                  </tr>
                </thead>
                <tbody>
                  {iapItems.map((item) => (
                    <tr key={item.id} className="border-b border-black/5 last:border-0">
                      <td className="py-2.5 font-medium text-gray-800">{item.name}</td>
                      <td className="py-2.5">
                        <Badge variant="purple">{item.item_type}</Badge>
                      </td>
                      <td className="py-2.5 text-gray-700">
                        {item.price_usd != null ? `$${item.price_usd}` : '—'}
                      </td>
                      <td className="py-2.5 text-gray-500">{item.description ?? '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </>
        )}
      </Card>
      </FadeInCard>

      {/* Instructor Review Panel */}
      <FadeInCard index={4}>
      <Card className="border-primary/20">
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-primary mb-1">
          {t('instructorProjectDetail.reviewTitle')}
        </p>
        <p className="text-xs text-gray-400 mb-5">
          {t('instructorProjectDetail.reviewSubtitle')}
        </p>

        {reviewError && (
          <div className="bg-red-50 border border-red-200 text-red-700 rounded-2xl p-3 mb-4 text-sm">
            {reviewError}
          </div>
        )}

        {/* State: submitted or resubmitted */}
        {(project.status === 'submitted' || project.status === 'resubmitted') && (
          <div className="space-y-4">
            <p className="text-sm text-gray-600 leading-6">
              {t('instructorProjectDetail.submittedHelp')}
            </p>
            <button
              onClick={handleMarkUnderReview}
              disabled={reviewLoading}
              className="rounded-full border-2 border-primary/30 px-5 py-2.5 text-sm font-bold text-primary hover:bg-primary/5 disabled:opacity-50 transition-colors"
            >
              {reviewLoading ? t('instructorProjects.updating') : t('instructorProjectDetail.markUnderReview')}
            </button>
          </div>
        )}

        {/* State: under_review */}
        {project.status === 'under_review' && (
          <div className="space-y-5">
            {/* Send Back section */}
            <div className="border-2 border-orange-200 rounded-2xl p-4">
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-orange-600 mb-3">
                {t('instructorProjectDetail.sendBackTitle')}
              </p>
              <div className="mb-3">
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  {t('instructorProjectDetail.commentForStudent')} <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={sendBackComment}
                  onChange={(e) => setSendBackComment(e.target.value)}
                  rows={3}
                  placeholder={t('instructorProjectDetail.returnPlaceholder')}
                  className={textareaCls}
                />
              </div>
              <button
                onClick={handleReturn}
                disabled={reviewLoading}
                className="rounded-full border-2 border-orange-300 px-5 py-2.5 text-sm font-bold text-orange-600 hover:bg-orange-50 disabled:opacity-50 transition-colors"
              >
                {reviewLoading ? t('instructorProjectDetail.sending') : t('instructorProjectDetail.sendBackTitle')}
              </button>
            </div>

            {/* Give Grade section */}
            <div className="border-2 border-green-200 rounded-2xl p-4">
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-green-600 mb-3">
                {t('instructorProjectDetail.giveGrade')}
              </p>
              <div className="mb-3 max-w-xs">
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  {t('instructorProjectDetail.gradeLabel')} <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  min={0}
                  max={100}
                  value={gradeValue}
                  onChange={(e) => setGradeValue(e.target.value)}
                  placeholder={t('instructorProjectDetail.gradePlaceholder')}
                  className={inputCls}
                />
              </div>
              <div className="mb-3">
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  {t('instructorProjectDetail.comment')}{' '}
                  <span className="text-gray-400 font-normal text-xs">{t('instructorProjectDetail.optional')}</span>
                </label>
                <textarea
                  value={gradeComment}
                  onChange={(e) => setGradeComment(e.target.value)}
                  rows={2}
                  placeholder={t('instructorProjectDetail.feedbackPlaceholder')}
                  className={textareaCls}
                />
              </div>
              <button
                onClick={handleGrade}
                disabled={reviewLoading}
                className="rounded-full bg-green-600 px-6 py-2.5 text-sm font-bold text-white hover:bg-green-700 disabled:opacity-50 transition-colors"
              >
                {reviewLoading ? t('common.saving') : t('instructorProjectDetail.giveGrade')}
              </button>
            </div>
          </div>
        )}

        {/* State: graded */}
        {project.status === 'graded' && (
          <div className="bg-green-50 border-2 border-green-200 rounded-2xl p-4 space-y-2">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-green-600">{t('status.graded')}</p>
            <p className="text-2xl font-bold text-green-800">
              {project.grade ?? '—'}<span className="text-base font-normal text-green-600">/100</span>
            </p>
            {project.graded_at && (
              <p className="text-xs text-green-500">
                {t('instructorProjectDetail.gradedOn', { date: formatDate(project.graded_at) })}
              </p>
            )}
            {project.instructor_comment && (
              <div className="mt-2 pt-2 border-t border-green-200">
                <p className="text-xs font-bold text-gray-500 mb-1">{t('instructorProjectDetail.yourComment')}</p>
                <p className="text-sm text-gray-700">{project.instructor_comment}</p>
              </div>
            )}
          </div>
        )}

        {/* State: returned */}
        {project.status === 'returned' && (
          <div className="bg-orange-50 border-2 border-orange-200 rounded-2xl p-4 space-y-2">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-orange-600">
              {t('instructorProjectDetail.returnedToStudent')}
            </p>
            <p className="text-xs text-gray-500">
              {t('instructorProjectDetail.waitingRevision')}
            </p>
            {project.instructor_comment && (
              <div className="mt-2 pt-2 border-t border-orange-200">
                <p className="text-xs font-bold text-gray-500 mb-1">{t('instructorProjectDetail.yourComment')}</p>
                <p className="text-sm text-gray-700">{project.instructor_comment}</p>
              </div>
            )}
          </div>
        )}

        {/* State: draft (not submitted yet) */}
        {project.status === 'draft' && (
          <p className="text-sm text-gray-400">
            {t('instructorProjectDetail.notSubmitted')}
          </p>
        )}
      </Card>
      </FadeInCard>
    </PageContainer>
  )
}
