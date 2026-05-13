// ---------------------------------------------------------------------------
// BuildPage.tsx — Student Step 2: Ads + IAP Configuration
//
// Route: /project/:projectId/build
//
// On mount: fetch existing ads_config and iap_config for this project
//           (pre-fill form if they already exist — supports editing)
//
// On save:
//   - Upsert ads_config + all ad placements
//   - Upsert iap_config + all IAP items
//   - Advance project current_step to 3
//   - Navigate to /project/:projectId/guardrail
// ---------------------------------------------------------------------------

import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

import PageContainer from "../../../app/layout/PageContainer";
import Card from "../../../shared/components/Card";
import {
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
  updateProject,
} from "../../projects/services/projects.service";
import type {
  AdPlacement,
  IapConfig,
  IapItem,
} from "../../../lib/database.types";

// ---------------------------------------------------------------------------
// Step indicator (same across all step pages)
// ---------------------------------------------------------------------------
function StepIndicator({ current }: { current: number }) {
  const steps = ["Setup", "Build", "Guardrail", "Output"];
  return (
    <div className="flex items-center gap-2 mb-6 flex-wrap">
      {steps.map((label, i) => {
        const step = i + 1;
        const isActive = step === current;
        const isDone = step < current;
        return (
          <div key={label} className="flex items-center gap-2">
            <div
              className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${
                isActive
                  ? "bg-[#9E76B4] text-white"
                  : isDone
                  ? "bg-green-500 text-white"
                  : "bg-gray-100 text-gray-400"
              }`}
            >
              {isDone ? "✓" : step}
            </div>
            <span
              className={`text-sm font-medium ${
                isActive ? "text-gray-800" : "text-gray-400"
              }`}
            >
              {label}
            </span>
            {i < steps.length - 1 && (
              <div className="w-8 h-px bg-gray-200 mx-1" />
            )}
          </div>
        );
      })}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Types for local form state
// ---------------------------------------------------------------------------
interface AdsFormState {
  ad_network: string;
  revenue_model: string;
  notes: string;
}

interface PlacementDraft {
  id: string | null;       // null = not saved yet (new row)
  placement_type: AdPlacement["placement_type"];
  trigger_point: string;
  frequency_cap: string;   // string in form, parsed to number on save
  notes: string;
}

interface IapFormState {
  store: IapConfig["store"];
  currency: string;
  notes: string;
}

interface ItemDraft {
  id: string | null;       // null = not saved yet
  name: string;
  item_type: IapItem["item_type"];
  price_usd: string;       // string in form, parsed to number on save
  description: string;
}

const PLACEMENT_TYPES: AdPlacement["placement_type"][] = [
  "rewarded", "interstitial", "banner", "native",
];

const ITEM_TYPES: IapItem["item_type"][] = [
  "consumable", "non_consumable", "subscription",
];

const AD_NETWORKS = ["AdMob", "Unity Ads", "IronSource", "AppLovin", "Other"];
const REVENUE_MODELS = ["CPM", "CPC", "CPA", "Rewarded CPM", "Hybrid"];
const STORE_OPTIONS: IapConfig["store"][] = ["google_play", "app_store", "both"];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function newPlacementDraft(): PlacementDraft {
  return {
    id: null,
    placement_type: "rewarded",
    trigger_point: "",
    frequency_cap: "",
    notes: "",
  };
}

function newItemDraft(): ItemDraft {
  return {
    id: null,
    name: "",
    item_type: "consumable",
    price_usd: "",
    description: "",
  };
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------
export default function BuildPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();

  // Ads config state
  const [adsConfigId, setAdsConfigId] = useState<string | null>(null);
  const [adsForm, setAdsForm] = useState<AdsFormState>({
    ad_network: "",
    revenue_model: "",
    notes: "",
  });
  const [placements, setPlacements] = useState<PlacementDraft[]>([newPlacementDraft()]);

  // IAP config state
  const [iapConfigId, setIapConfigId] = useState<string | null>(null);
  const [iapForm, setIapForm] = useState<IapFormState>({
    store: null,
    currency: "USD",
    notes: "",
  });
  const [items, setItems] = useState<ItemDraft[]>([newItemDraft()]);

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  // -------------------------------------------------------------------------
  // Load existing ads + IAP data on mount
  // -------------------------------------------------------------------------
  useEffect(() => {
    if (!projectId) return;

    async function load() {
      setIsLoading(true);
      setLoadError(null);

      // Fetch ads config
      const { data: adsData, error: adsErr } = await getAdsConfig(projectId!);
      if (adsErr) { setLoadError(adsErr); setIsLoading(false); return; }

      if (adsData) {
        setAdsConfigId(adsData.id);
        setAdsForm({
          ad_network: adsData.ad_network ?? "",
          revenue_model: adsData.revenue_model ?? "",
          notes: adsData.notes ?? "",
        });

        // Fetch placements for this ads config
        const { data: placementsData } = await listAdPlacements(adsData.id);
        if (placementsData && placementsData.length > 0) {
          setPlacements(
            placementsData.map(
              (p: AdPlacement): PlacementDraft => ({
                id: p.id,
                placement_type: p.placement_type,
                trigger_point: p.trigger_point ?? "",
                frequency_cap: p.frequency_cap?.toString() ?? "",
                notes: p.notes ?? "",
              })
            )
          );
        }
      }

      // Fetch IAP config
      const { data: iapData, error: iapErr } = await getIapConfig(projectId!);
      if (iapErr) { setLoadError(iapErr); setIsLoading(false); return; }

      if (iapData) {
        setIapConfigId(iapData.id);
        setIapForm({
          store: iapData.store ?? null,
          currency: iapData.currency ?? "USD",
          notes: iapData.notes ?? "",
        });

        // Fetch IAP items
        const { data: itemsData } = await listIapItems(iapData.id);
        if (itemsData && itemsData.length > 0) {
          setItems(
            itemsData.map(
              (it: IapItem): ItemDraft => ({
                id: it.id,
                name: it.name,
                item_type: it.item_type,
                price_usd: it.price_usd?.toString() ?? "",
                description: it.description ?? "",
              })
            )
          );
        }
      }

      setIsLoading(false);
    }

    load();
  }, [projectId]);

  // -------------------------------------------------------------------------
  // Placement helpers
  // -------------------------------------------------------------------------
  function updatePlacement(index: number, field: keyof PlacementDraft, value: string) {
    setPlacements((prev) =>
      prev.map((p, i) => (i === index ? { ...p, [field]: value } : p))
    );
  }

  async function removePlacement(index: number) {
    const p = placements[index];
    if (p.id) {
      // Already saved in DB — delete it
      await deleteAdPlacement(p.id);
    }
    setPlacements((prev) => prev.filter((_, i) => i !== index));
  }

  // -------------------------------------------------------------------------
  // IAP item helpers
  // -------------------------------------------------------------------------
  function updateItem(index: number, field: keyof ItemDraft, value: string) {
    setItems((prev) =>
      prev.map((it, i) => (i === index ? { ...it, [field]: value } : it))
    );
  }

  async function removeItem(index: number) {
    const it = items[index];
    if (it.id) {
      await deleteIapItem(it.id);
    }
    setItems((prev) => prev.filter((_, i) => i !== index));
  }

  // -------------------------------------------------------------------------
  // Save — upsert everything then navigate forward
  // -------------------------------------------------------------------------
  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!projectId) return;

    setSaveError(null);
    setIsSaving(true);

    try {
      // 1. Upsert ads config
      const { data: savedAds, error: adsErr } = await upsertAdsConfig({
        project_id: projectId,
        ad_network: adsForm.ad_network || null,
        revenue_model: adsForm.revenue_model || null,
        notes: adsForm.notes || null,
      });
      if (adsErr || !savedAds) { setSaveError(adsErr ?? "Failed to save ads config"); return; }
      setAdsConfigId(savedAds.id);

      // 2. Save new placements (only rows without an id yet)
      const newPlacements = placements.filter((p) => !p.id);
      for (const p of newPlacements) {
        const { data: saved, error: err } = await createAdPlacement({
          ads_config_id: savedAds.id,
          placement_type: p.placement_type,
          trigger_point: p.trigger_point || null,
          frequency_cap: p.frequency_cap ? parseInt(p.frequency_cap) : null,
          notes: p.notes || null,
        });
        if (err) { setSaveError(err); return; }
        // Update local state with the new id so a second save doesn't duplicate
        if (saved) {
          setPlacements((prev) =>
            prev.map((item) =>
              item === p ? { ...item, id: saved.id } : item
            )
          );
        }
      }

      // 3. Upsert IAP config
      const { data: savedIap, error: iapErr } = await upsertIapConfig({
        project_id: projectId,
        store: iapForm.store,
        currency: iapForm.currency || "USD",
        notes: iapForm.notes || null,
      });
      if (iapErr || !savedIap) { setSaveError(iapErr ?? "Failed to save IAP config"); return; }
      setIapConfigId(savedIap.id);

      // 4. Save new IAP items
      const newItems = items.filter((it) => !it.id);
      for (const it of newItems) {
        if (!it.name.trim()) continue; // skip blank rows
        const { data: saved, error: err } = await createIapItem({
          iap_config_id: savedIap.id,
          name: it.name,
          item_type: it.item_type,
          price_usd: it.price_usd ? parseFloat(it.price_usd) : null,
          description: it.description || null,
        });
        if (err) { setSaveError(err); return; }
        if (saved) {
          setItems((prev) =>
            prev.map((item) =>
              item === it ? { ...item, id: saved.id } : item
            )
          );
        }
      }

      // 5. Advance project step
      await updateProject(projectId, { current_step: 3 });

      navigate(`/project/${projectId}/guardrail`);
    } finally {
      setIsSaving(false);
    }
  }

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------
  if (isLoading) {
    return (
      <PageContainer>
        <div className="flex items-center justify-center min-h-[40vh]">
          <div className="w-8 h-8 border-2 border-gray-300 border-t-[#9E76B4] rounded-full animate-spin" />
        </div>
      </PageContainer>
    );
  }

  if (loadError) {
    return (
      <PageContainer>
        <div className="bg-red-50 border border-red-200 rounded-xl p-5 text-sm text-red-700">
          {loadError}
        </div>
      </PageContainer>
    );
  }

  // Show which config ids are loaded (debug info hidden in production)
  void adsConfigId;
  void iapConfigId;

  return (
    <PageContainer>
      <StepIndicator current={2} />

      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 tracking-tight">
          Step 2 — Build
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          Configure your advertising placements and in-app purchase items.
        </p>
      </div>

      <form onSubmit={handleSave} className="space-y-8 max-w-2xl">

        {/* ================================================================
            ADS CONFIG SECTION
            ================================================================ */}
        <Card>
          <div className="p-6 space-y-5">
            <h2 className="text-lg font-bold text-gray-800 border-b border-gray-100 pb-3">
              Ads Configuration
            </h2>

            {/* Ad Network */}
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">
                Ad Network
              </label>
              <select
                value={adsForm.ad_network}
                onChange={(e) => setAdsForm({ ...adsForm, ad_network: e.target.value })}
                className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#9E76B4]/20 focus:border-[#9E76B4] outline-none text-gray-800"
              >
                <option value="">Select ad network...</option>
                {AD_NETWORKS.map((n) => (
                  <option key={n} value={n}>{n}</option>
                ))}
              </select>
            </div>

            {/* Revenue Model */}
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">
                Revenue Model
              </label>
              <select
                value={adsForm.revenue_model}
                onChange={(e) => setAdsForm({ ...adsForm, revenue_model: e.target.value })}
                className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#9E76B4]/20 focus:border-[#9E76B4] outline-none text-gray-800"
              >
                <option value="">Select revenue model...</option>
                {REVENUE_MODELS.map((m) => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
            </div>

            {/* Ads Notes */}
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">
                Notes (optional)
              </label>
              <textarea
                rows={2}
                value={adsForm.notes}
                onChange={(e) => setAdsForm({ ...adsForm, notes: e.target.value })}
                placeholder="Any additional context about your ads strategy..."
                className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#9E76B4]/20 focus:border-[#9E76B4] outline-none resize-none text-gray-800"
              />
            </div>

            {/* Ad Placements */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                  Ad Placements
                </label>
                <button
                  type="button"
                  onClick={() => setPlacements((prev) => [...prev, newPlacementDraft()])}
                  className="text-xs font-semibold text-[#9E76B4] hover:text-[#7B5C8F] transition-colors"
                >
                  + Add Placement
                </button>
              </div>

              <div className="space-y-4">
                {placements.map((p, idx) => (
                  <div
                    key={idx}
                    className="bg-gray-50 border border-gray-200 rounded-xl p-4 space-y-3"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-gray-500 uppercase">
                        Placement #{idx + 1}
                      </span>
                      {placements.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removePlacement(idx)}
                          className="text-xs text-red-400 hover:text-red-600 transition-colors"
                        >
                          Remove
                        </button>
                      )}
                    </div>

                    {/* Type */}
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs text-gray-500 mb-1">Type</label>
                        <select
                          value={p.placement_type}
                          onChange={(e) =>
                            updatePlacement(idx, "placement_type", e.target.value)
                          }
                          className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#9E76B4]/20 text-gray-800"
                        >
                          {PLACEMENT_TYPES.map((t) => (
                            <option key={t} value={t}>
                              {t.charAt(0).toUpperCase() + t.slice(1)}
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Frequency Cap */}
                      <div>
                        <label className="block text-xs text-gray-500 mb-1">
                          Frequency Cap (per session)
                        </label>
                        <input
                          type="number"
                          min={0}
                          value={p.frequency_cap}
                          onChange={(e) =>
                            updatePlacement(idx, "frequency_cap", e.target.value)
                          }
                          placeholder="e.g. 3 (blank = no cap)"
                          className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#9E76B4]/20 text-gray-800"
                        />
                      </div>
                    </div>

                    {/* Trigger Point */}
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">
                        Trigger Point
                      </label>
                      <input
                        type="text"
                        value={p.trigger_point}
                        onChange={(e) =>
                          updatePlacement(idx, "trigger_point", e.target.value)
                        }
                        placeholder="e.g. level_complete, game_over, menu_open"
                        className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#9E76B4]/20 text-gray-800"
                      />
                    </div>

                    {/* Notes */}
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">Notes</label>
                      <input
                        type="text"
                        value={p.notes}
                        onChange={(e) => updatePlacement(idx, "notes", e.target.value)}
                        placeholder="Optional notes..."
                        className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#9E76B4]/20 text-gray-800"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </Card>

        {/* ================================================================
            IAP CONFIG SECTION
            ================================================================ */}
        <Card>
          <div className="p-6 space-y-5">
            <h2 className="text-lg font-bold text-gray-800 border-b border-gray-100 pb-3">
              In-App Purchase (IAP) Configuration
            </h2>

            {/* Store */}
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">
                Store
              </label>
              <select
                value={iapForm.store ?? ""}
                onChange={(e) =>
                  setIapForm({
                    ...iapForm,
                    store: (e.target.value as IapConfig["store"]) || null,
                  })
                }
                className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#9E76B4]/20 focus:border-[#9E76B4] outline-none text-gray-800"
              >
                <option value="">Select store...</option>
                {STORE_OPTIONS.map((s) => (
                  <option key={s ?? ""} value={s ?? ""}>
                    {s === "google_play"
                      ? "Google Play"
                      : s === "app_store"
                      ? "App Store (iOS)"
                      : "Both"}
                  </option>
                ))}
              </select>
            </div>

            {/* Currency */}
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">
                Currency
              </label>
              <input
                type="text"
                value={iapForm.currency}
                onChange={(e) => setIapForm({ ...iapForm, currency: e.target.value })}
                placeholder="USD"
                className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#9E76B4]/20 focus:border-[#9E76B4] outline-none text-gray-800"
              />
            </div>

            {/* IAP Notes */}
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">
                Notes (optional)
              </label>
              <textarea
                rows={2}
                value={iapForm.notes}
                onChange={(e) => setIapForm({ ...iapForm, notes: e.target.value })}
                placeholder="Any context about your IAP strategy..."
                className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#9E76B4]/20 focus:border-[#9E76B4] outline-none resize-none text-gray-800"
              />
            </div>

            {/* IAP Items */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                  IAP Items
                </label>
                <button
                  type="button"
                  onClick={() => setItems((prev) => [...prev, newItemDraft()])}
                  className="text-xs font-semibold text-[#9E76B4] hover:text-[#7B5C8F] transition-colors"
                >
                  + Add Item
                </button>
              </div>

              <div className="space-y-4">
                {items.map((it, idx) => (
                  <div
                    key={idx}
                    className="bg-gray-50 border border-gray-200 rounded-xl p-4 space-y-3"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-gray-500 uppercase">
                        Item #{idx + 1}
                      </span>
                      {items.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeItem(idx)}
                          className="text-xs text-red-400 hover:text-red-600 transition-colors"
                        >
                          Remove
                        </button>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      {/* Name */}
                      <div>
                        <label className="block text-xs text-gray-500 mb-1">
                          Item Name
                        </label>
                        <input
                          type="text"
                          value={it.name}
                          onChange={(e) => updateItem(idx, "name", e.target.value)}
                          placeholder="e.g. Energy Refill x10"
                          className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#9E76B4]/20 text-gray-800"
                        />
                      </div>

                      {/* Price */}
                      <div>
                        <label className="block text-xs text-gray-500 mb-1">
                          Price (USD)
                        </label>
                        <input
                          type="number"
                          step="0.01"
                          min={0}
                          value={it.price_usd}
                          onChange={(e) => updateItem(idx, "price_usd", e.target.value)}
                          placeholder="e.g. 0.99"
                          className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#9E76B4]/20 text-gray-800"
                        />
                      </div>
                    </div>

                    {/* Item Type */}
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">Type</label>
                      <select
                        value={it.item_type}
                        onChange={(e) => updateItem(idx, "item_type", e.target.value)}
                        className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#9E76B4]/20 text-gray-800"
                      >
                        {ITEM_TYPES.map((t) => (
                          <option key={t} value={t}>
                            {t === "non_consumable"
                              ? "Non-consumable"
                              : t.charAt(0).toUpperCase() + t.slice(1)}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Description */}
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">
                        Description
                      </label>
                      <input
                        type="text"
                        value={it.description}
                        onChange={(e) => updateItem(idx, "description", e.target.value)}
                        placeholder="What does this item do for the player?"
                        className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#9E76B4]/20 text-gray-800"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </Card>

        {/* Save error */}
        {saveError && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-700">
            {saveError}
          </div>
        )}

        {/* Navigation buttons */}
        <div className="flex justify-between items-center">
          <button
            type="button"
            onClick={() => navigate(`/project/${projectId}/setup`)}
            className="px-5 py-2.5 rounded-xl border border-gray-200 text-gray-600 text-sm font-medium hover:bg-gray-50 transition-colors"
          >
            ← Back to Setup
          </button>

          <button
            type="submit"
            disabled={isSaving}
            className="px-6 py-2.5 bg-[#9E76B4] hover:bg-[#85619A] disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold rounded-xl transition-colors shadow-sm"
          >
            {isSaving ? "Saving..." : "Save & Continue →"}
          </button>
        </div>
      </form>
    </PageContainer>
  );
}
