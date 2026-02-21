import type { RecommendationItem } from "../types";

interface Props {
  items: RecommendationItem[];
}

export default function AIRecommendations({ items }: Props) {
  return (
    <div className="bg-white rounded-xl shadow p-5">
      <h3 className="font-semibold mb-4">AI Recommendations</h3>

      <div className="space-y-3 text-sm">
        {items.map((item) => (
          <div
            key={item.title}
            className={`p-3 rounded border ${
              item.type === "success"
                ? "bg-green-100 border-green-300"
                : "bg-yellow-100 border-yellow-300"
            }`}
          >
            <p className="font-medium">{item.title}</p>
            {item.description && (
              <p className="text-xs mt-1">{item.description}</p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
