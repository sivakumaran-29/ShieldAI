import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://ahoufeuljfhbpadyljui.supabase.co'
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFob3VmZXVsamZoYnBhZHlsanVpIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NDE3ODc2NiwiZXhwIjoyMDk5NzU0NzY2fQ.nwXAFe3YBdcMWvYG2rRW_zm3olNmOiCsFcQ0l4fiIQw'

const supabase = createClient(supabaseUrl, supabaseServiceKey)

const checkRLS = async () => {
  console.log('Querying table policies from postgres schemas...')
  const { data, error } = await supabase.rpc('empty_RPC_or_raw')
  // Since we cannot run arbitrary SQL unless there is an RPC, let's inspect profiles RLS directly by trying to query it with a regular candidate client
  // Let's create an anon client and see what SELECT/UPDATE it can do!
  console.log('Done.')
}

// Let's sign in ch.sc.u4cse25201@students.amrita.edu and check if it can UPDATE/INSERT on integrity_audits!
const testCandidatePermissions = async () => {
  const candidateEmail = 'ch.sc.u4cse25201@students.amrita.edu'
  const candidatePassword = 'ch.sc.u4cse25201'

  const client = createClient(supabaseUrl, 'sb_publishable_fA8oB-cSujb9Q-lf5tOkzA_J7J5zkuN')
  
  console.log('Signing in as candidate...')
  const { data: authData, error: authError } = await client.auth.signInWithPassword({
    email: candidateEmail,
    password: candidatePassword
  })

  if (authError) {
    console.error('Candidate sign in failed:', authError)
    return
  }

  const token = authData.session.access_token
  console.log('Candidate signed in successfully! User ID:', authData.user.id)

  console.log('Candidate: try to SELECT integrity_audits...')
  const selectRes = await client.from('integrity_audits').select('*')
  console.log('Candidate SELECT success:', !selectRes.error, 'Rows count:', selectRes.data?.length, 'Error:', selectRes.error)

  console.log('Candidate: try to UPDATE existing integrity_audits id=39...')
  const updateRes = await client
    .from('integrity_audits')
    .update({ integrity_score: 95, updated_at: new Date().toISOString() })
    .eq('id', 39)
  
  console.log('Candidate UPDATE success:', !updateRes.error, 'Error:', updateRes.error)
}

testCandidatePermissions()
