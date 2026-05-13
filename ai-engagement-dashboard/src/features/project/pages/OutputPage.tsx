// ---------------------------------------------------------------------------
// OutputPage.tsx — Student Step 4: Summary + Export
//
// Route: /project/output
//
// Final step. Shows a full summary of the project (Setup → Build → Guardrail)
// and lets the student export as PDF or CSV.
//
// TODO: Connect to exports.service.ts (already exists) and render full summary.
// ---------------------------------------------------------------------------

import PageContainer from "../../../app/layout/PageContainer";

export default function OutputPage() {
  return (
    <PageContainer>
      <div className="mb-6">
        <p className="text-xs font-bold text-[#9E76B4] uppercase tracking-wider mb-1">
          Step 4 of 4
        </p>
        <h1 className="text-3xl font-bold text-gray-900 tracking-tight">
          Output — Summary & Export
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          Review your complete project and export as PDF or CSV.
        </p>
      </div>

      <div className="bg-amber-50 border border-amber-200 rounded-xl p-5 text-sm text-amber-800">
        <p className="font-semibold mb-1">TODO — Not implemented yet</p>
        <p>
          This page will render a full project summary card and provide
          PDF/CSV export buttons using <code className="font-mono bg-amber-100 px-1 rounded">exports.service.ts</code>.
        </p>
      </div>
    </PageContainer>
  );
}
