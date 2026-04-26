import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { collection, addDoc } from "firebase/firestore";
import { db, auth } from "../../../lib/firebase"; 

// Layout & Components
import PageContainer from "../../../app/layout/PageContainer";
import UploadForm from "../components/UploadForm";
import PreviewPanel from "../components/PreviewPanel";
import PreviewModal from "../components/PreviewModal";

// Data & Types
import { mockData } from "../../critique/data/mockData";
import type { DynamicSubmission } from "../types/submission";

export default function UploadPage() {
  const [submissionData, setSubmissionData] = useState<any>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const navigate = useNavigate();

  /**
   * ฟังก์ชันเตรียมข้อมูลแบบ Flexible Schema
   * ดึงข้อมูลจากฟอร์ม (formData) มาผสมกับผลวิเคราะห์ AI (mockData)
   */
  const prepareDynamicData = (formData: any): DynamicSubmission => {
    // ป้องกันค่า undefined เพราะ Firestore จะ Error ถ้าเจอค่านี้
    return {
      userId: auth.currentUser?.uid || "guest_user",
      gameTitle: formData.title || "Untitled Project",
      timestamp: new Date().toISOString(),
      blocks: [
        { 
          type: 'key-value', 
          title: 'Project Setup Context', 
          data: { 
            Genre: formData.genre || "-", 
            Target: formData.audience || "-", 
            Economy: formData.monetization || "-" 
          } 
        },
        { 
          type: 'header', 
          title: 'Core Mechanics Description', 
          data: formData.mechanic || "No description provided." 
        },
        { 
          type: 'analysis-box', 
          title: 'AI Ethical Insights (Preview)', 
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
      ]
    };
  };

  // เมื่อกดยืนยันจากฟอร์ม ให้สร้างข้อมูลพรีวิวโชว์ใน Modal
  const handleFormPreview = (formData: any) => {
    const dynamicData = prepareDynamicData(formData);
    setSubmissionData(dynamicData);
  };

  /**
   * ฟังก์ชันกดยืนยันใน PreviewModal: บันทึกลง Firebase และย้ายหน้า
   */
  const handleConfirmSubmission = async () => {
    if (!submissionData) return;
    
    setIsProcessing(true);
    console.log("Starting Firebase Submission...", submissionData);

    try {
      // ตรวจสอบชื่อ Collection 'submissions' ให้ตรงกับใน Firebase Console นะครับ
      const docRef = await addDoc(collection(db, "submissions"), submissionData);
      
      console.log("✅ Saved to Firestore successfully! ID:", docRef.id);
      
      // เมื่อเซฟสำเร็จ ให้ปิด Modal และพาไปหน้า Critique ทันที
      setSubmissionData(null);
      navigate("/critique");

    } catch (error: any) {
      // ถ้า Error จะโชว์ใน Console แบบละเอียด
      console.error("❌ Firebase Error Detail:", error.code, error.message);
      alert(`ไม่สามารถบันทึกข้อมูลได้: ${error.message}`);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <PageContainer>
      <div className="grid md:grid-cols-2 gap-8 items-start">
        {/* ฝั่งซ้าย: ส่วนของฟอร์ม */}
        <section className="flex flex-col gap-6">
          <div className="mb-2">
            <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Project Submission</h1>
            <p className="text-sm text-gray-500 mt-1">
              Configure your monetization parameters for ethical analysis.
            </p>
          </div>
          
          <UploadForm onPreview={handleFormPreview} />
        </section>

        {/* ฝั่งขวา: Preview Panel เดิม */}
        <section className="sticky top-8">
          <PreviewPanel />
        </section>
      </div>

      {/* Modal พรีวิว A4 ก่อนกดยืนยันบันทึกข้อมูล */}
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