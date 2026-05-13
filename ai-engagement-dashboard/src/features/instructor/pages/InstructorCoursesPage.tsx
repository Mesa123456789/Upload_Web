// ---------------------------------------------------------------------------
// InstructorCoursesPage.tsx — Manage courses
//
// Route: /instructor/courses
//
// Features:
//   - List all courses for the logged-in instructor
//   - Create a new course via a simple inline form
//   - Shows published vs draft status
// ---------------------------------------------------------------------------

import { useEffect, useState } from "react";
import { useAuth } from "../../auth/context/AuthContext";
import {
  listInstructorCourses,
  createCourse,
} from "../../courses/services/courses.service";
import type { Course } from "../../../lib/database.types";
import PageContainer from "../../../app/layout/PageContainer";
import Card from "../../../shared/components/Card";

// ---------------------------------------------------------------------------
// Sub-component: CourseCard
// ---------------------------------------------------------------------------

function CourseCard({ course }: { course: Course }) {
  return (
    <Card>
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h3 className="font-semibold text-gray-800 truncate">{course.title}</h3>
          {course.description && (
            <p className="text-sm text-gray-500 mt-1 line-clamp-2">{course.description}</p>
          )}
          <p className="text-xs text-gray-400 mt-2">
            Created {new Date(course.created_at).toLocaleDateString()}
          </p>
        </div>
        <span
          className={`shrink-0 px-2.5 py-1 rounded-full text-xs font-semibold ${
            course.is_published
              ? "bg-green-50 text-green-600"
              : "bg-gray-100 text-gray-500"
          }`}
        >
          {course.is_published ? "Published" : "Draft"}
        </span>
      </div>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------

export default function InstructorCoursesPage() {
  const { profile } = useAuth();

  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Form state for creating a new course
  const [showForm, setShowForm] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  useEffect(() => {
    if (!profile?.id) return;

    async function load() {
      setLoading(true);
      setError(null);
      const { data, error: err } = await listInstructorCourses(profile!.id);
      if (err) {
        setError(err);
      } else {
        setCourses(data);
      }
      setLoading(false);
    }

    load();
  }, [profile?.id]);

  async function handleCreateCourse(e: React.FormEvent) {
    e.preventDefault();
    if (!profile?.id || !newTitle.trim()) return;

    setCreating(true);
    setCreateError(null);

    const { data: created, error: err } = await createCourse({
      instructor_id: profile.id,
      title: newTitle.trim(),
      description: newDescription.trim() || null,
      is_published: false, // always start as draft
    });

    if (err || !created) {
      setCreateError(err ?? "Unknown error");
      setCreating(false);
      return;
    }

    // Prepend the new course to the list (newest first) and reset form
    setCourses((prev) => [created, ...prev]);
    setNewTitle("");
    setNewDescription("");
    setShowForm(false);
    setCreating(false);
  }

  return (
    <PageContainer>
      {/* Header */}
      <div className="mb-6 flex items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Courses</h1>
          <p className="text-sm text-gray-500 mt-1">
            Manage your courses and enrolled students.
          </p>
        </div>
        <button
          onClick={() => setShowForm((v) => !v)}
          className="shrink-0 px-4 py-2 rounded-lg bg-[#9E76B4] text-white text-sm font-semibold hover:bg-[#8A5EA0] transition-colors"
        >
          {showForm ? "Cancel" : "+ New Course"}
        </button>
      </div>

      {/* Create course form */}
      {showForm && (
        <form
          onSubmit={handleCreateCourse}
          className="bg-white rounded-2xl border border-black/5 shadow-sm p-6 mb-6"
        >
          <h2 className="text-base font-semibold text-gray-800 mb-4">New Course</h2>

          <div className="space-y-3">
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">
                Title *
              </label>
              <input
                type="text"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                placeholder="e.g. Game Design Fundamentals"
                required
                className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#9E76B4]/40"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">
                Description
              </label>
              <textarea
                value={newDescription}
                onChange={(e) => setNewDescription(e.target.value)}
                placeholder="Optional — brief description of this course"
                rows={2}
                className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#9E76B4]/40 resize-none"
              />
            </div>
          </div>

          {createError && (
            <p className="mt-3 text-sm text-red-600">{createError}</p>
          )}

          <div className="mt-4 flex gap-3">
            <button
              type="submit"
              disabled={creating || !newTitle.trim()}
              className="px-4 py-2 rounded-lg bg-[#9E76B4] text-white text-sm font-semibold hover:bg-[#8A5EA0] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {creating ? "Creating..." : "Create Course"}
            </button>
          </div>
        </form>
      )}

      {/* Loading */}
      {loading && (
        <p className="text-sm text-gray-400">Loading courses...</p>
      )}

      {/* Error */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Course list */}
      {!loading && !error && courses.length === 0 && (
        <div className="bg-gray-50 border border-gray-100 rounded-xl p-8 text-center">
          <p className="text-sm text-gray-500">You haven't created any courses yet.</p>
          <p className="text-xs text-gray-400 mt-1">Click "+ New Course" to get started.</p>
        </div>
      )}

      {!loading && !error && courses.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {courses.map((course) => (
            <CourseCard key={course.id} course={course} />
          ))}
        </div>
      )}
    </PageContainer>
  );
}
