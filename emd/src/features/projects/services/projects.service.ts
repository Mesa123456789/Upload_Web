import { isSupabaseConfigured, supabase } from '../../../lib/supabase'
import type {
  Project,
  AdsConfig,
  AdPlacement,
  IapConfig,
  IapItem,
} from '../../../lib/database.types'

interface DemoProjectState {
  projects: Project[]
  adsConfigs: AdsConfig[]
  adPlacements: AdPlacement[]
  iapConfigs: IapConfig[]
  iapItems: IapItem[]
}

const demoNow = new Date().toISOString()
const demoStorageKey = 'emd-demo-project-state'

function createDemoState(): DemoProjectState {
  return {
    projects: [
      {
        id: 'demo-project',
        owner_id: 'demo-student',
        course_id: 'demo-course',
        title: 'PuzzleWorld Plus',
        genre: ['Puzzle', 'Casual'],
        target_audience: 'All ages',
        session_length: '5-10 min',
        platform: ['Mobile (iOS)', 'Mobile (Android)'],
        core_mechanic: 'Player clears puzzle levels, earns coins, upgrades boosters, then starts the next challenge.',
        current_step: 4,
        status: 'draft',
        submitted_at: null,
        grade: null,
        instructor_comment: null,
        graded_at: null,
        created_at: demoNow,
        updated_at: demoNow,
      },
    ],
    adsConfigs: [
      {
        id: 'demo-ads',
        project_id: 'demo-project',
        ad_network: 'AdMob',
        revenue_model: 'rewarded',
        notes: 'Revenue mix target: Ads 60% / IAP 40%',
        created_at: demoNow,
        updated_at: demoNow,
      },
    ],
    adPlacements: [
      {
        id: 'demo-ad-1',
        ads_config_id: 'demo-ads',
        placement_type: 'rewarded',
        trigger_point: 'After first level',
        frequency_cap: 2,
        notes: null,
        created_at: demoNow,
      },
      {
        id: 'demo-ad-2',
        ads_config_id: 'demo-ads',
        placement_type: 'interstitial',
        trigger_point: 'Outcome screen',
        frequency_cap: 1,
        notes: null,
        created_at: demoNow,
      },
    ],
    iapConfigs: [
      {
        id: 'demo-iap',
        project_id: 'demo-project',
        store: 'both',
        currency: 'USD',
        notes: null,
        created_at: demoNow,
        updated_at: demoNow,
      },
    ],
    iapItems: [
      {
        id: 'demo-iap-1',
        iap_config_id: 'demo-iap',
        name: 'Energy Refill',
        item_type: 'consumable',
        price_usd: 0.99,
        description: 'Restore 20 energy',
        created_at: demoNow,
      },
      {
        id: 'demo-iap-2',
        iap_config_id: 'demo-iap',
        name: 'Starter Pack',
        item_type: 'consumable',
        price_usd: 4.99,
        description: '150 coins, 50 gems, and 2 boosters',
        created_at: demoNow,
      },
    ],
  }
}

function readDemoState(): DemoProjectState {
  const raw = window.localStorage.getItem(demoStorageKey)
  if (!raw) {
    const initial = createDemoState()
    writeDemoState(initial)
    return initial
  }
  return JSON.parse(raw) as DemoProjectState
}

function writeDemoState(state: DemoProjectState) {
  window.localStorage.setItem(demoStorageKey, JSON.stringify(state))
}

// ─────────────────────────────────────────────
// Projects
// ─────────────────────────────────────────────

export async function createProject(params: {
  course_id: string
  title: string
}): Promise<Project> {
  if (!isSupabaseConfigured) {
    const state = readDemoState()
    const project: Project = {
      id: `demo-project-${Date.now()}`,
      owner_id: 'demo-student',
      course_id: params.course_id,
      title: params.title,
      genre: null,
      target_audience: null,
      session_length: null,
      platform: null,
      core_mechanic: null,
      current_step: 1,
      status: 'draft',
      submitted_at: null,
      grade: null,
      instructor_comment: null,
      graded_at: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }
    state.projects.unshift(project)
    writeDemoState(state)
    return project
  }

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
  if (!isSupabaseConfigured) {
    const project = readDemoState().projects.find((item) => item.id === projectId)
    if (!project) throw new Error('Project not found')
    return project
  }

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
  if (!isSupabaseConfigured) {
    const state = readDemoState()
    const index = state.projects.findIndex((item) => item.id === projectId)
    if (index === -1) throw new Error('Project not found')
    state.projects[index] = {
      ...state.projects[index],
      ...updates,
      updated_at: new Date().toISOString(),
    }
    writeDemoState(state)
    return state.projects[index]
  }

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
  if (!isSupabaseConfigured) return updateProject(projectId, updates)

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
  if (!isSupabaseConfigured) {
    return readDemoState().projects
      .filter((project) => project.course_id === courseId && project.owner_id === ownerId)
      .sort((a, b) => b.updated_at.localeCompare(a.updated_at))
  }

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
  if (!isSupabaseConfigured) {
    return readDemoState().projects
      .filter((project) => project.course_id === courseId)
      .sort((a, b) => b.updated_at.localeCompare(a.updated_at))
  }

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
  if (!isSupabaseConfigured) {
    const state = readDemoState()
    const projectConfigIds = state.adsConfigs
      .filter((config) => config.project_id === projectId)
      .map((config) => config.id)
    const iapConfigIds = state.iapConfigs
      .filter((config) => config.project_id === projectId)
      .map((config) => config.id)
    state.projects = state.projects.filter((project) => project.id !== projectId)
    state.adsConfigs = state.adsConfigs.filter((config) => config.project_id !== projectId)
    state.adPlacements = state.adPlacements.filter((placement) => !projectConfigIds.includes(placement.ads_config_id))
    state.iapConfigs = state.iapConfigs.filter((config) => config.project_id !== projectId)
    state.iapItems = state.iapItems.filter((item) => !iapConfigIds.includes(item.iap_config_id))
    writeDemoState(state)
    return
  }

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
  if (!isSupabaseConfigured) {
    const state = readDemoState()
    const index = state.adsConfigs.findIndex((config) => config.project_id === params.project_id)
    const nextConfig: AdsConfig = {
      id: index >= 0 ? state.adsConfigs[index].id : `demo-ads-${Date.now()}`,
      project_id: params.project_id,
      ad_network: params.ad_network ?? null,
      revenue_model: params.revenue_model ?? null,
      notes: params.notes ?? null,
      created_at: index >= 0 ? state.adsConfigs[index].created_at : new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }
    if (index >= 0) state.adsConfigs[index] = nextConfig
    else state.adsConfigs.push(nextConfig)
    writeDemoState(state)
    return nextConfig
  }

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
  if (!isSupabaseConfigured) {
    return readDemoState().adsConfigs.find((config) => config.project_id === projectId) ?? null
  }

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
  if (!isSupabaseConfigured) {
    return readDemoState().adPlacements.filter((placement) => placement.ads_config_id === adsConfigId)
  }

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
  if (!isSupabaseConfigured) {
    const state = readDemoState()
    const placement: AdPlacement = {
      id: `demo-ad-${Date.now()}`,
      ads_config_id: params.ads_config_id,
      placement_type: params.placement_type,
      trigger_point: params.trigger_point ?? null,
      frequency_cap: params.frequency_cap ?? null,
      notes: params.notes ?? null,
      created_at: new Date().toISOString(),
    }
    state.adPlacements.push(placement)
    writeDemoState(state)
    return placement
  }

  const { data, error } = await supabase
    .from('ad_placements')
    .insert(params)
    .select()
    .single()

  if (error) throw new Error(error.message)
  return data
}

export async function deleteAdPlacement(placementId: string): Promise<void> {
  if (!isSupabaseConfigured) {
    const state = readDemoState()
    state.adPlacements = state.adPlacements.filter((placement) => placement.id !== placementId)
    writeDemoState(state)
    return
  }

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
  if (!isSupabaseConfigured) {
    const state = readDemoState()
    const index = state.iapConfigs.findIndex((config) => config.project_id === params.project_id)
    const nextConfig: IapConfig = {
      id: index >= 0 ? state.iapConfigs[index].id : `demo-iap-${Date.now()}`,
      project_id: params.project_id,
      store: params.store ?? null,
      currency: params.currency ?? 'USD',
      notes: params.notes ?? null,
      created_at: index >= 0 ? state.iapConfigs[index].created_at : new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }
    if (index >= 0) state.iapConfigs[index] = nextConfig
    else state.iapConfigs.push(nextConfig)
    writeDemoState(state)
    return nextConfig
  }

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
  if (!isSupabaseConfigured) {
    return readDemoState().iapConfigs.find((config) => config.project_id === projectId) ?? null
  }

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
  if (!isSupabaseConfigured) {
    return readDemoState().iapItems.filter((item) => item.iap_config_id === iapConfigId)
  }

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
  if (!isSupabaseConfigured) {
    const state = readDemoState()
    const item: IapItem = {
      id: `demo-iap-item-${Date.now()}`,
      iap_config_id: params.iap_config_id,
      name: params.name,
      item_type: params.item_type,
      price_usd: params.price_usd ?? null,
      description: params.description ?? null,
      created_at: new Date().toISOString(),
    }
    state.iapItems.push(item)
    writeDemoState(state)
    return item
  }

  const { data, error } = await supabase
    .from('iap_items')
    .insert(params)
    .select()
    .single()

  if (error) throw new Error(error.message)
  return data
}

export async function deleteIapItem(itemId: string): Promise<void> {
  if (!isSupabaseConfigured) {
    const state = readDemoState()
    state.iapItems = state.iapItems.filter((item) => item.id !== itemId)
    writeDemoState(state)
    return
  }

  const { error } = await supabase
    .from('iap_items')
    .delete()
    .eq('id', itemId)

  if (error) throw new Error(error.message)
}
