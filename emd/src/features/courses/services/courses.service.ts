import { supabase } from '../../../lib/supabase'
import type { Course, CourseEnrollment, Profile } from '../../../lib/database.types'

// Fetch all courses the current student is enrolled in
export async function listStudentCourses(): Promise<Course[]> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  // Get the course_ids this student is enrolled in
  const { data: enrollments, error: enrollError } = await supabase
    .from('course_enrollments')
    .select('course_id')
    .eq('student_id', user.id)

  if (enrollError) throw new Error(enrollError.message)
  if (!enrollments || enrollments.length === 0) return []

  const courseIds = enrollments.map((e) => e.course_id)

  const { data, error } = await supabase
    .from('courses')
    .select('*')
    .in('id', courseIds)
    .order('created_at', { ascending: false })

  if (error) throw new Error(error.message)
  return data ?? []
}

// Fetch all courses created by the current instructor
export async function listInstructorCourses(): Promise<Course[]> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const { data, error } = await supabase
    .from('courses')
    .select('*')
    .eq('instructor_id', user.id)
    .order('created_at', { ascending: false })

  if (error) throw new Error(error.message)
  return data ?? []
}

// Create a new course (instructor only)
export async function createCourse(params: {
  title: string
  description?: string
  invite_code: string
}): Promise<Course> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const { data, error } = await supabase
    .from('courses')
    .insert({
      instructor_id: user.id,
      title: params.title,
      description: params.description ?? null,
      invite_code: params.invite_code,
    })
    .select()
    .single()

  if (error) throw new Error(error.message)
  return data
}

// Enroll the current student using an invite code.
// Returns the existing enrollment if the student is already enrolled
// rather than throwing a duplicate-key error.
export async function enrollStudent(inviteCode: string): Promise<CourseEnrollment> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  // Find the course by invite code
  const course = await getCourseByInviteCode(inviteCode)

  // Check if the student is already enrolled to give a friendly message
  const { data: existing } = await supabase
    .from('course_enrollments')
    .select('*')
    .eq('course_id', course.id)
    .eq('student_id', user.id)
    .maybeSingle()

  if (existing) {
    // Already enrolled — return the existing record instead of erroring
    return existing
  }

  const { data, error } = await supabase
    .from('course_enrollments')
    .insert({
      course_id: course.id,
      student_id: user.id,
      enrolled_via: 'invite_code',
    })
    .select()
    .single()

  // Translate Supabase/Postgres errors into user-friendly messages
  if (error) {
    if (error.code === '42501') {
      // RLS policy blocked the insert — student role not permitted
      throw new Error('Permission denied. Please contact your instructor.')
    }
    throw new Error(error.message)
  }
  return data
}

// Update a course's title, description, or is_active flag (instructor only).
// Returns the updated course row.
export async function updateCourse(
  courseId: string,
  updates: { title?: string; description?: string | null; is_active?: boolean }
): Promise<Course> {
  const { data, error } = await supabase
    .from('courses')
    .update(updates)
    .eq('id', courseId)
    .select()
    .single()

  if (error) throw new Error(error.message)
  return data
}

// Instructor: get all student profiles enrolled in a course.
// Two-step query: enrollments → profile ids → profiles (avoids nested join complexity).
export async function listEnrolledStudents(courseId: string): Promise<Profile[]> {
  const { data: enrollments, error: enrollError } = await supabase
    .from('course_enrollments')
    .select('student_id')
    .eq('course_id', courseId)

  if (enrollError) throw new Error(enrollError.message)
  if (!enrollments || enrollments.length === 0) return []

  const studentIds = enrollments.map((e) => e.student_id)

  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .in('id', studentIds)
    .order('display_name', { ascending: true })

  if (error) throw new Error(error.message)
  return data ?? []
}

// Leave a course (student only) — deletes the enrollment row.
// After this, the student will no longer see this course on their dashboard.
export async function leaveCourse(courseId: string): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const { error } = await supabase
    .from('course_enrollments')
    .delete()
    .match({ student_id: user.id, course_id: courseId })

  if (error) throw new Error(error.message)
}

// Delete a course (instructor only).
// NOTE: Supabase schema must have ON DELETE CASCADE on course_enrollments.course_id
// and projects.course_id for this to clean up related rows automatically.
// If cascade is not set, run the SQL migration in emd-schema.sql first.
export async function deleteCourse(courseId: string): Promise<void> {
  const { error } = await supabase
    .from('courses')
    .delete()
    .eq('id', courseId)

  if (error) throw new Error(error.message)
}

// Look up a course by its invite code — throws if not found or inactive.
// The invite code comparison is case-insensitive (always uppercased).
export async function getCourseByInviteCode(inviteCode: string): Promise<Course> {
  const { data, error } = await supabase
    .from('courses')
    .select('*')
    .eq('invite_code', inviteCode.trim().toUpperCase())
    .maybeSingle()

  // maybeSingle() returns null (not an error) when no rows match
  if (error) throw new Error('Failed to look up invite code')
  if (!data) throw new Error('Invite code not found')
  if (!data.is_active) throw new Error('This course is no longer accepting new students')
  return data
}
