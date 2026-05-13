// ---------------------------------------------------------------------------
// GuardrailPage.tsx — Student Step 3: AI Guardrail Results
//
// Route: /project/guardrail
//
// Displays the results from the AI ethical guardrail analysis.
// The analysis is run server-side (by the instructor's system) and stored
// in the `analyses` table as an immutable append-only record.
//
// TODO: Fetch analysis by projectId and display score + failure_points.
//       This page is being built by the instructor team — stub only for now.
// ---------------------------------------------------------------------------

import PageContainer from "../../../app/layout/PageContainer";

export default function GuardrailPage() {
  return (
    <PageContainer>
      <div className="mb-6">
        <p className="text-xs font-bold text-[#9E76B4] uppercase tracking-wider mb-1">
          Step 3 of 4
        </p>
        <h1 className="text-3xl font-bold text-gray-900 tracking-tight">
          Guardrail — AI Ethics Review
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          Review the AI ethical analysis of your monetization design.
        </p>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-xl p-5 text-sm text-blue-800">
        <p className="font-semibold mb-1">Stub — Implemented by instructor team</p>
        <p>
          This page will show the AI guardrail score, failure points, and
          recommendations fetched from the <code className="font-mono bg-blue-100 px-1 rounded">analyses</code> table.
        </p>
      </div>
    </PageContainer>
  );
}
