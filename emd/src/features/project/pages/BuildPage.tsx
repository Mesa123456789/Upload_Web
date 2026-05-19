import { useEffect, useState } from 'react'
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
} from '../../projects/services/projects.service'
import type { AdPlacement, IapItem, AdsConfig, IapConfig } from '../../../lib/database.types'
import PageContainer from '../../../app/layout/PageContainer'
import Card from '../../../shared/components/Card'
import Badge from '../../../shared/components/Badge'
import Spinner from '../../../shared/components/Spinner'
import StepIndicator from './components/StepIndicator'

const PLACEMENT_TYPES: Array<'rewarded' | 'interstitial' | 'banner' | 'native'> = [
  'rewarded', 'interstitial', 'banner', 'native',
]

const IAP_ITEM_TYPES: Array<'consumable' | 'non_consumable' | 'subscription'> = [
  'consumable', 'non_consumable', 'subscription',
]

const TRIGGER_POINTS = [
  'Level Complete', 'Game Over', 'Menu Open', 'After 3 Levels',
  'Idle Moment', 'Shop Open', 'Before Boss', 'Currency Depleted',
]

// Shared input style — consistent across all form fields in wizard
const inputCls = 'border border-black/10 rounded-xl px-4 py-2.5 text-sm bg-background-main focus:outline-none focus:ring-2 focus:ring-primary/30 placeholder:text-gray-400'

export default function BuildPage() {
  const { id: projectId } = useParams<{ id: string }>()
  const navigate = useNavigate()

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Ads state
  const [adsConfig, setAdsConfig] = useState<AdsConfig | null>(null)
  const [adNetwork, setAdNetwork] = useState('')
  const [revenueModel, setRevenueModel] = useState('')
  const [adPlacements, setAdPlacements] = useState<AdPlacement[]>([])

  // New placement form
  const [newPlacementType, setNewPlacementType] = useState<'rewarded' | 'interstitial' | 'banner' | 'native'>('rewarded')
  const [newTriggerPoint, setNewTriggerPoint] = useState('')
  const [newFrequencyCap, setNewFrequencyCap] = useState('')
  const [addingPlacement, setAddingPlacement] = useState(false)

  // IAP state
  const [iapConfig, setIapConfig] = useState<IapConfig | null>(null)
  const [iapStore, setIapStore] = useState<'google_play' | 'app_store' | 'both' | ''>('')
  const [iapItems, setIapItems] = useState<IapItem[]>([])

  // New IAP item form
  const [newItemName, setNewItemName] = useState('')
  const [newItemType, setNewItemType] = useState<'consumable' | 'non_consumable' | 'subscription'>('consumable')
  const [newItemPrice, setNewItemPrice] = useState('')
  const [newItemDesc, setNewItemDesc] = useState('')
  const [addingItem, setAddingItem] = useState(false)

  useEffect(() => {
    async function load() {
      if (!projectId) return
      try {
        await getProject(projectId) // Verify access

        // Load ads
        const ac = await getAdsConfig(projectId)
        if (ac) {
          setAdsConfig(ac)
          setAdNetwork(ac.ad_network ?? '')
          setRevenueModel(ac.revenue_model ?? '')
          const placements = await listAdPlacements(ac.id)
          setAdPlacements(placements)
        }

        // Load IAP
        const ic = await getIapConfig(projectId)
        if (ic) {
          setIapConfig(ic)
          setIapStore((ic.store as 'google_play' | 'app_store' | 'both') ?? '')
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

  async function handleAddPlacement() {
    if (!projectId) return
    setAddingPlacement(true)
    setError(null)
    try {
      // Ensure ads_config exists first
      let configId = adsConfig?.id
      if (!configId) {
        const ac = await upsertAdsConfig({
          project_id: projectId,
          ad_network: adNetwork || null,
          revenue_model: revenueModel || null,
        })
        setAdsConfig(ac)
        configId = ac.id
      }

      const placement = await createAdPlacement({
        ads_config_id: configId,
        placement_type: newPlacementType,
        trigger_point: newTriggerPoint || null,
        frequency_cap: newFrequencyCap ? parseInt(newFrequencyCap) : null,
      })
      setAdPlacements((prev) => [...prev, placement])
      setNewTriggerPoint('')
      setNewFrequencyCap('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add placement')
    } finally {
      setAddingPlacement(false)
    }
  }

  async function handleRemovePlacement(placementId: string) {
    try {
      await deleteAdPlacement(placementId)
      setAdPlacements((prev) => prev.filter((p) => p.id !== placementId))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to remove')
    }
  }

  async function handleAddIapItem() {
    if (!projectId || !newItemName.trim()) return
    setAddingItem(true)
    setError(null)
    try {
      let configId = iapConfig?.id
      if (!configId) {
        const ic = await upsertIapConfig({
          project_id: projectId,
          store: iapStore || null,
          currency: 'USD',
        })
        setIapConfig(ic)
        configId = ic.id
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
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add item')
    } finally {
      setAddingItem(false)
    }
  }

  async function handleRemoveIapItem(itemId: string) {
    try {
      await deleteIapItem(itemId)
      setIapItems((prev) => prev.filter((i) => i.id !== itemId))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to remove')
    }
  }

  async function handleNext() {
    if (!projectId) return
    setSaving(true)
    setError(null)
    try {
      // Save ads config fields
      if (adNetwork || revenueModel) {
        await upsertAdsConfig({
          project_id: projectId,
          ad_network: adNetwork || null,
          revenue_model: revenueModel || null,
        })
      }

      // Save IAP config
      if (iapStore) {
        await upsertIapConfig({
          project_id: projectId,
          store: iapStore,
          currency: 'USD',
        })
      }

      // Advance to step 3
      await updateProject(projectId, { current_step: 3 })
      navigate(`/project/${projectId}/guardrail`)
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
      <StepIndicator current={2} />

      {/* Page heading */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-gray-900">Monetization Builder</h1>
        <p className="text-sm text-gray-500 leading-6 mt-1">
          Design your Ads and In-App Purchase strategy
        </p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-2xl p-4 text-sm">
          {error}
        </div>
      )}

      {/* ── Ads Configuration ── */}
      <Card>
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-primary mb-5">
          Ads Configuration
        </p>

        <div className="grid grid-cols-2 gap-4 mb-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Ad Network</label>
            <input
              type="text"
              value={adNetwork}
              onChange={(e) => setAdNetwork(e.target.value)}
              placeholder="e.g. AdMob, Unity Ads"
              className={`w-full ${inputCls}`}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Revenue Model</label>
            <select
              value={revenueModel}
              onChange={(e) => setRevenueModel(e.target.value)}
              className={`w-full ${inputCls}`}
            >
              <option value="">Select model</option>
              <option value="cpm">CPM (Cost per Mille)</option>
              <option value="cpc">CPC (Cost per Click)</option>
              <option value="rewarded">Rewarded</option>
              <option value="hybrid">Hybrid</option>
            </select>
          </div>
        </div>

        {/* Ad Placements list */}
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-primary mb-3">
          Ad Placements
        </p>

        {adPlacements.length > 0 && (
          <div className="space-y-2 mb-4">
            {adPlacements.map((p) => (
              <div key={p.id} className="flex items-center justify-between bg-background-main rounded-xl px-4 py-2.5">
                <div className="flex items-center gap-3">
                  <Badge variant={p.placement_type === 'rewarded' ? 'green' : p.placement_type === 'interstitial' ? 'yellow' : 'blue'}>
                    {p.placement_type}
                  </Badge>
                  <span className="text-sm text-gray-700">{p.trigger_point ?? '—'}</span>
                  {p.frequency_cap && (
                    <span className="text-xs text-gray-400">Cap: {p.frequency_cap}x</span>
                  )}
                </div>
                <button
                  onClick={() => handleRemovePlacement(p.id)}
                  className="text-red-400 hover:text-red-600 text-xs font-bold transition-colors"
                >
                  Remove
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Add placement form */}
        <div className="border-2 border-dashed border-black/10 rounded-2xl p-4">
          <p className="text-xs font-bold text-gray-500 mb-3">Add Placement</p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <select
              value={newPlacementType}
              onChange={(e) => setNewPlacementType(e.target.value as typeof newPlacementType)}
              className={inputCls}
            >
              {PLACEMENT_TYPES.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
            <select
              value={newTriggerPoint}
              onChange={(e) => setNewTriggerPoint(e.target.value)}
              className={inputCls}
            >
              <option value="">Trigger point</option>
              {TRIGGER_POINTS.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
            <input
              type="number"
              value={newFrequencyCap}
              onChange={(e) => setNewFrequencyCap(e.target.value)}
              placeholder="Freq cap"
              min="1"
              className={inputCls}
            />
            <button
              onClick={handleAddPlacement}
              disabled={addingPlacement}
              className="rounded-xl bg-primary px-4 py-2 text-sm font-bold text-white hover:bg-primary-light disabled:opacity-50 transition-colors"
            >
              {addingPlacement ? '...' : '+ Add'}
            </button>
          </div>
        </div>
      </Card>

      {/* ── IAP Configuration ── */}
      <Card>
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-primary mb-5">
          In-App Purchases (IAP)
        </p>

        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Store</label>
          <select
            value={iapStore}
            onChange={(e) => setIapStore(e.target.value as typeof iapStore)}
            className={`w-48 ${inputCls}`}
          >
            <option value="">Select store</option>
            <option value="google_play">Google Play</option>
            <option value="app_store">App Store</option>
            <option value="both">Both</option>
          </select>
        </div>

        {/* IAP Items list */}
        {iapItems.length > 0 && (
          <div className="space-y-2 mb-4">
            {iapItems.map((item) => (
              <div key={item.id} className="flex items-center justify-between bg-background-main rounded-xl px-4 py-2.5">
                <div className="flex items-center gap-3">
                  <Badge variant="purple">{item.item_type}</Badge>
                  <span className="text-sm text-gray-700 font-medium">{item.name}</span>
                  {item.price_usd != null && (
                    <span className="text-xs text-gray-500">${item.price_usd}</span>
                  )}
                  {item.description && (
                    <span className="text-xs text-gray-400">{item.description}</span>
                  )}
                </div>
                <button
                  onClick={() => handleRemoveIapItem(item.id)}
                  className="text-red-400 hover:text-red-600 text-xs font-bold transition-colors"
                >
                  Remove
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Add IAP item form */}
        <div className="border-2 border-dashed border-black/10 rounded-2xl p-4">
          <p className="text-xs font-bold text-gray-500 mb-3">Add IAP Item</p>
          <div className="grid grid-cols-2 gap-3 mb-3">
            <input
              type="text"
              value={newItemName}
              onChange={(e) => setNewItemName(e.target.value)}
              placeholder="Item name (e.g. Energy Pack)"
              className={inputCls}
            />
            <select
              value={newItemType}
              onChange={(e) => setNewItemType(e.target.value as typeof newItemType)}
              className={inputCls}
            >
              {IAP_ITEM_TYPES.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <input
              type="number"
              value={newItemPrice}
              onChange={(e) => setNewItemPrice(e.target.value)}
              placeholder="Price USD"
              min="0"
              step="0.01"
              className={inputCls}
            />
            <input
              type="text"
              value={newItemDesc}
              onChange={(e) => setNewItemDesc(e.target.value)}
              placeholder="Description"
              className={inputCls}
            />
            <button
              onClick={handleAddIapItem}
              disabled={addingItem || !newItemName.trim()}
              className="rounded-xl bg-primary px-4 py-2 text-sm font-bold text-white hover:bg-primary-light disabled:opacity-50 transition-colors"
            >
              {addingItem ? '...' : '+ Add Item'}
            </button>
          </div>
        </div>
      </Card>

      {/* Navigation buttons */}
      <div className="flex justify-between">
        <button
          onClick={() => navigate(`/project/${projectId}/setup`)}
          className="rounded-full border-2 border-gray-200 px-6 py-2.5 text-sm font-bold text-gray-700 hover:bg-gray-50 transition-colors"
        >
          Back
        </button>
        <button
          onClick={handleNext}
          disabled={saving}
          className="rounded-full bg-primary px-6 py-2.5 text-sm font-bold text-white hover:bg-primary-light disabled:opacity-50 transition-colors"
        >
          {saving ? 'Saving...' : 'Next: Guardrail'}
        </button>
      </div>
    </PageContainer>
  )
}
