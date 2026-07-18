import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://ahoufeuljfhbpadyljui.supabase.co';
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFob3VmZXVsamZoYnBhZHlsanVpIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NDE3ODc2NiwiZXhwIjoyMDk5NzU0NzY2fQ.nwXAFe3YBdcMWvYG2rRW_zm3olNmOiCsFcQ0l4fiIQw';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false }
});

async function main() {
  const start = 204;
  const end = 277;

  // fetch all users to get IDs for existing ones
  const { data: usersData, error: listError } = await supabase.auth.admin.listUsers();
  const allUsers = usersData?.users || [];

  for (let i = start; i <= end; i++) {
    const roll = `ch.sc.u4cse25${i}`;
    const email = `${roll}@students.amrita.edu`;
    const password = roll;

    let userId = null;
    let existingUser = allUsers.find(u => u.email === email);

    if (!existingUser) {
      const { data, error } = await supabase.auth.admin.createUser({
        email: email,
        password: password,
        email_confirm: true
      });
      if (error) {
        console.log(`Error creating ${email}:`, error.message);
        continue;
      }
      userId = data.user.id;
    } else {
      userId = existingUser.id;
    }

    if (userId) {
      // Upsert profile
      const { error: profileError } = await supabase.from('profiles').upsert([
        {
          id: userId,
          email: email,
          name: roll.toUpperCase(),
          role: 'candidate'
        }
      ], { onConflict: 'id' });

      if (profileError) {
        console.error(`Error creating profile for ${email}:`, profileError.message);
      } else {
        console.log(`Profile synced for ${email}`);
      }
    }
  }

  console.log('Done!');
}

main();
