// ---------------------------------------------------------------------------
// courses.service.ts — CRUD operations for `courses` and `course_enrollments`
//
// Why separate from projects.service?
//   Courses and enrollments are owned by instructors. Projects are owned by
//   students. Keeping them in separate files makes it easy to add instructor-
//   specific logic later without touching the student workflow.
// ---------------------------------------------------------------------------

import { supabase } from "../../../lib/supabase";
import type {
  Course,
  CourseInsert,
  CourseEnrollment,
  CourseEnrollmentInsert,
} from "../../../lib/database.types";

// ---------------------------------------------------------------------------
// createCourse — INSERT a new course (instructor only)
// ---------------------------------------------------------------------------

export async function createCourse(input: {
  instructor_id: string;
  title: string;
  description?: string | null;
  is_published?: boolean;
}): Promise<{ data: Course | null; error: string | null }> {
  const insert: CourseInsert = {
    instructor_id: input.instructor_id,
    title: input.title,
    description: input.description ?? null,
    is_published: input.is_published ?? false, // default: draft
  };

  const { data, error } = await supabase
    .from("courses")
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .insert(insert as any) // cast: supabase-js v2.105+ expects Relationships key in Database type
    .select()
    .single();

  if (error) {
    console.error("[courses.service] createCourse error:", error);
    return { data: null, error: error.message };
  }

  return { data, error: null };
}

// ---------------------------------------------------------------------------
// listCourses — SELECT all published courses
//   (used on enrollment page so students can pick a course to join)
// ---------------------------------------------------------------------------

export async function listCourses(): Promise<{
  data: Course[];
  error: string | null;
}> {
  const { data, error } = await supabase
    .from("courses")
    .select("*")
    .eq("is_published", true)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[courses.service] listCourses error:", error);
    return { data: [], error: error.message };
  }

  return { data: data ?? [], error: null };
}

// ---------------------------------------------------------------------------
// listInstructorCourses — SELECT all courses created by a specific instructor
// ---------------------------------------------------------------------------

export async function listInstructorCourses(instructorId: string): Promise<{
  data: Course[];
  error: string | null;
}> {
  const { data, error } = await supabase
    .from("courses")
    .select("*")
    .eq("instructor_id", instructorId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[courses.service] listInstructorCourses error:", error);
    return { data: [], error: error.message };
  }

  return { data: data ?? [], error: null };
}

// ---------------------------------------------------------------------------
// enrollStudent — INSERT a course enrollment (student joins a course)
//
// Why check for existing enrollment first?
//   Supabase will throw a unique constraint violation if you try to insert a
//   duplicate enrollment. We catch it gracefully here instead of showing a
//   raw error to the user.
// ---------------------------------------------------------------------------

export async function enrollStudent(input: {
  course_id: string;
  student_id: string;
}): Promise<{ data: CourseEnrollment | null; error: string | null }> {
  // Check if already enrolled
  const { data: existing } = await supabase
    .from("course_enrollments")
    .select("id")
    .eq("course_id", input.course_id)
    .eq("student_id", input.student_id)
    .maybeSingle(); // returns null (not error) if no row found

  if (existing) {
    // Already enrolled — not an error, just return the fact
    return { data: null, error: "Already enrolled in this course" };
  }

  const insert: CourseEnrollmentInsert = {
    course_id: input.course_id,
    student_id: input.student_id,
  };

  const { data, error } = await supabase
    .from("course_enrollments")
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .insert(insert as any) // cast: supabase-js v2.105+ expects Relationships key in Database type
    .select()
    .single();

  if (error) {
    console.error("[courses.service] enrollStudent error:", error);
    return { data: null, error: error.message };
  }

  return { data, error: null };
}

// ---------------------------------------------------------------------------
// listStudentCourses — SELECT all courses a student is enrolled in
// ---------------------------------------------------------------------------

export async function listStudentCourses(studentId: string): Promise<{
  data: (CourseEnrollment & { course: Course })[];
  error: string | null;
}> {
  // Supabase JOIN syntax: select the enrollment row + the related course row
  const { data, error } = await supabase
    .from("course_enrollments")
    .select("*, course:courses(*)")  // "course" becomes the alias for the joined row
    .eq("student_id", studentId);

  if (error) {
    console.error("[courses.service] listStudentCourses error:", error);
    return { data: [], error: error.message };
  }

  return { data: (data as any) ?? [], error: null };
}
