// ---------------------------------------------------------------------------
// Database types — aligned with emd-schema.sql (Supabase PostgreSQL)
//
// Field names MUST match the actual column names in Supabase.
// Reference: /outputs/notes/emd-schema.sql
//
// How to keep in sync:
//   Run `npx supabase gen types typescript --project-id <id>` to auto-generate.
// ---------------------------------------------------------------------------

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

// ---------------------------------------------------------------------------
// Row types — what you get back from SELECT
// ---------------------------------------------------------------------------

export interface Profile {
  id: string;            // uuid, FK → auth.users
  email: string;
  display_name: string | null;
  role: "student" | "instructor";
  created_at: string;    // timestamptz as ISO string
  updated_at: string;
}

export interface Course {
  id: string;
  instructor_id: string;  // FK → profiles.id
  title: string;
  description: string | null;
  invite_code: string;    // unique short code, e.g. "CS401-A"
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CourseEnrollment {
  id: string;
  course_id: string;      // FK → courses.id
  student_id: string;     // FK → profiles.id
  enrolled_via: "invite_code" | "manual";
  enrolled_at: string;
}

export interface Project {
  id: string;
  owner_id: string;       // FK → profiles.id  (was student_id — schema uses owner_id)
  course_id: string | null;  // nullable: can be a personal project
  // Step 1 fields
  title: string;
  genre: string[] | null;
  target_audience: string | null;
  session_length: string | null;  // stored as TEXT in schema, e.g. "15 min"
  platform: string[] | null;
  core_mechanic: string | null;
  // Flow tracking
  current_step: 1 | 2 | 3 | 4;
  status: "in_progress" | "submitted" | "graded";
  created_at: string;
  updated_at: string;
}

export interface AdsConfig {
  id: string;
  project_id: string;     // FK → projects.id (unique — one per project)
  ad_network: string | null;   // e.g. 'admob', 'unity_ads'
  revenue_model: string | null; // e.g. 'cpm', 'rewarded'
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface AdPlacement {
  id: string;
  ads_config_id: string;  // FK → ads_configs.id
  placement_type: "banner" | "interstitial" | "rewarded" | "native";
  trigger_point: string | null;  // e.g. 'level_complete', 'game_over'
  frequency_cap: number | null;  // max times per session (null = no cap)
  notes: string | null;
  created_at: string;
}

export interface IapConfig {
  id: string;
  project_id: string;     // FK → projects.id (unique — one per project)
  store: "google_play" | "app_store" | "both" | null;
  currency: string | null;  // default 'USD'
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface IapItem {
  id: string;
  iap_config_id: string;  // FK → iap_configs.id
  name: string;
  item_type: "consumable" | "non_consumable" | "subscription";
  price_usd: number | null;
  description: string | null;
  created_at: string;
}

export interface Analysis {
  id: string;
  project_id: string;     // FK → projects.id
  overall_score: number | null;  // 0-100 ethical score
  passed: boolean;
  failure_points: Json;   // jsonb: [{ issue, severity, suggestion }]
  summary: string | null;
  model_used: string | null;
  created_at: string;
  // Note: no updated_at — analyses are immutable append-only audit logs
}

// ---------------------------------------------------------------------------
// Insert types — what you pass to INSERT (omit auto-generated fields)
// ---------------------------------------------------------------------------

export type ProfileInsert = Omit<Profile, "created_at" | "updated_at">;

export type CourseInsert = Omit<Course, "id" | "created_at" | "updated_at">;

export type CourseEnrollmentInsert = Omit<CourseEnrollment, "id" | "enrolled_at">;

export type ProjectInsert = Omit<Project, "id" | "current_step" | "status" | "created_at" | "updated_at">;

export type AdsConfigInsert = Omit<AdsConfig, "id" | "created_at" | "updated_at">;

export type AdPlacementInsert = Omit<AdPlacement, "id" | "created_at">;

export type IapConfigInsert = Omit<IapConfig, "id" | "created_at" | "updated_at">;

export type IapItemInsert = Omit<IapItem, "id" | "created_at">;

export type AnalysisInsert = Omit<Analysis, "id" | "created_at">;

// ---------------------------------------------------------------------------
// Database shape — passed to createClient<Database> for full type inference
// ---------------------------------------------------------------------------

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: Profile;
        Insert: ProfileInsert;
        Update: Partial<ProfileInsert>;
      };
      courses: {
        Row: Course;
        Insert: CourseInsert;
        Update: Partial<CourseInsert>;
      };
      course_enrollments: {
        Row: CourseEnrollment;
        Insert: CourseEnrollmentInsert;
        Update: Partial<CourseEnrollmentInsert>;
      };
      projects: {
        Row: Project;
        Insert: ProjectInsert;
        Update: Partial<ProjectInsert>;
      };
      ads_configs: {
        Row: AdsConfig;
        Insert: AdsConfigInsert;
        Update: Partial<AdsConfigInsert>;
      };
      ad_placements: {
        Row: AdPlacement;
        Insert: AdPlacementInsert;
        Update: Partial<AdPlacementInsert>;
      };
      iap_configs: {
        Row: IapConfig;
        Insert: IapConfigInsert;
        Update: Partial<IapConfigInsert>;
      };
      iap_items: {
        Row: IapItem;
        Insert: IapItemInsert;
        Update: Partial<IapItemInsert>;
      };
      analyses: {
        Row: Analysis;
        Insert: AnalysisInsert;
        Update: never; // analyses are immutable — no UPDATE allowed
      };
    };
  };
}
