import PageContainer from "../../../app/layout/PageContainer";
import { mockData } from "../data/mockData";
import EngagementFunnel from "../components/EngagementFunnel";
import AIRecommendations from "../components/AIRecommendations";
import ActionableChecklist from "../components/ActionableChecklist";
import DiscrepancyAnalysis from "../components/DiscrepancyAnalysis";
import DiscrepancyGraph from "../components/DiscrepancyGraph";
import HighPressureWarning from "../components/HighPressureWarning";
import MiniEngagementGraph from "../components/MiniEngagementGraph";
import AnalysisHighlights from "../components/AnalysisHighlights";

export default function CritiquePage() {
  const data = mockData;

  return (
    <PageContainer>
      <div className="space-y-10">

        {/* PAGE 1 */}
        <div className="space-y-6">
          <div className="bg-blue-700 text-white rounded-xl p-4 font-semibold">
            Treasure Raid - Aggressive CTA
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            <EngagementFunnel data={data.funnel} />

            <div className="space-y-6">
              <AIRecommendations items={data.recommendations} />
              <ActionableChecklist items={data.checklist} />
            </div>

            <EngagementFunnel data={data.funnel} />

            <div className="space-y-6">
              <MiniEngagementGraph />
              <HighPressureWarning
                warning1={data.highPressure.warning1}
                warning2={data.highPressure.warning2}
              />
            </div>
          </div>
        </div>

        {/* PAGE 2 */}
        <div className="space-y-6">
          <div className="bg-gradient-to-r from-blue-700 to-blue-500 text-white rounded-xl p-4 flex justify-between items-center shadow">
            <div className="font-semibold">
              Observed vs Expected – Design Critique
            </div>

            <div className="flex gap-3">
              <label htmlFor="testSelect" className="sr-only">
                Select Test
              </label>
              <select
                id="testSelect"
                className="text-black rounded px-2 py-1"
              >
                <option>Treasure Raid - Aggressive CTA</option>
              </select>

              <button className="bg-white text-blue-700 px-3 py-1 rounded">
                Change Test
              </button>
            </div>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            <div className="md:col-span-2 space-y-6">
              <DiscrepancyAnalysis
                expected={data.expectedFlow}
                observed={data.observedFlow}
              />
              <DiscrepancyGraph
                data={data.graph}
                metrics={data.graphMetrics}
              />
            </div>

            <div className="space-y-6">
              <AnalysisHighlights highlights={data.highlights} />
              <AIRecommendations items={data.recommendations} />
              <ActionableChecklist items={data.checklist} />
            </div>
          </div>
        </div>

      </div>
    </PageContainer>
  );
}
