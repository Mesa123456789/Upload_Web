// ---------------------------------------------------------------------------
// Database types — manually written to match the Supabase schema (9 tables)
//
// How to keep in sync:
//   If you add/rename columns in Supabase, update this file too.
//   Better long-term: run `npx supabase gen types typescript --project-id <id>`
//   to auto-generate and replace this file.
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
  role: "student" | "instructor" | "admin";
  created_at: string;    // timestamptz as ISO string
}

export interface Course {
  id: string;
  title: string;
  description: string | null;
  instructor_id: string; // FK → profiles.id
  is_published: boolean;
  created_at: string;
}

export interface CourseEnrollment {
  id: string;
  course_id: string;     // FK → courses.id
  student_id: string;    // FK → profiles.id
  enrolled_at: string;
}

export interface Project {
  id: string;
  course_id: string;     // FK → courses.id
  student_id: string;    // FK → profiles.id
  title: string;
  genre: string[];       // text[]
  platform: string[];    // text[]
  target_audience: string | null;
  session_length_min: number | null;
  core_mechanic: string | null;
  monetization: string[]; // text[]
  created_at: string;
  updated_at: string;
}

export interface AdsConfig {
  id: string;
  project_id: string;    // FK → projects.id
  daily_ad_cap: number | null;
  rewarded_enabled: boolean;
  interstitial_enabled: boolean;
  banner_enabled: boolean;
  created_at: string;
}

export interface AdPlacement {
  id: string;
  ads_config_id: string; // FK → ads_configs.id
  placement_type: string;
  trigger_event: string | null;
  frequency_cap: number | null;
  notes: string | null;
}

export interface IapConfig {
  id: string;
  project_id: string;    // FK → projects.id
  has_starter_pack: boolean;
  has_battle_pass: boolean;
  has_subscription: boolean;
  created_at: string;
}

export interface IapItem {
  id: string;
  iap_config_id: string; // FK → iap_configs.id
  item_name: string;
  price_usd: number | null;
  category: string | null;
  description: string | null;
}

export interface Analysis {
  id: string;
  project_id: string;    // FK → projects.id
  analyzed_by: string;   // FK → profiles.id
  score: number | null;
  summary: string | null;
  failure_points: Json;  // jsonb — structured AI output
  recommendations: string | null;
  created_at: string;
  // Note: no updated_at — analyses are immutable append-only audit logs
}

// ---------------------------------------------------------------------------
// Insert types — what you pass to INSERT (omit auto-generated fields)
// ---------------------------------------------------------------------------

export type ProfileInsert = Omit<Profile, "created_at">;
export type CourseInsert = Omit<Course, "id" | "created_at">;
export type CourseEnrollmentInsert = Omit<CourseEnrollment, "id" | "enrolled_at">;
export type ProjectInsert = Omit<Project, "id" | "created_at" | "updated_at">;
export type AdsConfigInsert = Omit<AdsConfig, "id" | "created_at">;
export type AdPlacementInsert = Omit<AdPlacement, "id">;
export type IapConfigInsert = Omit<IapConfig, "id" | "created_at">;
export type IapItemInsert = Omit<IapItem, "id">;
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
