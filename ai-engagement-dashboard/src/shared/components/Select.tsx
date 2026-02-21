interface Props {
  label: string;
  value: string;
  options: string[];
  onChange: (value: string) => void;
}

export default function Select({
  label,
  value,
  options,
  onChange,
}: Props) {
  return (
    <div className="space-y-1">
      <label className="text-sm font-medium">{label}</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full border rounded-lg px-3 py-2"
      >
        <option value="">Select...</option>
        {options.map((o) => (
          <option key={o}>{o}</option>
        ))}
      </select>
    </div>
  );
}
