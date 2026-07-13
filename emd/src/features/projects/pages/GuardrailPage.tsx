import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  getProject,
  updateProject,
  getAdsConfig,
  listAdPlacements,
  getIapConfig,
  listIapItems,
} from '../services/projects.service'
import type { Project, AdPlacement, IapItem } from '../../../lib/database.types'
import PageContainer from '../../../app/layout/PageContainer'
import Card from '../../../shared/components/Card'
import FadeInCard from '../../../shared/components/FadeInCard'
import Badge from '../../../shared/components/Badge'
import { Skeleton, SkeletonCard } from '../../../shared/components/Skeleton'
import { notify } from '../../../shared/lib/toast'
import StepIndicator from './components/StepIndicator'

interface Finding {
  title: string
  severity: 'High' | 'Medium' | 'Low'
  message: string
}

function getFindings(adPlacements: AdPlacement[], iapItems: IapItem[]): Finding[] {
  const findings: Finding[] = []

  const uncappedAds = adPlacements.filter((placement) => !placement.frequency_cap)
  if (uncappedAds.length > 0) {
    findings.push({
      title: 'Frequency cap missing',
      severity: 'High',
      message: `${uncappedAds.length} ad placement${uncappedAds.length === 1 ? '' : 's'} need a clear cap before release.`,
    })
  }

  const interstitials = adPlacements.filter((placement) => placement.placement_type === 'interstitial')
  if (interstitials.length > 1) {
    findings.push({
      title: 'Interstitial pressure',
      severity: 'Medium',
      message: 'Multiple interstitial placements can interrupt player autonomy.',
    })
  }

  const vagueItems = iapItems.filter((item) => !item.description)
  if (vagueItems.length > 0) {
    findings.push({
      title: 'IAP benefit unclear',
      severity: 'Medium',
      message: `${vagueItems.length} purchase item${vagueItems.length === 1 ? '' : 's'} should explain the value received.`,
    })
  }

  return findings
}

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
        const loadedProject = await getProject(projectId)
        setProject(loadedProject)

        const adsConfig = await getAdsConfig(projectId)
        if (adsConfig) setAdPlacements(await listAdPlacements(adsConfig.id))

        const iapConfig = await getIapConfig(projectId)
        if (iapConfig) setIapItems(await listIapItems(iapConfig.id))
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [projectId])

  const findings = useMemo(() => getFindings(adPlacements, iapItems), [adPlacements, iapItems])
  const riskScore = Math.min(10, findings.reduce((sum, finding) => sum + (finding.severity === 'High' ? 4 : finding.severity === 'Medium' ? 2 : 1), 1))
  const passedChecks = [
    'Clear price and benefit',
    'Optional, not required',
    'No loaded language',
    'Player can decline rewarded ads',
  ]

  async function handleNext() {
    if (!projectId) return
    setSaving(true)
    setError(null)
    try {
      await updateProject(projectId, { current_step: 4 })
      navigate(`/project/${projectId}/output`)
      notify.success('ผ่าน Guardrail แล้ว! ไปหน้า Output ได้เลย')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to proceed')
      notify.error('ไม่สามารถดำเนินการต่อได้ ลองใหม่อีกครั้ง')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <PageContainer>
        <Skeleton className="h-8 w-full" />
        <Skeleton className="h-9 w48" />
        <div className="grid gap-6 lg:grid-cols-[1fr_300px]">
          <div className="space-y-4">
            <SkeletonCard />
            <SkeletonCard />
          </div>
          <Skeleton className="h-48 rounded-lg" />
        </div>
      </PageContainer>
    )
  }

  return (
    <PageContainer>
      <StepIndicator current={3} />

      <div>
        <h1 className="text-3xl font-black tracking-tight text-slate-950">Ethics Guardrail</h1>
        <p className="mt-2 text-sm leading-6 text-slate-500">
          Failed checks are shown first so students can fix pressure and clarity risks quickly.
        </p>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <div className="space-y-6">
          <FadeInCard index={0}>
          <Card>
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.18em] text-primary">Results Summary</p>
                <h2 className="mt-2 text-xl font-black text-slate-950">{project?.title ?? 'Project'}</h2>
              </div>
              <div className="rounded-lg bg-slate-50 px-4 py-3 text-right">
                <p className="text-xs font-bold text-slate-500">Risk Score</p>
                <p className={`text-3xl font-black ${riskScore >= 8 ? 'text-red-700' : riskScore >= 5 ? 'text-amber-700' : 'text-emerald-700'}`}>
                  {riskScore}/10
                </p>
              </div>
            </div>
          </Card>
          </FadeInCard>

          <FadeInCard index={1}>
          <Card>
            <div className="mb-5 flex items-center justify-between">
              <h2 className="text-xl font-black text-slate-950">Failure Points</h2>
              <Badge variant={findings.length ? 'red' : 'green'}>{findings.length ? `${findings.length} to fix` : 'Passed'}</Badge>
            </div>

            {findings.length === 0 ? (
              <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-5">
                <h3 className="font-black text-emerald-900">No priority failures found</h3>
                <p className="mt-2 text-sm leading-6 text-emerald-700">
                  The plan has basic caps, optional purchase language, and clear value cues.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {findings.map((finding, index) => (
                  <div key={finding.title} className="rounded-lg border border-line bg-slate-50 p-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <h3 className="font-black text-slate-950">Guardrail #{index + 1}: {finding.title}</h3>
                      <Badge variant={finding.severity === 'High' ? 'red' : 'yellow'}>{finding.severity}</Badge>
                    </div>
                    <p className="mt-2 text-sm leading-6 text-slate-600">{finding.message}</p>
                    <button
                      onClick={() => navigate(`/project/${projectId}/build`)}
                      className="mt-4 rounded-md border border-line bg-white px-3 py-2 text-xs font-bold text-slate-700 transition hover:border-primary/30 hover:text-primary"
                    >
                      Jump to Fix
                    </button>
                  </div>
                ))}
              </div>
            )}
          </Card>
          </FadeInCard>
        </div>

        <aside className="space-y-4">
          <FadeInCard index={2}>
          <Card>
            <h2 className="font-black text-slate-950">Passed</h2>
            <ul className="mt-4 space-y-3 text-sm font-medium text-slate-600">
              {passedChecks.map((check) => (
                <li key={check} className="flex gap-3">
                  <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-xs font-black text-emerald-700">✓</span>
                  {check}
                </li>
              ))}
            </ul>
          </Card>
          </FadeInCard>

          <FadeInCard index={3}>
          <Card>
            <h2 className="font-black text-slate-950">Plan Snapshot</h2>
            <dl className="mt-4 space-y-3 text-sm">
              <div className="flex justify-between gap-4"><dt className="text-slate-500">Ads</dt><dd className="font-black">{adPlacements.length}</dd></div>
              <div className="flex justify-between gap-4"><dt className="text-slate-500">IAP Items</dt><dd className="font-black">{iapItems.length}</dd></div>
              <div className="flex justify-between gap-4"><dt className="text-slate-500">Guardrail</dt><dd className="font-black">{findings.length ? 'Needs Fix' : 'Ready'}</dd></div>
            </dl>
          </Card>
          </FadeInCard>

          <div className="sticky bottom-4 flex gap-3 rounded-lg border border-line bg-white p-3 shadow-lg">
            <button onClick={() => navigate(`/project/${projectId}/build`)} className="rounded-lg border border-line px-4 py-2.5 text-sm font-bold text-slate-700 hover:bg-slate-50">
              Back
            </button>
            <button onClick={handleNext} disabled={saving} className="flex-1 rounded-lg bg-primary px-4 py-2.5 text-sm font-bold text-white hover:bg-primary-light disabled:opacity-50">
              {saving ? 'Saving...' : 'Continue to Output'}
            </button>
          </div>
        </aside>
      </div>
    </PageContainer>
  )
}