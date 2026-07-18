const { createClient } = require('@supabase/supabase-js')
const dotenv = require('dotenv')
const path = require('path')

const envPath = path.resolve('c:/ShieldAI/ShieldAI/.env')
dotenv.config({ path: envPath })

const supabaseUrl = process.env.VITE_SUPABASE_URL
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY

const supabase = createClient(supabaseUrl, supabaseKey)

async function run() {
  const { data: qData, error: qError } = await supabase
    .from('exam_questions')
    .select('*')
    .limit(10)
    
  if (qError) {
    console.error("Error:", qError)
    return
  }
  
  const mcqQuestions = qData
    .map(row => JSON.parse(row.question_text))
    .filter(q => q.type === 'mcq')
    
  if (mcqQuestions.length === 0) {
    console.log("No MCQ questions found.")
    return
  }
  
  const examId = mcqQuestions[0].exam_id || qData.find(row => JSON.parse(row.question_text).id === mcqQuestions[0].id).exam_id

  const fakeSubmissions = {}
  mcqQuestions.forEach(q => {
    fakeSubmissions[q.id] = {
      code: q.mcq_options ? q.mcq_options[0] : "Option A",
      language: "mcq",
      status: "Accepted",
      cases_passed: 1,
      total_cases: 1,
      score: 100,
      execution_time: 0,
      memory_usage: 0
    }
  })
  
  const payload = {
    exam_id: examId,
    student_id: "fake-student-123",
    status: "submitted",
    integrity_score: 99,
    violation_logs: [],
    code_snapshot: JSON.stringify({
      enteredDetails: {
        name: "Fresh Test Candidate",
        email: "fresh@test.com",
        rollNumber: "FRESH001"
      },
      submissions: fakeSubmissions,
      finalScore: 100,
      startedAt: new Date().toISOString(),
      submittedAt: new Date().toISOString()
    })
  }

  const { error } = await supabase.from('integrity_audits').insert([payload])
  if (error) {
    console.error("Insert error:", error)
  } else {
    console.log("Successfully inserted fresh test candidate!")
  }
}

run()
