// ---------------------------------------------------------------------------
// GuardrailPage.tsx — Student Step 3: Ethics Review
//
// Route: /project/:projectId/guardrail
//
// Shows a review of everything the student configured in Step 1 + 2,
// plus a placeholder for the AI analysis (AI features are out of scope now).
//
// Data fetched on mount:
//   - Project (Step 1 info)
//   - AdsConfig + AdPlacements (Step 2 ads)
//   - IapConfig + IapItems (Step 2 IAP)
// ---------------------------------------------------------------------------

import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

import PageContainer from "../../../app/layout/PageContainer";
import Card from "../../../shared/components/Card";
import {
  getProject,
  getAdsConfig,
  listAdPlacements,
  getIapConfig,
  listIapItems,
  updateProject,
} from "../../projects/services/projects.service";
import type {
  Project,
  AdsConfig,
  AdPlacement,
  IapConfig,
  IapItem,
} from "../../../lib/database.types";

// ---------------------------------------------------------------------------
// Step indicator
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
// Small helper: key-value row
// ---------------------------------------------------------------------------
function InfoRow({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div className="flex gap-2 text-sm">
      <span className="text-gray-400 shrink-0 w-36">{label}</span>
      <span className="text-gray-800 font-medium">{value || "—"}</span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------
export default function GuardrailPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();

  const [project, setProject] = useState<Project | null>(null);
  const [adsConfig, setAdsConfig] = useState<AdsConfig | null>(null);
  const [placements, setPlacements] = useState<AdPlacement[]>([]);
  const [iapConfig, setIapConfig] = useState<IapConfig | null>(null);
  const [items, setItems] = useState<IapItem[]>([]);

  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isAdvancing, setIsAdvancing] = useState(false);

  // -------------------------------------------------------------------------
  // Load all data on mount
  // -------------------------------------------------------------------------
  useEffect(() => {
    if (!projectId) return;

    async function load() {
      setIsLoading(true);
      setLoadError(null);

      // Project
      const { data: proj, error: projErr } = await getProject(projectId!);
      if (projErr || !proj) { setLoadError(projErr ?? "Project not found"); setIsLoading(false); return; }
      setProject(proj);

      // Ads config
      const { data: ads, error: adsErr } = await getAdsConfig(projectId!);
      if (adsErr) { setLoadError(adsErr); setIsLoading(false); return; }
      setAdsConfig(ads);

      if (ads) {
        const { data: places } = await listAdPlacements(ads.id);
        setPlacements(places ?? []);
      }

      // IAP config
      const { data: iap, error: iapErr } = await getIapConfig(projectId!);
      if (iapErr) { setLoadError(iapErr); setIsLoading(false); return; }
      setIapConfig(iap);

      if (iap) {
        const { data: iapItemsList } = await listIapItems(iap.id);
        setItems(iapItemsList ?? []);
      }

      setIsLoading(false);
    }

    load();
  }, [projectId]);

  // -------------------------------------------------------------------------
  // Advance to Step 4
  // -------------------------------------------------------------------------
  async function handleContinue() {
    if (!projectId) return;
    setIsAdvancing(true);
    await updateProject(projectId, { current_step: 4 });
    navigate(`/project/${projectId}/output`);
    setIsAdvancing(false);
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

  return (
    <PageContainer>
      <StepIndicator current={3} />

      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 tracking-tight">
          Step 3 — Guardrail Review
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          Review your monetization design before the final output.
        </p>
      </div>

      <div className="max-w-2xl space-y-6">

        {/* ================================================================
            STEP 1 SUMMARY — Game Info
            ================================================================ */}
        <Card>
          <div className="p-6 space-y-3">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-base font-bold text-gray-800">Game Setup</h2>
              <button
                type="button"
                onClick={() => navigate(`/project/${projectId}/setup`)}
                className="text-xs text-[#9E76B4] hover:text-[#7B5C8F] font-semibold transition-colors"
              >
                Edit
              </button>
            </div>
            <InfoRow label="Title" value={project?.title} />
            <InfoRow
              label="Genre"
              value={(project?.genre ?? []).join(", ")}
            />
            <InfoRow
              label="Platform"
              value={(project?.platform ?? []).join(", ")}
            />
            <InfoRow label="Target Audience" value={project?.target_audience} />
            <InfoRow label="Session Length" value={project?.session_length} />
            <InfoRow label="Core Mechanic" value={project?.core_mechanic} />
          </div>
        </Card>

        {/* ================================================================
            STEP 2 SUMMARY — Ads Config
            ================================================================ */}
        <Card>
          <div className="p-6 space-y-3">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-base font-bold text-gray-800">Ads Configuration</h2>
              <button
                type="button"
                onClick={() => navigate(`/project/${projectId}/build`)}
                className="text-xs text-[#9E76B4] hover:text-[#7B5C8F] font-semibold transition-colors"
              >
                Edit
              </button>
            </div>

            {!adsConfig ? (
              <p className="text-sm text-gray-400 italic">No ads configuration set.</p>
            ) : (
              <>
                <InfoRow label="Ad Network" value={adsConfig.ad_network} />
                <InfoRow label="Revenue Model" value={adsConfig.revenue_model} />
                <InfoRow label="Notes" value={adsConfig.notes} />

                {placements.length > 0 && (
                  <div className="mt-3">
                    <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
                      Ad Placements ({placements.length})
                    </p>
                    <div className="space-y-2">
                      {placements.map((p) => (
                        <div
                          key={p.id}
                          className="flex items-center gap-3 text-sm bg-gray-50 rounded-lg px-3 py-2"
                        >
                          <span className="font-medium text-gray-700 capitalize w-24 shrink-0">
                            {p.placement_type}
                          </span>
                          <span className="text-gray-400 text-xs">
                            {p.trigger_point || "no trigger set"}
                          </span>
                          {p.frequency_cap !== null ? (
                            <span className="ml-auto text-xs bg-green-50 text-green-700 px-2 py-0.5 rounded-full">
                              Cap: {p.frequency_cap}/session
                            </span>
                          ) : (
                            <span className="ml-auto text-xs bg-amber-50 text-amber-600 px-2 py-0.5 rounded-full">
                              No cap
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </Card>

        {/* ================================================================
            STEP 2 SUMMARY — IAP Config
            ================================================================ */}
        <Card>
          <div className="p-6 space-y-3">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-base font-bold text-gray-800">IAP Configuration</h2>
              <button
                type="button"
                onClick={() => navigate(`/project/${projectId}/build`)}
                className="text-xs text-[#9E76B4] hover:text-[#7B5C8F] font-semibold transition-colors"
              >
                Edit
              </button>
            </div>

            {!iapConfig ? (
              <p className="text-sm text-gray-400 italic">No IAP configuration set.</p>
            ) : (
              <>
                <InfoRow
                  label="Store"
                  value={
                    iapConfig.store === "google_play"
                      ? "Google Play"
                      : iapConfig.store === "app_store"
                      ? "App Store (iOS)"
                      : iapConfig.store === "both"
                      ? "Both"
                      : null
                  }
                />
                <InfoRow label="Currency" value={iapConfig.currency} />
                <InfoRow label="Notes" value={iapConfig.notes} />

                {items.length > 0 && (
                  <div className="mt-3">
                    <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
                      IAP Items ({items.length})
                    </p>
                    <div className="space-y-2">
                      {items.map((it) => (
                        <div
                          key={it.id}
                          className="flex items-center gap-3 text-sm bg-gray-50 rounded-lg px-3 py-2"
                        >
                          <span className="font-medium text-gray-700 flex-1">
                            {it.name}
                          </span>
                          <span className="text-xs text-gray-400 capitalize">
                            {it.item_type.replace("_", " ")}
                          </span>
                          {it.price_usd !== null && (
                            <span className="text-xs font-semibold text-gray-600 ml-2">
                              ${it.price_usd.toFixed(2)}
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </Card>

        {/* ================================================================
            AI ANALYSIS PLACEHOLDER
            ================================================================ */}
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-5">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center shrink-0 mt-0.5">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                className="w-4 h-4 text-blue-500"
              >
                <path d="M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2zm0 18a8 8 0 1 1 8-8 8 8 0 0 1-8 8zm0-14a2 2 0 1 0 2 2 2 2 0 0 0-2-2zm1 8H11v-4h2z" />
              </svg>
            </div>
            <div>
              <p className="text-sm font-bold text-blue-800 mb-1">
                AI Ethics Analysis — Coming Soon
              </p>
              <p className="text-sm text-blue-700">
                The AI guardrail system will automatically analyze your monetization
                design for ethical issues (e.g. missing frequency caps, pay-to-progress
                patterns) and provide a risk score. This feature is under development.
              </p>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <div className="flex justify-between items-center">
          <button
            type="button"
            onClick={() => navigate(`/project/${projectId}/build`)}
            className="px-5 py-2.5 rounded-xl border border-gray-200 text-gray-600 text-sm font-medium hover:bg-gray-50 transition-colors"
          >
            ← Back to Build
          </button>

          <button
            type="button"
            onClick={handleContinue}
            disabled={isAdvancing}
            className="px-6 py-2.5 bg-[#9E76B4] hover:bg-[#85619A] disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold rounded-xl transition-colors shadow-sm"
          >
            {isAdvancing ? "Saving..." : "Continue to Output →"}
          </button>
        </div>
      </div>
    </PageContainer>
  );
}
