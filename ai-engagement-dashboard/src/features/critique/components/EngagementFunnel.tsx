import type { FunnelMetrics } from "../types";

interface Props {
  data: FunnelMetrics;
}

export default function EngagementFunnel({ data }: Props) {
  return (
    <div className="bg-white rounded-xl shadow p-5">
      <h3 className="font-semibold mb-4">Engagement Funnel</h3>

      <div className="flex items-center gap-2 text-xs mb-4">
        {["Hook", "First Tap", "Reward", "CTA Shown"].map((s) => (
          <span
            key={s}
            className="bg-blue-600 text-white px-3 py-1 rounded"
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
