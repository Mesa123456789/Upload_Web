// ---------------------------------------------------------------------------
// BuildPage.tsx — Student Step 2: Ads + IAP Configuration
//
// Route: /project/build
//
// Receives projectId from router state (set by SetupPage after createProject).
// Student configures Ads settings and IAP items here, which saves to
// ads_configs / ad_placements / iap_configs / iap_items tables.
//
// TODO: Build the actual Ads + IAP config form using the service layer.
// ---------------------------------------------------------------------------

import { useLocation } from "react-router-dom";
import PageContainer from "../../../app/layout/PageContainer";

export default function BuildPage() {
  // projectId is passed from SetupPage via navigate(..., { state: { projectId } })
  const location = useLocation();
  const projectId = (location.state as { projectId?: string } | null)?.projectId;

  return (
    <PageContainer>
      <div className="mb-6">
        <p className="text-xs font-bold text-[#9E76B4] uppercase tracking-wider mb-1">
          Step 2 of 4
        </p>
        <h1 className="text-3xl font-bold text-gray-900 tracking-tight">
          Build — Ads & IAP Config
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          Configure your advertising placements and in-app purchase items.
        </p>
      </div>

      <div className="bg-amber-50 border border-amber-200 rounded-xl p-5 text-sm text-amber-800">
        <p className="font-semibold mb-1">TODO — Not implemented yet</p>
        <p>This page will contain Ads config (daily cap, rewarded, interstitial, banner) and IAP config (starter pack, battle pass, items).</p>
        {projectId && (
          <p className="mt-2 font-mono text-xs text-amber-600">
            Project ID: {projectId}
          </p>
        )}
      </div>
    </PageContainer>
  );
}
