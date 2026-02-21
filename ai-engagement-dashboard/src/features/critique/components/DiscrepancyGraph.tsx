import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ResponsiveContainer,
  Legend,
} from "recharts";
import type { GraphPoint, GraphMetric } from "../types";

interface Props {
  data: GraphPoint[];
  metrics: GraphMetric[];
}

export default function DiscrepancyGraph({ data, metrics }: Props) {
  return (
    <div className="bg-white rounded-xl shadow p-5">
      <h3 className="font-semibold mb-4">Discrepancy Graph</h3>

      <div className="h-64">
        <ResponsiveContainer>
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="label" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Line type="monotone" dataKey="expected" stroke="#2563eb" />
            <Line type="monotone" dataKey="observed" stroke="#f97316" />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="grid grid-cols-5 text-center mt-6 text-sm">
        {metrics.map((m) => (
          <div key={m.label}>
            <p className="font-semibold">{m.value}</p>
            <p className="text-xs text-gray-500">{m.label}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
