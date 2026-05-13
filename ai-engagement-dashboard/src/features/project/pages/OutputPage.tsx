// ---------------------------------------------------------------------------
// OutputPage.tsx — Student Step 4: Summary & Export
//
// Route: /project/:projectId/output
//
// Fetches complete project data (project + ads + placements + iap + items)
// and renders a full summary. Provides CSV and PDF export.
//
// CSV export: built with native browser APIs (no extra library needed)
// PDF export: uses the browser's built-in print dialog (window.print)
//             with a print-specific CSS class to hide navigation
// ---------------------------------------------------------------------------

import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

import PageContainer from "../../../app/layout/PageContainer";
import Card from "../../../shared/components/Card";
import {
  getProject,
  getAdsConfig,
  listAdPlacements,
  getIapConfig,
  listIapItems,
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
// InfoRow helper
// ---------------------------------------------------------------------------
function InfoRow({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div className="flex gap-2 text-sm py-1.5 border-b border-gray-50 last:border-0">
      <span className="text-gray-400 shrink-0 w-40">{label}</span>
      <span className="text-gray-800">{value || "—"}</span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// CSV export — builds a CSV string and triggers browser download
// ---------------------------------------------------------------------------
function buildCsvContent(
  project: Project,
  adsConfig: AdsConfig | null,
  placements: AdPlacement[],
  iapConfig: IapConfig | null,
  items: IapItem[]
): string {
  const rows: string[][] = [];

  // Header
  rows.push(["Section", "Field", "Value"]);

  // Project info
  rows.push(["Project", "Title", project.title]);
  rows.push(["Project", "Genre", (project.genre ?? []).join("; ")]);
  rows.push(["Project", "Platform", (project.platform ?? []).join("; ")]);
  rows.push(["Project", "Target Audience", project.target_audience ?? ""]);
  rows.push(["Project", "Session Length", project.session_length ?? ""]);
  rows.push(["Project", "Core Mechanic", project.core_mechanic ?? ""]);
  rows.push(["Project", "Status", project.status]);

  // Ads config
  if (adsConfig) {
    rows.push(["Ads Config", "Ad Network", adsConfig.ad_network ?? ""]);
    rows.push(["Ads Config", "Revenue Model", adsConfig.revenue_model ?? ""]);
    rows.push(["Ads Config", "Notes", adsConfig.notes ?? ""]);
  }

  // Ad placements
  placements.forEach((p, i) => {
    rows.push([`Ad Placement ${i + 1}`, "Type", p.placement_type]);
    rows.push([`Ad Placement ${i + 1}`, "Trigger Point", p.trigger_point ?? ""]);
    rows.push([`Ad Placement ${i + 1}`, "Frequency Cap", p.frequency_cap?.toString() ?? "No cap"]);
    rows.push([`Ad Placement ${i + 1}`, "Notes", p.notes ?? ""]);
  });

  // IAP config
  if (iapConfig) {
    rows.push(["IAP Config", "Store", iapConfig.store ?? ""]);
    rows.push(["IAP Config", "Currency", iapConfig.currency ?? ""]);
    rows.push(["IAP Config", "Notes", iapConfig.notes ?? ""]);
  }

  // IAP items
  items.forEach((it, i) => {
    rows.push([`IAP Item ${i + 1}`, "Name", it.name]);
    rows.push([`IAP Item ${i + 1}`, "Type", it.item_type]);
    rows.push([`IAP Item ${i + 1}`, "Price (USD)", it.price_usd?.toString() ?? ""]);
    rows.push([`IAP Item ${i + 1}`, "Description", it.description ?? ""]);
  });

  // Escape quotes and join
  return rows
    .map((row) => row.map((cell) => `"${cell.replace(/"/g, '""')}"`).join(","))
    .join("\n");
}

function downloadCsv(content: string, filename: string) {
  const blob = new Blob([content], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.setAttribute("download", filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------
export default function OutputPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const printRef = useRef<HTMLDivElement>(null);

  const [project, setProject] = useState<Project | null>(null);
  const [adsConfig, setAdsConfig] = useState<AdsConfig | null>(null);
  const [placements, setPlacements] = useState<AdPlacement[]>([]);
  const [iapConfig, setIapConfig] = useState<IapConfig | null>(null);
  const [items, setItems] = useState<IapItem[]>([]);

  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  // -------------------------------------------------------------------------
  // Load all data
  // -------------------------------------------------------------------------
  useEffect(() => {
    if (!projectId) return;

    async function load() {
      setIsLoading(true);
      setLoadError(null);

      const { data: proj, error: projErr } = await getProject(projectId!);
      if (projErr || !proj) {
        setLoadError(projErr ?? "Project not found");
        setIsLoading(false);
        return;
      }
      setProject(proj);

      const { data: ads } = await getAdsConfig(projectId!);
      setAdsConfig(ads);
      if (ads) {
        const { data: places } = await listAdPlacements(ads.id);
        setPlacements(places ?? []);
      }

      const { data: iap } = await getIapConfig(projectId!);
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
  // Export handlers
  // -------------------------------------------------------------------------
  function handleExportCsv() {
    if (!project) return;
    const csv = buildCsvContent(project, adsConfig, placements, iapConfig, items);
    const safeName = project.title.replace(/[^a-z0-9]/gi, "_").toLowerCase();
    downloadCsv(csv, `${safeName}_emd_report.csv`);
  }

  function handleExportPdf() {
    // Use browser print dialog — styled via CSS @media print
    window.print();
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

  if (loadError || !project) {
    return (
      <PageContainer>
        <div className="bg-red-50 border border-red-200 rounded-xl p-5 text-sm text-red-700">
          {loadError ?? "Could not load project"}
        </div>
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      {/* Hide step indicator + buttons when printing */}
      <div className="print:hidden">
        <StepIndicator current={4} />
      </div>

      <div className="mb-6 flex items-start justify-between gap-4 print:hidden">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 tracking-tight">
            Step 4 — Output
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Your complete monetization design summary. Export when ready.
          </p>
        </div>

        <div className="flex gap-3 shrink-0">
          <button
            onClick={handleExportCsv}
            className="px-4 py-2 rounded-xl border border-gray-200 bg-white text-gray-700 text-sm font-semibold hover:bg-gray-50 transition-colors shadow-sm"
          >
            Export CSV
          </button>
          <button
            onClick={handleExportPdf}
            className="px-4 py-2 rounded-xl bg-[#9E76B4] hover:bg-[#85619A] text-white text-sm font-semibold transition-colors shadow-sm"
          >
            Export PDF
          </button>
        </div>
      </div>

      {/* ================================================================
          Printable report area
          ================================================================ */}
      <div ref={printRef} className="max-w-2xl space-y-6">

        {/* Report header — shown when printing */}
        <div className="hidden print:block mb-6">
          <h1 className="text-2xl font-bold text-gray-900">
            Ethical Monetization Designer — Project Report
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Generated: {new Date().toLocaleDateString()}
          </p>
        </div>

        {/* Project summary */}
        <Card>
          <div className="p-6">
            <h2 className="text-base font-bold text-gray-800 mb-4 flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-[#9E76B4]/10 text-[#9E76B4] flex items-center justify-center text-xs font-bold">
                1
              </span>
              Game Setup
            </h2>
            <div className="space-y-0">
              <InfoRow label="Game Title" value={project.title} />
              <InfoRow label="Genre" value={(project.genre ?? []).join(", ")} />
              <InfoRow label="Platform" value={(project.platform ?? []).join(", ")} />
              <InfoRow label="Target Audience" value={project.target_audience} />
              <InfoRow label="Session Length" value={project.session_length} />
              <InfoRow label="Core Mechanic" value={project.core_mechanic} />
            </div>
          </div>
        </Card>

        {/* Ads summary */}
        <Card>
          <div className="p-6">
            <h2 className="text-base font-bold text-gray-800 mb-4 flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-[#9E76B4]/10 text-[#9E76B4] flex items-center justify-center text-xs font-bold">
                2A
              </span>
              Ads Configuration
            </h2>

            {!adsConfig ? (
              <p className="text-sm text-gray-400 italic">No ads configuration.</p>
            ) : (
              <>
                <div className="space-y-0 mb-4">
                  <InfoRow label="Ad Network" value={adsConfig.ad_network} />
                  <InfoRow label="Revenue Model" value={adsConfig.revenue_model} />
                  <InfoRow label="Notes" value={adsConfig.notes} />
                </div>

                {placements.length > 0 && (
                  <div>
                    <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">
                      Ad Placements
                    </p>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="bg-gray-50">
                            <th className="text-left px-3 py-2 text-xs font-bold text-gray-400 uppercase">Type</th>
                            <th className="text-left px-3 py-2 text-xs font-bold text-gray-400 uppercase">Trigger</th>
                            <th className="text-left px-3 py-2 text-xs font-bold text-gray-400 uppercase">Freq. Cap</th>
                            <th className="text-left px-3 py-2 text-xs font-bold text-gray-400 uppercase">Notes</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                          {placements.map((p) => (
                            <tr key={p.id}>
                              <td className="px-3 py-2 text-gray-700 font-medium capitalize">{p.placement_type}</td>
                              <td className="px-3 py-2 text-gray-500">{p.trigger_point || "—"}</td>
                              <td className="px-3 py-2 text-gray-500">
                                {p.frequency_cap !== null ? `${p.frequency_cap}/session` : "No cap"}
                              </td>
                              <td className="px-3 py-2 text-gray-400 text-xs">{p.notes || "—"}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </Card>

        {/* IAP summary */}
        <Card>
          <div className="p-6">
            <h2 className="text-base font-bold text-gray-800 mb-4 flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-[#9E76B4]/10 text-[#9E76B4] flex items-center justify-center text-xs font-bold">
                2B
              </span>
              IAP Configuration
            </h2>

            {!iapConfig ? (
              <p className="text-sm text-gray-400 italic">No IAP configuration.</p>
            ) : (
              <>
                <div className="space-y-0 mb-4">
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
                </div>

                {items.length > 0 && (
                  <div>
                    <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">
                      IAP Items
                    </p>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="bg-gray-50">
                            <th className="text-left px-3 py-2 text-xs font-bold text-gray-400 uppercase">Name</th>
                            <th className="text-left px-3 py-2 text-xs font-bold text-gray-400 uppercase">Type</th>
                            <th className="text-left px-3 py-2 text-xs font-bold text-gray-400 uppercase">Price</th>
                            <th className="text-left px-3 py-2 text-xs font-bold text-gray-400 uppercase">Description</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                          {items.map((it) => (
                            <tr key={it.id}>
                              <td className="px-3 py-2 text-gray-700 font-medium">{it.name}</td>
                              <td className="px-3 py-2 text-gray-500 capitalize">
                                {it.item_type.replace("_", " ")}
                              </td>
                              <td className="px-3 py-2 text-gray-500">
                                {it.price_usd !== null ? `$${it.price_usd.toFixed(2)}` : "—"}
                              </td>
                              <td className="px-3 py-2 text-gray-400 text-xs">{it.description || "—"}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </Card>

        {/* Status badge */}
        <div className="bg-green-50 border border-green-200 rounded-xl p-4 flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center shrink-0">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              className="w-4 h-4 text-green-600"
            >
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </div>
          <div>
            <p className="text-sm font-bold text-green-800">Design Complete</p>
            <p className="text-xs text-green-600 mt-0.5">
              Project status: <span className="capitalize">{project.status.replace("_", " ")}</span>
            </p>
          </div>
        </div>

        {/* Navigation — hidden in print */}
        <div className="flex justify-between items-center print:hidden">
          <button
            type="button"
            onClick={() => navigate(`/project/${projectId}/guardrail`)}
            className="px-5 py-2.5 rounded-xl border border-gray-200 text-gray-600 text-sm font-medium hover:bg-gray-50 transition-colors"
          >
            ← Back to Guardrail
          </button>

          <button
            type="button"
            onClick={() => navigate("/dashboard")}
            className="px-5 py-2.5 rounded-xl bg-gray-800 hover:bg-gray-700 text-white text-sm font-semibold transition-colors"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    </PageContainer>
  );
}
