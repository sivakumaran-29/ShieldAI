import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://ahoufeuljfhbpadyljui.supabase.co'
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFob3VmZXVsamZoYnBhZHlsanVpIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NDE3ODc2NiwiZXhwIjoyMDk5NzU0NzY2fQ.nwXAFe3YBdcMWvYG2rRW_zm3olNmOiCsFcQ0l4fiIQw'

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey)

const checkAudits = async () => {
  console.log('Querying integrity_audits using admin client...')
  const { data: adminAudits, error: adminError } = await supabaseAdmin
    .from('integrity_audits')
    .select('*')
  
  if (adminError) {
    console.error('Failed to query as admin:', adminError.message)
    return
  }
  
  console.log(`Found ${adminAudits.length} records. Contents:`)
  console.log(JSON.stringify(adminAudits, null, 2))
}

checkAudits()
