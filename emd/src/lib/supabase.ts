import { createClient } from '@supabase/supabase-js'
import type { Database } from './database.types'

// Read env vars at module load time — Vite injects these at build time
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string

console.log('[Supabase] URL:', supabaseUrl)

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables')
}

// Typed Supabase client — all queries will be type-checked against Database schema
export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey)
