// ---------------------------------------------------------------------------
// projects.service.ts — CRUD for projects, ads_configs, ad_placements,
//                        iap_configs, and iap_items tables
//
// Why a service layer?
//   Components should NOT query Supabase directly. If the DB schema changes,
//   we update ONE file — not every page component.
//
// Pattern: each function returns { data, error } — consistent with Supabase.
// ---------------------------------------------------------------------------

import { supabase } from "../../../lib/supabase";
import type {
  Project,
  ProjectInsert,
  AdsConfig,
  AdsConfigInsert,
  AdPlacement,
  AdPlacementInsert,
  IapConfig,
  IapConfigInsert,
  IapItem,
  IapItemInsert,
} from "../../../lib/database.types";

// ===========================================================================
// PROJECTS
// ===========================================================================

// ---------------------------------------------------------------------------
// Input shape for creating a new project (Step 1 Setup)
// Field names match emd-schema.sql columns exactly
// ---------------------------------------------------------------------------
export interface CreateProjectInput {
  owner_id: string;         // maps to projects.owner_id
  course_id: string | null; // nullable: personal project has no course
  title: string;
  genre: string[];
  platform: string[];
  target_audience: string | null;
  session_length: string | null;  // TEXT in schema, e.g. "15 min"
  core_mechanic: string | null;
}

export type UpdateProjectInput = Partial<
  Omit<CreateProjectInput, "owner_id" | "course_id">
> & { current_step?: 1 | 2 | 3 | 4; status?: Project["status"] };

// ---------------------------------------------------------------------------
// createProject — INSERT a new project (called at end of Step 1)
// ---------------------------------------------------------------------------
export async function createProject(input: CreateProjectInput): Promise<{
  data: Project | null;
  error: string | null;
}> {
  const insert: ProjectInsert = {
    owner_id: input.owner_id,
    course_id: input.course_id,
    title: input.title,
    genre: input.genre,
    platform: input.platform,
    target_audience: input.target_audience,
    session_length: input.session_length,
    core_mechanic: input.core_mechanic,
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .from("projects")
    .insert(insert)
    .select()
    .single();

  if (error) {
    console.error("[projects.service] createProject error:", error);
    return { data: null, error: error.message };
  }

  return { data: data as Project, error: null };
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

  return { data: data as Project, error: null };
}

// ---------------------------------------------------------------------------
// updateProject — UPDATE an existing project row
// ---------------------------------------------------------------------------
export async function updateProject(
  projectId: string,
  updates: UpdateProjectInput
): Promise<{ data: Project | null; error: string | null }> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .from("projects")
    .update(updates)
    .eq("id", projectId)
    .select()
    .single();

  if (error) {
    console.error("[projects.service] updateProject error:", error);
    return { data: null, error: error.message };
  }

  return { data: data as Project, error: null };
}

// ---------------------------------------------------------------------------
// listProjects — SELECT all projects belonging to a student (by owner_id)
// ---------------------------------------------------------------------------
export async function listProjects(ownerId: string): Promise<{
  data: Project[];
  error: string | null;
}> {
  const { data, error } = await supabase
    .from("projects")
    .select("*")
    .eq("owner_id", ownerId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[projects.service] listProjects error:", error);
    return { data: [], error: error.message };
  }

  return { data: (data as Project[]) ?? [], error: null };
}

// ---------------------------------------------------------------------------
// listCourseProjects — SELECT all projects for a given course
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

  return { data: (data as Project[]) ?? [], error: null };
}

// ---------------------------------------------------------------------------
// listProjectsByCourseAndOwner — SELECT student's projects in a specific course
// Used by Student Dashboard to show projects per course
// ---------------------------------------------------------------------------
export async function listProjectsByCourseAndOwner(
  courseId: string,
  ownerId: string
): Promise<{ data: Project[]; error: string | null }> {
  const { data, error } = await supabase
    .from("projects")
    .select("*")
    .eq("course_id", courseId)
    .eq("owner_id", ownerId)
    .order("updated_at", { ascending: false });

  if (error) {
    console.error("[projects.service] listProjectsByCourseAndOwner error:", error);
    return { data: [], error: error.message };
  }

  return { data: (data as Project[]) ?? [], error: null };
}

// ===========================================================================
// ADS CONFIG
// ===========================================================================

export interface UpsertAdsConfigInput {
  project_id: string;
  ad_network: string | null;
  revenue_model: string | null;
  notes: string | null;
}

// ---------------------------------------------------------------------------
// upsertAdsConfig — INSERT or UPDATE ads_config (one per project)
// Using upsert on project_id UNIQUE constraint
// ---------------------------------------------------------------------------
export async function upsertAdsConfig(input: UpsertAdsConfigInput): Promise<{
  data: AdsConfig | null;
  error: string | null;
}> {
  const record: AdsConfigInsert = {
    project_id: input.project_id,
    ad_network: input.ad_network,
    revenue_model: input.revenue_model,
    notes: input.notes,
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .from("ads_configs")
    .upsert(record, { onConflict: "project_id" })
    .select()
    .single();

  if (error) {
    console.error("[projects.service] upsertAdsConfig error:", error);
    return { data: null, error: error.message };
  }

  return { data: data as AdsConfig, error: null };
}

// ---------------------------------------------------------------------------
// getAdsConfig — get ads_config for a project (returns null if not set yet)
// ---------------------------------------------------------------------------
export async function getAdsConfig(projectId: string): Promise<{
  data: AdsConfig | null;
  error: string | null;
}> {
  const { data, error } = await supabase
    .from("ads_configs")
    .select("*")
    .eq("project_id", projectId)
    .maybeSingle();

  if (error) {
    console.error("[projects.service] getAdsConfig error:", error);
    return { data: null, error: error.message };
  }

  return { data: data as AdsConfig | null, error: null };
}

// ===========================================================================
// AD PLACEMENTS
// ===========================================================================

export interface CreateAdPlacementInput {
  ads_config_id: string;
  placement_type: AdPlacement["placement_type"];
  trigger_point: string | null;
  frequency_cap: number | null;
  notes: string | null;
}

// ---------------------------------------------------------------------------
// createAdPlacement — INSERT a single ad placement row
// ---------------------------------------------------------------------------
export async function createAdPlacement(input: CreateAdPlacementInput): Promise<{
  data: AdPlacement | null;
  error: string | null;
}> {
  const record: AdPlacementInsert = {
    ads_config_id: input.ads_config_id,
    placement_type: input.placement_type,
    trigger_point: input.trigger_point,
    frequency_cap: input.frequency_cap,
    notes: input.notes,
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .from("ad_placements")
    .insert(record)
    .select()
    .single();

  if (error) {
    console.error("[projects.service] createAdPlacement error:", error);
    return { data: null, error: error.message };
  }

  return { data: data as AdPlacement, error: null };
}

// ---------------------------------------------------------------------------
// listAdPlacements — SELECT all placements for an ads_config
// ---------------------------------------------------------------------------
export async function listAdPlacements(adsConfigId: string): Promise<{
  data: AdPlacement[];
  error: string | null;
}> {
  const { data, error } = await supabase
    .from("ad_placements")
    .select("*")
    .eq("ads_config_id", adsConfigId)
    .order("created_at", { ascending: true });

  if (error) {
    console.error("[projects.service] listAdPlacements error:", error);
    return { data: [], error: error.message };
  }

  return { data: (data as AdPlacement[]) ?? [], error: null };
}

// ---------------------------------------------------------------------------
// deleteAdPlacement — DELETE a single placement by id
// ---------------------------------------------------------------------------
export async function deleteAdPlacement(placementId: string): Promise<{
  error: string | null;
}> {
  const { error } = await supabase
    .from("ad_placements")
    .delete()
    .eq("id", placementId);

  if (error) {
    console.error("[projects.service] deleteAdPlacement error:", error);
    return { error: error.message };
  }

  return { error: null };
}

// ===========================================================================
// IAP CONFIG
// ===========================================================================

export interface UpsertIapConfigInput {
  project_id: string;
  store: IapConfig["store"];
  currency: string | null;
  notes: string | null;
}

// ---------------------------------------------------------------------------
// upsertIapConfig — INSERT or UPDATE iap_config (one per project)
// ---------------------------------------------------------------------------
export async function upsertIapConfig(input: UpsertIapConfigInput): Promise<{
  data: IapConfig | null;
  error: string | null;
}> {
  const record: IapConfigInsert = {
    project_id: input.project_id,
    store: input.store,
    currency: input.currency,
    notes: input.notes,
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .from("iap_configs")
    .upsert(record, { onConflict: "project_id" })
    .select()
    .single();

  if (error) {
    console.error("[projects.service] upsertIapConfig error:", error);
    return { data: null, error: error.message };
  }

  return { data: data as IapConfig, error: null };
}

// ---------------------------------------------------------------------------
// getIapConfig — get iap_config for a project (null if not set yet)
// ---------------------------------------------------------------------------
export async function getIapConfig(projectId: string): Promise<{
  data: IapConfig | null;
  error: string | null;
}> {
  const { data, error } = await supabase
    .from("iap_configs")
    .select("*")
    .eq("project_id", projectId)
    .maybeSingle();

  if (error) {
    console.error("[projects.service] getIapConfig error:", error);
    return { data: null, error: error.message };
  }

  return { data: data as IapConfig | null, error: null };
}

// ===========================================================================
// IAP ITEMS
// ===========================================================================

export interface CreateIapItemInput {
  iap_config_id: string;
  name: string;
  item_type: IapItem["item_type"];
  price_usd: number | null;
  description: string | null;
}

// ---------------------------------------------------------------------------
// createIapItem — INSERT a single IAP item
// ---------------------------------------------------------------------------
export async function createIapItem(input: CreateIapItemInput): Promise<{
  data: IapItem | null;
  error: string | null;
}> {
  const record: IapItemInsert = {
    iap_config_id: input.iap_config_id,
    name: input.name,
    item_type: input.item_type,
    price_usd: input.price_usd,
    description: input.description,
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .from("iap_items")
    .insert(record)
    .select()
    .single();

  if (error) {
    console.error("[projects.service] createIapItem error:", error);
    return { data: null, error: error.message };
  }

  return { data: data as IapItem, error: null };
}

// ---------------------------------------------------------------------------
// listIapItems — SELECT all items for an iap_config
// ---------------------------------------------------------------------------
export async function listIapItems(iapConfigId: string): Promise<{
  data: IapItem[];
  error: string | null;
}> {
  const { data, error } = await supabase
    .from("iap_items")
    .select("*")
    .eq("iap_config_id", iapConfigId)
    .order("created_at", { ascending: true });

  if (error) {
    console.error("[projects.service] listIapItems error:", error);
    return { data: [], error: error.message };
  }

  return { data: (data as IapItem[]) ?? [], error: null };
}

// ---------------------------------------------------------------------------
// deleteIapItem — DELETE a single IAP item by id
// ---------------------------------------------------------------------------
export async function deleteIapItem(itemId: string): Promise<{
  error: string | null;
}> {
  const { error } = await supabase
    .from("iap_items")
    .delete()
    .eq("id", itemId);

  if (error) {
    console.error("[projects.service] deleteIapItem error:", error);
    return { error: error.message };
  }

  return { error: null };
}
