import type { FlowStep } from "../types";

interface Props {
  expected: FlowStep[];
  observed: FlowStep[];
}

export default function DiscrepancyAnalysis({
  expected,
  observed,
}: Props) {
  const renderFlow = (flow: FlowStep[]) => (
    <div className="flex flex-wrap gap-2 text-xs">
      {flow.map((step, i) => (
        <span
          key={i}
          className={`px-3 py-1 rounded text-white ${
            step.variant === "danger"
              ? "bg-red-600"
              : step.variant === "warning"
              ? "bg-orange-500"
              : "bg-primary"
          }`}
        >
          {step.label}
        </span>
      ))}
    </div>
  );

  return (
    <div className="bg-white rounded-xl shadow p-5">
      <h3 className="font-semibold mb-4">Discrepancy Analysis</h3>

      <p className="text-sm font-medium mb-2">Expected</p>
      {renderFlow(expected)}

      <p className="text-sm font-medium mt-4 mb-2">Observed</p>
      {renderFlow(observed)}
    </div>
  );
}
