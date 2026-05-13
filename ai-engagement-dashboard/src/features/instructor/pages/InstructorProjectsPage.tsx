// ---------------------------------------------------------------------------
// InstructorProjectsPage.tsx — View all student projects in a course
//
// Route: /instructor/projects
//
// Features:
//   - Course dropdown to filter projects by course
//   - Lists all projects for the selected course
//   - Shows genre, platform, mechanic, monetization details
// ---------------------------------------------------------------------------

import { useEffect, useState } from "react";
import { useAuth } from "../../auth/context/AuthContext";
import { listInstructorCourses } from "../../courses/services/courses.service";
import { listCourseProjects } from "../../projects/services/projects.service";
import type { Course, Project } from "../../../lib/database.types";
import PageContainer from "../../../app/layout/PageContainer";

// ---------------------------------------------------------------------------
// Sub-component: ProjectRow in a table
// ---------------------------------------------------------------------------

function ProjectTableRow({ project }: { project: Project }) {
  return (
    <tr className="hover:bg-gray-50 transition-colors">
      <td className="px-6 py-4 text-gray-700 font-medium">{project.title}</td>
      <td className="px-6 py-4 text-gray-500 text-xs">{project.genre.join(", ") || "—"}</td>
      <td className="px-6 py-4 text-gray-500 text-xs">{project.platform.join(", ") || "—"}</td>
      <td className="px-6 py-4 text-gray-500 text-xs">{project.core_mechanic ?? "—"}</td>
      <td className="px-6 py-4 text-gray-500 text-xs">{project.monetization.join(", ") || "—"}</td>
      <td className="px-6 py-4 text-gray-400 text-xs">
        {new Date(project.created_at).toLocaleDateString()}
      </td>
    </tr>
  );
}

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------

export default function InstructorProjectsPage() {
  const { profile } = useAuth();

  // Courses state — populate the dropdown
  const [courses, setCourses] = useState<Course[]>([]);
  const [coursesLoading, setCoursesLoading] = useState(true);
  const [coursesError, setCoursesError] = useState<string | null>(null);

  // Selected course id from dropdown — empty string = none selected
  const [selectedCourseId, setSelectedCourseId] = useState<string>("");

  // Projects state — populated when a course is selected
  const [projects, setProjects] = useState<Project[]>([]);
  const [projectsLoading, setProjectsLoading] = useState(false);
  const [projectsError, setProjectsError] = useState<string | null>(null);

  // Step 1: load courses list on mount
  useEffect(() => {
    if (!profile?.id) return;

    async function loadCourses() {
      setCoursesLoading(true);
      setCoursesError(null);

      const { data, error } = await listInstructorCourses(profile!.id);
      if (error) {
        setCoursesError(error);
      } else {
        setCourses(data);
        // Auto-select the first course if available
        if (data.length > 0) {
          setSelectedCourseId(data[0].id);
        }
      }
      setCoursesLoading(false);
    }

    loadCourses();
  }, [profile?.id]);

  // Step 2: load projects whenever selectedCourseId changes
  useEffect(() => {
    if (!selectedCourseId) {
      setProjects([]);
      return;
    }

    async function loadProjects() {
      setProjectsLoading(true);
      setProjectsError(null);

      const { data, error } = await listCourseProjects(selectedCourseId);
      if (error) {
        setProjectsError(error);
      } else {
        setProjects(data);
      }
      setProjectsLoading(false);
    }

    loadProjects();
  }, [selectedCourseId]);

  const selectedCourse = courses.find((c) => c.id === selectedCourseId);

  return (
    <PageContainer>
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 tracking-tight">All Projects</h1>
        <p className="text-sm text-gray-500 mt-1">
          View and review every student project across your courses.
        </p>
      </div>

      {/* Error loading courses */}
      {coursesError && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6 text-sm text-red-700">
          {coursesError}
        </div>
      )}

      {/* Course filter dropdown */}
      {!coursesLoading && courses.length > 0 && (
        <div className="mb-6 flex items-center gap-3">
          <label className="text-xs font-bold text-gray-500 uppercase tracking-wider shrink-0">
            Course
          </label>
          <select
            value={selectedCourseId}
            onChange={(e) => setSelectedCourseId(e.target.value)}
            className="px-3 py-2 rounded-lg border border-gray-200 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#9E76B4]/40 bg-white"
          >
            {courses.map((c) => (
              <option key={c.id} value={c.id}>
                {c.title} {c.is_published ? "" : "(Draft)"}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* No courses at all */}
      {!coursesLoading && !coursesError && courses.length === 0 && (
        <div className="bg-gray-50 border border-gray-100 rounded-xl p-8 text-center">
          <p className="text-sm text-gray-500">No courses found.</p>
          <p className="text-xs text-gray-400 mt-1">Create a course first before viewing projects.</p>
        </div>
      )}

      {/* Loading courses */}
      {coursesLoading && (
        <p className="text-sm text-gray-400">Loading courses...</p>
      )}

      {/* Projects section */}
      {!coursesLoading && selectedCourseId && (
        <div className="bg-white rounded-2xl border border-black/5 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
            <h2 className="text-base font-semibold text-gray-800">
              {selectedCourse?.title ?? "Projects"}
            </h2>
            {!projectsLoading && (
              <span className="text-xs text-gray-400">{projects.length} projects</span>
            )}
          </div>

          {/* Projects loading */}
          {projectsLoading && (
            <p className="px-6 py-6 text-sm text-gray-400">Loading projects...</p>
          )}

          {/* Projects error */}
          {projectsError && (
            <div className="px-6 py-4 text-sm text-red-600">{projectsError}</div>
          )}

          {/* Empty state */}
          {!projectsLoading && !projectsError && projects.length === 0 && (
            <p className="px-6 py-8 text-sm text-gray-400">
              No projects in this course yet.
            </p>
          )}

          {/* Table */}
          {!projectsLoading && !projectsError && projects.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-bold text-gray-400 uppercase tracking-wider">Project</th>
                    <th className="px-6 py-3 text-left text-xs font-bold text-gray-400 uppercase tracking-wider">Genre</th>
                    <th className="px-6 py-3 text-left text-xs font-bold text-gray-400 uppercase tracking-wider">Platform</th>
                    <th className="px-6 py-3 text-left text-xs font-bold text-gray-400 uppercase tracking-wider">Core Mechanic</th>
                    <th className="px-6 py-3 text-left text-xs font-bold text-gray-400 uppercase tracking-wider">Monetization</th>
                    <th className="px-6 py-3 text-left text-xs font-bold text-gray-400 uppercase tracking-wider">Created</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {projects.map((p) => (
                    <ProjectTableRow key={p.id} project={p} />
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </PageContainer>
  );
}
