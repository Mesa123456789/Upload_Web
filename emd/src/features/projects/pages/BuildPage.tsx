import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  getProject,
  updateProject,
  getAdsConfig,
  upsertAdsConfig,
  listAdPlacements,
  createAdPlacement,
  deleteAdPlacement,
  getIapConfig,
  upsertIapConfig,
  listIapItems,
  createIapItem,
  deleteIapItem,
} from '../services/projects.service'
import type { AdPlacement, IapItem, AdsConfig, IapConfig, Project } from '../../../lib/database.types'
import PageContainer from '../../../app/layout/PageContainer'
import Card from '../../../shared/components/Card'
import Badge from '../../../shared/components/Badge'
import { Skeleton, SkeletonCard } from '../../../shared/components/Skeleton'
import { notify } from '../../../shared/lib/toast'
import StepIndicator from './components/StepIndicator'
import AiSuggestionPanel from './components/AiSuggestionPanel'
import FadeInCard from '../../../shared/components/FadeInCard'
import { useI18n } from '../../../i18n/I18nProvider'

const PLACEMENT_TYPES: Array<'rewarded' | 'interstitial' | 'banner' | 'native'> = ['rewarded', 'interstitial', 'banner', 'native']
const IAP_ITEM_TYPES: Array<'consumable' | 'non_consumable' | 'subscription'> = ['consumable', 'non_consumable', 'subscription']
const TRIGGER_POINTS = ['Entry', 'After first level', 'Outcome screen', 'Between sessions', 'Shop open', 'Currency depleted', 'Cosmetic moment']
const inputClass = 'ds-input font-medium'
const optionKey = (value: string) => value.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '')

function pressureLevel(placements: AdPlacement[]) {
  const score = placements.reduce((sum, placement) => {
    const typeScore = placement.placement_type === 'interstitial' ? 3 : placement.placement_type === 'rewarded' ? 1 : 2
    const capScore = placement.frequency_cap ? Math.max(0, 3 - placement.frequency_cap) : 2
    return sum + typeScore + capScore
  }, 0)
  if (score >= 10) return { labelKey: 'build.levels.high', color: 'text-red-700', fill: 'w-[82%]' }
  if (score >= 5) return { labelKey: 'build.levels.medium', color: 'text-amber-700', fill: 'w-[55%]' }
  return { labelKey: 'build.levels.low', color: 'text-emerald-700', fill: 'w-[25%]' }
}

function fairnessLevel(items: IapItem[]) {
  const limited = items.filter((item) => item.description?.toLowerCase().includes('limited')).length
  if (limited > 1) return { labelKey: 'build.levels.needsReview', color: 'text-amber-700', fill: 'w-[58%]' }
  if (items.length > 0) return { labelKey: 'build.levels.fair', color: 'text-emerald-700', fill: 'w-[72%]' }
  return { labelKey: 'build.levels.unset', color: 'text-slate-500', fill: 'w-[20%]' }
}

export default function BuildPage() {
  const { id: projectId } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { t, formatNumber } = useI18n()
  const optionLabel = (group: string, value: string) => t(`build.${group}.${optionKey(value)}`)

  const [project, setProject] = useState<Project | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [activePanel, setActivePanel] = useState<'overview' | 'ads' | 'iap'>('overview')
  const [mix, setMix] = useState(60)

  const [adsConfig, setAdsConfig] = useState<AdsConfig | null>(null)
  const [adNetwork, setAdNetwork] = useState('')
  const [revenueModel, setRevenueModel] = useState('')
  const [adPlacements, setAdPlacements] = useState<AdPlacement[]>([])
  const [newPlacementType, setNewPlacementType] = useState<'rewarded' | 'interstitial' | 'banner' | 'native'>('rewarded')
  const [newTriggerPoint, setNewTriggerPoint] = useState('After first level')
  const [newFrequencyCap, setNewFrequencyCap] = useState('2')
  const [addingPlacement, setAddingPlacement] = useState(false)

  const [iapConfig, setIapConfig] = useState<IapConfig | null>(null)
  const [iapStore, setIapStore] = useState<'google_play' | 'app_store' | 'both' | ''>('both')
  const [iapItems, setIapItems] = useState<IapItem[]>([])
  const [newItemName, setNewItemName] = useState('')
  const [newItemType, setNewItemType] = useState<'consumable' | 'non_consumable' | 'subscription'>('consumable')
  const [newItemPrice, setNewItemPrice] = useState('')
  const [newItemDesc, setNewItemDesc] = useState('')
  const [addingItem, setAddingItem] = useState(false)

  useEffect(() => {
    async function load() {
      if (!projectId) return
      try {
        const loadedProject = await getProject(projectId)
        setProject(loadedProject)

        const loadedAdsConfig = await getAdsConfig(projectId)
        if (loadedAdsConfig) {
          setAdsConfig(loadedAdsConfig)
          setAdNetwork(loadedAdsConfig.ad_network ?? '')
          setRevenueModel(loadedAdsConfig.revenue_model ?? '')
          setAdPlacements(await listAdPlacements(loadedAdsConfig.id))
        }

        const loadedIapConfig = await getIapConfig(projectId)
        if (loadedIapConfig) {
          setIapConfig(loadedIapConfig)
          setIapStore((loadedIapConfig.store as typeof iapStore) ?? '')
          setIapItems(await listIapItems(loadedIapConfig.id))
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : t('build.loadFailed'))
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [projectId])

  const pressure = useMemo(() => pressureLevel(adPlacements), [adPlacements])
  const fairness = useMemo(() => fairnessLevel(iapItems), [iapItems])

  async function handleAddPlacement() {
    if (!projectId) return
    setAddingPlacement(true)
    setError(null)
    try {
      let configId = adsConfig?.id
      if (!configId) {
        const config = await upsertAdsConfig({
          project_id: projectId,
          ad_network: adNetwork || null,
          revenue_model: revenueModel || null,
        })
        setAdsConfig(config)
        configId = config.id
      }

      const placement = await createAdPlacement({
        ads_config_id: configId,
        placement_type: newPlacementType,
        trigger_point: newTriggerPoint || null,
        frequency_cap: newFrequencyCap ? parseInt(newFrequencyCap) : null,
      })
      setAdPlacements((prev) => [...prev, placement])
      notify.success(t('build.placementAdded'))
    } catch (err) {
      setError(err instanceof Error ? err.message : t('build.addPlacementFailed'))
      notify.error(t('build.addPlacementError'))
    } finally {
      setAddingPlacement(false)
    }
  }

  async function handleRemovePlacement(placementId: string) {
    try {
      await deleteAdPlacement(placementId)
      setAdPlacements((prev) => prev.filter((placement) => placement.id !== placementId))
    } catch (err) {
      setError(err instanceof Error ? err.message : t('build.removePlacementFailed'))
    }
  }

  async function handleAddIapItem() {
    if (!projectId || !newItemName.trim()) return
    setAddingItem(true)
    setError(null)
    try {
      let configId = iapConfig?.id
      if (!configId) {
        const config = await upsertIapConfig({
          project_id: projectId,
          store: iapStore || null,
          currency: 'USD',
        })
        setIapConfig(config)
        configId = config.id
      }

      const item = await createIapItem({
        iap_config_id: configId,
        name: newItemName.trim(),
        item_type: newItemType,
        price_usd: newItemPrice ? parseFloat(newItemPrice) : null,
        description: newItemDesc || null,
      })
      setIapItems((prev) => [...prev, item])
      setNewItemName('')
      setNewItemPrice('')
      setNewItemDesc('')
      notify.success(t('build.itemAdded'))
    } catch (err) {
      setError(err instanceof Error ? err.message : t('build.addItemFailed'))
      notify.error(t('build.addItemError'))
    } finally {
      setAddingItem(false)
    }
  }

  async function handleRemoveIapItem(itemId: string) {
    try {
      await deleteIapItem(itemId)
      setIapItems((prev) => prev.filter((item) => item.id !== itemId))
    } catch (err) {
      setError(err instanceof Error ? err.message : t('build.removeItemFailed'))
    }
  }

  async function handleNext() {
    if (!projectId) return
    setSaving(true)
    setError(null)
    try {
      await upsertAdsConfig({
        project_id: projectId,
        ad_network: adNetwork || null,
        revenue_model: revenueModel || null,
        notes: `Revenue mix target: Ads ${mix}% / IAP ${100 - mix}%`,
      })

      await upsertIapConfig({
        project_id: projectId,
        store: iapStore || null,
        currency: 'USD',
      })

      await updateProject(projectId, { current_step: 3 })
      notify.success(t('build.savedNext'))
      navigate(`/project/${projectId}/guardrail`)
    } catch (err) {
      const msg = err instanceof Error ? err.message : t('build.saveFailed')
      setError(msg)
      notify.error(t('build.saveError'))
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <PageContainer>
        <Skeleton className="h-8 w-full" />
        <div className="flex items-end justify-between">
          <div className="space-y-2">
            <Skeleton className="h-9 w-64" />
            <Skeleton className="h-4 w-80" />
          </div>
          <Skeleton className="h-10 w-52 rounded-lg" />
        </div>
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
      <StepIndicator current={2} />

      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-slate-950">{t('build.title')}</h1>
          <p className="mt-2 text-sm leading-6 text-slate-500">
            {t('build.subtitle', { title: project?.title ? `${project.title}: ` : '' })}
          </p>
        </div>
        <div className="flex rounded-lg border border-line bg-white p-1 shadow-sm">
          {(['overview', 'ads', 'iap'] as const).map((panel) => (
            <button
              key={panel}
              onClick={() => setActivePanel(panel)}
              className={`rounded-md px-4 py-2 text-sm font-bold capitalize transition ${
                activePanel === panel ? 'bg-primary text-white' : 'text-slate-500 hover:bg-slate-50'
              }`}
            >
              {panel === 'iap' ? t('build.iap') : t(`build.${panel}`)}
            </button>
          ))}
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
        <div className="space-y-6">
          {activePanel === 'overview' && (
            <>
              <FadeInCard index={0}>
              <Card>
                <p className="mb-5 text-xs font-black uppercase tracking-[0.18em] text-primary">{t('build.revenueMixTarget')}</p>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={mix}
                  onChange={(event) => setMix(Number(event.target.value))}
                  className="w-full accent-primary"
                />
                <div className="mt-3 flex justify-between text-sm font-black text-slate-900">
                  <span>{t('build.adsPercent', { value: formatNumber(mix) })}</span>
                  <span>{t('build.iapPercent', { value: formatNumber(100 - mix) })}</span>
                </div>
              </Card>
              </FadeInCard>

              <FadeInCard index={1}>
              <Card className="overflow-hidden p-0">
                <div className="border-b border-line px-5 py-4">
                  <p className="text-xs font-black uppercase tracking-[0.18em] text-primary">{t('build.monetizationMap')}</p>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[680px] text-sm">
                    <thead>
                      <tr className="border-b border-line bg-slate-50 text-left text-xs font-black uppercase tracking-[0.12em] text-slate-400">
                        <th className="px-5 py-3">{t('build.sessionStage')}</th>
                        <th className="px-5 py-3">{t('build.configuredPoints')}</th>
                        <th className="px-5 py-3 text-right">{t('common.action')}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-line">
                      {['Entry', 'Gameplay', 'Outcome', 'Meta / Shop'].map((stage) => (
                        <tr key={stage}>
                          <td className="px-5 py-4 font-bold text-slate-900">{stage}</td>
                          <td className="px-5 py-4 text-slate-600">
                            {[...adPlacements.map((p) => p.trigger_point), ...iapItems.map((i) => i.name)]
                              .filter((value): value is string => Boolean(value))
                              .filter((value) => value.toLowerCase().includes(stage.split(' ')[0].toLowerCase()))
                              .join(', ') || t('build.noneYet')}
                          </td>
                          <td className="px-5 py-4 text-right">
                            <button
                              onClick={() => setActivePanel(stage === 'Meta / Shop' ? 'iap' : 'ads')}
                              className="rounded-md border border-line px-3 py-1.5 text-xs font-bold text-slate-700 hover:border-primary/30 hover:text-primary"
                            >
                              {t('build.addPlacement')}
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>
              </FadeInCard>
            </>
          )}

          {activePanel === 'ads' && (
            <FadeInCard index={0}>
            <Card>
              <p className="mb-5 text-xs font-black uppercase tracking-[0.18em] text-primary">{t('build.adsConfig')}</p>
              <div className="mb-5 grid gap-3 md:grid-cols-2">
                <input
                  type="text"
                  value={adNetwork}
                  onChange={(event) => setAdNetwork(event.target.value)}
                  placeholder={t('build.adNetworkPlaceholder')}
                  className={inputClass}
                />
                <select
                  value={revenueModel}
                  onChange={(event) => setRevenueModel(event.target.value)}
                  className={inputClass}
                >
                  <option value="">{t('build.revenueModel')}</option>
                  <option value="rewarded">{t('build.rewardedFirst')}</option>
                  <option value="cpm">{t('build.revenueModels.cpm')}</option>
                  <option value="hybrid">{t('build.revenueModels.hybrid')}</option>
                </select>
              </div>

              <div className="mb-5 grid gap-3 md:grid-cols-[1fr_1fr_120px_auto]">
                <select value={newPlacementType} onChange={(event) => setNewPlacementType(event.target.value as typeof newPlacementType)} className={inputClass}>
                  {PLACEMENT_TYPES.map((type) => <option key={type} value={type}>{optionLabel('placementTypes', type)}</option>)}
                </select>
                <select value={newTriggerPoint} onChange={(event) => setNewTriggerPoint(event.target.value)} className={inputClass}>
                  {TRIGGER_POINTS.map((point) => <option key={point} value={point}>{optionLabel('triggerPoints', point)}</option>)}
                </select>
                <input type="number" min="1" value={newFrequencyCap} onChange={(event) => setNewFrequencyCap(event.target.value)} placeholder={t('build.cap')} className={inputClass} />
                <button onClick={handleAddPlacement} disabled={addingPlacement} className="rounded-lg bg-primary px-4 py-2 text-sm font-bold text-white hover:bg-primary-light disabled:opacity-50">
                  {addingPlacement ? t('build.adding') : t('build.add')}
                </button>
              </div>

              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {adPlacements.map((placement, index) => (
                  <div key={placement.id} className="rounded-lg border border-line bg-slate-50 p-4">
                    <div className="mb-4 flex items-start justify-between gap-3">
                      <div>
                        <span className="mb-3 flex h-8 w-8 items-center justify-center rounded-md bg-white text-sm font-black text-slate-700 ring-1 ring-line">{index + 1}</span>
                        <h3 className="font-black capitalize text-slate-950">{t('build.adTitle', { type: optionLabel('placementTypes', placement.placement_type) })}</h3>
                      </div>
                      <Badge variant={placement.placement_type === 'interstitial' ? 'yellow' : 'green'}>
                        {placement.frequency_cap ? t('build.capValue', { value: formatNumber(placement.frequency_cap) }) : t('build.noCap')}
                      </Badge>
                    </div>
                    <p className="rounded-md bg-white p-3 text-sm font-semibold text-slate-600 ring-1 ring-line">
                      {placement.trigger_point ? optionLabel('triggerPoints', placement.trigger_point) : t('build.noTrigger')}
                    </p>
                    <button onClick={() => handleRemovePlacement(placement.id)} className="mt-4 rounded-md border border-line bg-white px-3 py-2 text-xs font-bold text-red-600 hover:bg-red-50">
                      {t('build.disable')}
                    </button>
                  </div>
                ))}
              </div>
            </Card>
            </FadeInCard>
          )}

          {activePanel === 'iap' && (
            <FadeInCard index={0}>
            <Card>
              <p className="mb-5 text-xs font-black uppercase tracking-[0.18em] text-primary">{t('build.iapConfig')}</p>
              <div className="mb-5">
                <select value={iapStore} onChange={(event) => setIapStore(event.target.value as typeof iapStore)} className={inputClass}>
                  <option value="">{t('build.selectStore')}</option>
                  <option value="google_play">{t('build.googlePlay')}</option>
                  <option value="app_store">{t('build.appStore')}</option>
                  <option value="both">{t('build.bothStores')}</option>
                </select>
              </div>

              <div className="mb-5 grid gap-3 md:grid-cols-[1fr_180px_120px]">
                <input value={newItemName} onChange={(event) => setNewItemName(event.target.value)} placeholder={t('build.itemNamePlaceholder')} className={inputClass} />
                <select value={newItemType} onChange={(event) => setNewItemType(event.target.value as typeof newItemType)} className={inputClass}>
                  {IAP_ITEM_TYPES.map((type) => <option key={type} value={type}>{optionLabel('iapItemTypes', type)}</option>)}
                </select>
                <input type="number" min="0" step="0.01" value={newItemPrice} onChange={(event) => setNewItemPrice(event.target.value)} placeholder={t('build.price')} className={inputClass} />
              </div>
              <div className="mb-5 grid gap-3 md:grid-cols-[1fr_auto]">
                <input value={newItemDesc} onChange={(event) => setNewItemDesc(event.target.value)} placeholder={t('build.benefitPlaceholder')} className={inputClass} />
                <button onClick={handleAddIapItem} disabled={addingItem || !newItemName.trim()} className="rounded-lg bg-primary px-4 py-2 text-sm font-bold text-white hover:bg-primary-light disabled:opacity-50">
                  {addingItem ? t('build.adding') : t('build.addItem')}
                </button>
              </div>

              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {iapItems.map((item, index) => (
                  <div key={item.id} className="rounded-lg border border-line bg-slate-50 p-4">
                    <div className="mb-4 flex items-start justify-between gap-3">
                      <div>
                        <span className="mb-3 flex h-8 w-8 items-center justify-center rounded-md bg-white text-sm font-black text-slate-700 ring-1 ring-line">{index + 1}</span>
                        <h3 className="font-black text-slate-950">{item.name}</h3>
                      </div>
                      <Badge variant="purple">{item.item_type}</Badge>
                    </div>
                    <p className="text-2xl font-black text-slate-950">{item.price_usd != null ? `$${item.price_usd}` : t('build.free')}</p>
                    <p className="mt-2 min-h-12 text-sm leading-6 text-slate-500">{item.description || t('build.noBenefit')}</p>
                    <button onClick={() => handleRemoveIapItem(item.id)} className="mt-4 rounded-md border border-line bg-white px-3 py-2 text-xs font-bold text-red-600 hover:bg-red-50">
                      {t('build.disable')}
                    </button>
                  </div>
                ))}
              </div>
            </Card>
            </FadeInCard>
          )}
        </div>

        <aside className="space-y-4">
          <FadeInCard index={0}>
          <Card>
            <h2 className="font-black text-slate-950">{t('build.sessionFlowPreview')}</h2>
            <div className="mt-4 rounded-lg bg-slate-50 p-4 text-sm font-semibold leading-7 text-slate-600">
              {t('build.sessionFlow')}
            </div>
          </Card>
          </FadeInCard>

          <FadeInCard index={1}>
          <Card>
            <h2 className="font-black text-slate-950">{t('build.quickSummary')}</h2>
            <dl className="mt-4 space-y-3 text-sm">
              <div className="flex justify-between gap-4"><dt className="text-slate-500">{t('build.rewardedAds')}</dt><dd className="font-black">{formatNumber(adPlacements.filter((p) => p.placement_type === 'rewarded').length)}</dd></div>
              <div className="flex justify-between gap-4"><dt className="text-slate-500">{t('build.interstitials')}</dt><dd className="font-black">{formatNumber(adPlacements.filter((p) => p.placement_type === 'interstitial').length)}</dd></div>
              <div className="flex justify-between gap-4"><dt className="text-slate-500">{t('build.iapItems')}</dt><dd className="font-black">{formatNumber(iapItems.length)}</dd></div>
            </dl>
          </Card>
          </FadeInCard>

          <FadeInCard index={2}>
          <Card>
            <h2 className="font-black text-slate-950">{t('build.pressureMeter')}</h2>
            <div className="mt-4 h-3 overflow-hidden rounded-full bg-slate-100">
              <div className={`h-full rounded-full bg-accent ${pressure.fill}`} />
            </div>
            <p className={`mt-3 text-sm font-black ${pressure.color}`}>{t('build.estimatedPressure', { level: t(pressure.labelKey) })}</p>
          </Card>
          </FadeInCard>

          <FadeInCard index={3}>
          <Card>
            <h2 className="font-black text-slate-950">{t('build.fairnessMeter')}</h2>
            <div className="mt-4 h-3 overflow-hidden rounded-full bg-slate-100">
              <div className={`h-full rounded-full bg-primary ${fairness.fill}`} />
            </div>
            <p className={`mt-3 text-sm font-black ${fairness.color}`}>{t('build.fairnessLevel', { level: t(fairness.labelKey) })}</p>
          </Card>
          </FadeInCard>

          <FadeInCard index={4}>
          <AiSuggestionPanel stage="build" projectId={projectId ?? ''} />
          </FadeInCard>

          <div className="sticky bottom-4 flex gap-3 rounded-lg border border-line bg-white p-3 shadow-lg">
            <button onClick={() => navigate(`/project/${projectId}/setup`)} className="rounded-lg border border-line px-4 py-2.5 text-sm font-bold text-slate-700 hover:bg-slate-50">
              {t('build.back')}
            </button>
            <button onClick={handleNext} disabled={saving} className="flex-1 rounded-lg bg-primary px-4 py-2.5 text-sm font-bold text-white hover:bg-primary-light disabled:opacity-50">
              {saving ? t('common.saving') : t('build.continueGuardrail')}
            </button>
          </div>
        </aside>
      </div>
    </PageContainer>
  )
}
