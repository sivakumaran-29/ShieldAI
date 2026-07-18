const { createClient } = require('@supabase/supabase-js')
const dotenv = require('dotenv')
const path = require('path')

const envPath = path.resolve('c:/ShieldAI/ShieldAI/.env')
dotenv.config({ path: envPath })

const supabaseUrl = process.env.VITE_SUPABASE_URL
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY

const supabase = createClient(supabaseUrl, supabaseKey)

async function run() {
  const { data, error } = await supabase
    .from('integrity_audits')
    .select('*')
    .order('updated_at', { ascending: false })
    .limit(3)
    
  if (error) {
    console.error("Error:", error)
    return
  }
  
  for (const row of data) {
    console.log(`\n\n--- Audit ID: ${row.id} | Updated: ${row.updated_at} ---`)
    const snapshot = JSON.parse(row.code_snapshot || '{}')
    console.log("Submissions Keys:", Object.keys(snapshot.submissions || {}))
    for (const [qId, sub] of Object.entries(snapshot.submissions || {})) {
       console.log(`Q: ${qId} -> code: ${JSON.stringify(sub.code)}`)
    }
  }
}

run()
