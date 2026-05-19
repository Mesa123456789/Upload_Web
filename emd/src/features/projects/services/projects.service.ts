import { supabase } from '../../../lib/supabase'
import type {
  Project,
  AdsConfig,
  AdPlacement,
  IapConfig,
  IapItem,
} from '../../../lib/database.types'

// ─────────────────────────────────────────────
// Projects
// ─────────────────────────────────────────────

export async function createProject(params: {
  course_id: string
  title: string
}): Promise<Project> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const { data, error } = await supabase
    .from('projects')
    .insert({
      owner_id: user.id,
      course_id: params.course_id,
      title: params.title,
      current_step: 1,
    })
    .select()
    .single()

  if (error) throw new Error(error.message)
  return data
}

export async function getProject(projectId: string): Promise<Project> {
  const { data, error } = await supabase
    .from('projects')
    .select('*')
    .eq('id', projectId)
    .single()

  if (error || !data) throw new Error('Project not found')
  return data
}

export async function updateProject(
  projectId: string,
  updates: Partial<Project>
): Promise<Project> {
  const { data, error } = await supabase
    .from('projects')
    .update(updates)
    .eq('id', projectId)
    .select()
    .single()

  if (error) throw new Error(error.message)
  return data
}

// Instructor-side update: runs UPDATE then fetches the row separately.
// This avoids the "Cannot coerce to single JSON object" error that occurs
// when the UPDATE policy exists but Supabase's chained .select().single()
// on an UPDATE query returns 0 rows (because the RETURNING clause is
// filtered by RLS). Fetching separately is reliable because instructor
// already has a SELECT policy on projects.
async function instructorUpdateProject(
  projectId: string,
  updates: Partial<Project>
): Promise<Project> {
  const { error } = await supabase
    .from('projects')
    .update(updates)
    .eq('id', projectId)

  if (error) throw new Error(error.message)

  // Re-fetch after update so we always return the fresh row.
  return getProject(projectId)
}

// Get all projects for a specific student in a specific course
export async function listProjectsByCourseAndOwner(
  courseId: string,
  ownerId: string
): Promise<Project[]> {
  const { data, error } = await supabase
    .from('projects')
    .select('*')
    .eq('course_id', courseId)
    .eq('owner_id', ownerId)
    .order('updated_at', { ascending: false })

  if (error) throw new Error(error.message)
  return data ?? []
}

// Instructor: get all projects in a course (across all students)
export async function listCourseProjects(courseId: string): Promise<Project[]> {
  const { data, error } = await supabase
    .from('projects')
    .select('*')
    .eq('course_id', courseId)
    .order('updated_at', { ascending: false })

  if (error) throw new Error(error.message)
  return data ?? []
}

// Submit a project for instructor review.
// Sets status → 'submitted' and records submitted_at timestamp.
export async function submitProject(projectId: string): Promise<Project> {
  return updateProject(projectId, {
    status: 'submitted',
    submitted_at: new Date().toISOString(),
  })
}

// Re-submit after editing — instructor sees it as revised.
// Sets status → 'resubmitted' and updates submitted_at to now.
export async function resubmitProject(projectId: string): Promise<Project> {
  return updateProject(projectId, {
    status: 'resubmitted',
    submitted_at: new Date().toISOString(),
  })
}

// Instructor: lock project for review — student cannot edit while under_review.
export async function setProjectUnderReview(projectId: string): Promise<Project> {
  return instructorUpdateProject(projectId, { status: 'under_review' })
}

// Instructor: return project to student for revision.
// Student will see the comment and can re-submit.
export async function returnProject(
  projectId: string,
  comment: string
): Promise<Project> {
  return instructorUpdateProject(projectId, {
    status: 'returned',
    instructor_comment: comment,
  })
}

// Instructor: grade a project — sets grade, comment, graded_at, status='graded'.
export async function gradeProject(
  projectId: string,
  grade: number,
  comment: string
): Promise<Project> {
  return instructorUpdateProject(projectId, {
    status: 'graded',
    grade,
    instructor_comment: comment,
    graded_at: new Date().toISOString(),
  })
}

// Delete a project and all its related data (cascade in DB).
// ads_configs and iap_configs reference projects with ON DELETE CASCADE,
// so deleting the project row removes child rows automatically.
export async function deleteProject(projectId: string): Promise<void> {
  const { error } = await supabase
    .from('projects')
    .delete()
    .eq('id', projectId)

  if (error) throw new Error(error.message)
}

// ─────────────────────────────────────────────
// Ads Config
// ─────────────────────────────────────────────

// Upsert (insert or update) ads config for a project
export async function upsertAdsConfig(params: {
  project_id: string
  ad_network?: string | null
  revenue_model?: string | null
  notes?: string | null
}): Promise<AdsConfig> {
  const { data, error } = await supabase
    .from('ads_configs')
    .upsert(
      {
        project_id: params.project_id,
        ad_network: params.ad_network ?? null,
        revenue_model: params.revenue_model ?? null,
        notes: params.notes ?? null,
      },
      { onConflict: 'project_id' }
    )
    .select()
    .single()

  if (error) throw new Error(error.message)
  return data
}

export async function getAdsConfig(projectId: string): Promise<AdsConfig | null> {
  const { data, error } = await supabase
    .from('ads_configs')
    .select('*')
    .eq('project_id', projectId)
    .maybeSingle()

  if (error) throw new Error(error.message)
  return data
}

// ─────────────────────────────────────────────
// Ad Placements
// ─────────────────────────────────────────────

export async function listAdPlacements(adsConfigId: string): Promise<AdPlacement[]> {
  const { data, error } = await supabase
    .from('ad_placements')
    .select('*')
    .eq('ads_config_id', adsConfigId)
    .order('created_at', { ascending: true })

  if (error) throw new Error(error.message)
  return data ?? []
}

export async function createAdPlacement(params: {
  ads_config_id: string
  placement_type: 'banner' | 'interstitial' | 'rewarded' | 'native'
  trigger_point?: string | null
  frequency_cap?: number | null
  notes?: string | null
}): Promise<AdPlacement> {
  const { data, error } = await supabase
    .from('ad_placements')
    .insert(params)
    .select()
    .single()

  if (error) throw new Error(error.message)
  return data
}

export async function deleteAdPlacement(placementId: string): Promise<void> {
  const { error } = await supabase
    .from('ad_placements')
    .delete()
    .eq('id', placementId)

  if (error) throw new Error(error.message)
}

// ─────────────────────────────────────────────
// IAP Config
// ─────────────────────────────────────────────

export async function upsertIapConfig(params: {
  project_id: string
  store?: 'google_play' | 'app_store' | 'both' | null
  currency?: string | null
  notes?: string | null
}): Promise<IapConfig> {
  const { data, error } = await supabase
    .from('iap_configs')
    .upsert(
      {
        project_id: params.project_id,
        store: params.store ?? null,
        currency: params.currency ?? 'USD',
        notes: params.notes ?? null,
      },
      { onConflict: 'project_id' }
    )
    .select()
    .single()

  if (error) throw new Error(error.message)
  return data
}

export async function getIapConfig(projectId: string): Promise<IapConfig | null> {
  const { data, error } = await supabase
    .from('iap_configs')
    .select('*')
    .eq('project_id', projectId)
    .maybeSingle()

  if (error) throw new Error(error.message)
  return data
}

// ─────────────────────────────────────────────
// IAP Items
// ─────────────────────────────────────────────

export async function listIapItems(iapConfigId: string): Promise<IapItem[]> {
  const { data, error } = await supabase
    .from('iap_items')
    .select('*')
    .eq('iap_config_id', iapConfigId)
    .order('created_at', { ascending: true })

  if (error) throw new Error(error.message)
  return data ?? []
}

export async function createIapItem(params: {
  iap_config_id: string
  name: string
  item_type: 'consumable' | 'non_consumable' | 'subscription'
  price_usd?: number | null
  description?: string | null
}): Promise<IapItem> {
  const { data, error } = await supabase
    .from('iap_items')
    .insert(params)
    .select()
    .single()

  if (error) throw new Error(error.message)
  return data
}

export async function deleteIapItem(itemId: string): Promise<void> {
  const { error } = await supabase
    .from('iap_items')
    .delete()
    .eq('id', itemId)

  if (error) throw new Error(error.message)
}
