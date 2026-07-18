import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const SUPABASE_URL = 'https://ahoufeuljfhbpadyljui.supabase.co';
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function testUpdate() {
  console.log("Updating with Anon key...");
  const payload = { programming_language: 'Python' };
  const { data, error } = await supabase
    .from('exam_questions')
    .update(payload)
    .eq('exam_id', 'as-564d58bc')
    .eq('type', 'ASSESSMENT_METADATA');
  
  console.log("Update result:", data, error);
}
testUpdate();
