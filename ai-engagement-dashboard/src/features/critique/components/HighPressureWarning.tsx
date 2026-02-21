interface Props {
  warning1: string;
  warning2: string;
}

export default function HighPressureWarning({
  warning1,
  warning2,
}: Props) {
  return (
    <div className="bg-red-100 border border-red-300 rounded-xl p-5">
      <h3 className="font-semibold mb-3">High Pressure Warning</h3>
      <ul className="text-sm list-disc list-inside space-y-2">
        <li>{warning1}</li>
        <li>{warning2}</li>
      </ul>
    </div>
  );
}
