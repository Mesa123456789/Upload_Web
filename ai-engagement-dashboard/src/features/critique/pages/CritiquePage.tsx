import { useRef, useEffect, useState } from "react";
import { useReactToPrint } from "react-to-print";
import { collection, query, orderBy, limit, getDocs } from "firebase/firestore";
import { db } from "../../../lib/firebase";

import PageContainer from "../../../app/layout/PageContainer";
import EngagementFunnel from "../components/EngagementFunnel";
import AIRecommendations from "../components/AIRecommendations";
import ActionableChecklist from "../components/ActionableChecklist";
import DiscrepancyAnalysis from "../components/DiscrepancyAnalysis";
import DiscrepancyGraph from "../components/DiscrepancyGraph";
import HighPressureWarning from "../components/HighPressureWarning";
import MiniEngagementGraph from "../components/MiniEngagementGraph";
import AnalysisHighlights from "../components/AnalysisHighlights";
import Dropdown, { DropdownItem } from "../../../shared/components/Dropdown";
import DocumentTemplate from "../../upload/components/DocumentTemplate";

// mockData ยังเอาไว้เป็น fallback กรณี Firebase โหลดไม่ได้
import { mockData } from "../data/mockData";
import type { DynamicSubmission } from "../../upload/types/submission";

export default function CritiquePage() {
  const printRef = useRef<HTMLDivElement>(null);

  // State เก็บข้อมูลจาก Firebase
  const [submission, setSubmission] = useState<DynamicSubmission | null>(null);
  const [loading, setLoading] = useState(true);

  // ดึง submission ล่าสุดจาก Firestore
  useEffect(() => {
    const fetchLatest = async () => {
      try {
        const q = query(
          collection(db, "submissions"),
          orderBy("timestamp", "desc"),
          limit(1)
        );
        const snapshot = await getDocs(q);

        if (!snapshot.empty) {
          setSubmission(snapshot.docs[0].data() as DynamicSubmission);
        }
      } catch (err) {
        console.error("❌ Failed to fetch submission:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchLatest();
  }, []);

  const handlePrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: `AI_Critique_Report_${Date.now()}`,
  });

  // ถ้า Firebase โหลดยังไม่เสร็จ
  if (loading) {
    return (
      <PageContainer>
        <div className="flex items-center justify-center h-64 text-primary font-medium animate-pulse">
          Loading latest analysis...
        </div>
      </PageContainer>
    );
  }

  // ข้อมูลที่จะใช้ใน UI หลัก ยังเป็น mockData อยู่ก่อน
  // (เดี๋ยว phase ต่อไปค่อย map จาก submission มาแทน)
  const data = mockData;

  // ข้อมูลที่จะใช้ใน PDF — ถ้ามี submission จาก Firebase ใช้อันนั้น ไม่งั้น fallback mockData
  const printData: DynamicSubmission = submission ?? {
    userId: "guest_user",
    gameTitle: "AI Critique Report",
    timestamp: new Date().toISOString(),
    blocks: [
      {
        type: "analysis-box",
        title: "AI Executive Summary",
        data: { summary: data.highlights.hook + " " + data.highlights.reward },
      },
      {
        type: "key-value",
        title: "Performance Overview",
        data: {
          "Risk Level": data.highlights.risk,
          "Consistency": data.highlights.consistency,
          "Completion Rate": data.funnel.completionRate,
        },
      },
      { type: "list", title: "Critical Recommendations", data: data.recommendations },
      { type: "list", title: "Actionable Checklist", data: data.checklist },
    ],
  };

  return (
    <PageContainer>
      <div className="space-y-10">

        {/* TOP BAR ACTIONS */}
        <div className="flex justify-between items-center">
          {/* แสดงชื่อ game จาก Firebase ถ้ามี */}
          {submission && (
            <p className="text-sm text-gray-500">
              Showing result for: <span className="font-bold text-primary">{submission.gameTitle}</span>
            </p>
          )}
          <div className="ml-auto">
            <Dropdown
              trigger={
                <button className="bg-background-card border border-primary/20 text-primary px-5 py-2 rounded-full shadow-sm hover:bg-white flex items-center gap-2 transition text-sm font-bold cursor-pointer">
                  Actions
                  <span className="text-[10px] opacity-60">▼</span>
                </button>
              }
              align="right"
            >
              <DropdownItem onClick={handlePrint}>Download PDF Report</DropdownItem>
              <DropdownItem>Share with Team</DropdownItem>
              <DropdownItem>Export Data (CSV)</DropdownItem>
              <DropdownItem className="text-blue-600 font-medium">Save to Dashboard</DropdownItem>
            </Dropdown>
          </div>
        </div>

        {/* PAGE 1 */}
        <div className="space-y-6">
          <div className="bg-primary text-background-card rounded-2xl p-5 font-bold flex justify-between items-center shadow-sm">
            <span className="text-lg">{submission?.gameTitle ?? "Treasure Raid - Aggressive CTA"}</span>
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

      {/* Hidden A4 สำหรับ print — ใช้ข้อมูลจาก Firebase */}
      <div className="hidden">
        <div ref={printRef} className="p-8">
          <DocumentTemplate data={printData as any} />
        </div>
      </div>

    </PageContainer>
  );
}