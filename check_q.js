import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://ahoufeuljfhbpadyljui.supabase.co';
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFob3VmZXVsamZoYnBhZHlsanVpIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NDE3ODc2NiwiZXhwIjoyMDk5NzU0NzY2fQ.nwXAFe3YBdcMWvYG2rRW_zm3olNmOiCsFcQ0l4fiIQw';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
supabase.from('exam_questions').select('*').limit(2).then(r => console.log(JSON.stringify(r)));
