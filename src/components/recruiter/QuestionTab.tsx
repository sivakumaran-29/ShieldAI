import { useState, useEffect } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { 
  Plus, Edit, Trash, AlignLeft, Trash2, ArrowLeft
} from 'lucide-react'
import { CodingQuestion, TestCase, saveQuestion, deleteQuestion, fetchQuestions, Assessment } from '../../lib/assessmentEngine'

interface QuestionTabProps {
  selectedAssessment: Assessment
  onBack: () => void
}

export default function QuestionTab({ selectedAssessment, onBack }: QuestionTabProps) {
  const [questions, setQuestions] = useState<CodingQuestion[]>([])
  const [loading, setLoading] = useState(true)
  const [isEditing, setIsEditing] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)

  // Question Form attributes
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [difficulty, setDifficulty] = useState<'Easy' | 'Medium' | 'Hard'>('Easy')
  const [constraints, setConstraints] = useState('')
  const [inputFormat, setInputFormat] = useState('')
  const [outputFormat, setOutputFormat] = useState('')
  const [sampleInput, setSampleInput] = useState('')
  const [sampleOutput, setSampleOutput] = useState('')
  const [explanation, setExplanation] = useState('')
  const [timeLimit, setTimeLimit] = useState(1000)
  const [memoryLimit, setMemoryLimit] = useState(256)
  const [tags, setTags] = useState<string[]>([])
  const [tagInput, setTagInput] = useState('')

  // Test Cases list
  const [testCases, setTestCases] = useState<TestCase[]>([
    { id: 'tc-1', input: '', expected_output: '', is_public: true, weight: 50 },
    { id: 'tc-2', input: '', expected_output: '', is_public: false, weight: 50 }
  ])

  const loadQuestions = async () => {
    setLoading(true)
    const list = await fetchQuestions(selectedAssessment.id)
    setQuestions(list)
    setLoading(false)
  }

  useEffect(() => {
    loadQuestions()
  }, [selectedAssessment])

  const handleOpenCreateForm = () => {
    setIsEditing(true)
    setEditId(null)
    setTitle('')
    setDescription('')
    setDifficulty('Easy')
    setConstraints('• 1 <= nums.length <= 10^5')
    setInputFormat('')
    setOutputFormat('')
    setSampleInput('')
    setSampleOutput('')
    setExplanation('')
    setTimeLimit(1000)
    setMemoryLimit(256)
    setTags(['Arrays'])
    setTestCases([
      { id: 'tc-' + crypto.randomUUID().slice(0, 4), input: '', expected_output: '', is_public: true, weight: 50 },
      { id: 'tc-' + crypto.randomUUID().slice(0, 4), input: '', expected_output: '', is_public: false, weight: 50 }
    ])
  }

  const handleOpenEditForm = (q: CodingQuestion) => {
    setIsEditing(true)
    setEditId(q.id)
    setTitle(q.title)
    setDescription(q.description)
    setDifficulty(q.difficulty)
    setConstraints(q.constraints)
    setInputFormat(q.input_format)
    setOutputFormat(q.output_format)
    setSampleInput(q.sample_input)
    setSampleOutput(q.sample_output)
    setExplanation(q.explanation)
    setTimeLimit(q.time_limit)
    setMemoryLimit(q.memory_limit)
    setTags(q.tags || [])
    setTestCases(q.test_cases?.length > 0 ? q.test_cases : [
      { id: 'tc-1', input: '', expected_output: '', is_public: true, weight: 50 }
    ])
  }

  const handleAddTestCase = () => {
    setTestCases(prev => [
      ...prev,
      { id: 'tc-' + crypto.randomUUID().slice(0, 4), input: '', expected_output: '', is_public: false, weight: 10 }
    ])
  }

  const handleRemoveTestCase = (id: string) => {
    setTestCases(prev => prev.filter(c => c.id !== id))
  }

  const handleTestCaseChange = (id: string, field: keyof TestCase, value: any) => {
    setTestCases(prev => prev.map(tc => {
      if (tc.id === id) {
        return { ...tc, [field]: value }
      }
      return tc
    }))
  }

  const handleAddTag = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && tagInput.trim()) {
      e.preventDefault()
      if (!tags.includes(tagInput.trim())) {
        setTags(prev => [...prev, tagInput.trim()])
      }
      setTagInput('')
    }
  }

  const handleRemoveTag = (tagText: string) => {
    setTags(prev => prev.filter(t => t !== tagText))
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim()) return

    const id = editId || 'q-' + crypto.randomUUID().slice(0, 8)
    const payload: CodingQuestion = {
      id,
      exam_id: selectedAssessment.id,
      title,
      description,
      difficulty,
      constraints,
      input_format: inputFormat,
      output_format: outputFormat,
      sample_input: sampleInput,
      sample_output: sampleOutput,
      explanation: explanation,
      time_limit: Number(timeLimit),
      memory_limit: Number(memoryLimit),
      test_cases: testCases,
      tags
    }

    await saveQuestion(payload)
    setIsEditing(false)
    loadQuestions()
  }

  const handleDelete = async (qid: string) => {
    if (window.confirm('Delete this coding challenge permanently from assessment?')) {
      await deleteQuestion(qid)
      loadQuestions()
    }
  }

  if (loading) {
    return (
      <div className="p-12 text-center text-xs font-mono text-sky-400">
        Loading assessment questions bank data...
      </div>
    )
  }

  return (
    <div className="space-y-6">
      
      {/* Selector Header Bar */}
      <div className="flex items-center justify-between border-b border-sky-950 pb-4 select-none">
        <div className="flex items-center gap-2">
          <Button onClick={onBack} variant="outline" size="sm" className="border-sky-950 text-neutral-350 p-2 h-8 rounded-lg cursor-pointer">
            <ArrowLeft className="w-4 h-4 mr-1.5" /> Back
          </Button>
          <div>
            <h3 className="font-extrabold text-[11px] text-sky-400 uppercase tracking-widest leading-none">Questions Registry</h3>
            <span className="text-[10px] text-neutral-450 leading-none">{selectedAssessment.title}</span>
          </div>
        </div>

        {!isEditing && (
          <Button onClick={handleOpenCreateForm} className="bg-sky-550 hover:bg-sky-505 text-white text-xs h-9 px-4 rounded-xl cursor-pointer">
            <Plus className="w-4 h-4 mr-1.5" /> Add Challenge Question
          </Button>
        )}
      </div>

      {isEditing ? (
        <Card className="bg-neutral-900 border-sky-950 p-6 rounded-2xl">
          <form onSubmit={handleSave} className="space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="col-span-2 flex flex-col gap-1.5">
                <label className="text-[10px] font-mono text-neutral-400 uppercase tracking-wider font-bold">Question / Challenge Title</label>
                <input 
                  type="text" 
                  value={title} 
                  onChange={e => setTitle(e.target.value)}
                  className="bg-neutral-950 border border-sky-950 text-neutral-100 rounded-xl p-2.5 text-xs outline-none focus:border-sky-500 font-semibold"
                  placeholder="e.g. Valid Parentheses"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-mono text-neutral-400 uppercase tracking-wider font-bold">Difficulty Setting</label>
                <select 
                  value={difficulty} 
                  onChange={e => setDifficulty(e.target.value as any)}
                  className="bg-neutral-950 border border-sky-950 text-neutral-100 rounded-xl p-2.5 text-xs outline-none focus:border-sky-505 font-bold"
                >
                  <option value="Easy">Easy</option>
                  <option value="Medium">Medium</option>
                  <option value="Hard">Hard</option>
                </select>
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-mono text-neutral-400 uppercase tracking-wider font-bold flex items-center gap-1">
                <AlignLeft className="w-3.5 h-3.5" /> Challenge Description (Markdown / Text syntax)
              </label>
              <textarea 
                value={description} 
                onChange={e => setDescription(e.target.value)}
                className="bg-neutral-950 border border-sky-950 text-neutral-100 rounded-xl p-2.5 text-xs outline-none focus:border-sky-500 font-mono min-h-36"
                placeholder="Declare variables details, expectations, edge scenarios..."
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-mono text-neutral-400 uppercase tracking-wider font-bold">Constraints specs</label>
              <textarea 
                value={constraints} 
                onChange={e => setConstraints(e.target.value)}
                className="bg-neutral-950 border border-sky-950 text-neutral-100 rounded-xl p-2.5 text-xs outline-none focus:border-sky-505 font-mono min-h-16"
                placeholder="• 2 <= nums.length <= 10^4"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-mono text-neutral-400 uppercase tracking-wider font-bold">Input Format Layout</label>
                <input 
                  type="text" 
                  value={inputFormat} 
                  onChange={e => setInputFormat(e.target.value)}
                  className="bg-neutral-950 border border-sky-950 text-neutral-100 rounded-xl p-2.5 text-xs outline-none focus:border-sky-500"
                  placeholder="First line contains N. In subsequent line N integers..."
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-mono text-neutral-400 uppercase tracking-wider font-bold">Output Format Layout</label>
                <input 
                  type="text" 
                  value={outputFormat} 
                  onChange={e => setOutputFormat(e.target.value)}
                  className="bg-neutral-950 border border-sky-950 text-neutral-100 rounded-xl p-2.5 text-xs outline-none focus:border-sky-500"
                  placeholder="Print indices comma separated..."
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-mono text-neutral-400 uppercase tracking-wider font-bold">Sample Input (Visible to Candidate)</label>
                <textarea 
                  value={sampleInput} 
                  onChange={e => setSampleInput(e.target.value)}
                  className="bg-neutral-950 border border-sky-950 text-neutral-100 rounded-xl p-2.5 text-xs outline-none focus:border-sky-500 font-mono min-h-16"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-mono text-neutral-400 uppercase tracking-wider font-bold">Sample Expected Output</label>
                <textarea 
                  value={sampleOutput} 
                  onChange={e => setSampleOutput(e.target.value)}
                  className="bg-neutral-950 border border-sky-950 text-neutral-100 rounded-xl p-2.5 text-xs outline-none focus:border-sky-500 font-mono min-h-16"
                />
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-mono text-neutral-400 uppercase tracking-wider font-bold">Sample Explanation</label>
              <textarea 
                value={explanation} 
                onChange={e => setExplanation(e.target.value)}
                className="bg-neutral-950 border border-sky-950 text-neutral-100 rounded-xl p-2.5 text-xs outline-none focus:border-sky-500 min-h-16"
                placeholder="Briefly state why sample input generates sample output..."
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-mono text-neutral-400 uppercase tracking-wider font-bold">Execution Timeout Limit (ms)</label>
                <input 
                  type="number" 
                  value={timeLimit} 
                  onChange={e => setTimeLimit(Number(e.target.value))}
                  className="bg-neutral-950 border border-sky-950 text-neutral-100 rounded-xl p-2.5 text-xs outline-none focus:border-sky-505 font-bold"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-mono text-neutral-400 uppercase tracking-wider font-bold">Memory Limit (MB)</label>
                <input 
                  type="number" 
                  value={memoryLimit} 
                  onChange={e => setMemoryLimit(Number(e.target.value))}
                  className="bg-neutral-950 border border-sky-950 text-neutral-100 rounded-xl p-2.5 text-xs outline-none focus:border-sky-505 font-bold"
                />
              </div>

              <div className="flex flex-col gap-1.5 font-sans relative">
                <label className="text-[10px] font-mono text-neutral-400 uppercase tracking-wider font-bold">Topic Tags (Press Enter)</label>
                <input 
                  type="text" 
                  value={tagInput} 
                  onChange={e => setTagInput(e.target.value)}
                  onKeyDown={handleAddTag}
                  className="bg-neutral-950 border border-sky-950 text-neutral-100 rounded-xl p-2.5 text-xs outline-none focus:border-sky-505"
                  placeholder="e.g. Arrays, Recursion..."
                />
                <div className="flex flex-wrap gap-1 mt-1.5">
                  {tags.map(t => (
                    <span key={t} className="bg-neutral-950 text-[9px] font-mono text-sky-400 border border-sky-950 px-2 py-0.5 rounded-md flex items-center gap-1 select-none">
                      {t} <span onClick={() => handleRemoveTag(t)} className="text-red-500 font-bold hover:text-red-305 cursor-pointer ml-1">x</span>
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {/* TEST CASES MANAGEMENT SECTION */}
            <div className="space-y-3 pt-3 border-t border-sky-950">
              <div className="flex justify-between items-center select-none">
                <h4 className="text-[10px] font-mono font-bold text-sky-450 uppercase tracking-widest">Test Cases Matrix</h4>
                <Button type="button" onClick={handleAddTestCase} size="sm" className="bg-neutral-950 border border-sky-950 text-sky-400 text-[10px] h-7 px-3.5 gap-1.5 rounded-lg hover:bg-sky-950/20 cursor-pointer font-bold">
                  <Plus className="w-3.5 h-3.5" /> Add Case
                </Button>
              </div>

              <div className="space-y-4">
                {testCases.map((tc, index) => (
                  <div key={tc.id} className="p-4 bg-neutral-950/30 border border-sky-955 rounded-xl grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
                    <div className="md:col-span-1 border-r border-sky-955/50 pr-2 select-none">
                      <span className="text-[10px] font-mono font-bold text-neutral-500 block">Case #{index + 1}</span>
                      <span className="text-[8px] font-mono text-sky-500/60 block">{tc.id}</span>
                    </div>

                    <div className="md:col-span-4 flex flex-col gap-1.5">
                      <label className="text-[9px] font-mono uppercase text-neutral-500 tracking-wider">Input parameters</label>
                      <textarea 
                        value={tc.input} 
                        onChange={e => handleTestCaseChange(tc.id, 'input', e.target.value)}
                        className="bg-neutral-950 border border-sky-950 text-neutral-100 rounded-lg p-2 text-xs font-mono outline-none min-h-12 focus:border-sky-505"
                        placeholder="Parameters to write in stdin..."
                      />
                    </div>

                    <div className="md:col-span-4 flex flex-col gap-1.5">
                      <label className="text-[9px] font-mono uppercase text-neutral-500 tracking-wider">Expected Console Output</label>
                      <textarea 
                        value={tc.expected_output} 
                        onChange={e => handleTestCaseChange(tc.id, 'expected_output', e.target.value)}
                        className="bg-neutral-950 border border-sky-950 text-neutral-100 rounded-lg p-2 text-xs font-mono outline-none min-h-12 focus:border-sky-505"
                        placeholder="Expected output string..."
                      />
                    </div>

                    <div className="md:col-span-2 flex flex-col gap-2 p-1 font-sans justify-center items-start">
                      <label className="flex items-center gap-2 text-[10px] font-semibold cursor-pointer select-none">
                        <input 
                          type="checkbox" 
                          checked={tc.is_public} 
                          onChange={e => handleTestCaseChange(tc.id, 'is_public', e.target.checked)}
                          className="w-3.5 h-3.5 bg-neutral-900 border-sky-950 rounded text-sky-500"
                        />
                        Is case Public?
                      </label>
                      
                      <div className="flex items-center gap-1.5 w-full">
                        <label className="text-[9px] font-mono text-neutral-500">Weight:</label>
                        <input 
                          type="number" 
                          value={tc.weight} 
                          onChange={e => handleTestCaseChange(tc.id, 'weight', Number(e.target.value))}
                          className="w-16 bg-neutral-950 border border-sky-950 text-neutral-100 rounded-lg p-1 text-[10px] outline-none text-center font-bold"
                        />
                      </div>
                    </div>

                    <div className="md:col-span-1 flex justify-center">
                      <Button 
                        type="button" 
                        onClick={() => handleRemoveTestCase(tc.id)} 
                        variant="ghost" 
                        size="sm" 
                        disabled={testCases.length <= 1}
                        className="text-red-500 font-bold hover:text-red-400 p-1.5 h-auto rounded hover:bg-red-950/20"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-sky-950">
              <Button type="button" onClick={() => setIsEditing(false)} variant="outline" className="border-sky-950 text-sky-400 text-xs">
                Cancel
              </Button>
              <Button type="submit" className="bg-sky-550 hover:bg-sky-505 text-white text-xs px-6">
                Save question
              </Button>
            </div>
          </form>
        </Card>
      ) : (
        <div className="space-y-4">
          {questions.map(q => (
            <Card key={q.id} className="bg-neutral-900/40 border-sky-955 p-4 rounded-xl flex items-center justify-between gap-4">
              <div className="space-y-1.5">
                <div className="flex items-center gap-2">
                  <span className="px-1.5 py-0.5 rounded text-[8px] font-mono font-bold bg-neutral-950 text-sky-400 border border-sky-950 uppercase">
                    {q.difficulty}
                  </span>
                  <span className="px-1.5 py-0.5 rounded text-[8px] font-mono font-bold bg-neutral-950 text-neutral-450 border border-neutral-850">
                    Total Cases: {q.test_cases?.length || 0}
                  </span>
                  <h4 className="font-extrabold text-xs text-neutral-250 font-sans">{q.title}</h4>
                </div>
                <p className="text-[10px] text-neutral-400 line-clamp-1">{q.description}</p>
                <div className="flex gap-1">
                  {q.tags?.map((t, idx) => (
                    <span key={idx} className="bg-neutral-950 text-[8px] font-mono text-neutral-500 border border-neutral-850 px-1.5 py-0.2 rounded">
                      {t}
                    </span>
                  ))}
                </div>
              </div>

              <div className="flex items-center gap-1 bg-neutral-950/20 px-2 py-1 border border-sky-955/30 rounded-xl">
                <Button 
                  onClick={() => handleOpenEditForm(q)}
                  variant="ghost" 
                  size="sm" 
                  className="h-7 text-[10px] px-2.5 font-bold hover:text-white text-sky-400 gap-1"
                >
                  <Edit className="w-3 h-3" /> Edit
                </Button>
                <Button 
                  onClick={() => handleDelete(q.id)}
                  variant="ghost" 
                  size="sm" 
                  className="h-7 text-[10px] px-2.5 font-bold hover:text-red-300 text-red-400 gap-1"
                >
                  <Trash className="w-3 h-3" /> Delete
                </Button>
              </div>
            </Card>
          ))}

          {questions.length === 0 && (
            <div className="text-center p-12 bg-neutral-900/10 border border-sky-950/40 rounded-3xl text-xs font-mono text-neutral-505">
              No questions found for this assessment. Select manual creation or seed with AI generator!
            </div>
          )}
        </div>
      )}

    </div>
  )
}
