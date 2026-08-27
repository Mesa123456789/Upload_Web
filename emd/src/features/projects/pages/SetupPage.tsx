import { useEffect, useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { useAuth } from '../../auth/context/useAuth'
import { createProject, getProject, updateProject } from '../services/projects.service'
import type { Project } from '../../../lib/database.types'
import PageContainer from '../../../app/layout/PageContainer'
import Card from '../../../shared/components/Card'
import { Skeleton, SkeletonCard } from '../../../shared/components/Skeleton'
import { notify } from '../../../shared/lib/toast'
import StepIndicator from './components/StepIndicator'
import AiSuggestionPanel from './components/AiSuggestionPanel'
import FadeInCard from '../../../shared/components/FadeInCard'
import { useChat } from '../context/ChatContext'
import { useI18n } from '../../../i18n/I18nProvider'

const MAIN_GENRES = ['Puzzle', 'Action', 'RPG', 'Simulation', 'Strategy', 'Casual', 'Sports', 'Adventure']
const MORE_GENRES = [
  'Arcade',
  'Idle',
  'Hyper-casual',
  'Racing',
  'Shooter',
  'Battle Royale',
  'Card',
  'Board',
  'Trivia',
  'Word',
  'Educational',
  'Music',
  'Rhythm',
  'Horror',
  'Survival',
  'Sandbox',
  'MMORPG',
  'MOBA',
  'Tower Defense',
  'Roguelike',
  'Visual Novel',
]
const PLATFORMS = ['Mobile (iOS)', 'Mobile (Android)', 'PC', 'Console', 'Web']
const AUDIENCES = ['All ages', 'Kids', 'Teens', 'Casual adults', 'Core players']
const SESSION_LENGTHS = ['Under 5 min', '5-10 min', '10-30 min', '30+ min']

const inputClass = 'ds-input font-medium'
const optionKey = (value: string) => value.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '')

export default function SetupPage() {
  const { id: projectId } = useParams<{ id: string }>()
  const [searchParams] = useSearchParams()
  const courseIdFromQuery = searchParams.get('courseId')
  const isMissingCourseForNewProject = !projectId && !courseIdFromQuery
  const navigate = useNavigate()
  const { user } = useAuth()
  const { t } = useI18n()
  const optionLabel = (group: string, value: string) => t(`setup.${group}.${optionKey(value)}`)

  const [_project, setProject] = useState<Project | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showMoreGenres, setShowMoreGenres] = useState(false)
  const [title, setTitle] = useState('')
  const [genre, setGenre] = useState<string[]>([])
  const [customGenre, setCustomGenre] = useState('')
  const [platform, setPlatform] = useState<string[]>([])
  const [customPlatform, setCustomPlatform] = useState('')
  const [targetAudience, setTargetAudience] = useState('')
  const [customTargetAudience, setCustomTargetAudience] = useState('')
  const [coreMechanic, setCoreMechanic] = useState('')
  const [sessionLength, setSessionLength] = useState('5-10 min')

  const { setLiveDraft } = useChat()

  // push state ฟอร์มขึ้น ChatContext ทุกครั้งที่เปลี่ยน — ให้ AI อ่านสดได้
  // โดยไม่ต้อง save DB ก่อน (ตามหลัก "Setup อ่านสด / Build+ อ่าน DB")
  useEffect(() => {
    setLiveDraft({
      title,
      genre,
      platform,
      target_audience: customTargetAudience.trim() || targetAudience.trim() || null,
      core_mechanic: coreMechanic.trim() || null,
      session_length: sessionLength || null,
      current_step: 1,
    })
  }, [title, genre, platform, targetAudience, customTargetAudience, coreMechanic, sessionLength, setLiveDraft])

  // เคลียร์ liveDraft ตอนออกจากหน้า Setup — หน้าอื่นจะอ่านจาก DB แทน
  useEffect(() => {
    return () => setLiveDraft(null)
  }, [setLiveDraft])

  useEffect(() => {
    async function load() {
      if (projectId) {
        try {
          const project = await getProject(projectId)
          setProject(project)
          setTitle(project.title)
          setGenre(project.genre ?? [])
          setPlatform(project.platform ?? [])
          if (project.target_audience && AUDIENCES.includes(project.target_audience)) {
            setTargetAudience(project.target_audience)
          } else {
            setTargetAudience('')
            setCustomTargetAudience(project.target_audience ?? '')
          }
          setCoreMechanic(project.core_mechanic ?? '')
          setSessionLength(project.session_length ?? '5-10 min')
        } catch (err) {
          setError(err instanceof Error ? err.message : t('setup.loadFailed'))
        }
      } else if (!courseIdFromQuery) {
        setError(t('setup.courseMissing'))
      }
      setLoading(false)
    }
    load()
  }, [courseIdFromQuery, projectId, t])

  function toggleArrayItem(arr: string[], item: string): string[] {
    return arr.includes(item) ? arr.filter((value) => value !== item) : [...arr, item]
  }

  function addCustomPlatform() {
    const nextPlatform = customPlatform.trim()
    if (!nextPlatform) return
    setPlatform((current) => current.includes(nextPlatform) ? current : [...current, nextPlatform])
    setCustomPlatform('')
  }

  function addCustomGenre() {
    const nextGenre = customGenre.trim()
    if (!nextGenre) return
    setGenre((current) => current.includes(nextGenre) ? current : [...current, nextGenre])
    setCustomGenre('')
  }

  // Custom genres typed by the user aren't in the genreOptions dictionary,
  // so optionLabel() would fall back to showing the raw i18n key string —
  // pass those through as-is instead of translating.
  function genreLabel(item: string) {
    return MAIN_GENRES.includes(item) || MORE_GENRES.includes(item) ? optionLabel('genreOptions', item) : item
  }

  // logic เซฟกลาง — ใช้ทั้ง Save Draft และ Continue
  // ต่างกันแค่ current_step (Continue = step 2, Save Draft = คงสถานะปัจจุบันไม่ขยับ)
  // current_step ของอาจารย์ (draft tracking) ไม่ถูกแก้ถ้าไม่ได้ตั้งใจส่งมา
  async function saveProject(nextStep?: number): Promise<string | null> {
    if (!title.trim()) {
      setError(t('setup.titleRequired'))
      return null
    }
    if (!user) return null

    let savedProjectId: string | undefined = projectId

    if (!savedProjectId) {
      if (!courseIdFromQuery) {
        setError(t('setup.courseMissing'))
        return null
      }
      const newProject = await createProject({
        course_id: courseIdFromQuery,
        title: title.trim(),
      })
      savedProjectId = newProject.id as string
    }

    const finalTargetAudience = customTargetAudience.trim() || targetAudience.trim()

    await updateProject(savedProjectId, {
      title: title.trim(),
      genre: genre.length > 0 ? genre : null,
      platform: platform.length > 0 ? platform : null,
      target_audience: finalTargetAudience || null,
      core_mechanic: coreMechanic.trim() || null,
      session_length: sessionLength || null,
      ...(nextStep != null ? { current_step: nextStep } : {}),
    })

    return savedProjectId as string
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError(null)
    try {
      const savedProjectId = await saveProject(2)
      if (savedProjectId) {
        notify.success(t('setup.savedNext'))
        navigate(`/project/${savedProjectId}/build`)
      }
    } catch (err) {
      notify.error(t('setup.saveErrorToast'))
      setError(err instanceof Error ? err.message : t('setup.saveFailed'))
    } finally {
      setSaving(false)
    }
  }

  // Save Draft — เซฟข้อมูลจริง (เดิมแค่ navigate ทิ้งข้อมูล) แล้วกลับ dashboard
  // ไม่ส่ง current_step ไป จึงไม่กระทบสถานะ draft-tracking ที่อาจารย์ใช้ดูความคืบหน้า
  async function handleSaveDraft() {
    setSaving(true)
    setError(null)
    try {
      const savedProjectId = await saveProject()
      if (savedProjectId) {
        notify.success(t('setup.saveDraftSuccess'))
        navigate('/dashboard')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : t('setup.saveDraftFailed'))
      notify.error(t('setup.draftErrorToast'))
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <PageContainer>
        <Skeleton className="h-8 w-full" /> {/* StepIndicator */}
        {/* header row */}
        <div className="flex items-end justify-between">
          <div className="space-y-2">
            <Skeleton className="h-9 w-64" />
            <Skeleton className="h-4 w-80" />
          </div>
          <Skeleton className="h-10 w-52 rounded-lg" /> {/* tab switcher */}
        </div>
        <div className="grid gap-6 lg:grid-cols-[1fr_300px]">
          <div className="space-y-4">
            <SkeletonCard />
            <SkeletonCard />
          </div>
          <Skeleton className="h-48 rounded-lg" /> {/* sidebar */}
        </div>
      </PageContainer>
    )
  }

  return (
    <PageContainer>
      <StepIndicator current={1} />

      <div>
        <h1 className="text-3xl font-black tracking-tight text-slate-950">{t('setup.title')}</h1>
        <p className="mt-2 text-sm leading-6 text-slate-500">
          {t('setup.subtitle')}
        </p>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="grid gap-6 lg:grid-cols-[1fr_340px]">
        <div className="space-y-6">
          <FadeInCard index={0}>
          <Card>
            <p className="mb-5 text-xs font-black uppercase tracking-[0.18em] text-primary">{t('setup.basicInfo')}</p>
            <div className="space-y-5">
              <div>
                <label className="mb-2 block text-sm font-bold text-slate-700">{t('setup.gameTitle')}</label>
                <input
                  type="text"
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                  placeholder={t('setup.gameTitlePlaceholder')}
                  className={inputClass}
                />
              </div>

              <div>
                <label className="mb-3 block text-sm font-bold text-slate-700">{t('setup.genre')}</label>
                <div className="flex flex-wrap gap-2">
                  {MAIN_GENRES.map((item) => (
                    <button
                      key={item}
                      type="button"
                      onClick={() => setGenre(toggleArrayItem(genre, item))}
                      className={`rounded-md border px-3 py-2 text-sm font-bold transition ${
                        genre.includes(item)
                          ? 'border-primary bg-primary text-white'
                          : 'border-line bg-white text-slate-600 hover:border-primary/30'
                      }`}
                    >
                    {optionLabel('genreOptions', item)}
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => setShowMoreGenres((value) => !value)}
                    className="rounded-md border border-dashed border-primary/40 bg-orange-50 px-3 py-2 text-sm font-black text-primary transition hover:border-primary hover:bg-orange-100"
                  >
                    {showMoreGenres ? t('setup.less') : t('setup.more')}
                  </button>
                </div>
                {showMoreGenres && (
                  <div className="mt-3 rounded-lg border border-line bg-slate-50 p-3">
                    <div className="flex flex-wrap gap-2">
                      {MORE_GENRES.map((item) => (
                        <button
                          key={item}
                          type="button"
                          onClick={() => setGenre(toggleArrayItem(genre, item))}
                          className={`rounded-md border px-3 py-2 text-sm font-bold transition ${
                            genre.includes(item)
                              ? 'border-primary bg-primary text-white'
                              : 'border-line bg-white text-slate-600 hover:border-primary/30'
                          }`}
                        >
                      {optionLabel('genreOptions', item)}
                        </button>
                      ))}
                      {genre.filter((item) => !MAIN_GENRES.includes(item) && !MORE_GENRES.includes(item)).map((item) => (
                        // Custom genres have no "source list" to fall back to when
                        // unselected, so they only have one state: present = selected.
                        // Clicking removes it from the array outright instead of toggling.
                        <button
                          key={item}
                          type="button"
                          onClick={() => setGenre((current) => current.filter((g) => g !== item))}
                          className="relative rounded-md border border-primary bg-primary px-3 py-2 text-sm font-bold text-white transition hover:bg-primary/90"
                          aria-label={`Remove custom genre ${item}`}
                        >
                          {item}
                          <span
                            className="absolute -right-1 -top-1 h-2.5 w-2.5 rounded-full border border-white bg-yellow-400"
                            aria-hidden="true"
                          />
                        </button>
                      ))}
                    </div>
                    <div className="mt-3 flex gap-2">
                      <input
                        type="text"
                        value={customGenre}
                        onChange={(event) => setCustomGenre(event.target.value)}
                        onKeyDown={(event) => {
                          if (event.key === 'Enter') {
                            event.preventDefault()
                            addCustomGenre()
                          }
                        }}
                        placeholder={t('setup.customGenrePlaceholder')}
                        className={`${inputClass} min-w-0`}
                      />
                      <button
                        type="button"
                        onClick={addCustomGenre}
                        className="shrink-0 rounded-lg border border-primary/30 bg-orange-50 px-4 py-2 text-sm font-black text-primary transition hover:border-primary hover:bg-orange-100"
                      >
                        {t('setup.add')}
                      </button>
                    </div>
                  </div>
                )}
                {genre.length > 0 && (
                  <p className="mt-2 text-xs font-semibold text-slate-500">
                    {t('setup.selected', { items: genre.map((item) => genreLabel(item)).join(', ') })}
                  </p>
                )}
              </div>

              <div>
                <label className="mb-3 block text-sm font-bold text-slate-700">{t('setup.platform')}</label>
                <div className="grid gap-2 sm:grid-cols-2">
                  {PLATFORMS.map((item) => (
                    <label
                      key={item}
                      className={`flex items-center gap-3 rounded-lg border p-3 text-sm font-semibold transition ${
                        platform.includes(item)
                          ? 'border-primary bg-teal-50 text-primary'
                          : 'border-line bg-white text-slate-600'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={platform.includes(item)}
                        onChange={() => setPlatform(toggleArrayItem(platform, item))}
                        className="h-4 w-4 accent-primary"
                      />
                    {optionLabel('platformOptions', item)}
                    </label>
                  ))}
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={customPlatform}
                      onChange={(event) => setCustomPlatform(event.target.value)}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter') {
                          event.preventDefault()
                          addCustomPlatform()
                        }
                      }}
                      placeholder={t('setup.customPlatformPlaceholder')}
                      className={`${inputClass} min-w-0`}
                    />
                    <button
                      type="button"
                      onClick={addCustomPlatform}
                      className="shrink-0 rounded-lg border border-primary/30 bg-orange-50 px-4 py-2 text-sm font-black text-primary transition hover:border-primary hover:bg-orange-100"
                    >
                      {t('setup.add')}
                    </button>
                  </div>
                </div>
                {platform.filter((item) => !PLATFORMS.includes(item)).length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {platform.filter((item) => !PLATFORMS.includes(item)).map((item) => (
                      <label
                        key={item}
                        className={`flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm font-semibold transition ${
                          platform.includes(item)
                            ? 'border-primary bg-teal-50 text-primary'
                            : 'border-line bg-white text-slate-600'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={platform.includes(item)}
                          onChange={() => setPlatform(toggleArrayItem(platform, item))}
                          className="h-4 w-4 accent-primary"
                        />
                        {item}
                      </label>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <label className="mb-2 block text-sm font-bold text-slate-700">{t('setup.targetAudience')}</label>
                <select
                  value={targetAudience}
                  onChange={(event) => {
                    setTargetAudience(event.target.value)
                    if (event.target.value) setCustomTargetAudience('')
                  }}
                  className={inputClass}
                >
                  <option value="">{t('setup.selectAudience')}</option>
                  {AUDIENCES.map((item) => (
                    <option key={item} value={item}>{optionLabel('audienceOptions', item)}</option>
                  ))}
                </select>
                <input
                  type="text"
                  value={customTargetAudience}
                  onChange={(event) => {
                    setCustomTargetAudience(event.target.value)
                    if (event.target.value.trim()) setTargetAudience('')
                  }}
                  placeholder={t('setup.customAudiencePlaceholder')}
                  className={`${inputClass} mt-3`}
                />
              </div>
            </div>
          </Card>
          </FadeInCard>

          <FadeInCard index={1}>
          <Card>
            <p className="mb-5 text-xs font-black uppercase tracking-[0.18em] text-primary">{t('setup.sessionLoop')}</p>
            <div className="space-y-5">
              <div>
                <label className="mb-2 block text-sm font-bold text-slate-700">{t('setup.sessionLength')}</label>
                <select
                  value={sessionLength}
                  onChange={(event) => setSessionLength(event.target.value)}
                  className={inputClass}
                >
                  {SESSION_LENGTHS.map((item) => (
                    <option key={item} value={item}>{optionLabel('sessionOptions', item)}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-2 block text-sm font-bold text-slate-700">{t('setup.coreLoop')}</label>
                <textarea
                  value={coreMechanic}
                  onChange={(event) => setCoreMechanic(event.target.value)}
                  placeholder={t('setup.coreLoopPlaceholder')}
                  className={`${inputClass} min-h-28 resize-y leading-6`}
                />
              </div>
            </div>
          </Card>
          </FadeInCard>
        </div>

        <aside className="space-y-4">
          <FadeInCard index={2}>
          <Card>
            <h2 className="text-base font-black text-slate-950">{t('setup.contextPreview')}</h2>
            <div className="mt-4 rounded-lg bg-slate-50 p-4 text-sm font-semibold text-slate-600">
              {t('setup.flowPreview')}
            </div>
          </Card>
          </FadeInCard>

          <FadeInCard index={3}>
          <Card>
            <h2 className="text-base font-black text-slate-950">{t('setup.quickSummary')}</h2>
            <dl className="mt-4 space-y-3 text-sm">
              <div className="flex justify-between gap-4">
                <dt className="text-slate-500">{t('setup.summaryTitle')}</dt>
                <dd className="font-bold text-slate-900">{title || t('setup.untitled')}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-slate-500">{t('setup.summaryGenre')}</dt>
                <dd className="max-w-44 text-right font-bold text-slate-900">
                  {genre.length > 0 ? genre.join(', ') : t('setup.notSet')}
                </dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-slate-500">{t('setup.summaryPlatforms')}</dt>
                <dd className="max-w-44 text-right font-bold text-slate-900">
                  {platform.length > 0 ? platform.join(', ') : t('setup.notSet')}
                </dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-slate-500">{t('setup.summarySession')}</dt>
                <dd className="font-bold text-slate-900">{sessionLength}</dd>
              </div>
            </dl>
          </Card>
          </FadeInCard>

          <FadeInCard index={4}>
          <AiSuggestionPanel stage="setup" projectId={projectId ?? ''} />
          </FadeInCard>

          <div className="sticky bottom-4 flex gap-3 rounded-lg border border-line bg-white p-3 shadow-lg">
            <button
              type="button"
              onClick={handleSaveDraft}
              disabled={saving || isMissingCourseForNewProject}
              className="flex-1 rounded-lg border border-line px-4 py-2.5 text-sm font-bold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
            >
              {saving ? t('common.saving') : t('setup.saveDraft')}
            </button>
            <button
              type="submit"
              disabled={saving || isMissingCourseForNewProject}
              className="flex-1 rounded-lg bg-primary px-4 py-2.5 text-sm font-bold text-white transition hover:bg-primary-light disabled:opacity-50"
            >
              {saving ? t('common.saving') : t('setup.continue')}
            </button>
          </div>
        </aside>
      </form>
    </PageContainer>
  )
}
