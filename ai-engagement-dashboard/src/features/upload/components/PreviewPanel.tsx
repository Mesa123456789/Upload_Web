import Card from "../../../shared/components/Card";

export default function PreviewPanel() {
  return (
    <Card>
      <h2 className="text-xl font-semibold text-center mb-1">
        Engagement Critique
      </h2>
      <p className="text-center text-gray-500 text-sm mb-6">
        Review & Insights
      </p>

      <div className="space-y-6 text-sm">

        <div>
          <h3 className="font-semibold mb-2">Engagement Funnel</h3>
          <div className="bg-gray-100 p-3 rounded">
            Hook: Tap Chest → First Reward: +10 Coins → CTA: Join the Adventure! → CTA Clicks
          </div>
        </div>

        <div>
          <h3 className="font-semibold mb-2">Analysis Highlights</h3>

          <div className="flex gap-2 mb-3">
            <span className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-xs">
              Risk: Low
            </span>
            <span className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-xs">
              Consistency: High
            </span>
          </div>

          <div className="space-y-3">

            <div className="bg-green-50 border border-green-200 p-3 rounded">
              ✔ Hook Clarity: Clear & Fun Start  
              <p className="text-gray-500 text-xs">
                Players quickly understood tap action.
              </p>
            </div>

            <div className="bg-green-50 border border-green-200 p-3 rounded">
              ✔ Reward Impact: Positive Peak  
              <p className="text-gray-500 text-xs">
                Reward moment is well-timed and satisfying.
              </p>
            </div>

            <div className="bg-green-50 border border-green-200 p-3 rounded">
              ✔ CTA Strategy: Balanced Timing  
              <p className="text-gray-500 text-xs">
                CTA appears after reward buildup. Well-placed.
              </p>
            </div>

          </div>
        </div>

        <div>
          <h3 className="font-semibold mb-2">Actionable Suggestions</h3>
          <div className="space-y-2">
            <label><input type="checkbox" /> Maintain consistent feedback speed.</label><br />
            <label><input type="checkbox" /> Keep reward popup visible before CTA.</label><br />
            <label><input type="checkbox" /> Test & tune to sustain user interest.</label>
          </div>
        </div>



      </div>
    </Card>
  );
}
