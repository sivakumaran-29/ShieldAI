import { supabaseAdmin } from './supabaseAdmin'

export const fetchActiveBatches = async () => {
  let allAuthUsers: any[] = []
  let page = 1
  while (true) {
    const { data } = await supabaseAdmin.auth.admin.listUsers({ page, perPage: 1000 })
    if (!data?.users || data.users.length === 0) break
    allAuthUsers = allAuthUsers.concat(data.users)
    page++
  }

  const { data: profiles } = await supabaseAdmin.from('profiles').select('id, role').eq('role', 'candidate')
  
  const batches = new Set<string>()
  const depts = new Set<string>()

  allAuthUsers.forEach(u => {
    // Verify that the user still exists in the strictly consistent PostgreSQL profiles table
    // This perfectly bypasses the eventual consistency delay of Supabase Auth listUsers!
    if (profiles?.find(p => p.id === u.id)) {
      const b = u.user_metadata?.batch
      if (b) {
        batches.add(b)
        depts.add(b.split('_')[0])
      }
    }
  })

  return {
    batches: Array.from(batches).sort(),
    departments: Array.from(depts).sort()
  }
}
