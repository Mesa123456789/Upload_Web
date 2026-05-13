// ---------------------------------------------------------------------------
// courses.service.ts — CRUD for courses and course_enrollments tables
//
// Separated from projects.service because courses are instructor-owned
// while projects are student-owned.
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
  invite_code: string;
  is_active?: boolean;
}): Promise<{ data: Course | null; error: string | null }> {
  const insert: CourseInsert = {
    instructor_id: input.instructor_id,
    title: input.title,
    description: input.description ?? null,
    invite_code: input.invite_code,
    is_active: input.is_active ?? true,
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .from("courses")
    .insert(insert)
    .select()
    .single();

  if (error) {
    console.error("[courses.service] createCourse error:", error);
    return { data: null, error: error.message };
  }

  return { data: data as Course, error: null };
}

// ---------------------------------------------------------------------------
// listCourses — SELECT all active courses
// ---------------------------------------------------------------------------
export async function listCourses(): Promise<{
  data: Course[];
  error: string | null;
}> {
  const { data, error } = await supabase
    .from("courses")
    .select("*")
    .eq("is_active", true)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[courses.service] listCourses error:", error);
    return { data: [], error: error.message };
  }

  return { data: (data as Course[]) ?? [], error: null };
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

  return { data: (data as Course[]) ?? [], error: null };
}

// ---------------------------------------------------------------------------
// enrollStudent — INSERT a course enrollment via invite code
// ---------------------------------------------------------------------------
export async function enrollStudent(input: {
  course_id: string;
  student_id: string;
  enrolled_via?: CourseEnrollment["enrolled_via"];
}): Promise<{ data: CourseEnrollment | null; error: string | null }> {
  // Check if already enrolled to avoid confusing unique-constraint errors
  const { data: existing } = await supabase
    .from("course_enrollments")
    .select("id")
    .eq("course_id", input.course_id)
    .eq("student_id", input.student_id)
    .maybeSingle();

  if (existing) {
    return { data: null, error: "Already enrolled in this course" };
  }

  const insert: CourseEnrollmentInsert = {
    course_id: input.course_id,
    student_id: input.student_id,
    enrolled_via: input.enrolled_via ?? "invite_code",
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .from("course_enrollments")
    .insert(insert)
    .select()
    .single();

  if (error) {
    console.error("[courses.service] enrollStudent error:", error);
    return { data: null, error: error.message };
  }

  return { data: data as CourseEnrollment, error: null };
}

// ---------------------------------------------------------------------------
// listStudentCourses — SELECT all courses a student is enrolled in
// ---------------------------------------------------------------------------
export async function listStudentCourses(studentId: string): Promise<{
  data: (CourseEnrollment & { course: Course })[];
  error: string | null;
}> {
  const { data, error } = await supabase
    .from("course_enrollments")
    .select("*, course:courses(*)")
    .eq("student_id", studentId);

  if (error) {
    console.error("[courses.service] listStudentCourses error:", error);
    return { data: [], error: error.message };
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return { data: (data as any) ?? [], error: null };
}

// ---------------------------------------------------------------------------
// getCourseByInviteCode — find a course by its invite_code
// (used when student types in the code to enroll)
// ---------------------------------------------------------------------------
export async function getCourseByInviteCode(inviteCode: string): Promise<{
  data: Course | null;
  error: string | null;
}> {
  const { data, error } = await supabase
    .from("courses")
    .select("*")
    .eq("invite_code", inviteCode.trim())
    .maybeSingle();

  if (error) {
    console.error("[courses.service] getCourseByInviteCode error:", error);
    return { data: null, error: error.message };
  }

  return { data: data as Course | null, error: null };
}
