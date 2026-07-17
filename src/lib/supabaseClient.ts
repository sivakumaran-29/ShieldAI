import { createClient } from '@supabase/supabase-js'

// Pulled securely from your ignored local environment variables file
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  console.error("Supabase environment routing parameters are missing! Check your .env setup.")
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)