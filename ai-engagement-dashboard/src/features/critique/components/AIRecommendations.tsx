import { useState } from "react";
import type { RecommendationItem } from "../types";
import Dropdown, { DropdownItem } from "../../../shared/components/Dropdown";

interface Props {
  items: RecommendationItem[];
}

export default function AIRecommendations({ items }: Props) {
  const [filter, setFilter] = useState<"all" | "success" | "warning">("all");

  const filteredItems = items.filter((item) => {
    if (filter === "all") return true;
    return item.type === filter;
  });

  return (
    <div className="bg-white rounded-xl shadow p-5">
      <div className="flex justify-between items-center mb-4">
        <h3 className="font-semibold">AI Recommendations</h3>
        
        <Dropdown
          trigger={
            <button className="text-xs bg-primary/10 text-primary hover:bg-primary/20 px-3 py-1.5 rounded-full flex items-center gap-2 transition font-bold cursor-pointer">
              Filter: {filter.charAt(0).toUpperCase() + filter.slice(1)}
              <span className="text-[8px] opacity-60">▼</span>
            </button>
          }
          align="right"
        >
          <DropdownItem onClick={() => setFilter("all")}>All</DropdownItem>
          <DropdownItem onClick={() => setFilter("success")}>Success Only</DropdownItem>
          <DropdownItem onClick={() => setFilter("warning")}>Warnings Only</DropdownItem>
        </Dropdown>
      </div>

      <div className="space-y-3 text-sm">
        {filteredItems.length > 0 ? (
          filteredItems.map((item) => (
            <div
              key={item.title}
              className={`p-4 rounded-xl border ${
                item.type === "success"
                  ? "bg-primary/5 border-primary/20 text-primary"
                  : "bg-primary-light/10 border-primary-light/30 text-primary-light"
              }`}
            >
              <p className="font-bold flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-current"></span>
                {item.title}
              </p>
              {item.description && (
                <p className="text-xs mt-2 opacity-80 leading-relaxed font-medium">
                  {item.description}
                </p>
              )}
            </div>
          ))
        ) : (
          <p className="text-center text-secondary py-6 italic font-medium">No recommendations found for this filter.</p>
        )}
      </div>
    </div>
  );
}
