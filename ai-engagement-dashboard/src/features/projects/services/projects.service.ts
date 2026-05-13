// ---------------------------------------------------------------------------
// projects.service.ts — CRUD operations for the `projects` table
//
// Why a service layer?
//   Components should NOT talk to Supabase directly. If we ever change the
//   database or add caching, we only update one file — not every component.
//   This is called "separation of concerns."
//
// Pattern used: each function returns { data, error } — same shape as
//   Supabase's own API, so callers have consistent error handling.
// ---------------------------------------------------------------------------

import { supabase } from "../../../lib/supabase";
import type { Project, ProjectInsert } from "../../../lib/database.types";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** What the caller passes when creating a new project (Step 1 Setup) */
export interface CreateProjectInput {
  course_id: string;
  student_id: string;
  title: string;
  genre: string[];
  platform: string[];
  target_audience: string | null;
  session_length_min: number | null;
  core_mechanic: string | null;
  monetization: string[];
}

/** What the caller passes when updating an existing project */
export type UpdateProjectInput = Partial<Omit<CreateProjectInput, "course_id" | "student_id">>;

// ---------------------------------------------------------------------------
// createProject — INSERT a new project row (called at the end of Step 1)
// ---------------------------------------------------------------------------

export async function createProject(input: CreateProjectInput): Promise<{
  data: Project | null;
  error: string | null;
}> {
  const insert: ProjectInsert = {
    course_id: input.course_id,
    student_id: input.student_id,
    title: input.title,
    genre: input.genre,
    platform: input.platform,
    target_audience: input.target_audience,
    session_length_min: input.session_length_min,
    core_mechanic: input.core_mechanic,
    monetization: input.monetization,
  };

  const { data, error } = await supabase
    .from("projects")
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .insert(insert as any) // cast: supabase-js v2.105+ expects Relationships key in Database type
    .select()   // return the newly created row so caller gets the `id`
    .single();  // we inserted 1 row → expect 1 row back

  if (error) {
    console.error("[projects.service] createProject error:", error);
    return { data: null, error: error.message };
  }

  return { data, error: null };
}

// ---------------------------------------------------------------------------
// getProject — SELECT a single project by id
// ---------------------------------------------------------------------------

export async function getProject(projectId: string): Promise<{
  data: Project | null;
  error: string | null;
}> {
  const { data, error } = await supabase
    .from("projects")
    .select("*")
    .eq("id", projectId)
    .single();

  if (error) {
    console.error("[projects.service] getProject error:", error);
    return { data: null, error: error.message };
  }

  return { data, error: null };
}

// ---------------------------------------------------------------------------
// updateProject — UPDATE an existing project (used when student edits Step 1)
// ---------------------------------------------------------------------------

export async function updateProject(
  projectId: string,
  updates: UpdateProjectInput
): Promise<{ data: Project | null; error: string | null }> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .from("projects")
    .update(updates) // cast via (supabase as any): supabase-js v2.105+ Relationships type mismatch
    .eq("id", projectId)
    .select()
    .single() as { data: Project | null; error: { message: string } | null };

  if (error) {
    console.error("[projects.service] updateProject error:", error);
    return { data: null, error: error.message };
  }

  return { data, error: null };
}

// ---------------------------------------------------------------------------
// listProjects — SELECT all projects belonging to a student
//   (used on the student's dashboard to show their project history)
// ---------------------------------------------------------------------------

export async function listProjects(studentId: string): Promise<{
  data: Project[];
  error: string | null;
}> {
  const { data, error } = await supabase
    .from("projects")
    .select("*")
    .eq("student_id", studentId)
    .order("created_at", { ascending: false }); // newest first

  if (error) {
    console.error("[projects.service] listProjects error:", error);
    return { data: [], error: error.message };
  }

  return { data: data ?? [], error: null };
}

// ---------------------------------------------------------------------------
// listCourseProjects — SELECT all projects for a given course
//   (used by instructor to see every student's work in their course)
// ---------------------------------------------------------------------------

export async function listCourseProjects(courseId: string): Promise<{
  data: Project[];
  error: string | null;
}> {
  const { data, error } = await supabase
    .from("projects")
    .select("*")
    .eq("course_id", courseId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[projects.service] listCourseProjects error:", error);
    return { data: [], error: error.message };
  }

  return { data: data ?? [], error: null };
}
