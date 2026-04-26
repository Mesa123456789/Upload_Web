import { useState } from "react";
import Card from "../../../shared/components/Card";
import Button from "../../../shared/components/Button";
import Select from "../../../shared/components/Select";

// กำหนดตัวเลือกจาก Constants
const GENRE_OPTIONS = [
  "RPG / Adventure",
  "Action / Shooter",
  "Casual / Puzzle",
  "Simulation / Strategy"
];

const MONETIZATION_OPTIONS = [
  "Ads-Supported (Rewarded/Interstitial)",
  "In-App Purchases (IAP)",
  "Hybrid Model (Ads + IAP)"
];

interface UploadFormProps {
  onPreview: (formData: any) => void;
}

export default function UploadForm({ onPreview }: UploadFormProps) {
  // สร้าง State สำหรับเก็บข้อมูลฟอร์ม
  const [formData, setFormData] = useState({
    title: "",
    genre: "RPG / Adventure",
    audience: "",
    mechanic: "",
    monetization: "Ads-Supported (Rewarded/Interstitial)"
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // ส่งข้อมูลกลับไปที่หน้าหลักเพื่อทำ Preview
    onPreview(formData);
  };

  return (
    <Card>
      <form onSubmit={handleSubmit} className="space-y-5 p-2">
        <div className="border-b pb-3 mb-2">
          <h2 className="text-lg font-bold text-gray-800 uppercase tracking-wide">Project Context</h2>
        </div>

        {/* Game Title */}
        <div>
          <label className="block text-xs font-bold text-gray-500 uppercase mb-1.5 ml-1">Game Title</label>
          <input 
            type="text"
            required
            className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#9E76B4]/20 focus:border-[#9E76B4] outline-none transition-all"
            placeholder="e.g. Project Ethical Quest"
            value={formData.title}
            onChange={(e) => setFormData({...formData, title: e.target.value})}
          />
        </div>

        {/* Genre & Monetization Selection */}
        <div className="grid grid-cols-2 gap-4">
          <Select 
            label="Game Genre" 
            options={GENRE_OPTIONS}
            value={formData.genre}
            onChange={(val) => setFormData({...formData, genre: val})}
          />
          <Select 
            label="Monetization Strategy" 
            options={MONETIZATION_OPTIONS}
            value={formData.monetization}
            onChange={(val) => setFormData({...formData, monetization: val})}
          />
        </div>

        {/* Target Audience */}
        <div>
          <label className="block text-xs font-bold text-gray-500 uppercase mb-1.5 ml-1">Target Audience</label>
          <input 
            type="text"
            className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#9E76B4]/20 focus:border-[#9E76B4] outline-none transition-all"
            placeholder="e.g. Competitive mobile players aged 18-25"
            value={formData.audience}
            onChange={(e) => setFormData({...formData, audience: e.target.value})}
          />
        </div>

        {/* Mechanics Description */}
        <div>
          <label className="block text-xs font-bold text-gray-500 uppercase mb-1.5 ml-1">Core Mechanics & Game Loop</label>
          <textarea 
            className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#9E76B4]/20 focus:border-[#9E76B4] outline-none transition-all h-32 resize-none"
            placeholder="Describe how the core gameplay interacts with monetization moments..."
            value={formData.mechanic}
            onChange={(e) => setFormData({...formData, mechanic: e.target.value})}
          />
        </div>

        {/* Submit Action */}
        <div className="pt-2">
          <Button type="submit" className="w-full py-3 shadow-lg shadow-[#9E76B4]/10">
            Generate Analysis & Preview Report
          </Button>
        </div>
      </form>
    </Card>
  );
}