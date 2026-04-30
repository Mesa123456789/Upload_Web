import type { RefObject } from "react";
import type { DynamicSubmission } from "../types/submission"; // 1. เปลี่ยนมาใช้ Type ใหม่
import DocumentTemplate from "./DocumentTemplate";
import Button from "../../../shared/components/Button";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  data: DynamicSubmission; // 2. รับค่าเป็น Dynamic Schema
  onConfirm: () => void;
  printRef?: RefObject<HTMLDivElement | null>; // 3. ใส่ ? เผื่อหน้าไหนไม่ได้ใช้ Print
  isProcessing?: boolean;
}

export default function PreviewModal({ isOpen, onClose, data, onConfirm, printRef, isProcessing }: Props) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-10">
      <div className="relative bg-gray-100 w-full max-w-5xl h-full flex flex-col rounded-2xl shadow-2xl overflow-hidden">
        
        <div className="bg-white border-b p-4 flex justify-between items-center shrink-0">
          <div>
            <h3 className="text-xl font-bold text-gray-800">Review Submission</h3>
            <p className="text-xs text-gray-500 font-medium tracking-wide">PLEASE REVIEW YOUR DESIGN BEFORE SUBMITTING</p>
          </div>
          <div className="flex gap-3">
            <button 
              onClick={onClose}
              disabled={isProcessing}
              className="px-6 py-2 rounded-full border border-gray-300 text-gray-600 hover:bg-gray-50 transition-all font-bold cursor-pointer disabled:opacity-50"
            >
              Cancel
            </button>
            <Button onClick={onConfirm} disabled={isProcessing}>
              {isProcessing ? "Processing..." : "Confirm & Submit"}
            </Button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-12 bg-gray-200">
          <div className="scale-90 origin-top transform transition-all flex justify-center">
            {/* ถ้ามี printRef ส่งมาก็ครอบให้ ถ้าไม่มีก็วาดปกติ */}
            {printRef ? (
              <div ref={printRef}>
                <DocumentTemplate data={data} />
              </div>
            ) : (
              <DocumentTemplate data={data} />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}