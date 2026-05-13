// ---------------------------------------------------------------------------
// InstructorCoursesPage.tsx — Manage courses
//
// Route: /instructor/courses
//
// Instructors can create, publish, and manage their courses here.
// Each course has enrolled students and associated projects.
//
// TODO: Connect to courses.service.ts — list/create/update courses for
//       the logged-in instructor.
// ---------------------------------------------------------------------------

import PageContainer from "../../../app/layout/PageContainer";

export default function InstructorCoursesPage() {
  return (
    <PageContainer>
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Courses</h1>
        <p className="text-sm text-gray-500 mt-1">
          Manage your courses and enrolled students.
        </p>
      </div>

      <div className="bg-amber-50 border border-amber-200 rounded-xl p-5 text-sm text-amber-800">
        <p className="font-semibold mb-1">TODO — Not implemented yet</p>
        <p>
          This page will list courses from <code className="font-mono bg-amber-100 px-1 rounded">courses.service.ts</code>{" "}
          and allow the instructor to create new courses and manage enrollments.
        </p>
      </div>
    </PageContainer>
  );
}
