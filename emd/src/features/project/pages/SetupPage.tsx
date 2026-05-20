import { useEffect, useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { useAuth } from '../../auth/context/useAuth'
import { createProject, getProject, updateProject } from '../../projects/services/projects.service'
import type { Project } from '../../../lib/database.types'
import PageContainer from '../../../app/layout/PageContainer'
import Card from '../../../shared/components/Card'
import Spinner from '../../../shared/components/Spinner'
import StepIndicator from './components/StepIndicator'
import AiSuggestionPanel from './components/AiSuggestionPanel'

const GENRES = ['Puzzle', 'Action', 'RPG', 'Simulation', 'Strategy', 'Casual', 'Sports', 'Adventure']
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
  const [title, setTitle] = useState('')
  const [genre, setGenre] = useState<string[]>([])
  const [platform, setPlatform] = useState<string[]>([])
  const [targetAudience, setTargetAudience] = useState('')
  const [coreMechanic, setCoreMechanic] = useState('')
  const [sessionLength, setSessionLength] = useState('5-10 min')

  useEffect(() => {
    async function load() {
      if (projectId) {
        try {
          const project = await getProject(projectId)
          setProject(project)
          setTitle(project.title)
          setGenre(project.genre ?? [])
          setPlatform(project.platform ?? [])
          setTargetAudience(project.target_audience ?? '')
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

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    if (!title.trim()) {
      setError('Game title is required')
      return
    }

    if (!user) return

    setSaving(true)
    setError(null)

    try {
      let savedProjectId = projectId

      if (!savedProjectId) {
        if (!courseIdFromQuery) {
          setError('Course ID is missing. Please return to the dashboard.')
          setSaving(false)
          return
        }
        const newProject = await createProject({
          course_id: courseIdFromQuery,
          title: title.trim(),
        })
        savedProjectId = newProject.id
      }

      await updateProject(savedProjectId, {
        title: title.trim(),
        genre: genre.length > 0 ? genre : null,
        platform: platform.length > 0 ? platform : null,
        target_audience: targetAudience.trim() || null,
        core_mechanic: coreMechanic.trim() || null,
        session_length: sessionLength || null,
        current_step: 2,
      })

      navigate(`/project/${savedProjectId}/build`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save')
    } finally {
      setSaving(false)
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
                  {GENRES.map((item) => (
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
                </div>
              </div>

              <div>
                <label className="mb-2 block text-sm font-bold text-slate-700">Target Audience</label>
                <select
                  value={targetAudience}
                  onChange={(event) => setTargetAudience(event.target.value)}
                  className={inputClass}
                >
                  <option value="">Select audience</option>
                  {AUDIENCES.map((item) => (
                    <option key={item} value={item}>{item}</option>
                  ))}
                </select>
              </div>
            </div>
          </Card>

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
        </div>

        <aside className="space-y-4">
          <Card>
            <h2 className="text-base font-black text-slate-950">Context Preview</h2>
            <div className="mt-4 rounded-lg bg-slate-50 p-4 text-sm font-semibold text-slate-600">
              Start <span className="text-slate-300">→</span> Play <span className="text-slate-300">→</span> Outcome <span className="text-slate-300">→</span> Reward <span className="text-slate-300">→</span> Next
            </div>
          </Card>

          <Card>
            <h2 className="text-base font-black text-slate-950">Quick Summary</h2>
            <dl className="mt-4 space-y-3 text-sm">
              <div className="flex justify-between gap-4">
                <dt className="text-slate-500">Title</dt>
                <dd className="font-bold text-slate-900">{title || 'Untitled project'}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-slate-500">Genre</dt>
                <dd className="font-bold text-slate-900">{genre[0] ?? 'Not set'}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-slate-500">Platforms</dt>
                <dd className="font-bold text-slate-900">{platform.length || 0}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-slate-500">Session</dt>
                <dd className="font-bold text-slate-900">{sessionLength}</dd>
              </div>
            </dl>
          </Card>

          <AiSuggestionPanel stage="setup" />

          <div className="sticky bottom-4 flex gap-3 rounded-lg border border-line bg-white p-3 shadow-lg">
            <button
              type="button"
              onClick={() => navigate('/dashboard')}
              className="flex-1 rounded-lg border border-line px-4 py-2.5 text-sm font-bold text-slate-700 transition hover:bg-slate-50"
            >
              Save Draft
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
