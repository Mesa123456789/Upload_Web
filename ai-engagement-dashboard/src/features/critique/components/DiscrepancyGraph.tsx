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
            <Line type="monotone" dataKey="expected" stroke="#1F4D3A" strokeWidth={3} dot={{ r: 4 }} />
            <Line type="monotone" dataKey="observed" stroke="#f36f21" strokeWidth={3} dot={{ r: 4 }} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4 text-center mt-6 text-sm">
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
