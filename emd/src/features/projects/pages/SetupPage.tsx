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

const inputClass = 'w-full rounded-lg border border-line bg-white px-4 py-2.5 text-sm font-medium text-slate-800 shadow-sm focus:outline-none focus:ring-2 focus:ring-primary/30 placeholder:text-slate-400'

export default function SetupPage() {
  const { id: projectId } = useParams<{ id: string }>()
  const [searchParams] = useSearchParams()
  const courseIdFromQuery = searchParams.get('courseId')
  const navigate = useNavigate()
  const { user } = useAuth()

  const [_project, setProject] = useState<Project | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showMoreGenres, setShowMoreGenres] = useState(false)
  const [title, setTitle] = useState('')
  const [genre, setGenre] = useState<string[]>([])
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
          setError(err instanceof Error ? err.message : 'Failed to load project')
        }
      }
      setLoading(false)
    }
    load()
  }, [projectId])

  function toggleArrayItem(arr: string[], item: string): string[] {
    return arr.includes(item) ? arr.filter((value) => value !== item) : [...arr, item]
  }

  function addCustomPlatform() {
    const nextPlatform = customPlatform.trim()
    if (!nextPlatform) return
    setPlatform((current) => current.includes(nextPlatform) ? current : [...current, nextPlatform])
    setCustomPlatform('')
  }

  // logic เซฟกลาง — ใช้ทั้ง Save Draft และ Continue
  // ต่างกันแค่ current_step (Continue = step 2, Save Draft = คงสถานะปัจจุบันไม่ขยับ)
  // current_step ของอาจารย์ (draft tracking) ไม่ถูกแก้ถ้าไม่ได้ตั้งใจส่งมา
  async function saveProject(nextStep?: number): Promise<string | null> {
    if (!title.trim()) {
      setError('Game title is required')
      return null
    }
    if (!user) return null

    let savedProjectId: string | undefined = projectId

    if (!savedProjectId) {
      if (!courseIdFromQuery) {
        setError('Course ID is missing. Please return to the dashboard.')
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
        notify.success('บันทึกแล้ว ไปต่อขั้นที่ 2 ได้เลย')
        navigate(`/project/${savedProjectId}/build`)
      }
    } catch (err) {
      notify.error('บัททึกไม่สำเร็จ ลองใหม่อีกครั้ง')
      setError(err instanceof Error ? err.message : 'Failed to save')
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
        notify.success('บันทึก Draft แล้ว')
        navigate('/dashboard')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save draft')
      notify.error('บันทึก Draft ไม่สำเร็จ ลองอีกครั้ง')
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
        <h1 className="text-3xl font-black tracking-tight text-slate-950">Project Setup</h1>
        <p className="mt-2 text-sm leading-6 text-slate-500">
          Define the game context so the assistant can generate relevant ethical design guidance.
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
            <p className="mb-5 text-xs font-black uppercase tracking-[0.18em] text-primary">A. Basic Info</p>
            <div className="space-y-5">
              <div>
                <label className="mb-2 block text-sm font-bold text-slate-700">Game Title</label>
                <input
                  type="text"
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                  placeholder="DragonVille, PuzzleWorld Plus..."
                  className={inputClass}
                />
              </div>

              <div>
                <label className="mb-3 block text-sm font-bold text-slate-700">Genre</label>
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
                      {item}
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => setShowMoreGenres((value) => !value)}
                    className="rounded-md border border-dashed border-primary/40 bg-orange-50 px-3 py-2 text-sm font-black text-primary transition hover:border-primary hover:bg-orange-100"
                  >
                    {showMoreGenres ? 'less' : '...more'}
                  </button>
                </div>
                {showMoreGenres && (
                  <div className="mt-3 flex flex-wrap gap-2 rounded-lg border border-line bg-slate-50 p-3">
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
                        {item}
                      </button>
                    ))}
                  </div>
                )}
                {genre.length > 0 && (
                  <p className="mt-2 text-xs font-semibold text-slate-500">
                    Selected: {genre.join(', ')}
                  </p>
                )}
              </div>

              <div>
                <label className="mb-3 block text-sm font-bold text-slate-700">Platform</label>
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
                      {item}
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
                      placeholder="Add your own platform..."
                      className={`${inputClass} min-w-0`}
                    />
                    <button
                      type="button"
                      onClick={addCustomPlatform}
                      className="shrink-0 rounded-lg border border-primary/30 bg-orange-50 px-4 py-2 text-sm font-black text-primary transition hover:border-primary hover:bg-orange-100"
                    >
                      Add
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
                <label className="mb-2 block text-sm font-bold text-slate-700">Target Audience</label>
                <select
                  value={targetAudience}
                  onChange={(event) => {
                    setTargetAudience(event.target.value)
                    if (event.target.value) setCustomTargetAudience('')
                  }}
                  className={inputClass}
                >
                  <option value="">Select audience</option>
                  {AUDIENCES.map((item) => (
                    <option key={item} value={item}>{item}</option>
                  ))}
                </select>
                <input
                  type="text"
                  value={customTargetAudience}
                  onChange={(event) => {
                    setCustomTargetAudience(event.target.value)
                    if (event.target.value.trim()) setTargetAudience('')
                  }}
                  placeholder="Or type your own audience..."
                  className={`${inputClass} mt-3`}
                />
              </div>
            </div>
          </Card>
          </FadeInCard>

          <FadeInCard index={1}>
          <Card>
            <p className="mb-5 text-xs font-black uppercase tracking-[0.18em] text-primary">B. Session & Loop</p>
            <div className="space-y-5">
              <div>
                <label className="mb-2 block text-sm font-bold text-slate-700">Typical Session Length</label>
                <select
                  value={sessionLength}
                  onChange={(event) => setSessionLength(event.target.value)}
                  className={inputClass}
                >
                  <option value="Under 5 min">Under 5 min</option>
                  <option value="5-10 min">5-10 min</option>
                  <option value="10-30 min">10-30 min</option>
                  <option value="30+ min">30+ min</option>
                </select>
              </div>

              <div>
                <label className="mb-2 block text-sm font-bold text-slate-700">Core Loop</label>
                <textarea
                  value={coreMechanic}
                  onChange={(event) => setCoreMechanic(event.target.value)}
                  placeholder="Player enters level, wins or loses, receives rewards, upgrades, then starts the next challenge."
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
            <h2 className="text-base font-black text-slate-950">Context Preview</h2>
            <div className="mt-4 rounded-lg bg-slate-50 p-4 text-sm font-semibold text-slate-600">
              Start <span className="text-slate-300">→</span> Play <span className="text-slate-300">→</span> Outcome <span className="text-slate-300">→</span> Reward <span className="text-slate-300">→</span> Next
            </div>
          </Card>
          </FadeInCard>

          <FadeInCard index={3}>
          <Card>
            <h2 className="text-base font-black text-slate-950">Quick Summary</h2>
            <dl className="mt-4 space-y-3 text-sm">
              <div className="flex justify-between gap-4">
                <dt className="text-slate-500">Title</dt>
                <dd className="font-bold text-slate-900">{title || 'Untitled project'}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-slate-500">Genre</dt>
                <dd className="max-w-44 text-right font-bold text-slate-900">
                  {genre.length > 0 ? genre.join(', ') : 'Not set'}
                </dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-slate-500">Platforms</dt>
                <dd className="max-w-44 text-right font-bold text-slate-900">
                  {platform.length > 0 ? platform.join(', ') : 'Not set'}
                </dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-slate-500">Session</dt>
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
              disabled={saving}
              className="flex-1 rounded-lg border border-line px-4 py-2.5 text-sm font-bold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Save Draft'}
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 rounded-lg bg-primary px-4 py-2.5 text-sm font-bold text-white transition hover:bg-primary-light disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Continue'}
            </button>
          </div>
        </aside>
      </form>
    </PageContainer>
  )
}