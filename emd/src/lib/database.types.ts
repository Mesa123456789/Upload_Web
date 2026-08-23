// EMD — Supabase Database Types
// Tables: profiles, courses, course_enrollments, projects,
//         ads_configs, ad_placements, iap_configs, iap_items, analyses

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          email: string
          display_name: string | null
          role: 'student' | 'instructor'
          contact_info: string | null   // instructor: phone/email/line
          student_code: string | null   // student: student ID number
          major: string | null          // student: major/program
          year: number | null           // student: year of study
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          email: string
          display_name?: string | null
          role?: 'student' | 'instructor'
          contact_info?: string | null
          student_code?: string | null
          major?: string | null
          year?: number | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string
          display_name?: string | null
          role?: 'student' | 'instructor'
          contact_info?: string | null
          student_code?: string | null
          major?: string | null
          year?: number | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      courses: {
        Row: {
          id: string
          instructor_id: string
          title: string
          description: string | null
          invite_code: string
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          instructor_id: string
          title: string
          description?: string | null
          invite_code: string
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          instructor_id?: string
          title?: string
          description?: string | null
          invite_code?: string
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'courses_instructor_id_fkey'
            columns: ['instructor_id']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          }
        ]
      }
      course_enrollments: {
        Row: {
          id: string
          course_id: string
          student_id: string
          enrolled_via: 'invite_code' | 'manual'
          enrolled_at: string
        }
        Insert: {
          id?: string
          course_id: string
          student_id: string
          enrolled_via?: 'invite_code' | 'manual'
          enrolled_at?: string
        }
        Update: {
          id?: string
          course_id?: string
          student_id?: string
          enrolled_via?: 'invite_code' | 'manual'
          enrolled_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'course_enrollments_course_id_fkey'
            columns: ['course_id']
            isOneToOne: false
            referencedRelation: 'courses'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'course_enrollments_student_id_fkey'
            columns: ['student_id']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          }
        ]
      }
      projects: {
        Row: {
          id: string
          owner_id: string
          course_id: string | null
          title: string
          genre: string[] | null
          target_audience: string | null
          session_length: string | null
          platform: string[] | null
          core_mechanic: string | null
          current_step: number
          status: 'draft' | 'submitted' | 'resubmitted' | 'under_review' | 'returned' | 'graded'
          submitted_at: string | null  // ISO timestamp of last submit/resubmit
          grade: number | null         // instructor grade 0-100
          instructor_comment: string | null  // instructor feedback text
          graded_at: string | null     // ISO timestamp when graded
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          owner_id: string
          course_id?: string | null
          title: string
          genre?: string[] | null
          target_audience?: string | null
          session_length?: string | null
          platform?: string[] | null
          core_mechanic?: string | null
          current_step?: number
          status?: 'draft' | 'submitted' | 'resubmitted' | 'under_review' | 'returned' | 'graded'
          submitted_at?: string | null
          grade?: number | null
          instructor_comment?: string | null
          graded_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          owner_id?: string
          course_id?: string | null
          title?: string
          genre?: string[] | null
          target_audience?: string | null
          session_length?: string | null
          platform?: string[] | null
          core_mechanic?: string | null
          current_step?: number
          status?: 'draft' | 'submitted' | 'resubmitted' | 'under_review' | 'returned' | 'graded'
          submitted_at?: string | null
          grade?: number | null
          instructor_comment?: string | null
          graded_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'projects_owner_id_fkey'
            columns: ['owner_id']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'projects_course_id_fkey'
            columns: ['course_id']
            isOneToOne: false
            referencedRelation: 'courses'
            referencedColumns: ['id']
          }
        ]
      }
      ads_configs: {
        Row: {
          id: string
          project_id: string
          ad_network: string | null
          revenue_model: string | null
          notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          project_id: string
          ad_network?: string | null
          revenue_model?: string | null
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          project_id?: string
          ad_network?: string | null
          revenue_model?: string | null
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'ads_configs_project_id_fkey'
            columns: ['project_id']
            isOneToOne: true
            referencedRelation: 'projects'
            referencedColumns: ['id']
          }
        ]
      }
      ad_placements: {
        Row: {
          id: string
          ads_config_id: string
          placement_type: 'banner' | 'interstitial' | 'rewarded' | 'native'
          trigger_point: string | null
          frequency_cap: number | null
          notes: string | null
          created_at: string
        }
        Insert: {
          id?: string
          ads_config_id: string
          placement_type: 'banner' | 'interstitial' | 'rewarded' | 'native'
          trigger_point?: string | null
          frequency_cap?: number | null
          notes?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          ads_config_id?: string
          placement_type?: 'banner' | 'interstitial' | 'rewarded' | 'native'
          trigger_point?: string | null
          frequency_cap?: number | null
          notes?: string | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'ad_placements_ads_config_id_fkey'
            columns: ['ads_config_id']
            isOneToOne: false
            referencedRelation: 'ads_configs'
            referencedColumns: ['id']
          }
        ]
      }
      iap_configs: {
        Row: {
          id: string
          project_id: string
          store: 'google_play' | 'app_store' | 'both' | null
          currency: string | null
          notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          project_id: string
          store?: 'google_play' | 'app_store' | 'both' | null
          currency?: string | null
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          project_id?: string
          store?: 'google_play' | 'app_store' | 'both' | null
          currency?: string | null
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'iap_configs_project_id_fkey'
            columns: ['project_id']
            isOneToOne: true
            referencedRelation: 'projects'
            referencedColumns: ['id']
          }
        ]
      }
      iap_items: {
        Row: {
          id: string
          iap_config_id: string
          name: string
          item_type: 'consumable' | 'non_consumable' | 'subscription'
          price_usd: number | null
          description: string | null
          created_at: string
        }
        Insert: {
          id?: string
          iap_config_id: string
          name: string
          item_type: 'consumable' | 'non_consumable' | 'subscription'
          price_usd?: number | null
          description?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          iap_config_id?: string
          name?: string
          item_type?: 'consumable' | 'non_consumable' | 'subscription'
          price_usd?: number | null
          description?: string | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'iap_items_iap_config_id_fkey'
            columns: ['iap_config_id']
            isOneToOne: false
            referencedRelation: 'iap_configs'
            referencedColumns: ['id']
          }
        ]
      }
      analyses: {
        Row: {
          id: string
          project_id: string
          overall_score: number | null
          passed: boolean
          failure_points: Json
          summary: string | null
          model_used: string | null
          created_at: string
        }
        Insert: {
          id?: string
          project_id: string
          overall_score?: number | null
          passed?: boolean
          failure_points?: Json
          summary?: string | null
          model_used?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          project_id?: string
          overall_score?: number | null
          passed?: boolean
          failure_points?: Json
          summary?: string | null
          model_used?: string | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'analyses_project_id_fkey'
            columns: ['project_id']
            isOneToOne: false
            referencedRelation: 'projects'
            referencedColumns: ['id']
          }
        ]
      }
      app_roles: {
        Row: {
          name: string
          label: string
          description: string | null
          is_builtin: boolean
          created_by: string | null
          created_at: string
        }
        Insert: {
          name: string
          label: string
          description?: string | null
          is_builtin?: boolean
          created_by?: string | null
          created_at?: string
        }
        Update: {
          name?: string
          label?: string
          description?: string | null
          is_builtin?: boolean
          created_by?: string | null
          created_at?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          id: string
          user_id: string
          role: string
          granted_by: string | null
          granted_at: string
        }
        Insert: {
          id?: string
          user_id: string
          role: string
          granted_by?: string | null
          granted_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          role?: string
          granted_by?: string | null
          granted_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'user_roles_user_id_fkey'
            columns: ['user_id']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          }
        ]
      }
    }
    Views: Record<string, never>
    Functions: Record<string, never>
    Enums: Record<string, never>
    CompositeTypes: Record<string, never>
  }
}

// Convenience row types
export type Profile = Database['public']['Tables']['profiles']['Row']
export type ProjectStatus = 'draft' | 'submitted' | 'resubmitted' | 'under_review' | 'returned' | 'graded'
export type Course = Database['public']['Tables']['courses']['Row']
export type CourseEnrollment = Database['public']['Tables']['course_enrollments']['Row']
export type Project = Database['public']['Tables']['projects']['Row']
export type AdsConfig = Database['public']['Tables']['ads_configs']['Row']
export type AdPlacement = Database['public']['Tables']['ad_placements']['Row']
export type IapConfig = Database['public']['Tables']['iap_configs']['Row']
export type IapItem = Database['public']['Tables']['iap_items']['Row']
export type Analysis = Database['public']['Tables']['analyses']['Row']
export type UserRole = Database['public']['Tables']['user_roles']['Row']
// Widened to `string` because role names are now created at runtime through
// the app_roles catalog, not fixed at compile time. 'admin' stays a special
// string used directly in code (AuthContext's isAdmin check, RLS has_role
// calls) — it doesn't need its own literal type for that to keep working.
export type AppRole = string
export type AppRoleCatalogEntry = Database['public']['Tables']['app_roles']['Row']
