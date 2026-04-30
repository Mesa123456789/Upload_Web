import React, { useState } from "react";
import Card from "../../../shared/components/Card";
import Button from "../../../shared/components/Button";
// import Select from "../../../shared/components/Select";

// ---------------------------------------------------------------------------
// 1. Types & Interfaces
// ---------------------------------------------------------------------------

export interface GameFormData {
  title: string;
  genre: string[];
  audience: string;
  mechanic: string;
  monetization: string[];
}

interface UploadFormProps {
  onPreview: (formData: GameFormData, isAIEnabled: boolean) => void;
}

// ---------------------------------------------------------------------------
// 2. Constants (อัปเดต Genre ใหม่ แยกให้ชัดเจน และเพิ่มความหลากหลาย)
// ---------------------------------------------------------------------------

const GENRE_OPTIONS = [
  { label: "Action", value: "Action" },
  { label: "RPG", value: "RPG" },
  { label: "Shooter", value: "Shooter" },
  { label: "Strategy", value: "Strategy" },
  { label: "Simulation", value: "Simulation" },
  { label: "Survival", value: "Survival" },
  { label: "Horror", value: "Horror" },
  { label: "Puzzle", value: "Puzzle" },
  { label: "Casual", value: "Casual" },
  { label: "Platformer", value: "Platformer" },
  { label: "Sports / Racing", value: "Sports" },
  { label: "Visual Novel", value: "Visual Novel" },
  { label: "Idle / Clicker", value: "Idle" }
];

const MONETIZATION_OPTIONS = [
  { label: "Ads (Rewarded/Interstitial)", value: "Ads" },
  { label: "In-App Purchases (IAP)", value: "IAP" },
  { label: "Premium / Paid Upfront", value: "Premium" },
  { label: "Battle Pass / Subscription", value: "Subscription" }
];

// ---------------------------------------------------------------------------
// 3. Main Component
// ---------------------------------------------------------------------------

export default function UploadForm({ onPreview }: UploadFormProps) {
  const [formData, setFormData] = useState<GameFormData>({
    title: "",
    genre: ["RPG"],
    audience: "",
    mechanic: "",
    monetization: ["Ads"]
  });

  const [isAIEnabled, setIsAIEnabled] = useState(true);
  
  // State สำหรับเปิด/ปิด Show More ของ Genre
  const [isGenreExpanded, setIsGenreExpanded] = useState(false);

  const toggleSelection = (field: 'genre' | 'monetization', value: string) => {
    setFormData((prev) => {
      const currentList = prev[field];
      if (currentList.includes(value)) {
        return { ...prev, [field]: currentList.filter(item => item !== value) };
      } else {
        return { ...prev, [field]: [...currentList, value] };
      }
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onPreview(formData, isAIEnabled);
  };

  // กำหนดจำนวน Genre ที่จะโชว์ตอนยังไม่กด Show More
  const INITIAL_GENRE_COUNT = 7;
  const displayedGenres = isGenreExpanded 
    ? GENRE_OPTIONS 
    : GENRE_OPTIONS.slice(0, INITIAL_GENRE_COUNT);

  return (
    <Card>
      <form onSubmit={handleSubmit} className="space-y-6 p-6">
        
        <div className="border-b border-gray-100 pb-4 mb-2">
          <h2 className="text-xl font-bold text-gray-800">
            Project Context
          </h2>
          <p className="text-sm text-gray-500 mt-1">
            Provide details for evaluation
          </p>
        </div>

        {/* Input: Game Title */}
        <div>
          <label htmlFor="game-title" className="block text-xs font-bold text-gray-500 uppercase mb-1.5 ml-1">
            Game Title <span className="text-red-400">*</span>
          </label>
          <input 
            id="game-title"
            type="text"
            required
            className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#9E76B4]/20 focus:border-[#9E76B4] outline-none transition-all text-gray-800"
            placeholder="e.g. Project Ethical Quest"
            value={formData.title}
            onChange={(e) => setFormData({...formData, title: e.target.value})}
          />
        </div>

        {/* Multi-Select: Genre (Pills UI + Show More) */}
        <div>
          <label className="block text-xs font-bold text-gray-500 uppercase mb-1.5 ml-1">
            Game Genre <span className="text-xs normal-case font-normal text-gray-400">(Select multiple)</span>
          </label>
          <div className="flex flex-wrap gap-2">
            {displayedGenres.map((opt) => {
              const isSelected = formData.genre.includes(opt.value);
              return (
                <button
                  type="button"
                  key={opt.value}
                  onClick={() => toggleSelection('genre', opt.value)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                    isSelected 
                      ? 'bg-[#9E76B4] text-white shadow-md shadow-[#9E76B4]/30' 
                      : 'bg-gray-50 text-gray-600 border border-gray-200 hover:bg-gray-100 hover:border-gray-300'
                  }`}
                >
                  {opt.label}
                </button>
              );
            })}
            
            {/* ปุ่ม Show More / Less */}
            {GENRE_OPTIONS.length > INITIAL_GENRE_COUNT && (
              <button
                type="button"
                onClick={() => setIsGenreExpanded(!isGenreExpanded)}
                className="px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-200 bg-gray-100 text-gray-500 hover:bg-gray-200 border border-transparent"
              >
                {isGenreExpanded ? "− Less" : `+ ${GENRE_OPTIONS.length - INITIAL_GENRE_COUNT} More`}
              </button>
            )}
          </div>
        </div>

        {/* Multi-Select: Monetization (Pills UI) */}
        <div>
          <label className="block text-xs font-bold text-gray-500 uppercase mb-1.5 ml-1">
            Monetization Strategy <span className="text-xs normal-case font-normal text-gray-400">(Select multiple)</span>
          </label>
          <div className="flex flex-wrap gap-2">
            {MONETIZATION_OPTIONS.map((opt) => {
              const isSelected = formData.monetization.includes(opt.value);
              return (
                <button
                  type="button"
                  key={opt.value}
                  onClick={() => toggleSelection('monetization', opt.value)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                    isSelected 
                      ? 'bg-[#9E76B4] text-white shadow-md shadow-[#9E76B4]/30' 
                      : 'bg-gray-50 text-gray-600 border border-gray-200 hover:bg-gray-100 hover:border-gray-300'
                  }`}
                >
                  {opt.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Input: Target Audience */}
        <div>
          <label htmlFor="target-audience" className="block text-xs font-bold text-gray-500 uppercase mb-1.5 ml-1">
            Target Audience
          </label>
          <input 
            id="target-audience"
            type="text"
            className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#9E76B4]/20 focus:border-[#9E76B4] outline-none transition-all text-gray-800"
            placeholder="e.g. Competitive mobile players aged 18-25"
            value={formData.audience}
            onChange={(e) => setFormData({...formData, audience: e.target.value})}
          />
        </div>

        {/* Textarea: Core Mechanics */}
        <div>
          <label htmlFor="core-mechanics" className="block text-xs font-bold text-gray-500 uppercase mb-1.5 ml-1">
            Core Mechanics & Game Loop
          </label>
          <textarea 
            id="core-mechanics"
            className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#9E76B4]/20 focus:border-[#9E76B4] outline-none transition-all h-32 resize-none text-gray-800"
            placeholder="Describe how players progress and interact with monetization moments..."
            value={formData.mechanic}
            onChange={(e) => setFormData({...formData, mechanic: e.target.value})}
          />
        </div>

        {/* Action Buttons */}
        <div className="pt-6 border-t border-gray-100 flex items-center justify-end gap-3">
          <Button 
            type="submit" 
            className="py-2.5 px-6 shadow-md shadow-[#9E76B4]/20 font-semibold bg-[#9E76B4] hover:bg-[#85619A] text-white transition-colors"
          >
            Preview & Submit
          </Button>

          <div className="relative group flex items-center">
            <button 
              type="button" 
              onClick={() => setIsAIEnabled(!isAIEnabled)}
              className={`w-10 h-10 rounded-xl border-2 transition-all duration-300 flex justify-center items-center ${
                isAIEnabled 
                  ? 'bg-purple-50 text-[#9E76B4] border-[#9E76B4] shadow-sm' 
                  : 'bg-white text-gray-400 border-gray-200 hover:bg-gray-50'
              }`}
            >
              <svg 
                xmlns="http://www.w3.org/2000/svg" 
                viewBox="0 0 24 24" 
                fill="none" 
                stroke="currentColor" 
                strokeWidth="2" 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                className={`w-5 h-5 transition-transform ${isAIEnabled ? 'scale-110' : 'scale-100'}`}
              >
                <path d="M21 12c0-1.66-1.34-3-3-3-.45 0-.88.1-1.27.28C16.14 7.63 14.28 6 12 6s-4.14 1.63-4.73 3.28C6.88 9.1 6.45 9 6 9c-1.66 0-3 1.34-3 3s1.34 3 3 3c.45 0 .88-.1 1.27-.28C7.86 16.37 9.72 18 12 18s4.14-1.63 4.73-3.28c.39.18.82.28 1.27.28 1.66 0 3-1.34 3-3z"></path>
                <circle cx="12" cy="12" r="2"></circle>
              </svg>
            </button>
            <div className="absolute bottom-full right-0 mb-3 w-max px-3 py-1.5 bg-gray-800 text-white text-xs font-medium rounded-lg shadow-lg opacity-0 -translate-y-1 pointer-events-none group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-200 z-10">
              AI Analysis: <span className={isAIEnabled ? "text-green-400" : "text-gray-400"}>{isAIEnabled ? 'ON' : 'OFF'}</span>
              <div className="absolute top-full right-3.5 -mt-1 w-2 h-2 bg-gray-800 rotate-45"></div>
            </div>
          </div>
        </div>
      </form>
    </Card>
  );
}