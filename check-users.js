import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://ahoufeuljfhbpadyljui.supabase.co'
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFob3VmZXVsamZoYnBhZHlsanVpIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NDE3ODc2NiwiZXhwIjoyMDk5NzU0NzY2fQ.nwXAFe3YBdcMWvYG2rRW_zm3olNmOiCsFcQ0l4fiIQw'

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey)

const resetAdminPassword = async () => {
  console.log('Resetting admin password...')
  const { data, error } = await supabaseAdmin.auth.admin.updateUserById(
    'a75483a2-d293-410b-bfc4-ddfac493161f',
    { password: 'AdminSecure123!' }
  )
  if (error) {
    console.error('Failed to reset admin password:', error.message)
  } else {
    console.log('Admin password updated successfully to: AdminSecure123!')
  }
}

resetAdminPassword()
