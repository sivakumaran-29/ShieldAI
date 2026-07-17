import { useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { GoogleGenerativeAI } from '@google/generative-ai'
import { 
  Sparkles, BrainCircuit, RefreshCw, AlertCircle
} from 'lucide-react'
import { CodingQuestion, saveQuestion, Assessment } from '../../lib/assessmentEngine'

interface AIGenerationTabProps {
  selectedAssessment: Assessment
  onRefresh: () => void
}

export default function AIGenerationTab({ selectedAssessment, onRefresh }: AIGenerationTabProps) {
  const [prompt, setPrompt] = useState('Create a coding challenge about finding the longest palindromic substring in a string.')
  const [difficulty, setDifficulty] = useState<'Easy' | 'Medium' | 'Hard'>('Medium')
  const [generating, setGenerating] = useState(false)
  const [generatedQuestions, setGeneratedQuestions] = useState<CodingQuestion[]>([])
  const [statusMsg, setStatusMsg] = useState('')
  const [errorMsg, setErrorMsg] = useState('')

  const handleGenerateQuestions = async () => {
    if (!prompt.trim()) return
    setGenerating(true)
    setErrorMsg('')
    setGeneratedQuestions([])
    setStatusMsg('Sourcing compiler algorithms from Gemini AI clusters...')

    const apiKey = import.meta.env.VITE_GEMINI_API_KEY
    if (!apiKey) {
      setErrorMsg('VITE_GEMINI_API_KEY is missing in your .env file. Please check environment variables.')
      setGenerating(false)
      return
    }

    try {
      const genAI = new GoogleGenerativeAI(apiKey)
      const model = genAI.getGenerativeModel({
        model: 'gemini-3.1-flash-lite',
        generationConfig: { responseMimeType: 'application/json' }
      })

      const aiQueryPrompt = `
        You are a senior computer science professor and software engineering evaluator.
        Generate a single highly coherent, structured coding question based on this prompt material: "${prompt}".
        
        Difficulty level required: ${difficulty}
        
        Formulate:
        1. A clear Title.
        2. A comprehensive markdown/text description with variable styles.
        3. Clear input/output format guidelines.
        4. Performance limits: execution limit typically 1000ms, memory limit 256MB.
        5. Specific constraints matching ${difficulty} profile.
        6. A visible Sample Input & Sample Output matching cases.
        7. A short explanation of the sample logic.
        8. Three test cases: at least two public (is_public=true), one hidden (is_public=false). Each test case should have:
           - input (string)
           - expected_output (string)
           - is_public (boolean)
           - weight (number, sum of weights should be 100).
        9. Tags related to the topic.

        Return your output ONLY as a JSON matching this exact structure:
        {
          "title": "string",
          "description": "string",
          "difficulty": "Easy" | "Medium" | "Hard",
          "constraints": "string",
          "input_format": "string",
          "output_format": "string",
          "sample_input": "string",
          "sample_output": "string",
          "explanation": "string",
          "time_limit": number,
          "memory_limit": number,
          "test_cases": [
            { "id": "tc-1", "input": "string", "expected_output": "string", "is_public": boolean, "weight": number }
          ],
          "tags": ["string"]
        }
      `

      const result = await model.generateContent(aiQueryPrompt)
      const responseText = result.response.text()
      const parsedQ = JSON.parse(responseText)

      // Add structural mapping info
      const constructedQ: CodingQuestion = {
        id: 'ai-q-' + crypto.randomUUID().slice(0, 8),
        exam_id: selectedAssessment.id,
        ...parsedQ
      }

      setGeneratedQuestions([constructedQ])
      setStatusMsg('AI Generation completed successfully. Review and save below.')
    } catch (err: any) {
      console.error(err)
      setErrorMsg(err.message || 'Gemini transaction aborted. Please refine query parameters.')
    } finally {
      setGenerating(false)
    }
  }

  const handleApproveQuestion = async (q: CodingQuestion) => {
    setStatusMsg(`Syncing challenge "${q.title}" to assessment...`)
    const success = await saveQuestion(q)
    if (success) {
      setGeneratedQuestions(prev => prev.filter(item => item.id !== q.id))
      setStatusMsg(`Successfully added "${q.title}" to assessment bank!`)
      onRefresh()
    } else {
      setErrorMsg('Failed to sync generated question to Supabase. Check connectivity.')
    }
  }

  return (
    <div className="space-y-6">
      
      {/* UI Settings Cards */}
      <Card className="bg-neutral-900 border-sky-955 p-6 rounded-2xl">
        <div className="space-y-4">
          <div className="flex items-center gap-2 select-none">
            <BrainCircuit className="w-5 h-5 text-sky-400" />
            <h3 className="text-xs font-bold font-mono tracking-widest text-sky-400 uppercase">AI Generator Sandbox</h3>
          </div>

          {/* Form prompts */}
          <div className="flex flex-col gap-1.5 pt-1">
            <label className="text-[10px] font-mono text-neutral-400 uppercase font-bold tracking-wider">Concept or Prompt topic details</label>
            <textarea 
              value={prompt} 
              onChange={e => setPrompt(e.target.value)}
              className="bg-neutral-950 border border-sky-955 text-neutral-100 rounded-xl p-3 text-xs outline-none focus:border-sky-500 min-h-20"
              placeholder="e.g. Design a hashmap query checking anagram groups..." 
            />
          </div>

          <div className="flex flex-wrap items-center justify-between gap-4 pt-2 border-t border-sky-955/30">
            <div className="flex items-center gap-3">
              <label className="text-[10px] font-mono font-bold uppercase text-neutral-450 tracking-wider">Algorithmic complexity:</label>
              <select 
                value={difficulty} 
                onChange={e => setDifficulty(e.target.value as any)}
                className="bg-neutral-950 border border-sky-955 text-neutral-100 rounded-xl p-1.5 px-3 text-xs font-mono font-bold outline-none focus:border-sky-500 cursor-pointer"
              >
                <option value="Easy">Easy (Linear / Array basics)</option>
                <option value="Medium">Medium (Stack / Sorting / DFS)</option>
                <option value="Hard">Hard (Graph / Dynamic programming)</option>
              </select>
            </div>

            <Button 
              onClick={handleGenerateQuestions}
              disabled={generating || !prompt.trim()}
              className="bg-gradient-to-r from-sky-400 to-blue-500 hover:from-sky-300 hover:to-blue-400 text-neutral-950 font-black text-xs px-6 h-10 rounded-xl flex items-center gap-1.5 shadow-[0_4px_20px_rgba(58,189,248,0.15)] cursor-pointer active:scale-95 transition"
            >
              {generating ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin text-neutral-95" />
                  <span>Spawning Algorithm...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 fill-current" />
                  <span>Generate Challenge with AI</span>
                </>
              )}
            </Button>
          </div>
        </div>
      </Card>

      {/* Messages */}
      {statusMsg && !errorMsg && (
        <div className="text-xs text-sky-400 bg-sky-950/20 border border-sky-950 p-3.5 rounded-xl font-mono animate-pulse">
          {statusMsg}
        </div>
      )}

      {errorMsg && (
        <div className="text-xs text-red-400 bg-red-950/30 border border-red-900/40 p-3.5 rounded-xl flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* PREVIEW CONTAINER OF GENERATED QUESTIONS */}
      <div className="space-y-4">
        {generatedQuestions.map(q => (
          <Card key={q.id} className="bg-neutral-900 border-sky-950 rounded-2xl overflow-hidden shadow-2xl">
            <div className="bg-neutral-950 border-b border-sky-950 px-5 py-3 flex justify-between items-center select-none">
              <div className="flex items-center gap-2.5">
                <span className="px-2 py-0.5 rounded text-[8px] font-mono font-bold bg-neutral-900 border border-sky-950 text-sky-400 uppercase">
                  AI Generated - {q.difficulty}
                </span>
                <h4 className="font-extrabold text-neutral-100 text-xs">{q.title}</h4>
              </div>
              <div className="flex gap-2">
                <Button 
                  onClick={() => setGeneratedQuestions([])} 
                  variant="outline" 
                  size="sm"
                  className="border-sky-950 text-red-400 text-[10px] h-7 px-3.5 hover:bg-red-950/20 rounded-lg font-bold"
                >
                  Discard Draft
                </Button>
                <Button 
                  onClick={() => handleApproveQuestion(q)} 
                  className="bg-emerald-600 hover:bg-emerald-500 text-neutral-980 font-black h-7 px-4 text-[10px] tracking-wider rounded-lg active:scale-95"
                >
                  Approve & Save to Exam
                </Button>
              </div>
            </div>

            <CardContent className="p-5 space-y-4 text-xs">
              <div className="space-y-2 border-b border-sky-950/40 pb-3">
                <span className="text-[9px] font-mono font-bold text-sky-400 uppercase tracking-widest block">Problem Description</span>
                <p className="text-neutral-400 leading-relaxed font-sans whitespace-pre-wrap">{q.description}</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-b border-sky-950/40 pb-3">
                <div>
                  <span className="text-[9px] font-mono font-bold text-sky-405 uppercase tracking-widest block mb-1">Constraints specs</span>
                  <pre className="p-2.5 bg-neutral-950 text-neutral-400 rounded-xl font-mono text-[10px] whitespace-pre-wrap">{q.constraints}</pre>
                </div>
                <div>
                  <span className="text-[9px] font-mono font-bold text-sky-405 uppercase tracking-widest block mb-1">Input / Output structures</span>
                  <div className="space-y-1 mt-1 text-[10.5px]">
                    <div>In: <span className="text-neutral-400">{q.input_format}</span></div>
                    <div>Out: <span className="text-neutral-450">{q.output_format}</span></div>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <span className="text-[9px] font-mono font-bold text-sky-400 uppercase tracking-widest block mb-1">Sample case input</span>
                  <pre className="p-3 bg-neutral-950 text-sky-305 border border-sky-955/20 rounded-xl font-mono text-[10px] whitespace-pre-wrap">{q.sample_input}</pre>
                </div>
                <div>
                  <span className="text-[9px] font-mono font-bold text-sky-400 uppercase tracking-widest block mb-1">Sample case expected</span>
                  <pre className="p-3 bg-neutral-950 text-emerald-400 border border-sky-955/20 rounded-xl font-mono text-[10px] whitespace-pre-wrap">{q.sample_output}</pre>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

    </div>
  )
}
