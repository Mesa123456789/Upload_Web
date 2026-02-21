import type { CritiqueData } from "../types";

interface Props {
  highlights: CritiqueData["highlights"];
}

export default function AnalysisHighlights({ highlights }: Props) {
  return (
    <div className="bg-white rounded-xl shadow p-5 space-y-4">

      <h3 className="font-semibold">Analysis Highlights</h3>

      <div className="flex gap-3">
        <span className="bg-green-100 text-green-700 px-3 py-1 rounded text-sm">
          Risk: {highlights.risk}
        </span>
        <span className="bg-green-100 text-green-700 px-3 py-1 rounded text-sm">
          Consistency: {highlights.consistency}
        </span>
      </div>

      <div className="space-y-2 text-sm">
        <div className="bg-green-50 p-3 rounded">{highlights.hook}</div>
        <div className="bg-green-50 p-3 rounded">{highlights.reward}</div>
        <div className="bg-green-50 p-3 rounded">{highlights.cta}</div>
      </div>

    </div>
  );
}
