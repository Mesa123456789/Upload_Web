// ---------------------------------------------------------------------------
// InstructorDashboardPage.tsx — Instructor home
//
// Route: /instructor/dashboard
//
// Shows:
//   1. Stats cards — Total Courses, Total Projects, Students count
//   2. Recent Projects table — all projects across instructor's courses
//
// Data strategy:
//   1. Fetch all courses for the logged-in instructor
//   2. For each course, fetch all projects (Promise.all — parallel)
//   3. Flatten + compute stats locally
//
// Note: Score and Risk columns require the `analyses` table which is not yet
//       wired to a service. They are omitted for now and documented below.
// ---------------------------------------------------------------------------

import { useEffect, useState } from "react";
import { useAuth } from "../../auth/context/AuthContext";
import { listInstructorCourses } from "../../courses/services/courses.service";
import { listCourseProjects } from "../../projects/services/projects.service";
import type { Course, Project } from "../../../lib/database.types";
import PageContainer from "../../../app/layout/PageContainer";
import Card from "../../../shared/components/Card";

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

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------

// ProjectRow is a project plus the course title it belongs to (for display)
interface ProjectRow extends Project {
  courseTitle: string;
}

export default function InstructorDashboardPage() {
  const { profile } = useAuth();

  const [courses, setCourses] = useState<Course[]>([]);
  const [projects, setProjects] = useState<ProjectRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Guard: don't fetch until we have a profile with an id
    if (!profile?.id) return;

    async function load() {
      setLoading(true);
      setError(null);

      // Step 1: fetch all courses for this instructor
      const { data: courseList, error: courseErr } = await listInstructorCourses(profile!.id);
      if (courseErr) {
        setError(courseErr);
        setLoading(false);
        return;
      }
      setCourses(courseList);

      // Step 2: fetch projects for every course in parallel
      const results = await Promise.all(
        courseList.map((c) =>
          listCourseProjects(c.id).then(({ data }) =>
            // Tag each project with the course title so the table can show it
            (data ?? []).map((p): ProjectRow => ({ ...p, courseTitle: c.title }))
          )
        )
      );

      // Flatten [[ProjectRow], [ProjectRow], ...] → [ProjectRow]
      const allProjects = results.flat();

      // Sort newest first
      allProjects.sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );

      setProjects(allProjects);
      setLoading(false);
    }

    load();
  }, [profile?.id]);

  // Compute stats from live data
  const uniqueStudents = new Set(projects.map((p) => p.student_id)).size;

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

      {/* Loading state */}
      {loading && (
        <p className="text-sm text-gray-400 mb-6">Loading data...</p>
      )}

      {/* Error state */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Stats row — shown even while loading so layout doesn't jump */}
      {!loading && !error && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          <StatCard
            label="My Courses"
            value={courses.length}
            sublabel="published + draft"
          />
          <StatCard
            label="Total Projects"
            value={projects.length}
            sublabel="across all courses"
            accent="green"
          />
          <StatCard
            label="Students"
            value={uniqueStudents}
            sublabel="unique students"
          />
        </div>
      )}

      {/* Projects table */}
      {!loading && !error && (
        <div className="bg-white rounded-2xl border border-black/5 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
            <h2 className="text-base font-semibold text-gray-800">Recent Projects</h2>
            <span className="text-xs text-gray-400">{projects.length} total</span>
          </div>

          {projects.length === 0 ? (
            <p className="px-6 py-8 text-sm text-gray-400">
              No projects found. Students will appear here once they create projects in your courses.
            </p>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-bold text-gray-400 uppercase tracking-wider">Course</th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-gray-400 uppercase tracking-wider">Project</th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-gray-400 uppercase tracking-wider">Genre</th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-gray-400 uppercase tracking-wider">Platform</th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-gray-400 uppercase tracking-wider">Created</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {projects.map((p) => (
                  <tr key={p.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 text-gray-500 text-xs">{p.courseTitle}</td>
                    <td className="px-6 py-4 text-gray-700 font-medium">{p.title}</td>
                    <td className="px-6 py-4 text-gray-500 text-xs">{p.genre.join(", ") || "—"}</td>
                    <td className="px-6 py-4 text-gray-500 text-xs">{p.platform.join(", ") || "—"}</td>
                    <td className="px-6 py-4 text-gray-400 text-xs">
                      {new Date(p.created_at).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </PageContainer>
  );
}
