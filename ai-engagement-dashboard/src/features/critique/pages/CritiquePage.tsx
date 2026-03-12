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
import Dropdown, { DropdownItem } from "../../../shared/components/Dropdown";

export default function CritiquePage() {
  const data = mockData;

  return (
    <PageContainer>
      <div className="space-y-10">
        
        {/* TOP BAR ACTIONS */}
        <div className="flex justify-end">
          <Dropdown 
            trigger={
              <button className="bg-background-card border border-primary/20 text-primary px-5 py-2 rounded-full shadow-sm hover:bg-white flex items-center gap-2 transition text-sm font-bold cursor-pointer">
                Actions
                <span className="text-[10px] opacity-60">▼</span>
              </button>
            }
            align="right"
          >
            <DropdownItem>Download PDF Report</DropdownItem>
            <DropdownItem>Share with Team</DropdownItem>
            <DropdownItem>Export Data (CSV)</DropdownItem>
            <DropdownItem className="text-blue-600 font-medium">Save to Dashboard</DropdownItem>
          </Dropdown>
        </div>

        {/* PAGE 1 */}
        <div className="space-y-6">
          <div className="bg-primary text-background-card rounded-2xl p-5 font-bold flex justify-between items-center shadow-sm">
            <span className="text-lg">Treasure Raid - Aggressive CTA</span>
            <span className="text-[10px] bg-background-card text-primary px-3 py-1.5 rounded-full uppercase tracking-widest font-black shadow-sm">Live Test</span>
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
          <div className="bg-background-card shadow-sm border border-black/5 rounded-2xl p-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div className="font-bold text-lg text-primary border-l-4 border-primary-light pl-4">
              Observed vs Expected – Design Critique
            </div>

            <Dropdown
              trigger={
                <button className="bg-primary text-white px-6 py-2.5 rounded-full flex items-center gap-3 text-sm font-bold transition hover:bg-primary-light shadow-sm cursor-pointer">
                  Treasure Raid - Aggressive CTA
                  <span className="text-[10px] opacity-60">▼</span>
                </button>
              }
              align="right"
            >
              <div className="px-4 py-2 text-xs text-gray-500 font-semibold border-b">Select Active Test</div>
              <DropdownItem>Treasure Raid - Aggressive CTA</DropdownItem>
              <DropdownItem>Lucky Wheel - Low Pressure</DropdownItem>
              <DropdownItem>Daily Login - Reward Focus</DropdownItem>
              <DropdownItem>Store Page - Minimalist</DropdownItem>
            </Dropdown>
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
