import { createClient } from '@supabase/supabase-js'

// Pulled securely from your ignored environment file
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseServiceKey = import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error("Critical Admin configuration missing! Ensure variables are mapped in your .env file.")
}

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

const seedAmritaCandidates = async () => {
  console.log('Initiating batch user creation for candidates 201 through 277...')
  
  for (let i = 1; i <= 77; i++) {
    const rollSuffix = 200 + i 
    
    const email = `ch.sc.u4cse25${rollSuffix}@students.amrita.edu`
    const password = `ch.sc.u4cse25${rollSuffix}`

    const { data, error } = await supabaseAdmin.auth.admin.createUser({
      email: email,
      password: password,
      email_confirm: true, // Bypasses email verification links for rapid onboarding
      user_metadata: {
        name: `Candidate ${rollSuffix}`,
        role: 'student'
      }
    })

    if (error) {
      console.error(`[ERROR] Failed to create ${email}:`, error.message)
    } else {
      console.log(`[SUCCESS] Registered: ${email}`)
    }
  }
  
  console.log('Batch candidate creation complete. All 77 accounts are ready for the assessment.')
}

seedAmritaCandidates()