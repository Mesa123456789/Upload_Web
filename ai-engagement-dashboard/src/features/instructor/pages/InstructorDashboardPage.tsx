// ---------------------------------------------------------------------------
// InstructorDashboardPage.tsx — Instructor home
//
// Route: /instructor/dashboard
//
// Shows:
//   1. Stats cards — Active Projects, Guardrail Pass %, Risk Flags
//   2. Recent Projects table — all projects across instructor's courses
//
// Data strategy (current): stub data so layout is visible while services
// are being built. Replace STUB_* constants with real service calls.
//
// TODO: Wire to courses.service.ts (listCourseProjects) and analyses table.
// ---------------------------------------------------------------------------

import PageContainer from "../../../app/layout/PageContainer";
import Card from "../../../shared/components/Card";

// ---------------------------------------------------------------------------
// Stub data — replace with real service calls once backend is ready
// ---------------------------------------------------------------------------

const STUB_STATS = {
  activeProjects: 24,
  guardrailPassPct: 71,
  riskFlags: 5,
};

const STUB_PROJECTS = [
  { id: "1", student: "Somsak W.", title: "Dragon Quest Mobile", status: "Guardrail", score: 82, risk: false },
  { id: "2", student: "Nattapat K.", title: "Space Idle Tycoon", status: "Build", score: null, risk: false },
  { id: "3", student: "Pimchanok T.", title: "Candy Rush 2", status: "Guardrail", score: 45, risk: true },
  { id: "4", student: "Anuwat P.", title: "Battle Legends", status: "Output", score: 88, risk: false },
  { id: "5", student: "Yanisa R.", title: "Farm & Grow", status: "Setup", score: null, risk: false },
];

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

interface StatCardProps {
  label: string;
  value: string | number;
  sublabel?: string;
  accent?: "default" | "green" | "red";
}

function StatCard({ label, value, sublabel, accent = "default" }: StatCardProps) {
  const accentColor = {
    default: "text-gray-900",
    green: "text-green-600",
    red: "text-red-500",
  }[accent];

  return (
    <Card>
      <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">{label}</p>
      <p className={`text-4xl font-bold ${accentColor}`}>{value}</p>
      {sublabel && <p className="text-xs text-gray-400 mt-1">{sublabel}</p>}
    </Card>
  );
}

// Badge for project status
function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    Setup:      "bg-gray-100 text-gray-600",
    Build:      "bg-blue-50 text-blue-600",
    Guardrail:  "bg-purple-50 text-[#9E76B4]",
    Output:     "bg-green-50 text-green-600",
  };
  return (
    <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${colors[status] ?? "bg-gray-100 text-gray-500"}`}>
      {status}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------

export default function InstructorDashboardPage() {
  return (
    <PageContainer>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 tracking-tight">
          Instructor Dashboard
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          Overview of all student projects and ethical review status.
        </p>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <StatCard
          label="Active Projects"
          value={STUB_STATS.activeProjects}
          sublabel="across all courses"
        />
        <StatCard
          label="Guardrail Pass Rate"
          value={`${STUB_STATS.guardrailPassPct}%`}
          sublabel="of reviewed projects"
          accent="green"
        />
        <StatCard
          label="Risk Flags"
          value={STUB_STATS.riskFlags}
          sublabel="need instructor review"
          accent="red"
        />
      </div>

      {/* Projects table */}
      <div className="bg-white rounded-2xl border border-black/5 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <h2 className="text-base font-semibold text-gray-800">Recent Projects</h2>
          <span className="text-xs text-gray-400">Stub data — connect to service</span>
        </div>

        <table className="w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-bold text-gray-400 uppercase tracking-wider">Student</th>
              <th className="px-6 py-3 text-left text-xs font-bold text-gray-400 uppercase tracking-wider">Project</th>
              <th className="px-6 py-3 text-left text-xs font-bold text-gray-400 uppercase tracking-wider">Step</th>
              <th className="px-6 py-3 text-left text-xs font-bold text-gray-400 uppercase tracking-wider">Score</th>
              <th className="px-6 py-3 text-left text-xs font-bold text-gray-400 uppercase tracking-wider">Risk</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {STUB_PROJECTS.map((p) => (
              <tr key={p.id} className="hover:bg-gray-50 transition-colors">
                <td className="px-6 py-4 text-gray-700 font-medium">{p.student}</td>
                <td className="px-6 py-4 text-gray-600">{p.title}</td>
                <td className="px-6 py-4">
                  <StatusBadge status={p.status} />
                </td>
                <td className="px-6 py-4 text-gray-600">
                  {p.score !== null ? (
                    <span className={p.score >= 70 ? "text-green-600 font-semibold" : "text-red-500 font-semibold"}>
                      {p.score}
                    </span>
                  ) : (
                    <span className="text-gray-300">—</span>
                  )}
                </td>
                <td className="px-6 py-4">
                  {p.risk ? (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-red-50 text-red-500">
                      High Risk
                    </span>
                  ) : (
                    <span className="text-gray-300 text-xs">—</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </PageContainer>
  );
}
