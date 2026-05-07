import { useRef, useEffect, useState } from "react";
import { useReactToPrint } from "react-to-print";
import { collection, query, orderBy, limit, getDocs } from "firebase/firestore";
import { db, auth } from "../../../lib/firebase";

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
import Card from "../../../shared/components/Card";
import DocumentTemplate from "../../upload/components/DocumentTemplate";

import { mockData } from "../data/mockData";
import type { DynamicSubmission } from "../../upload/types/submission";
import {
  getRememberedLatestSubmission,
  rememberLatestSubmission,
  saveAnalysisLocally,
} from "../../../shared/session";

function ChipList({ items, emptyText }: { items?: string[]; emptyText: string }) {
  const visibleItems = items && items.length > 0 ? items : [emptyText];

  return (
    <div className="flex flex-wrap gap-2">
      {visibleItems.map((item) => (
        <span
          key={item}
          className="rounded-full bg-primary/10 px-3 py-1.5 text-xs font-bold text-primary ring-1 ring-primary/10"
        >
          {item}
        </span>
      ))}
    </div>
  );
}

export default function CritiquePage() {
  const printRef = useRef<HTMLDivElement>(null);
  const [submission, setSubmission] = useState<DynamicSubmission | null>(getRememberedLatestSubmission());
  const [loading, setLoading] = useState(!submission);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const fetchLatest = async () => {
      try {
        const currentUserId = auth.currentUser?.uid || "guest_user";
        const q = query(collection(db, "submissions"), orderBy("timestamp", "desc"), limit(12));
        const snapshot = await getDocs(q);
        const matchingDoc =
          snapshot.docs.find((doc) => {
            const item = doc.data() as DynamicSubmission;
            return item.userId === currentUserId;
          }) || snapshot.docs[0];

        if (matchingDoc) {
          const latest = matchingDoc.data() as DynamicSubmission;
          setSubmission(latest);
          rememberLatestSubmission(latest);
        }
      } catch (err) {
        console.error("Failed to fetch submission:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchLatest();
  }, []);

  const data = mockData;

  const printData: DynamicSubmission = submission ?? {
    userId: "guest_user",
    userEmail: "student@example.com",
    userName: "Demo Student",
    classCode: "CLASS-DEMO",
    gameTitle: "AI Critique Report",
    timestamp: new Date().toISOString(),
    aiEnabled: true,
    blocks: [
      {
        type: "analysis-box",
        title: "AI Executive Summary",
        data: { summary: `${data.highlights.hook} ${data.highlights.reward}` },
      },
      {
        type: "key-value",
        title: "Performance Overview",
        data: {
          "Risk Level": data.highlights.risk,
          Consistency: data.highlights.consistency,
          "Completion Rate": data.funnel.completionRate,
        },
      },
      { type: "list", title: "Critical Recommendations", data: data.recommendations },
      { type: "list", title: "Actionable Checklist", data: data.checklist },
    ],
  };

  const pdfData: DynamicSubmission = {
    ...printData,
    blocks: [
      {
        type: "key-value",
        title: "Submitted Game Information",
        data: {
          "Game Title": printData.gameTitle,
          "Game Genre": (printData.genre || []).join(", ") || "No genre selected",
          "Monetization Strategy": (printData.monetization || []).join(", ") || "No monetization selected",
          "Target Audience": printData.audience || "No target audience provided",
          "Platform / Device": printData.platform || "-",
          "Player Goal / Win Condition": printData.playerGoal || "-",
        },
      },
      {
        type: "header",
        title: "Core Mechanics & Game Loop",
        data: printData.mechanic || "No mechanics description provided.",
      },
      {
        type: "key-value",
        title: "Engagement & Monetization Details",
        data: {
          "Reward Moment": printData.rewardMoment || "-",
          "Monetization Timing": printData.monetizationTiming || "-",
          "Player Pressure Points": printData.pressurePoint || "-",
        },
      },
      {
        type: "key-value",
        title: "AI Analysis Overview",
        data: {
          "Risk Level": data.highlights.risk,
          Consistency: data.highlights.consistency,
          "Completion Rate": data.funnel.completionRate,
          "Tap Time": data.funnel.tapTime,
          "Reward Time": data.funnel.rewardTime,
          "CTA Shown": data.funnel.ctaShown,
        },
      },
      {
        type: "list",
        title: "Analysis Highlights",
        data: [
          { title: data.highlights.hook },
          { title: data.highlights.reward },
          { title: data.highlights.cta },
        ],
      },
      {
        type: "list",
        title: "AI Recommendations",
        data: data.recommendations,
      },
      {
        type: "list",
        title: "Actionable Checklist",
        data: data.checklist,
      },
      {
        type: "list",
        title: "High Pressure Warnings",
        data: [
          { title: data.highPressure.warning1 },
          { title: data.highPressure.warning2 },
        ],
      },
      {
        type: "key-value",
        title: "Graph Metrics",
        data: Object.fromEntries(data.graphMetrics.map((metric) => [metric.label, metric.value])),
      },
      {
        type: "list",
        title: "Observed vs Expected Flow",
        data: [
          {
            title: "Expected",
            description: data.expectedFlow.map((step) => step.label).join(" -> "),
          },
          {
            title: "Observed",
            description: data.observedFlow.map((step) => step.label).join(" -> "),
          },
        ],
      },
      {
        type: "list",
        title: "Engagement Graph Points",
        data: data.graph.map((point) => ({
          title: point.label,
          description: `Expected ${point.expected}, observed ${point.observed}`,
        })),
      },
    ],
  };

  const handlePrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: `AI_Critique_Report_${printData.gameTitle.replace(/\s+/g, "_")}`,
  });

  const handleCsvExport = () => {
    const rows = [
      ["Field", "Value"],
      ["Game Title", printData.gameTitle],
      ["Class Code", printData.classCode || ""],
      ["Student Email", printData.userEmail || ""],
      ["Genres", (printData.genre || []).join(", ")],
      ["Audience", printData.audience || ""],
      ["Platform", printData.platform || ""],
      ["Player Goal", printData.playerGoal || ""],
      ["Mechanics", printData.mechanic || ""],
      ["Reward Moment", printData.rewardMoment || ""],
      ["Monetization Timing", printData.monetizationTiming || ""],
      ["Pressure Points", printData.pressurePoint || ""],
      ["Monetization", (printData.monetization || []).join(", ")],
      ["AI Enabled", printData.aiEnabled ? "Yes" : "No"],
      ["Risk", data.highlights.risk],
      ["Consistency", data.highlights.consistency],
      ["Completion Rate", data.funnel.completionRate],
      ["Recommendations", data.recommendations.map((item) => `${item.title} ${item.description || ""}`).join(" | ")],
    ];
    const csv = rows
      .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(","))
      .join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${printData.gameTitle.replace(/\s+/g, "_")}_critique.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleSaveToDashboard = () => {
    saveAnalysisLocally(printData);
    setSaved(true);
  };

  if (loading) {
    return (
      <PageContainer>
        <div className="flex h-64 items-center justify-center font-medium text-primary animate-pulse">
          Loading latest analysis...
        </div>
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <div className="space-y-10">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-primary-light">
              Critique Result
            </p>
            <h1 className="mt-1 text-2xl font-bold text-gray-900">{printData.gameTitle}</h1>
            <p className="mt-1 text-sm text-gray-500">
              Class {printData.classCode || "CLASS-DEMO"} - {printData.aiEnabled ? "AI analysis enabled" : "Manual submission"}
            </p>
          </div>

          <div className="relative z-30 w-fit">
            <Dropdown
              trigger={
                <button className="flex cursor-pointer items-center justify-center gap-2 rounded-full border border-primary/20 bg-background-card px-5 py-2 text-sm font-bold text-primary shadow-sm transition hover:bg-white">
                  Actions
                  <span className="text-[10px] opacity-60">v</span>
                </button>
              }
              align="left"
            >
              <DropdownItem onClick={handlePrint}>Export PDF</DropdownItem>
              <DropdownItem onClick={handleCsvExport}>Export CSV</DropdownItem>
              <DropdownItem onClick={handleSaveToDashboard} className="font-medium text-blue-600">
                {saved ? "Saved to Dashboard" : "Save to Dashboard"}
              </DropdownItem>
            </Dropdown>
          </div>
        </div>

        <section>
          <Card>
            <div className="space-y-6">
              <div className="border-l-4 border-primary-light pl-4">
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-primary-light">
                  Game Title
                </p>
                <h2 className="mt-1 break-words text-xl font-bold text-primary sm:text-2xl">
                  {printData.gameTitle}
                </h2>
              </div>

              <div className="grid gap-5 px-0 sm:px-1 md:grid-cols-3">
                <div>
                  <p className="mb-2 text-xs font-bold uppercase tracking-[0.14em] text-gray-400">
                    Game Genre
                  </p>
                  <ChipList items={printData.genre} emptyText="No genre selected" />
                </div>

                <div>
                  <p className="mb-2 text-xs font-bold uppercase tracking-[0.14em] text-gray-400">
                    Monetization Strategy
                  </p>
                  <ChipList items={printData.monetization} emptyText="No monetization selected" />
                </div>

                <div>
                  <p className="mb-2 text-xs font-bold uppercase tracking-[0.14em] text-gray-400">
                    Target Audience
                  </p>
                  <ChipList
                    items={printData.audience ? [printData.audience] : undefined}
                    emptyText="No target audience provided"
                  />
                </div>

                <div>
                  <p className="mb-2 text-xs font-bold uppercase tracking-[0.14em] text-gray-400">
                    Platform / Device
                  </p>
                  <ChipList
                    items={printData.platform ? [printData.platform] : undefined}
                    emptyText="No platform provided"
                  />
                </div>

                <div>
                  <p className="mb-2 text-xs font-bold uppercase tracking-[0.14em] text-gray-400">
                    Player Goal / Win Condition
                  </p>
                  <ChipList
                    items={printData.playerGoal ? [printData.playerGoal] : undefined}
                    emptyText="No goal provided"
                  />
                </div>
              </div>

              <div className="rounded-2xl bg-background-main/70 p-5 ring-1 ring-black/5">
                <p className="text-xs font-bold uppercase tracking-[0.14em] text-gray-400">
                  Core Mechanics & Game Loop
                </p>
                <p className="mt-3 whitespace-pre-wrap text-sm leading-7 text-gray-700">
                  {printData.mechanic || "No mechanics description provided."}
                </p>
              </div>

              <div className="grid gap-4 md:grid-cols-3">
                <div className="rounded-2xl bg-background-main/70 p-5 ring-1 ring-black/5">
                  <p className="text-xs font-bold uppercase tracking-[0.14em] text-gray-400">
                    Reward Moment
                  </p>
                  <p className="mt-3 whitespace-pre-wrap text-sm leading-7 text-gray-700">
                    {printData.rewardMoment || "No reward moment provided."}
                  </p>
                </div>

                <div className="rounded-2xl bg-background-main/70 p-5 ring-1 ring-black/5">
                  <p className="text-xs font-bold uppercase tracking-[0.14em] text-gray-400">
                    Monetization Timing
                  </p>
                  <p className="mt-3 whitespace-pre-wrap text-sm leading-7 text-gray-700">
                    {printData.monetizationTiming || "No monetization timing provided."}
                  </p>
                </div>

                <div className="rounded-2xl bg-background-main/70 p-5 ring-1 ring-black/5">
                  <p className="text-xs font-bold uppercase tracking-[0.14em] text-gray-400">
                    Player Pressure Points
                  </p>
                  <p className="mt-3 whitespace-pre-wrap text-sm leading-7 text-gray-700">
                    {printData.pressurePoint || "No pressure points provided."}
                  </p>
                </div>
              </div>
            </div>
          </Card>
        </section>

        <section className="space-y-6">
          <div className="rounded-2xl bg-background-card p-6 shadow-sm ring-1 ring-black/5">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="border-l-4 border-primary-light pl-4">
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-primary-light">
                  AI Analysis
                </p>
                <h2 className="mt-1 text-xl font-bold text-primary">
                  Engagement critique and recommendations
                </h2>
              </div>
              <div className="rounded-full bg-primary/10 px-4 py-2 text-xs font-bold text-primary">
                {data.highlights.risk} risk / {data.highlights.consistency} consistency
              </div>
            </div>

            <div className="mt-6 grid gap-6 md:grid-cols-2">
              <EngagementFunnel data={data.funnel} />
              <AnalysisHighlights highlights={data.highlights} />
              <div className="space-y-6">
                <AIRecommendations items={data.recommendations} />
                <ActionableChecklist items={data.checklist} />
              </div>
              <div className="space-y-6">
                <MiniEngagementGraph />
                <HighPressureWarning
                  warning1={data.highPressure.warning1}
                  warning2={data.highPressure.warning2}
                />
              </div>
            </div>
          </div>

          <div className="grid gap-6 md:grid-cols-3">
            <div className="space-y-6 md:col-span-2">
              <div className="rounded-2xl bg-primary p-5 text-background-card">
                <h3 className="text-lg font-bold">Observed vs Expected - Design Critique</h3>
                <p className="mt-1 text-sm text-background-card/75">
                  Comparison between intended player flow and likely engagement behavior.
                </p>
              </div>
              <DiscrepancyAnalysis expected={data.expectedFlow} observed={data.observedFlow} />
              <DiscrepancyGraph data={data.graph} metrics={data.graphMetrics} />
            </div>
            <div className="space-y-6">
              <AIRecommendations items={data.recommendations} />
              <ActionableChecklist items={data.checklist} />
            </div>
          </div>
        </section>
      </div>

      <div className="hidden">
        <div ref={printRef} className="p-8">
          <DocumentTemplate data={pdfData} />
        </div>
      </div>
    </PageContainer>
  );
}
