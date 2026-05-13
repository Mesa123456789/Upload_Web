// ---------------------------------------------------------------------------
// StudentDashboardPage.tsx — Student home screen
//
// Route: /dashboard
//
// Shows:
//   1. All courses the student is enrolled in
//   2. Under each course: the student's own projects with status badge
//   3. "New Project" button per course
//   4. If no courses enrolled: empty state + invite code form to join a course
//
// Data strategy:
//   1. listStudentCourses(studentId)  → get enrolled courses
//   2. For each course: listProjectsByCourseAndOwner(courseId, studentId)
//      → run in parallel with Promise.all
//   3. State: courses[], projectsMap { [courseId]: Project[] }
//
// Navigation on project card click:
//   Maps current_step (1-4) to the correct route:
//     1 → /project/:id/setup
//     2 → /project/:id/build
//     3 → /project/:id/guardrail
//     4 → /project/:id/output
// ---------------------------------------------------------------------------

import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import PageContainer from "../../../app/layout/PageContainer";
import Card from "../../../shared/components/Card";
import { useAuth } from "../../auth/context/AuthContext";
import { listStudentCourses, getCourseByInviteCode, enrollStudent } from "../../courses/services/courses.service";
import { listProjectsByCourseAndOwner } from "../../projects/services/projects.service";
import type { Course, Project } from "../../../lib/database.types";

// ---------------------------------------------------------------------------
// Map project current_step number to the correct URL segment
// ---------------------------------------------------------------------------
function stepToPath(step: 1 | 2 | 3 | 4): string {
  const map: Record<number, string> = {
    1: "setup",
    2: "build",
    3: "guardrail",
    4: "output",
  };
  return map[step] ?? "setup";
}

// ---------------------------------------------------------------------------
// Map current_step to a human-readable label for the badge
// ---------------------------------------------------------------------------
function stepLabel(step: 1 | 2 | 3 | 4): string {
  const labels: Record<number, string> = {
    1: "Setup",
    2: "Build",
    3: "Guardrail",
    4: "Output",
  };
  return labels[step] ?? "Setup";
}

// ---------------------------------------------------------------------------
// Color classes for the step badge
// ---------------------------------------------------------------------------
function stepBadgeClass(step: 1 | 2 | 3 | 4): string {
  if (step === 4) return "bg-green-50 text-green-700 border border-green-200";
  if (step === 3) return "bg-blue-50 text-blue-700 border border-blue-200";
  if (step === 2) return "bg-yellow-50 text-yellow-700 border border-yellow-200";
  return "bg-gray-50 text-gray-600 border border-gray-200";
}

// ---------------------------------------------------------------------------
// ProjectCard — single project entry in the course list
// ---------------------------------------------------------------------------
interface ProjectCardProps {
  project: Project;
  onOpen: (project: Project) => void;
}

function ProjectCard({ project, onOpen }: ProjectCardProps) {
  const updatedDate = new Date(project.updated_at).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });

  return (
    <button
      type="button"
      onClick={() => onOpen(project)}
      className="w-full text-left bg-white border border-gray-100 hover:border-[#9E76B4]/40 hover:shadow-sm rounded-xl px-4 py-3.5 flex items-center gap-4 transition-all group"
    >
      {/* Project title + updated date */}
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-gray-800 truncate group-hover:text-[#9E76B4] transition-colors">
          {project.title}
        </p>
        <p className="text-xs text-gray-400 mt-0.5">Updated {updatedDate}</p>
      </div>

      {/* Current step badge */}
      <span
        className={`text-xs font-semibold px-2.5 py-1 rounded-full shrink-0 ${stepBadgeClass(project.current_step)}`}
      >
        {stepLabel(project.current_step)}
      </span>

      {/* Arrow icon */}
      <svg
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        viewBox="0 0 24 24"
        strokeWidth={2}
        stroke="currentColor"
        className="w-4 h-4 text-gray-300 group-hover:text-[#9E76B4] shrink-0 transition-colors"
      >
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
      </svg>
    </button>
  );
}

// ---------------------------------------------------------------------------
// JoinCourseForm — inline form that appears in the empty-state panel
// ---------------------------------------------------------------------------
interface JoinCourseFormProps {
  onJoined: () => void; // called after successful enrollment to re-fetch data
}

function JoinCourseForm({ onJoined }: JoinCourseFormProps) {
  const { user } = useAuth();
  const [code, setCode] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  async function handleJoin(e: React.FormEvent) {
    e.preventDefault();
    if (!user || !code.trim()) return;

    setIsLoading(true);
    setError(null);
    setSuccess(null);

    // Step 1: find course by invite code
    const { data: course, error: findErr } = await getCourseByInviteCode(code.trim());
    if (findErr || !course) {
      setError("Course not found. Please check your invite code.");
      setIsLoading(false);
      return;
    }

    if (!course.is_active) {
      setError("This course is no longer active.");
      setIsLoading(false);
      return;
    }

    // Step 2: enroll the student
    const { error: enrollErr } = await enrollStudent({
      course_id: course.id,
      student_id: user.id,
      enrolled_via: "invite_code",
    });

    if (enrollErr) {
      // "Already enrolled" is a soft conflict — surface as info
      if (enrollErr === "Already enrolled in this course") {
        setError("You are already enrolled in this course.");
      } else {
        setError(enrollErr);
      }
      setIsLoading(false);
      return;
    }

    setSuccess(`Joined "${course.title}" successfully!`);
    setCode("");
    setIsLoading(false);

    // Re-fetch parent data after a short delay so the success message is visible
    setTimeout(onJoined, 800);
  }

  return (
    <form onSubmit={handleJoin} className="flex flex-col gap-3">
      <div className="flex gap-2">
        <input
          type="text"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          placeholder="Enter invite code (e.g. DG401-A)"
          className="flex-1 px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#9E76B4]/20 focus:border-[#9E76B4] text-gray-800 placeholder-gray-400"
        />
        <button
          type="submit"
          disabled={isLoading || !code.trim()}
          className="px-5 py-2.5 bg-[#9E76B4] hover:bg-[#85619A] disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-semibold rounded-xl transition-colors"
        >
          {isLoading ? "Joining..." : "Join"}
        </button>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}
      {success && <p className="text-sm text-green-600">{success}</p>}
    </form>
  );
}

// ---------------------------------------------------------------------------
// Main page component
// ---------------------------------------------------------------------------
export default function StudentDashboardPage() {
  const { user, profile } = useAuth();
  const navigate = useNavigate();

  // courses[] + projectsMap indexed by course id
  const [courses, setCourses] = useState<Course[]>([]);
  const [projectsMap, setProjectsMap] = useState<Record<string, Project[]>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  // -------------------------------------------------------------------------
  // Fetch enrolled courses + each course's projects
  // -------------------------------------------------------------------------
  async function fetchDashboardData(userId: string) {
    setIsLoading(true);
    setLoadError(null);

    // Get all course enrollments (with nested course data)
    const { data: enrollments, error: enrollErr } = await listStudentCourses(userId);
    if (enrollErr) {
      setLoadError(enrollErr);
      setIsLoading(false);
      return;
    }

    const enrolledCourses = (enrollments ?? []).map((e) => e.course);
    setCourses(enrolledCourses);

    // Fetch projects for each course in parallel
    const projectResults = await Promise.all(
      enrolledCourses.map((c) =>
        listProjectsByCourseAndOwner(c.id, userId).then(({ data }) => ({
          courseId: c.id,
          projects: data ?? [],
        }))
      )
    );

    const map: Record<string, Project[]> = {};
    for (const r of projectResults) {
      map[r.courseId] = r.projects;
    }
    setProjectsMap(map);
    setIsLoading(false);
  }

  useEffect(() => {
    if (!user?.id) return;
    fetchDashboardData(user.id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  // -------------------------------------------------------------------------
  // Navigate to the step the student was last on
  // -------------------------------------------------------------------------
  function handleOpenProject(project: Project) {
    const path = stepToPath(project.current_step);
    navigate(`/project/${project.id}/${path}`);
  }

  // -------------------------------------------------------------------------
  // Navigate to new project form, passing courseId as search param
  // -------------------------------------------------------------------------
  function handleNewProject(courseId: string) {
    navigate(`/project/new?courseId=${courseId}`);
  }

  // -------------------------------------------------------------------------
  // Render states
  // -------------------------------------------------------------------------
  if (isLoading) {
    return (
      <PageContainer>
        <div className="flex items-center justify-center min-h-[40vh]">
          <div className="w-8 h-8 border-2 border-gray-300 border-t-[#9E76B4] rounded-full animate-spin" />
        </div>
      </PageContainer>
    );
  }

  if (loadError) {
    return (
      <PageContainer>
        <div className="bg-red-50 border border-red-200 rounded-xl p-5 text-sm text-red-700">
          {loadError}
        </div>
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      {/* Page header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 tracking-tight">
          My Dashboard
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          Welcome back, {profile?.display_name ?? user?.email ?? "Student"}.
        </p>
      </div>

      {/* Empty state — no courses enrolled yet */}
      {courses.length === 0 && (
        <Card>
          <div className="p-8 flex flex-col items-center text-center gap-4">
            {/* Decorative icon */}
            <div className="w-14 h-14 rounded-2xl bg-[#9E76B4]/10 flex items-center justify-center">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
                stroke="currentColor"
                className="w-7 h-7 text-[#9E76B4]"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25"
                />
              </svg>
            </div>

            <div>
              <p className="text-base font-semibold text-gray-800">
                You are not enrolled in any course yet
              </p>
              <p className="text-sm text-gray-500 mt-1">
                Enter the invite code from your instructor to join a course and start creating projects.
              </p>
            </div>

            {/* Invite code form */}
            <div className="w-full max-w-sm mt-2">
              <JoinCourseForm onJoined={() => fetchDashboardData(user!.id)} />
            </div>
          </div>
        </Card>
      )}

      {/* Courses + projects */}
      <div className="space-y-8">
        {courses.map((course) => {
          const courseProjects = projectsMap[course.id] ?? [];

          return (
            <section key={course.id}>
              {/* Course header */}
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h2 className="text-lg font-bold text-gray-800">{course.title}</h2>
                  {course.description && (
                    <p className="text-xs text-gray-400 mt-0.5">{course.description}</p>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => handleNewProject(course.id)}
                  className="flex items-center gap-1.5 px-4 py-2 bg-[#9E76B4] hover:bg-[#85619A] text-white text-sm font-semibold rounded-xl transition-colors shadow-sm"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth={2.5}
                    stroke="currentColor"
                    className="w-3.5 h-3.5"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                  </svg>
                  New Project
                </button>
              </div>

              {/* Project list or empty */}
              {courseProjects.length === 0 ? (
                <div className="bg-gray-50 border border-dashed border-gray-200 rounded-xl px-4 py-6 text-center">
                  <p className="text-sm text-gray-400">
                    No projects yet. Click "New Project" to get started.
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {courseProjects.map((project) => (
                    <ProjectCard
                      key={project.id}
                      project={project}
                      onOpen={handleOpenProject}
                    />
                  ))}
                </div>
              )}
            </section>
          );
        })}
      </div>

      {/* Inline join course form (shown at bottom when user already has courses) */}
      {courses.length > 0 && (
        <div className="mt-10 pt-8 border-t border-gray-100">
          <h3 className="text-sm font-semibold text-gray-600 mb-3">
            Join another course
          </h3>
          <div className="max-w-sm">
            <JoinCourseForm onJoined={() => fetchDashboardData(user!.id)} />
          </div>
        </div>
      )}
    </PageContainer>
  );
}
