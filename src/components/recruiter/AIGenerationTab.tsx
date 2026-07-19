import { useState, useEffect } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { GoogleGenerativeAI } from '@google/generative-ai'
import { 
  Sparkles, BrainCircuit, AlertCircle, Terminal, Check, Plus
} from 'lucide-react'
import { CodingQuestion, saveQuestion, Assessment } from '../../lib/assessmentEngine'
import Latex from 'react-latex-next'

interface AIGenerationTabProps {
  selectedAssessment: Assessment
  onRefresh: () => void
}

export default function AIGenerationTab({ selectedAssessment, onRefresh }: AIGenerationTabProps) {
  const [prompt, setPrompt] = useState('Create a coding challenge about finding the longest palindromic substring in a string.')
  const [difficulty, setDifficulty] = useState<'Easy' | 'Medium' | 'Hard'>('Medium')
  const [activeGeneratorType, setActiveGeneratorType] = useState<'coding' | 'mcq' | null>(null)
  const [showTypeDropdown, setShowTypeDropdown] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [generatedQuestions, setGeneratedQuestions] = useState<CodingQuestion[]>([])
  const [editingDraftId, setEditingDraftId] = useState<string | null>(null)
  const [statusMsg, setStatusMsg] = useState('')
  const [errorMsg, setErrorMsg] = useState('')
  const [loaderDots, setLoaderDots] = useState('')
  const [pdfBase64, setPdfBase64] = useState<string | null>(null)
  const [pdfName, setPdfName] = useState<string | null>(null)

  const handlePdfUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) {
      setPdfBase64(null)
      setPdfName(null)
      return
    }
    setPdfName(file.name)
    const reader = new FileReader()
    reader.onload = (event) => {
      const base64Str = (event.target?.result as string).split(',')[1]
      setPdfBase64(base64Str)
    }
    reader.readAsDataURL(file)
  }

  // Animated loader dots effect
  useEffect(() => {
    if (!generating) return
    const interval = setInterval(() => {
      setLoaderDots(prev => (prev.length >= 3 ? '' : prev + '.'))
    }, 400)
    return () => clearInterval(interval)
  }, [generating])

  const handleGenerateQuestions = async () => {
    if (!prompt.trim()) return
    setGenerating(true)
    setErrorMsg('')
    setGeneratedQuestions([])
    setStatusMsg('Sourcing compiler algorithms from Gemini AI clusters')

    const apiKey = import.meta.env.VITE_GEMINI_API_KEY
    if (!apiKey) {
      setErrorMsg('No active VITE_GEMINI_API_KEY found in platform configuration files.')
      setGenerating(false)
      return
    }

    try {
      const genAI = new GoogleGenerativeAI(apiKey)
      // Use gemini-3.1-flash-lite for fast generated responses
      const model = genAI.getGenerativeModel({ model: 'gemini-3.1-flash-lite' })

      const codingInterface = `
      interface TestCase {
        id: string;
        input: string;
        expected_output: string;
        is_public: boolean;
        weight: number;
      }

      interface CodingQuestion {
        id: string;
        exam_id: string;
        title: string;
        type: 'coding';
        description: string;
        difficulty: 'Easy' | 'Medium' | 'Hard';
        constraints: string;
        input_format: string;
        output_format: string;
        sample_input: string;
        sample_output: string;
        explanation: string;
        time_limit: number;
        memory_limit: number;
        test_cases: TestCase[]; // generate exactly 3-5 test-cases. Use random uuid values or simple strings for test-case ids.
        tags: string[];
      }
      `

      const mcqInterface = `
      interface CodingQuestion {
        id: string;
        exam_id: string;
        title: string;
        type: 'mcq';
        mcq_options: string[]; // exactly 4 options
        mcq_correct_index: number; // 0, 1, 2, or 3 representing the correct option
        description: string; // The actual question body
        difficulty: 'Easy' | 'Medium' | 'Hard';
        constraints: string; // keep empty
        input_format: string; // keep empty
        output_format: string; // keep empty
        sample_input: string; // keep empty
        sample_output: string; // keep empty
        explanation: string; // explanation for the answer
        time_limit: number; // default 1000
        memory_limit: number; // default 256
        test_cases: []; // keep empty array
        tags: string[];
      }
      `

      const promptTemplate = `
      You are an expert software engineer recruiter. Generate a single highly structured ${activeGeneratorType === 'mcq' ? 'Multiple Choice Question (MCQ)' : 'coding question'} matching these options:
      - Topic/Description Goal: ${prompt}
      - Difficulty Level: ${difficulty}
      - Target Exam ID: ${selectedAssessment.id}
      ${pdfBase64 && activeGeneratorType === 'mcq' ? '\n- Context: Generate the question based on the provided PDF document.' : ''}

      You MUST respond ONLY with a valid JSON object matching the following TypeScript interface definition exactly. Do NOT wrap it in backticks, markdown markers, or other explanation blocks. Simply respond with raw JSON content:

      ${activeGeneratorType === 'coding' ? codingInterface : mcqInterface}
      `

      let generationParams: any[] = [promptTemplate]
      
      if (activeGeneratorType === 'mcq' && pdfBase64) {
        generationParams.push({
          inlineData: {
            data: pdfBase64,
            mimeType: "application/pdf"
          }
        })
      }

      const result = await model.generateContent(generationParams)
      const text = result.response.text()

      // Sanitize potential markdown wrap syntax
      let cleanJson = text.trim()
      if (cleanJson.startsWith('```json')) {
        cleanJson = cleanJson.slice(7)
      }
      if (cleanJson.endsWith('```')) {
        cleanJson = cleanJson.slice(0, -3)
      }
      cleanJson = cleanJson.trim()

      const parsed: CodingQuestion = JSON.parse(cleanJson)
      // Force match target exam id
      parsed.exam_id = selectedAssessment.id
      parsed.difficulty = difficulty
      parsed.type = activeGeneratorType || 'coding'

      setGeneratedQuestions([parsed])
      setActiveGeneratorType(null)
      setStatusMsg('Compilation draft generated successfully.')
    } catch (err: any) {
      console.error(err)
      setErrorMsg(err.message || 'Gemini model generation failed. Inspect local credentials.')
    } finally {
      setGenerating(false)
    }
  }

  const handleUpdateDraft = (id: string, field: string, value: string) => {
    setGeneratedQuestions(prev => prev.map(q => q.id === id ? { ...q, [field]: value } : q))
  }

  const handleApproveDraft = async (q: CodingQuestion) => {
    await saveQuestion(q)
    setGeneratedQuestions(prev => prev.filter(item => item.id !== q.id))
    onRefresh()
    alert('Coding challenge approved and active in assessment playlist.')
  }

  const presets = [
    { title: 'Graph Cycle Detection', prompt: 'Detect a cycle in a directed graph using DFS traversal.' },
    { title: 'Sub-array Sum K', prompt: 'Find the total number of continuous subarrays whose sum equals to k.' },
    { title: 'Reverse K Nodes', prompt: 'Reverse nodes of a linked list k at a time.' }
  ]

  return (
    <div className="space-y-8 select-none">
      
      {/* Header */}
      <div>
        <h2 className="text-[12px] font-heading font-bold tracking-wider text-[#5B8CFF] uppercase">// AI COPMILER GENERATOR</h2>
        <span className="text-[11px] sys-text-body font-sans mt-1 block font-medium">Selected assessment: {selectedAssessment.title}</span>
      </div>

      {/* Workspace Split: Controls and presets */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-start">
        
        {/* Left Console area (8 cols) */}
        <div className="md:col-span-8 space-y-6">
          {!activeGeneratorType ? (
            <div className="border border-dashed border-white/5 bg-[rgba(28,28,30,0.72)] backdrop-blur-[16px] rounded-2xl p-12 flex flex-col items-center justify-center text-center space-y-4 shadow-inner min-h-64">
              <div className="w-12 h-12 sys-card rounded-full flex items-center justify-center mb-2 border border-transparent">
                <Terminal className="w-5 h-5 sys-text-body" />
              </div>
              <div>
                <h3 className="text-white font-bold text-lg mb-1">Generate AI Challenge</h3>
                <p className="sys-text-body text-xs font-mono max-w-sm mx-auto">Use our advanced LLM engines to create dynamic programming challenges or multiple choice questions instantly.</p>
              </div>
              <div className="relative mt-4">
                <Button 
                  onClick={() => setShowTypeDropdown(!showTypeDropdown)}
                  className="bg-[#3f6ad5] hover:bg-[#3254a8] hover:shadow-[0_0_15px_rgba(63,106,213,0.6)] active:shadow-[0_0_8px_rgba(63,106,213,0.4)] text-white text-xs h-10 px-6 rounded-xl font-bold cursor-pointer transition flex items-center gap-2 shadow-lg"
                >
                  <Plus className="w-4 h-4" strokeWidth={2} /> Create Challenge with AI
                </Button>
                {showTypeDropdown && (
                  <div className="absolute top-full mt-2 left-1/2 -translate-x-1/2 w-56 bg-[rgba(28,28,30,0.72)] backdrop-blur-[16px] border border-white/5 rounded-xl shadow-2xl overflow-hidden z-50 flex flex-col animate-fade-in">
                    <button 
                      onClick={() => { setShowTypeDropdown(false); setActiveGeneratorType('mcq'); }} 
                      className="text-left px-4 py-3.5 text-xs text-white hover:sys-card border-b border-white/5 font-bold transition"
                    >
                      Multiple Choice
                    </button>
                    <button 
                      onClick={() => { setShowTypeDropdown(false); setActiveGeneratorType('coding'); }} 
                      className="text-left px-4 py-3.5 text-xs text-white hover:sys-card font-bold transition"
                    >
                      Coding Challenge
                    </button>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <Card className="bg-[rgba(28,28,30,0.72)] backdrop-blur-[16px] border-white/5 p-6 rounded-2xl relative overflow-hidden shadow-xl animate-fade-in">
              <div className="absolute top-0 left-0 right-0 h-[2px] sys-bg" />
              
              <div className="space-y-4">
                <div className="flex items-center justify-between border-b border-white/5 pb-3">
                  <div className="flex items-center gap-2 text-[9px] font-mono font-bold sys-text-body uppercase tracking-widest">
                    <Terminal className="w-4 h-4 text-[#5B8CFF]" /> {activeGeneratorType === 'mcq' ? 'MCQ' : 'CODING'} PROMPT CONSOLE
                  </div>
                  <button onClick={() => setActiveGeneratorType(null)} className="text-[10px] font-mono sys-text-body hover:text-white uppercase tracking-wider">
                    Cancel
                  </button>
                </div>

                {/* Preset buttons */}
                <div className="flex flex-wrap gap-2 pt-1 select-none">
                  {presets.map((p, idx) => (
                    <button 
                      key={idx}
                      onClick={() => setPrompt(p.prompt)}
                      className="px-3 py-1.5 sys-bg border border-white/5 rounded-xl sys-text-body hover:text-white text-[10px] font-mono transition cursor-pointer"
                    >
                      + {p.title}
                    </button>
                  ))}
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-[9px] font-mono sys-text-body uppercase tracking-wider">Describe challenge goal</label>
                  <textarea 
                    value={prompt}
                    onChange={e => setPrompt(e.target.value)}
                    className="sys-bg border border-white/5 text-white rounded-xl p-3 text-xs focus:outline-none focus:border-[#5B8CFF]/50 min-h-24 font-sans leading-relaxed"
                    placeholder="e.g. Find the maximum sum of a non-adjacent subarray..."
                  />
                </div>

                <div className="flex flex-col gap-1.5 pt-1">
                  <label className="text-[9px] font-mono sys-text-body uppercase tracking-wider">Complexity</label>
                  <select 
                    value={difficulty} 
                    onChange={e => setDifficulty(e.target.value as any)}
                    className="sys-bg border border-white/5 text-white rounded-xl p-3.5 text-xs font-semibold focus:outline-none focus:border-[#5B8CFF]/50 cursor-pointer"
                  >
                    <option value="Easy">Easy</option>
                    <option value="Medium">Medium</option>
                    <option value="Hard">Hard</option>
                  </select>
                </div>

                {activeGeneratorType === 'mcq' && (
                <div className="flex flex-col gap-1.5 pt-2">
                  <label className="text-[9px] font-mono sys-text-body uppercase tracking-wider">PDF Source Context (Optional)</label>
                  <label className="border border-dashed border-white/5 rounded-xl p-4 flex flex-col items-center justify-center cursor-pointer hover:border-[#5B8CFF]/50 hover:sys-card/50 transition sys-bg min-h-16">
                    <span className="text-[10px] sys-text-body font-mono text-center">
                      {pdfName ? `Attached Document: ${pdfName}` : 'Upload PDF Document to extract MCQ context'}
                    </span>
                    <input type="file" accept=".pdf" className="hidden" onChange={handlePdfUpload} />
                  </label>
                </div>
              )}

              <div className="flex items-end mt-4">
                  <Button 
                    onClick={handleGenerateQuestions}
                    disabled={generating || !prompt.trim()}
                    className="w-full bg-[#3f6ad5] hover:bg-[#3254a8] hover:shadow-[0_0_15px_rgba(63,106,213,0.6)] active:shadow-[0_0_8px_rgba(63,106,213,0.4)] text-white text-xs h-11 rounded-xl font-bold cursor-pointer transition flex items-center justify-center gap-1.5 shadow-md disabled:opacity-40"
                  >
                    {generating ? (
                      <>
                        <BrainCircuit className="w-4.5 h-4.5 animate-spin" strokeWidth={1.5} />
                        <span>SYNTHESIZING{loaderDots}</span>
                      </>
                    ) : (
                      <>
                        <span>RUN CO-CREATOR</span>
                        <Sparkles className="w-4 h-4" strokeWidth={1.5} />
                      </>
                    )}
                  </Button>
                </div>
              </div>
          </Card>
          )}

          {/* Status Message block */}
          {statusMsg && !errorMsg && (
            <div className="p-4 sys-bg border border-white/5 rounded-xl text-xs font-mono sys-text-body flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#14B8A6] animate-ping" />
              <span>{statusMsg}</span>
            </div>
          )}

          {errorMsg && (
            <div className="p-4 bg-[#F87171]/10 border border-[#F87171]/20 rounded-xl text-xs font-mono sys-text-primary flex items-center gap-2.5">
              <AlertCircle className="w-4.5 h-4.5 text-[#F87171]" />
              <span>{errorMsg}</span>
            </div>
          )}
        </div>

        {/* Right Info area (4 cols) */}
        <div className="md:col-span-4">
          <div className="p-5 bg-[rgba(28,28,30,0.72)] backdrop-blur-[16px] border border-white/5 rounded-2xl space-y-4">
            <span className="text-[9px] font-mono font-bold sys-text-body uppercase tracking-widest block">How it works</span>
            <div className="text-[11px] sys-text-body space-y-3 leading-relaxed">
              <p>ShieldAI leverages advanced LLM engines to create programming challenges dynamically.</p>
              <p>The generative builder automatically drafts input structures, constraints, explanations, and visible/hidden test suites.</p>
              <p>You can review the drafts and approve them into the active playlist in real-time.</p>
            </div>
          </div>
        </div>

      </div>

      {/* Generated draft preview cards */}
      {generatedQuestions.length > 0 && (
        <div className="space-y-4 pt-6 border-t border-white/5 animate-fade-in select-none">
          <span className="text-[9px] font-mono font-bold sys-text-body uppercase tracking-widest block">AI DRAFT PREVIEW PROPOSAL</span>

          {generatedQuestions.map((q, idx) => (
            <Card key={idx} className="bg-[rgba(28,28,30,0.72)] backdrop-blur-[16px] border-white/5 p-6 rounded-2xl relative overflow-hidden space-y-6">
              <div className="absolute top-0 left-0 right-0 h-[2px] bg-[#5B8CFF]" />
              
              <div className="flex justify-between items-start">
                <div>
                  <span className="bg-[#5B8CFF]/15 text-[#5B8CFF] border border-[#5B8CFF]/30 px-2 py-0.5 rounded text-[8px] font-mono font-bold uppercase tracking-wider">
                    {q.difficulty} Draft Proposal
                  </span>
                  {editingDraftId === q.id ? (
                    <input 
                      value={q.title} 
                      onChange={e => handleUpdateDraft(q.id, 'title', e.target.value)} 
                      className="bg-[rgba(28,28,30,0.72)] backdrop-blur-[16px] border border-white/5 text-white mt-2 p-1.5 rounded-lg w-full font-bold text-sm focus:outline-none focus:border-[#5B8CFF]/50"
                    />
                  ) : (
                    <h3 className="font-bold text-sm text-white font-heading mt-2">{q.title}</h3>
                  )}
                </div>

                <div className="flex gap-2">
                  <Button 
                    onClick={() => editingDraftId === q.id ? setEditingDraftId(null) : setEditingDraftId(q.id)}
                    className="sys-card hover:sys-card text-white text-xs h-9 px-4 rounded-xl font-bold cursor-pointer transition shadow-md"
                  >
                    {editingDraftId === q.id ? 'Done' : 'Edit'}
                  </Button>
                  <Button 
                    onClick={() => handleApproveDraft(q)}
                    className="bg-[#34D399] hover:bg-[#28b881] text-white text-xs h-9 px-4 rounded-xl font-bold cursor-pointer transition flex items-center gap-1.5 shadow-md"
                  >
                    <Check className="w-4 h-4" strokeWidth={1.5} /> Approve
                  </Button>
                </div>
              </div>

              {/* Description preview */}
              <div className="space-y-4 text-xs">
                <div className="space-y-1.5">
                  <span className="text-[9px] font-mono sys-text-body uppercase">Description</span>
                  {editingDraftId === q.id ? (
                    <textarea 
                      value={q.description} 
                      onChange={e => handleUpdateDraft(q.id, 'description', e.target.value)} 
                      className="bg-[rgba(28,28,30,0.72)] backdrop-blur-[16px] border border-white/5 text-white mt-1 p-2 rounded-lg w-full h-24 text-xs font-sans focus:outline-none focus:border-[#5B8CFF]/50"
                    />
                  ) : (
                    <div className="sys-text-body font-sans leading-relaxed whitespace-pre-wrap">
                      <Latex>{q.description || ''}</Latex>
                    </div>
                  )}
                </div>

                {q.type === 'mcq' ? (
                  <div className="space-y-2">
                    <span className="text-[9px] font-mono sys-text-body uppercase block">Multiple Choice Options</span>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {q.mcq_options?.map((opt, optIdx) => (
                        <div key={optIdx} className={`p-3 rounded-xl border text-[10px] ${q.mcq_correct_index === optIdx ? 'bg-[#34D399]/10 border-[#34D399]/30 text-[#34D399]' : 'sys-bg/40 border-white/5 sys-text-body'}`}>
                          <div className="font-bold mb-1">Option {String.fromCharCode(65 + optIdx)} {q.mcq_correct_index === optIdx && '(Correct)'}</div>
                          {editingDraftId === q.id ? (
                            <input 
                              value={opt} 
                              onChange={e => {
                                const newOpts = [...(q.mcq_options || [])]
                                newOpts[optIdx] = e.target.value
                                handleUpdateDraft(q.id, 'mcq_options', newOpts as any)
                              }}
                              className="bg-[rgba(28,28,30,0.72)] backdrop-blur-[16px] border border-white/5 text-white p-1.5 rounded w-full focus:outline-none focus:border-[#5B8CFF]/50"
                            />
                          ) : (
                            <div><Latex>{opt || ''}</Latex></div>
                          )}
                        </div>
                      ))}
                    </div>
                    {editingDraftId === q.id && (
                      <div className="mt-2">
                        <label className="text-[9px] font-mono sys-text-body uppercase tracking-wider block mb-1">Correct Index (0-3)</label>
                        <input 
                          type="number"
                          min="0" max="3"
                          value={q.mcq_correct_index ?? 0}
                          onChange={e => handleUpdateDraft(q.id, 'mcq_correct_index', Number(e.target.value) as any)}
                          className="bg-[rgba(28,28,30,0.72)] backdrop-blur-[16px] border border-white/5 text-white p-1.5 rounded w-20 focus:outline-none focus:border-[#5B8CFF]/50 text-xs"
                        />
                      </div>
                    )}
                  </div>
                ) : (
                  <>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="p-3 sys-bg rounded-xl border border-white/5">
                        <span className="text-[8px] font-mono sys-text-body uppercase">Constraints</span>
                        {editingDraftId === q.id ? (
                          <textarea 
                            value={q.constraints} 
                            onChange={e => handleUpdateDraft(q.id, 'constraints', e.target.value)} 
                            className="bg-[rgba(28,28,30,0.72)] backdrop-blur-[16px] border border-white/5 text-white mt-1 p-2 rounded-lg w-full h-16 text-[10px] font-mono focus:outline-none focus:border-[#5B8CFF]/50"
                          />
                        ) : (
                          <pre className="text-[10px] sys-text-body font-mono mt-1 whitespace-pre-wrap">{q.constraints}</pre>
                        )}
                      </div>
                      <div className="p-3 sys-bg rounded-xl border border-white/5">
                        <span className="text-[8px] font-mono sys-text-body uppercase">Explanation</span>
                        {editingDraftId === q.id ? (
                          <textarea 
                            value={q.explanation} 
                            onChange={e => handleUpdateDraft(q.id, 'explanation', e.target.value)} 
                            className="bg-[rgba(28,28,30,0.72)] backdrop-blur-[16px] border border-white/5 text-white mt-1 p-2 rounded-lg w-full h-16 text-[10px] font-mono focus:outline-none focus:border-[#5B8CFF]/50"
                          />
                        ) : (
                          <p className="text-[10px] sys-text-body mt-1 italic">{q.explanation}</p>
                        )}
                      </div>
                    </div>

                    <div className="space-y-2">
                      <span className="text-[9px] font-mono sys-text-body uppercase block">Generated Test Cases Matrix</span>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        {q.test_cases?.map((tc, tcIdx) => (
                          <div key={tcIdx} className="p-3 sys-bg/40 border border-white/5 rounded-xl font-mono text-[9px] sys-text-body">
                            <div className="flex justify-between items-center pb-1 border-b border-white/5/40 mb-1.5">
                              <span className="font-bold">Case #{tcIdx + 1}</span>
                              <span className="text-[8px] sys-card px-1 rounded">{tc.is_public ? 'Public' : 'Hidden'}</span>
                            </div>
                            <div className="truncate">Input: {tc.input}</div>
                            <div className="truncate">Expected: {tc.expected_output}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}

    </div>
  )
}
