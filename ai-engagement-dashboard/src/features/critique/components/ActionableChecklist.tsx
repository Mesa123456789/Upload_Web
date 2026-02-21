import type { ChecklistItem } from "../types";

interface Props {
  items: ChecklistItem[];
}

export default function ActionableChecklist({ items }: Props) {
  return (
    <div className="bg-white rounded-xl shadow p-5">
      <h3 className="font-semibold mb-4">Actionable Checklist</h3>

      <div className="space-y-2 text-sm">
        {items.map((item) => (
          <label key={item.label} className="flex items-center gap-2">
            <input type="checkbox" checked={item.checked} readOnly />
            {item.label}
          </label>
        ))}
      </div>
    </div>
  );
}
