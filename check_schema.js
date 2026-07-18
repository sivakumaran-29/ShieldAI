import { supabaseAdmin } from './src/lib/supabaseAdmin.js'; // I'll use raw URL and Key

import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
dotenv.config()

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false }
})

async function checkSchema() {
  const { data, error } = await supabase.from('profiles').select('*').limit(1)
  console.log('Profiles data:', data)
  console.log('Profiles error:', error)
}

checkSchema()
