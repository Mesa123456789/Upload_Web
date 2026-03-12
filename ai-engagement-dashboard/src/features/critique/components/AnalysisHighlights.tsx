import type { CritiqueData } from "../types";

interface Props {
  highlights: CritiqueData["highlights"];
}

export default function AnalysisHighlights({ highlights }: Props) {
  return (
    <div className="bg-white rounded-xl shadow p-5 space-y-4">

      <h3 className="font-semibold">Analysis Highlights</h3>

      <div className="flex flex-wrap gap-3">
        <span className="bg-primary/10 text-primary px-4 py-1.5 rounded-full text-xs font-bold ring-1 ring-primary/20">
          Risk: {highlights.risk}
        </span>
        <span className="bg-primary/10 text-primary px-4 py-1.5 rounded-full text-xs font-bold ring-1 ring-primary/20">
          Consistency: {highlights.consistency}
        </span>
      </div>

      <div className="space-y-3 text-sm">
        <div className="bg-background-main/50 p-4 rounded-xl border border-primary/10 text-primary font-medium">
          <span className="opacity-60 mr-2">✔</span> {highlights.hook}
        </div>
        <div className="bg-background-main/50 p-4 rounded-xl border border-primary/10 text-primary font-medium">
          <span className="opacity-60 mr-2">✔</span> {highlights.reward}
        </div>
        <div className="bg-background-main/50 p-4 rounded-xl border border-primary/10 text-primary font-medium">
          <span className="opacity-60 mr-2">✔</span> {highlights.cta}
        </div>
      </div>

    </div>
  );
}
