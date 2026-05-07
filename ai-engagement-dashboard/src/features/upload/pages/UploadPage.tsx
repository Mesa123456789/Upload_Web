import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { collection, addDoc } from "firebase/firestore";
import { db, auth } from "../../../lib/firebase";

import PageContainer from "../../../app/layout/PageContainer";
import UploadForm, { type GameFormData } from "../components/UploadForm";

import { mockData } from "../../critique/data/mockData";
import type { DynamicSubmission } from "../types/submission";
import { getActiveClassCode, rememberLatestSubmission } from "../../../shared/session";

export default function UploadPage() {
  const [isProcessing, setIsProcessing] = useState(false);
  const navigate = useNavigate();

  const prepareDynamicData = (formData: GameFormData, isAIEnabled: boolean): DynamicSubmission => {
    const user = auth.currentUser;
    const baseBlocks: DynamicSubmission["blocks"] = [
      {
        type: "key-value",
        title: "Project Setup Context",
        data: {
          Genre: formData.genre.length > 0 ? formData.genre.join(", ") : "-",
          Target: formData.audience || "-",
          Platform: formData.platform || "-",
          "Player Goal": formData.playerGoal || "-",
          Economy: formData.monetization.length > 0 ? formData.monetization.join(", ") : "-",
          "Class Code": getActiveClassCode(),
        },
      },
      {
        type: "header",
        title: "Core Mechanics Description",
        data: formData.mechanic || "No description provided.",
      },
      {
        type: "key-value",
        title: "Engagement & Monetization Details",
        data: {
          "Reward Moment": formData.rewardMoment || "-",
          "Monetization Timing": formData.monetizationTiming || "-",
          "Pressure Points": formData.pressurePoint || "-",
        },
      },
    ];

    const aiBlocks: DynamicSubmission["blocks"] = isAIEnabled
      ? [
          {
            type: "analysis-box",
            title: "AI Ethical Insights",
            data: { summary: mockData.highlights.hook || "Analysis is ready." },
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
      userId: user?.uid || "guest_user",
      userEmail: user?.email || "student@example.com",
      userName: user?.displayName || "Demo Student",
      classCode: getActiveClassCode(),
      gameTitle: formData.title || "Untitled Project",
      genre: formData.genre,
      audience: formData.audience,
      mechanic: formData.mechanic,
      playerGoal: formData.playerGoal,
      rewardMoment: formData.rewardMoment,
      monetizationTiming: formData.monetizationTiming,
      pressurePoint: formData.pressurePoint,
      platform: formData.platform,
      monetization: formData.monetization,
      aiEnabled: isAIEnabled,
      savedToDashboard: false,
      timestamp: new Date().toISOString(),
      blocks: [...baseBlocks, ...aiBlocks],
    };
  };

  const handleSubmit = async (formData: GameFormData, isAIEnabled: boolean) => {
    setIsProcessing(true);
    const dynamicData = prepareDynamicData(formData, isAIEnabled);

    try {
      await addDoc(collection(db, "submissions"), dynamicData);
      rememberLatestSubmission(dynamicData);
      navigate("/critique");
    } catch (error) {
      console.error("Firebase Error:", error);
      rememberLatestSubmission(dynamicData);
      navigate("/critique");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <PageContainer>
      <div className="mx-auto max-w-5xl space-y-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Project Submission</h1>
            <p className="text-sm text-gray-500 mt-1">
              Provide your game design context and choose whether AI should analyze it.
            </p>
          </div>
          <div className="rounded-full bg-background-card px-4 py-2 text-xs font-bold text-primary shadow-sm border border-black/5">
            Class: {getActiveClassCode()}
          </div>
        </div>

        <UploadForm onPreview={handleSubmit} isProcessing={isProcessing} />
      </div>
    </PageContainer>
  );
}
