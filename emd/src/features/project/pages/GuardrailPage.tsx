import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  getProject,
  updateProject,
  getAdsConfig,
  listAdPlacements,
  getIapConfig,
  listIapItems,
} from '../../projects/services/projects.service'
import type { Project, AdPlacement, IapItem } from '../../../lib/database.types'
import PageContainer from '../../../app/layout/PageContainer'
import Card from '../../../shared/components/Card'
import Badge from '../../../shared/components/Badge'
import Spinner from '../../../shared/components/Spinner'
import StepIndicator from './components/StepIndicator'

export default function GuardrailPage() {
  const { id: projectId } = useParams<{ id: string }>()
  const navigate = useNavigate()

  const [project, setProject] = useState<Project | null>(null)
  const [adPlacements, setAdPlacements] = useState<AdPlacement[]>([])
  const [iapItems, setIapItems] = useState<IapItem[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      if (!projectId) return
      try {
        const p = await getProject(projectId)
        setProject(p)

        // Load ads placements summary
        const ac = await getAdsConfig(projectId)
        if (ac) {
          const placements = await listAdPlacements(ac.id)
          setAdPlacements(placements)
        }

        // Load IAP items summary
        const ic = await getIapConfig(projectId)
        if (ic) {
          const items = await listIapItems(ic.id)
          setIapItems(items)
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [projectId])

  async function handleNext() {
    if (!projectId) return
    setSaving(true)
    setError(null)
    try {
      await updateProject(projectId, { current_step: 4 })
      navigate(`/project/${projectId}/output`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to proceed')
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
      <StepIndicator current={3} />

      {/* Page heading */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-gray-900">Ethics Guardrail</h1>
        <p className="text-sm text-gray-500 leading-6 mt-1">
          Review your monetization plan for ethical compliance
        </p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-2xl p-4 text-sm">
          {error}
        </div>
      )}

      {/* Summary of Step 1 */}
      {project && (
        <Card>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-primary mb-4">
            Game Setup
          </p>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-gray-500 block mb-1">Title</span>
              <span className="font-bold text-gray-900">{project.title}</span>
            </div>
            {project.genre && project.genre.length > 0 && (
              <div>
                <span className="text-gray-500 block mb-1">Genre</span>
                <span className="text-gray-900">{project.genre.join(', ')}</span>
              </div>
            )}
            {project.platform && project.platform.length > 0 && (
              <div>
                <span className="text-gray-500 block mb-1">Platform</span>
                <span className="text-gray-900">{project.platform.join(', ')}</span>
              </div>
            )}
            {project.target_audience && (
              <div>
                <span className="text-gray-500 block mb-1">Audience</span>
                <span className="text-gray-900">{project.target_audience}</span>
              </div>
            )}
            {project.session_length && (
              <div>
                <span className="text-gray-500 block mb-1">Session</span>
                <span className="text-gray-900">{project.session_length}</span>
              </div>
            )}
          </div>
        </Card>
      )}

      {/* Summary of Step 2 */}
      <Card>
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-primary mb-4">
          Monetization Plan
        </p>

        <div className="mb-5">
          <div className="flex items-center gap-3 mb-3">
            <p className="text-sm font-medium text-gray-700">Ad Placements</p>
            <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-bold text-primary">
              {adPlacements.length}
            </span>
          </div>
          {adPlacements.length === 0 ? (
            <p className="text-sm text-gray-400">No ad placements configured.</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {adPlacements.map((p) => (
                <div key={p.id} className="flex items-center gap-1.5 bg-background-main rounded-xl px-3 py-1.5">
                  <Badge variant="blue">{p.placement_type}</Badge>
                  {p.trigger_point && <span className="text-xs text-gray-600">{p.trigger_point}</span>}
                </div>
              ))}
            </div>
          )}
        </div>

        <div>
          <div className="flex items-center gap-3 mb-3">
            <p className="text-sm font-medium text-gray-700">IAP Items</p>
            <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-bold text-primary">
              {iapItems.length}
            </span>
          </div>
          {iapItems.length === 0 ? (
            <p className="text-sm text-gray-400">No IAP items configured.</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {iapItems.map((item) => (
                <div key={item.id} className="flex items-center gap-1.5 bg-background-main rounded-xl px-3 py-1.5">
                  <span className="text-sm font-medium text-gray-700">{item.name}</span>
                  {item.price_usd != null && (
                    <span className="text-xs text-gray-500">${item.price_usd}</span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </Card>

      {/* AI Guardrail — Coming Soon placeholder */}
      <div className="rounded-2xl border-2 border-dashed border-primary/30 bg-primary/5 p-6">
        <div className="text-center py-4">
          <div className="w-12 h-12 rounded-2xl mx-auto mb-4 flex items-center justify-center bg-primary text-white text-sm font-bold">
            AI
          </div>
          <h2 className="text-lg font-bold text-gray-900 mb-2">AI Ethics Analysis</h2>
          <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-bold text-primary">
            Coming Soon
          </span>
          <p className="text-sm text-gray-500 mt-4 max-w-sm mx-auto leading-6">
            The AI Guardrail engine will analyze your monetization plan for ethical compliance.
            This feature is pending instructor configuration of the analysis criteria.
          </p>
        </div>
      </div>

      {/* Navigation buttons */}
      <div className="flex justify-between">
        <button
          onClick={() => navigate(`/project/${projectId}/build`)}
          className="rounded-full border-2 border-gray-200 px-6 py-2.5 text-sm font-bold text-gray-700 hover:bg-gray-50 transition-colors"
        >
          Back
        </button>
        <button
          onClick={handleNext}
          disabled={saving}
          className="rounded-full bg-primary px-6 py-2.5 text-sm font-bold text-white hover:bg-primary-light disabled:opacity-50 transition-colors"
        >
          {saving ? 'Saving...' : 'Next: Output'}
        </button>
      </div>
    </PageContainer>
  )
}
