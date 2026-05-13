// ---------------------------------------------------------------------------
// InstructorProjectsPage.tsx — View all student projects in a course
//
// Route: /instructor/projects
//
// Full project list for the instructor — filterable by course, step, risk level.
// Instructor can click into a project to see full details and review AI analysis.
//
// TODO: Connect to projects.service.listCourseProjects() and analyses table.
//       Add course filter dropdown using courses.service.ts.
// ---------------------------------------------------------------------------

import PageContainer from "../../../app/layout/PageContainer";

export default function InstructorProjectsPage() {
  return (
    <PageContainer>
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 tracking-tight">All Projects</h1>
        <p className="text-sm text-gray-500 mt-1">
          View and review every student project across your courses.
        </p>
      </div>

      <div className="bg-amber-50 border border-amber-200 rounded-xl p-5 text-sm text-amber-800">
        <p className="font-semibold mb-1">TODO — Not implemented yet</p>
        <p>
          This page will call{" "}
          <code className="font-mono bg-amber-100 px-1 rounded">listCourseProjects(courseId)</code>{" "}
          and display all projects with filter/sort controls.
        </p>
      </div>
    </PageContainer>
  );
}
