import type { FunnelMetrics } from "../types";

interface Props {
  data: FunnelMetrics;
}

export default function EngagementFunnel({ data }: Props) {
  return (
    <div className="bg-white rounded-xl shadow p-5">
      <h3 className="font-semibold mb-4">Engagement Funnel</h3>

      <div className="flex flex-wrap items-center gap-2 text-xs mb-4">
        {["Hook", "First Tap", "Reward", "CTA Shown"].map((s) => (
          <span
            key={s}
            className="bg-primary-light/20 text-primary px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider"
          >
            {s}
          </span>
        ))}
      </div>

      <div className="bg-gray-50 p-3 rounded text-sm space-y-1">
        <p>Tap Time: {data.tapTime}</p>
        <p>Reward Time: {data.rewardTime}</p>
        <p>CTA Shown: {data.ctaShown}</p>
        <p>Completion Rate: {data.completionRate}</p>
      </div>
    </div>
  );
}
