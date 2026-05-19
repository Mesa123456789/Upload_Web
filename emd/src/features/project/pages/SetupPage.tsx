import { useEffect, useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { useAuth } from '../../auth/context/useAuth'
import { createProject, getProject, updateProject } from '../../projects/services/projects.service'
import type { Project } from '../../../lib/database.types'
import PageContainer from '../../../app/layout/PageContainer'
import Card from '../../../shared/components/Card'
import Spinner from '../../../shared/components/Spinner'
import StepIndicator from './components/StepIndicator'

const GENRES = ['Puzzle', 'Action', 'RPG', 'Simulation', 'Strategy', 'Casual', 'Sports', 'Adventure']
const PLATFORMS = ['Mobile (iOS)', 'Mobile (Android)', 'PC', 'Console', 'Web']

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

  // Form state
  const [title, setTitle] = useState('')
  const [genre, setGenre] = useState<string[]>([])
  const [platform, setPlatform] = useState<string[]>([])
  const [targetAudience, setTargetAudience] = useState('')
  const [coreMechanic, setCoreMechanic] = useState('')
  const [sessionLength, setSessionLength] = useState('5-10 min')

  useEffect(() => {
    async function load() {
      if (projectId) {
        // Edit existing project
        try {
          const p = await getProject(projectId)
          setProject(p)
          setTitle(p.title)
          setGenre(p.genre ?? [])
          setPlatform(p.platform ?? [])
          setTargetAudience(p.target_audience ?? '')
          setCoreMechanic(p.core_mechanic ?? '')
          setSessionLength(p.session_length ?? '5-10 min')
        } catch (err) {
          setError(err instanceof Error ? err.message : 'Failed to load project')
        }
      }
      setLoading(false)
    }
    load()
  }, [projectId])

  function toggleArrayItem(arr: string[], item: string): string[] {
    return arr.includes(item) ? arr.filter((x) => x !== item) : [...arr, item]
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
        // Create new project — requires courseId from query param
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

      // Save step 1 data + advance to step 2
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

      {/* Page heading */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-gray-900">Project Setup</h1>
        <p className="text-sm text-gray-500 leading-6 mt-1">Tell us about your game</p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-2xl p-4 text-sm">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <Card className="space-y-6">
          {/* Game Title */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-[0.18em] text-primary mb-2">
              Game Title <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Pixel Quest"
              className="w-full border border-black/10 rounded-xl px-4 py-2.5 text-sm bg-background-main focus:outline-none focus:ring-2 focus:ring-primary/30 placeholder:text-gray-400"
            />
          </div>

          {/* Genre */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-[0.18em] text-primary mb-3">
              Genre
            </label>
            <div className="flex flex-wrap gap-2">
              {GENRES.map((g) => (
                <button
                  key={g}
                  type="button"
                  onClick={() => setGenre(toggleArrayItem(genre, g))}
                  className={`rounded-full px-4 py-1.5 text-xs font-bold border-2 transition-colors ${
                    genre.includes(g)
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'border-gray-200 text-gray-600 hover:border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  {g}
                </button>
              ))}
            </div>
          </div>

          {/* Platform */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-[0.18em] text-primary mb-3">
              Platform
            </label>
            <div className="flex flex-wrap gap-2">
              {PLATFORMS.map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setPlatform(toggleArrayItem(platform, p))}
                  className={`rounded-full px-4 py-1.5 text-xs font-bold border-2 transition-colors ${
                    platform.includes(p)
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'border-gray-200 text-gray-600 hover:border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>

          {/* Target Audience */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-[0.18em] text-primary mb-2">
              Target Audience
            </label>
            <input
              type="text"
              value={targetAudience}
              onChange={(e) => setTargetAudience(e.target.value)}
              placeholder="e.g. Casual gamers aged 18-35"
              className="w-full border border-black/10 rounded-xl px-4 py-2.5 text-sm bg-background-main focus:outline-none focus:ring-2 focus:ring-primary/30 placeholder:text-gray-400"
            />
          </div>

          {/* Core Mechanic */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-[0.18em] text-primary mb-2">
              Core Mechanic
            </label>
            <input
              type="text"
              value={coreMechanic}
              onChange={(e) => setCoreMechanic(e.target.value)}
              placeholder="e.g. Match-3 puzzle solving"
              className="w-full border border-black/10 rounded-xl px-4 py-2.5 text-sm bg-background-main focus:outline-none focus:ring-2 focus:ring-primary/30 placeholder:text-gray-400"
            />
          </div>

          {/* Session Length */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-[0.18em] text-primary mb-2">
              Session Length
            </label>
            <select
              value={sessionLength}
              onChange={(e) => setSessionLength(e.target.value)}
              className="w-full border border-black/10 rounded-xl px-4 py-2.5 text-sm bg-background-main focus:outline-none focus:ring-2 focus:ring-primary/30"
            >
              <option value="Under 5 min">Under 5 min</option>
              <option value="5-10 min">5-10 min (default)</option>
              <option value="10-30 min">10-30 min</option>
              <option value="30+ min">30+ min</option>
            </select>
          </div>
        </Card>

        {/* Navigation buttons */}
        <div className="flex justify-between mt-6">
          <button
            type="button"
            onClick={() => navigate('/dashboard')}
            className="rounded-full border-2 border-gray-200 px-6 py-2.5 text-sm font-bold text-gray-700 hover:bg-gray-50 transition-colors"
          >
            Back
          </button>
          <button
            type="submit"
            disabled={saving}
            className="rounded-full bg-primary px-6 py-2.5 text-sm font-bold text-white hover:bg-primary-light disabled:opacity-50 transition-colors"
          >
            {saving ? 'Saving...' : 'Next: Build'}
          </button>
        </div>
      </form>
    </PageContainer>
  )
}
