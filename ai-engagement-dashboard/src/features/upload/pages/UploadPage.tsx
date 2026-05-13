// ---------------------------------------------------------------------------
// UploadPage.tsx — Step 1: Setup
//
// What changed from the old version:
//   - Removed Firebase imports (addDoc, collection, db, auth)
//   - Now uses projects.service.createProject() → saves to Supabase
//   - Gets student_id from useAuth() instead of auth.currentUser
//   - course_id is hardcoded as TODO until course selector UI is built
//   - Form data shape now matches GameFormData (renamed fields)
// ---------------------------------------------------------------------------

import { useState } from "react";
import { useNavigate } from "react-router-dom";

import PageContainer from "../../../app/layout/PageContainer";
import UploadForm from "../components/UploadForm";
import PreviewPanel from "../components/PreviewPanel";
import PreviewModal from "../components/PreviewModal";

import { useAuth } from "../../auth/context/AuthContext";
import { createProject } from "../../projects/services/projects.service";
import type { GameFormData } from "../components/UploadForm";
import type { DynamicSubmission } from "../types/submission";
import { mockData } from "../../critique/data/mockData";

export default function UploadPage() {
  const { user } = useAuth(); // get the logged-in user from AuthContext
  const [submissionData, setSubmissionData] = useState<DynamicSubmission | null>(null);
  const [pendingFormData, setPendingFormData] = useState<GameFormData | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const navigate = useNavigate();

  // Build a DynamicSubmission for the PreviewModal (display only, not what we save to DB)
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
    const dynamicData = prepareDynamicData(formData, isAIEnabled);
    setSubmissionData(dynamicData);
    setPendingFormData(formData); // keep raw form data for the actual DB insert
  };

  const handleConfirmSubmission = async () => {
    if (!pendingFormData || !user) return;

    setIsProcessing(true);
    try {
      const { data, error } = await createProject({
        course_id: null,                  // personal project — no course assigned
        owner_id: user.id,                // matches profiles.id (schema uses owner_id)
        title: pendingFormData.title,
        genre: pendingFormData.genre,
        platform: pendingFormData.platform,
        target_audience: pendingFormData.target_audience || null,
        // session_length_min (number) → session_length (text) in new schema
        session_length: pendingFormData.session_length_min
          ? `${pendingFormData.session_length_min} min`
          : null,
        core_mechanic: pendingFormData.core_mechanic || null,
      });

      if (error) {
        // If RLS blocks the insert, error message will say "permission denied" or similar
        alert(`ไม่สามารถบันทึกข้อมูลได้: ${error}`);
        return;
      }

      console.log("Saved to Supabase. Project ID:", data?.id);
      setSubmissionData(null);
      setPendingFormData(null);
      navigate("/critique");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <PageContainer>
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Project Submission</h1>
        <p className="text-sm text-gray-500 mt-1">
          Provide your game design context. Choose whether to enable AI analysis for ethical review.
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
