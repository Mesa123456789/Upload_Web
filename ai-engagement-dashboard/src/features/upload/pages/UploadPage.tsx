import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { collection, addDoc } from "firebase/firestore";
import { db, auth } from "../../../lib/firebase"; 

import PageContainer from "../../../app/layout/PageContainer";
import UploadForm from "../components/UploadForm";
import PreviewPanel from "../components/PreviewPanel";
import PreviewModal from "../components/PreviewModal";

import { mockData } from "../../critique/data/mockData";
import type { DynamicSubmission } from "../types/submission";

export default function UploadPage() {
  const [submissionData, setSubmissionData] = useState<DynamicSubmission | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const navigate = useNavigate();

  const prepareDynamicData = (formData: any, isAIEnabled: boolean): DynamicSubmission => {
    const baseBlocks: any[] = [
      { 
        type: 'key-value', 
        title: 'Project Setup Context', 
        data: { 
          // เช็คว่ามีค่าไหม ถ้าเป็น array ก็ join ด้วยลูกน้ำ
          Genre: formData.genre?.length > 0 ? formData.genre.join(", ") : "-", 
          Target: formData.audience || "-", 
          Economy: formData.monetization?.length > 0 ? formData.monetization.join(", ") : "-" 
        } 
      },
      { 
        type: 'header', 
        title: 'Core Mechanics Description', 
        data: formData.mechanic || "No description provided." 
      }
    ];

    const aiBlocks: any[] = isAIEnabled ? [
      { 
        type: 'analysis-box', 
        title: 'AI Ethical Insights', 
        data: { summary: mockData.highlights.hook || "Analyzing..." } 
      },
      { 
        type: 'list', 
        title: 'Strategic Recommendations', 
        data: mockData.recommendations || [] 
      },
      { 
        type: 'list', 
        title: 'Implementation Checklist', 
        data: mockData.checklist || [] 
      }
    ] : [];

    return {
      userId: auth.currentUser?.uid || "guest_user",
      gameTitle: formData.title || "Untitled Project",
      timestamp: new Date().toISOString(),
      blocks: [...baseBlocks, ...aiBlocks]
    };
  };

  const handleFormPreview = (formData: any, isAIEnabled: boolean) => {
    const dynamicData = prepareDynamicData(formData, isAIEnabled);
    setSubmissionData(dynamicData);
  };

  const handleConfirmSubmission = async () => {
    if (!submissionData) return;
    
    setIsProcessing(true);
    try {
      const docRef = await addDoc(collection(db, "submissions"), submissionData);
      console.log("✅ Saved to Firestore successfully! ID:", docRef.id);
      
      setSubmissionData(null);
      navigate("/critique");

    } catch (error: any) {
      console.error("❌ Firebase Error:", error);
      alert(`ไม่สามารถบันทึกข้อมูลได้: ${error.message}`);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <PageContainer>
      {/* 🚀 ย้าย Page Header ออกมาข้างนอก Grid แล้ว! */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Project Submission</h1>
        <p className="text-sm text-gray-500 mt-1">
          Provide your game design context. Choose whether to enable AI analysis for ethical review.
        </p>
      </div>

      {/* 🚀 ทีนี้ Card ฝั่งซ้ายกับขวาจะเริ่มที่ระดับเดียวกันเป๊ะ */}
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