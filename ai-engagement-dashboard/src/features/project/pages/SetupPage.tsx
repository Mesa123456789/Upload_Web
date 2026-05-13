// ---------------------------------------------------------------------------
// SetupPage.tsx — Student Step 1: Game Info Setup
//
// Route: /project/setup
//
// This is the entry point of the student flow. The student fills in basic
// game info here, then moves to Step 2 (Build — Ads + IAP config).
//
// Reuses UploadForm (from the old /upload page) which already connects
// to createProject() in projects.service. After confirm, we navigate to
// /project/build passing the new project id via router state.
// ---------------------------------------------------------------------------

import { useState } from "react";
import { useNavigate } from "react-router-dom";

import PageContainer from "../../../app/layout/PageContainer";
import UploadForm from "../../upload/components/UploadForm";
import PreviewPanel from "../../upload/components/PreviewPanel";
import PreviewModal from "../../upload/components/PreviewModal";

import { useAuth } from "../../auth/context/AuthContext";
import { createProject } from "../../projects/services/projects.service";
import type { GameFormData } from "../../upload/components/UploadForm";
import type { DynamicSubmission } from "../../upload/types/submission";
import { mockData } from "../../critique/data/mockData";

// ---------------------------------------------------------------------------
// TODO: Replace with real course selector once courses UI is built.
// ---------------------------------------------------------------------------
const TEMP_COURSE_ID = "00000000-0000-0000-0000-000000000001";

// Step indicator shown at the top of each step page
function StepIndicator({ current }: { current: number }) {
  const steps = ["Setup", "Build", "Guardrail", "Output"];
  return (
    <div className="flex items-center gap-2 mb-6">
      {steps.map((label, i) => {
        const step = i + 1;
        const isActive = step === current;
        const isDone = step < current;
        return (
          <div key={label} className="flex items-center gap-2">
            <div
              className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${
                isActive
                  ? "bg-[#9E76B4] text-white"
                  : isDone
                  ? "bg-green-500 text-white"
                  : "bg-gray-100 text-gray-400"
              }`}
            >
              {isDone ? "✓" : step}
            </div>
            <span
              className={`text-sm font-medium ${
                isActive ? "text-gray-800" : "text-gray-400"
              }`}
            >
              {label}
            </span>
            {i < steps.length - 1 && (
              <div className="w-8 h-px bg-gray-200 mx-1" />
            )}
          </div>
        );
      })}
    </div>
  );
}

export default function SetupPage() {
  const { user } = useAuth();
  const [submissionData, setSubmissionData] = useState<DynamicSubmission | null>(null);
  const [pendingFormData, setPendingFormData] = useState<GameFormData | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const navigate = useNavigate();

  // Build a DynamicSubmission for the preview modal (display only — not what we save)
  const prepareDynamicData = (formData: GameFormData, isAIEnabled: boolean): DynamicSubmission => {
    const baseBlocks: any[] = [
      {
        type: "key-value",
        title: "Project Setup Context",
        data: {
          Genre: formData.genre.length > 0 ? formData.genre.join(", ") : "-",
          Platform: formData.platform.length > 0 ? formData.platform.join(", ") : "-",
          Target: formData.target_audience || "-",
          "Session Length": formData.session_length_min ? `${formData.session_length_min} min` : "-",
          Economy: formData.monetization.length > 0 ? formData.monetization.join(", ") : "-",
        },
      },
      {
        type: "header",
        title: "Core Mechanics Description",
        data: formData.core_mechanic || "No description provided.",
      },
    ];

    const aiBlocks: any[] = isAIEnabled
      ? [
          {
            type: "analysis-box",
            title: "AI Ethical Insights",
            data: { summary: mockData.highlights.hook || "Analyzing..." },
          },
          {
            type: "list",
            title: "Strategic Recommendations",
            data: mockData.recommendations || [],
          },
          {
            type: "list",
            title: "Implementation Checklist",
            data: mockData.checklist || [],
          },
        ]
      : [];

    return {
      userId: user?.id || "unknown",
      gameTitle: formData.title || "Untitled Project",
      timestamp: new Date().toISOString(),
      blocks: [...baseBlocks, ...aiBlocks],
    };
  };

  const handleFormPreview = (formData: GameFormData, isAIEnabled: boolean) => {
    setSubmissionData(prepareDynamicData(formData, isAIEnabled));
    setPendingFormData(formData);
  };

  const handleConfirmSubmission = async () => {
    if (!pendingFormData || !user) return;

    setIsProcessing(true);
    try {
      const { data, error } = await createProject({
        course_id: TEMP_COURSE_ID,
        student_id: user.id,
        title: pendingFormData.title,
        genre: pendingFormData.genre,
        platform: pendingFormData.platform,
        target_audience: pendingFormData.target_audience || null,
        session_length_min: pendingFormData.session_length_min,
        core_mechanic: pendingFormData.core_mechanic || null,
        monetization: pendingFormData.monetization,
      });

      if (error) {
        alert(`ไม่สามารถบันทึกข้อมูลได้: ${error}`);
        return;
      }

      setSubmissionData(null);
      setPendingFormData(null);

      // Pass project id to the next step via router state
      navigate("/project/build", { state: { projectId: data?.id } });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <PageContainer>
      <StepIndicator current={1} />

      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 tracking-tight">
          Step 1 — Project Setup
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          Fill in your game info. This sets the context for monetization analysis.
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-8 items-start relative">
        <section className="flex flex-col gap-6">
          <UploadForm onPreview={handleFormPreview} />
        </section>
        <section className="sticky top-8">
          <PreviewPanel />
        </section>
      </div>

      {submissionData && (
        <PreviewModal
          isOpen={!!submissionData}
          onClose={() => !isProcessing && setSubmissionData(null)}
          data={submissionData}
          onConfirm={handleConfirmSubmission}
          isProcessing={isProcessing}
        />
      )}
    </PageContainer>
  );
}
