export default function MiniEngagementGraph() {
  return (
    <div className="bg-white rounded-xl shadow p-5">
      <h3 className="font-semibold mb-4">Mini Engagement Graph</h3>

      <div className="flex flex-wrap gap-2 text-xs">
        {["HOOK", "PLAY", "CTA", "END"].map((s) => (
          <span key={s} className="bg-gray-600 text-white px-3 py-1 rounded">
            {s}
          </span>
        ))}
      </div>
    </div>
  );
}
