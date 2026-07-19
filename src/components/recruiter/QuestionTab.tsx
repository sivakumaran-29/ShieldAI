import { useState, useEffect } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { 
  Plus, Edit, Trash2, ArrowLeft, X, SlidersHorizontal, Terminal
} from 'lucide-react'
import { CodingQuestion, TestCase, saveQuestion, deleteQuestion, fetchQuestions, Assessment } from '../../lib/assessmentEngine'
import Latex from 'react-latex-next'

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
  const [questionType, setQuestionType] = useState<'coding' | 'mcq'>('coding')
  const [mcqOptions, setMcqOptions] = useState<string[]>(['', '', '', ''])
  const [mcqCorrectIndex, setMcqCorrectIndex] = useState<number>(0)
  const [mcqMarks, setMcqMarks] = useState<number>(1)
  const [mcqNegativeMarks, setMcqNegativeMarks] = useState<number>(0)
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

  const [showTypeDropdown, setShowTypeDropdown] = useState(false)

  const handleOpenCreateForm = (type: 'coding' | 'mcq') => {
    setIsEditing(true)
    setEditId(null)
    setTitle('')
    setQuestionType(type)
    setMcqOptions(['', '', '', ''])
    setMcqCorrectIndex(0)
    setMcqMarks(1)
    setMcqNegativeMarks(0)
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
    setEditId(q.id)
    setTitle(q.title)
    setQuestionType(q.type || 'coding')
    setMcqOptions(q.mcq_options || ['', '', '', ''])
    setMcqCorrectIndex(q.mcq_correct_index || 0)
    setMcqMarks(q.mcq_marks ?? 1)
    setMcqNegativeMarks(q.mcq_negative_marks ?? 0)
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
      type: questionType,
      mcq_options: questionType === 'mcq' ? mcqOptions : undefined,
      mcq_correct_index: questionType === 'mcq' ? mcqCorrectIndex : undefined,
      mcq_marks: questionType === 'mcq' ? mcqMarks : undefined,
      mcq_negative_marks: questionType === 'mcq' ? mcqNegativeMarks : undefined,
      description,
      constraints,
      input_format: inputFormat,
      output_format: outputFormat,
      sample_input: sampleInput,
      sample_output: sampleOutput,
      explanation,
      difficulty,
      time_limit: Number(timeLimit),
      memory_limit: Number(memoryLimit),
      test_cases: testCases,
      tags
    }

    await saveQuestion(payload)
    setIsEditing(false)
    loadQuestions()
  }

  const handleDeleteQuestion = async (id: string) => {
    if (window.confirm('Delete this coding question from the assessment bank?')) {
      await deleteQuestion(id)
      loadQuestions()
    }
  }

  if (loading) {
    return (
      <div className="h-[200px] flex items-center justify-center sys-text-body font-mono text-xs select-none">
        <SlidersHorizontal className="w-5 h-5 animate-spin mr-2" strokeWidth={1.5} />
        <span>Fetching coding challenge lists...</span>
      </div>
    )
  }

  return (
    <div className="space-y-8 select-none">
      
      {/* Header bar */}
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-3">
          <Button 
            onClick={onBack}
            variant="ghost" 
            size="sm" 
            className="h-9 px-3 hover:bg-panel backdrop-blur-[16px]/40 border border-divider sys-text-body hover:text-primary rounded-xl cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div>
            <h2 className="text-[12px] font-heading font-bold tracking-wider text-[#5B8CFF] uppercase">// CHALLENGES BANK</h2>
            <span className="text-[11px] sys-text-body font-sans mt-1 block font-medium">Selected assessment: {selectedAssessment.title}</span>
          </div>
        </div>
        {!isEditing && (
          <div className="relative">
            <Button 
              onClick={() => setShowTypeDropdown(!showTypeDropdown)}
              className="bg-[#3f6ad5] hover:bg-[#3254a8] hover:shadow-[0_0_15px_rgba(63,106,213,0.6)] active:shadow-[0_0_8px_rgba(63,106,213,0.4)] text-primary text-xs h-10 px-5 rounded-xl font-bold cursor-pointer transition flex items-center gap-1.5 shadow-md"
            >
              <Plus className="w-4 h-4" strokeWidth={1.5} /> Add Challenge
            </Button>
            {showTypeDropdown && (
              <div className="absolute right-0 top-full mt-2 w-56 bg-panel backdrop-blur-[16px] border border-divider rounded-xl shadow-2xl overflow-hidden z-50 flex flex-col">
                <button 
                  onClick={() => { setShowTypeDropdown(false); handleOpenCreateForm('mcq'); }} 
                  className="text-left px-4 py-3.5 text-xs text-primary hover:sys-card border-b border-divider font-bold transition"
                >
                  Create Multiple Choice
                </button>
                <button 
                  onClick={() => { setShowTypeDropdown(false); handleOpenCreateForm('coding'); }} 
                  className="text-left px-4 py-3.5 text-xs text-primary hover:sys-card font-bold transition"
                >
                  Create Coding Challenge
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {!isEditing ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
          {/* Part 1: MCQs */}
          <div className="sys-bg/30 p-4 border border-transparent rounded-2xl">
            <h3 className="text-sm font-bold text-primary mb-4 border-b border-transparent pb-2">Part 1: Multiple Choice Questions</h3>
            <div className="flex flex-col gap-4">
              {questions.filter(q => q.type === 'mcq').map((q) => (
                <Card key={q.id} className="bg-panel backdrop-blur-[16px] border-divider p-6 rounded-2xl relative overflow-hidden flex flex-col justify-between min-h-48 hover:border-[#5B8CFF]/20 transition duration-300">
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span className={`px-2 py-0.5 rounded border text-[8px] font-mono font-bold uppercase tracking-wider ${
                        q.difficulty === 'Easy' ? 'bg-[#34D399]/15 text-[#34D399] border-[#34D399]/35' : 
                        q.difficulty === 'Medium' ? 'bg-[#FBBF24]/15 text-[#FBBF24] border-[#FBBF24]/35' : 
                        'bg-[#F87171]/15 text-[#F87171] border-[#F87171]/35'
                      }`}>
                        {q.difficulty}
                      </span>
                      
                      <div className="flex gap-1">
                        <Button 
                          onClick={() => handleOpenEditForm(q)}
                          variant="ghost" 
                          size="sm" 
                          className="h-7 w-7 p-0 hover:sys-card sys-text-body hover:text-primary rounded-lg cursor-pointer"
                        >
                          <Edit className="w-3.5 h-3.5" />
                        </Button>
                        <Button 
                          onClick={() => handleDeleteQuestion(q.id)}
                          variant="ghost" 
                          size="sm" 
                          className="h-7 w-7 p-0 hover:bg-[#F87171]/10 sys-text-body hover:text-[#F87171] rounded-lg cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </div>

                    <div>
                      <h3 className="font-bold text-xs text-primary font-heading">{q.title}</h3>
                      <p className="text-[10px] sys-text-body mt-1 line-clamp-3 leading-relaxed">{q.description}</p>
                    </div>

                    <div className="flex flex-wrap gap-1 pt-2">
                      {q.tags?.map((t, idx) => (
                        <span key={idx} className="bg-background border border-divider sys-text-body font-mono text-[8px] px-2 py-0.5 rounded-lg uppercase">
                          {t}
                        </span>
                      ))}
                    </div>
                  </div>
                </Card>
              ))}

              {questions.filter(q => q.type === 'mcq').length === 0 && (
                <div className="p-8 text-center border border-dashed border-divider rounded-2xl bg-panel backdrop-blur-[16px] sys-text-body text-xs font-mono select-none">
                  No Multiple Choice questions added yet.
                </div>
              )}
            </div>
          </div>

          {/* Part 2: Coding Challenges */}
          <div className="sys-bg/30 p-4 border border-transparent rounded-2xl">
            <h3 className="text-sm font-bold text-primary mb-4 border-b border-transparent pb-2">Part 2: Coding Challenges</h3>
            <div className="flex flex-col gap-4">
              {questions.filter(q => q.type !== 'mcq').map((q) => (
                <Card key={q.id} className="bg-panel backdrop-blur-[16px] border-divider p-6 rounded-2xl relative overflow-hidden flex flex-col justify-between min-h-48 hover:border-[#5B8CFF]/20 transition duration-300">
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span className={`px-2 py-0.5 rounded border text-[8px] font-mono font-bold uppercase tracking-wider ${
                        q.difficulty === 'Easy' ? 'bg-[#34D399]/15 text-[#34D399] border-[#34D399]/35' : 
                        q.difficulty === 'Medium' ? 'bg-[#FBBF24]/15 text-[#FBBF24] border-[#FBBF24]/35' : 
                        'bg-[#F87171]/15 text-[#F87171] border-[#F87171]/35'
                      }`}>
                        {q.difficulty}
                      </span>
                      
                      <div className="flex gap-1">
                        <Button 
                          onClick={() => handleOpenEditForm(q)}
                          variant="ghost" 
                          size="sm" 
                          className="h-7 w-7 p-0 hover:sys-card sys-text-body hover:text-primary rounded-lg cursor-pointer"
                        >
                          <Edit className="w-3.5 h-3.5" />
                        </Button>
                        <Button 
                          onClick={() => handleDeleteQuestion(q.id)}
                          variant="ghost" 
                          size="sm" 
                          className="h-7 w-7 p-0 hover:bg-[#F87171]/10 sys-text-body hover:text-[#F87171] rounded-lg cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </div>

                    <div>
                      <h3 className="font-bold text-xs text-primary font-heading">{q.title}</h3>
                      <p className="text-[10px] sys-text-body mt-1 line-clamp-3 leading-relaxed">{q.description}</p>
                    </div>

                    <div className="flex flex-wrap gap-1 pt-2">
                      {q.tags?.map((t, idx) => (
                        <span key={idx} className="bg-background border border-divider sys-text-body font-mono text-[8px] px-2 py-0.5 rounded-lg uppercase">
                          {t}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="flex justify-between items-center pt-4 border-t border-divider/60 text-[9px] font-mono sys-text-body mt-4 select-none">
                    <span>Time Limit: {q.time_limit}ms</span>
                    <span>Test Cases: {q.test_cases?.length || 0}</span>
                  </div>
                </Card>
              ))}

              {questions.filter(q => q.type !== 'mcq').length === 0 && (
                <div className="p-8 text-center border border-dashed border-divider rounded-2xl bg-panel backdrop-blur-[16px] sys-text-body text-xs font-mono select-none">
                  No coding challenges added yet.
                </div>
              )}
            </div>
          </div>
        </div>
      ) : (
        /* Edit Challenge Form */
        <Card className="bg-panel backdrop-blur-[16px] border-divider p-8 rounded-2xl relative overflow-hidden animate-fade-in shadow-2xl">
          <div className="absolute top-0 left-0 right-0 h-[2.5px] bg-[#5B8CFF]" />
          
          <h3 className="text-sm font-bold text-primary mb-6 font-heading flex items-center gap-2">
            <SlidersHorizontal className="w-4.5 h-4.5 text-[#5B8CFF]" />
            {editId ? 'Configure Coding Challenge' : 'Initialize New Challenge'}
          </h3>

          <form onSubmit={handleSave} className="space-y-6 text-xs">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              {/* Left Form section */}
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1.5 col-span-2">
                    <label className="text-[9px] font-mono sys-text-body uppercase tracking-wider">Question Title</label>
                    <input 
                      type="text" 
                      value={title} 
                      onChange={e => setTitle(e.target.value)}
                      className="sys-bg border border-divider text-primary rounded-xl p-3 text-sm font-bold focus:outline-none focus:border-[#5B8CFF]/50" 
                      placeholder="e.g. Reverse Linked List (LaTeX allowed)"
                      required
                    />
                    {title.trim() && (
                      <div className="mt-1 p-2 bg-card rounded-lg border border-divider text-xs text-primary">
                        <Latex>{title}</Latex>
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-[9px] font-mono sys-text-body uppercase tracking-wider">Question Type</label>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setQuestionType('coding')}
                      className={`flex-1 py-2 text-xs font-bold rounded-lg border transition ${questionType === 'coding' ? 'bg-[#5B8CFF]/20 border-[#5B8CFF] text-[#5B8CFF]' : 'sys-bg border-divider sys-text-body hover:text-primary'}`}
                    >
                      Coding Challenge
                    </button>
                    <button
                      type="button"
                      onClick={() => setQuestionType('mcq')}
                      className={`flex-1 py-2 text-xs font-bold rounded-lg border transition ${questionType === 'mcq' ? 'bg-[#5B8CFF]/20 border-[#5B8CFF] text-[#5B8CFF]' : 'sys-bg border-divider sys-text-body hover:text-primary'}`}
                    >
                      Multiple Choice
                    </button>
                  </div>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-[9px] font-mono sys-text-body uppercase tracking-wider">{questionType === 'mcq' ? 'Question Description' : 'Challenge Description'}</label>
                  <textarea 
                    value={description} 
                    onChange={e => setDescription(e.target.value)}
                    className="sys-bg border border-divider text-primary rounded-xl p-3 text-xs focus:outline-none focus:border-[#5B8CFF]/50 min-h-24 font-sans leading-relaxed" 
                    placeholder="Describe problem goals, parameters and context. You can use LaTeX math block: $$E=mc^2$$ or inline $x^2$."
                    required
                  />
                  {description.trim() && (
                    <div className="mt-2 p-3 bg-card rounded-lg border border-[#5B8CFF]/30 text-xs text-primary">
                      <span className="text-[#5B8CFF] text-[8px] font-bold uppercase mb-1 block">Live Preview</span>
                      <Latex>{description}</Latex>
                    </div>
                  )}
                </div>

                {questionType === 'coding' && (
                  <>
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[9px] font-mono sys-text-body uppercase tracking-wider">Tags (Press Enter)</label>
                      <div className="flex flex-wrap gap-1.5 p-2 sys-bg border border-divider rounded-xl min-h-11 items-center">
                        {tags.map((t, idx) => (
                          <span key={idx} className="sys-card border border-divider sys-text-primary font-mono text-[8px] px-2 py-0.5 rounded-lg uppercase flex items-center gap-1">
                            {t}
                            <button type="button" onClick={() => handleRemoveTag(t)} className="sys-text-body hover:text-primary focus:outline-none">
                              <X className="w-2.5 h-2.5" />
                            </button>
                          </span>
                        ))}
                        <input 
                          type="text"
                          value={tagInput}
                          onChange={e => setTagInput(e.target.value)}
                          onKeyDown={handleAddTag}
                          className="bg-transparent border-0 p-0 text-xs text-primary focus:outline-none focus:ring-0 placeholder:sys-text-body flex-1 min-w-16"
                          placeholder="Add tag..."
                        />
                      </div>
                    </div>
                  </>
                )}
              </div>

              {/* Right Form section */}
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[9px] font-mono sys-text-body uppercase tracking-wider">Difficulty</label>
                    <select 
                      value={difficulty} 
                      onChange={e => setDifficulty(e.target.value as any)}
                      className="sys-bg border border-divider text-primary rounded-xl p-3 text-xs font-semibold focus:outline-none focus:border-[#5B8CFF]/50 cursor-pointer"
                    >
                      <option value="Easy">Easy</option>
                      <option value="Medium">Medium</option>
                      <option value="Hard">Hard</option>
                    </select>
                  </div>
                  
                  {questionType === 'coding' && (
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[9px] font-mono sys-text-body uppercase tracking-wider">Time Limit (ms)</label>
                      <input 
                        type="number" 
                        value={timeLimit} 
                        onChange={e => setTimeLimit(Number(e.target.value))}
                        className="sys-bg border border-divider text-primary rounded-xl p-3 text-xs font-mono focus:outline-none focus:border-[#5B8CFF]/50"
                        min={100}
                        max={10000}
                        required
                      />
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[9px] font-mono sys-text-body uppercase tracking-wider">Explanation</label>
                    <input 
                      type="text" 
                      value={explanation} 
                      onChange={e => setExplanation(e.target.value)}
                      className="sys-bg border border-divider text-primary rounded-xl p-3 text-xs focus:outline-none focus:border-[#5B8CFF]/50"
                      placeholder="Optional details..."
                    />
                  </div>
                  
                  {questionType === 'coding' && (
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[9px] font-mono sys-text-body uppercase tracking-wider">Memory Limit (MB)</label>
                      <input 
                        type="number" 
                        value={memoryLimit} 
                        onChange={e => setMemoryLimit(Number(e.target.value))}
                        className="sys-bg border border-divider text-primary rounded-xl p-3 text-xs font-mono focus:outline-none focus:border-[#5B8CFF]/50"
                        min={16}
                        max={1024}
                        required
                      />
                    </div>
                  )}
                </div>

                {questionType === 'coding' && (
                  <>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="flex flex-col gap-1.5">
                        <label className="text-[9px] font-mono sys-text-body uppercase tracking-wider">Input Format</label>
                        <input 
                          type="text" 
                          value={inputFormat} 
                          onChange={e => setInputFormat(e.target.value)}
                          className="sys-bg border border-divider text-primary rounded-xl p-3 text-xs focus:outline-none focus:border-[#5B8CFF]/50"
                          placeholder="e.g. Standard input integers"
                        />
                      </div>
                      <div className="flex flex-col gap-1.5">
                        <label className="text-[9px] font-mono sys-text-body uppercase tracking-wider">Output Format</label>
                        <input 
                          type="text" 
                          value={outputFormat} 
                          onChange={e => setOutputFormat(e.target.value)}
                          className="sys-bg border border-divider text-primary rounded-xl p-3 text-xs focus:outline-none focus:border-[#5B8CFF]/50"
                          placeholder="e.g. Result stdout string"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="flex flex-col gap-1.5">
                        <label className="text-[9px] font-mono sys-text-body uppercase tracking-wider">Sample Input</label>
                        <textarea 
                          value={sampleInput} 
                          onChange={e => setSampleInput(e.target.value)}
                          className="sys-bg border border-divider text-primary rounded-xl p-3 text-xs font-mono focus:outline-none focus:border-[#5B8CFF]/50 min-h-16"
                          placeholder="Sample input data..."
                        />
                      </div>
                      <div className="flex flex-col gap-1.5">
                        <label className="text-[9px] font-mono sys-text-body uppercase tracking-wider">Sample Output</label>
                        <textarea 
                          value={sampleOutput} 
                          onChange={e => setSampleOutput(e.target.value)}
                          className="sys-bg border border-divider text-primary rounded-xl p-3 text-xs font-mono focus:outline-none focus:border-[#5B8CFF]/50 min-h-16"
                          placeholder="Expected output data..."
                        />
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>

            {questionType === 'coding' ? (
              <>
                <div className="flex flex-col gap-1.5 mb-4 mt-6">
                  <label className="text-[9px] font-mono sys-text-body uppercase tracking-wider">Constraints Guidelines</label>
                  <textarea 
                    value={constraints} 
                    onChange={e => setConstraints(e.target.value)}
                    className="sys-bg border border-divider text-primary rounded-xl p-3 text-xs focus:outline-none focus:border-[#5B8CFF]/50 min-h-20 font-mono" 
                    placeholder="• 1 <= nums.length <= 10^5"
                  />
                </div>

                {/* Test Cases Editor section */}
                <div className="pt-6 border-t border-divider">
                  <div className="flex justify-between items-center mb-4">
                <span className="text-[9px] font-mono font-bold sys-text-body uppercase tracking-widest flex items-center gap-1.5">
                  <Terminal className="w-4 h-4" strokeWidth={1.5} /> Test Cases Matrix
                </span>
                <Button 
                  type="button" 
                  onClick={handleAddTestCase}
                  variant="outline" 
                  size="sm"
                  className="border-divider bg-hover sys-text-body hover:text-primary h-7 px-3 text-[9px] font-bold rounded-xl cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" strokeWidth={1.5} /> Add Test Case
                </Button>
              </div>

              <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
                {testCases.map((tc) => (
                  <div key={tc.id} className="p-4 sys-bg/40 border border-divider rounded-xl grid grid-cols-1 md:grid-cols-11 gap-4 items-center animate-fade-in select-none">
                    
                    <div className="md:col-span-4 flex flex-col gap-1.5">
                      <label className="text-[8px] font-mono uppercase sys-text-body tracking-wider">Input Parameter</label>
                      <textarea 
                        value={tc.input} 
                        onChange={e => handleTestCaseChange(tc.id, 'input', e.target.value)}
                        className="sys-bg border border-divider text-primary rounded-lg p-2 text-xs font-mono outline-none min-h-12 focus:border-[#5B8CFF]/40"
                        placeholder="stdin inputs..."
                      />
                    </div>

                    <div className="md:col-span-4 flex flex-col gap-1.5">
                      <label className="text-[8px] font-mono uppercase sys-text-body tracking-wider">Expected Output</label>
                      <textarea 
                        value={tc.expected_output} 
                        onChange={e => handleTestCaseChange(tc.id, 'expected_output', e.target.value)}
                        className="sys-bg border border-divider text-primary rounded-lg p-2 text-xs font-mono outline-none min-h-12 focus:border-[#5B8CFF]/40"
                        placeholder="stdout output..."
                      />
                    </div>

                    <div className="md:col-span-2 flex flex-col gap-2 p-1 font-sans justify-center items-start">
                      <label className="flex items-center gap-2 text-[10px] font-semibold cursor-pointer select-none sys-text-body hover:text-primary">
                        <input 
                          type="checkbox" 
                          checked={tc.is_public}
                          onChange={e => handleTestCaseChange(tc.id, 'is_public', e.target.checked)}
                          className="w-3.5 h-3.5 rounded border-divider text-[#5B8CFF] focus:ring-0 sys-bg cursor-pointer"
                        />
                        <span>Visible Sample</span>
                      </label>
                      
                      <div className="flex items-center gap-1.5 w-full">
                        <span className="text-[8px] font-mono sys-text-body uppercase">Weight:</span>
                        <input 
                          type="number" 
                          value={tc.weight}
                          onChange={e => handleTestCaseChange(tc.id, 'weight', Number(e.target.value))}
                          className="w-14 sys-bg border border-divider text-primary text-[10px] rounded p-1 text-center font-mono outline-none"
                          min={0}
                        />
                      </div>
                    </div>

                    <div className="md:col-span-1 flex justify-end">
                      <Button 
                        type="button" 
                        onClick={() => handleRemoveTestCase(tc.id)}
                        variant="ghost" 
                        size="sm"
                        className="h-7 w-7 p-0 hover:bg-[#F87171]/10 sys-text-body hover:text-[#F87171] rounded-lg cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>

                  </div>
                ))}
              </div>
              </div>
              </>
            ) : (
              <div className="pt-6 border-t border-divider mt-6">
                <span className="text-[9px] font-mono font-bold sys-text-body uppercase tracking-widest flex items-center gap-1.5 mb-4">
                  Multiple Choice Options Matrix
                </span>
                
                <div className="space-y-3">
                  {mcqOptions.map((opt, idx) => (
                    <div key={idx} className="flex items-center gap-4 sys-bg/40 p-4 border border-divider rounded-xl">
                      <div className="flex items-center justify-center w-8 h-8 rounded-lg sys-card border border-divider sys-text-body font-bold font-mono text-[10px]">
                        {String.fromCharCode(65 + idx)}
                      </div>
                      <div className="flex-1 flex flex-col gap-2">
                        <input 
                          type="text" 
                          value={opt} 
                          onChange={e => {
                            const newOps = [...mcqOptions]
                            newOps[idx] = e.target.value
                            setMcqOptions(newOps)
                          }}
                          className="w-full bg-input shadow-inner shadow-black/40 border border-divider text-primary rounded-lg p-2.5 text-xs focus:outline-none focus:border-[#5B8CFF]/50"
                          placeholder={`Option ${String.fromCharCode(65 + idx)} text (LaTeX supported)...`}
                        />
                        {opt.trim() && (
                          <div className="p-2 bg-card rounded-lg border border-divider text-xs text-primary">
                            <Latex>{opt}</Latex>
                          </div>
                        )}
                      </div>
                      <label className="flex items-center gap-2 text-[10px] font-semibold cursor-pointer select-none sys-text-body hover:text-primary shrink-0 ml-4">
                        <input 
                          type="radio" 
                          name="mcqCorrectAnswer"
                          checked={mcqCorrectIndex === idx}
                          onChange={() => setMcqCorrectIndex(idx)}
                          className="w-4 h-4 text-[#5B8CFF] focus:ring-0 sys-bg cursor-pointer"
                        />
                        <span className={mcqCorrectIndex === idx ? 'text-[#34D399] font-bold' : ''}>Correct Answer</span>
                      </label>
                    </div>
                  ))}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
                  <div>
                    <label className="block text-[10px] font-mono font-bold text-muted uppercase tracking-wider mb-2 flex items-center gap-1.5">Marks for Correct Answer</label>
                    <input 
                      type="number" 
                      value={mcqMarks} 
                      onChange={e => setMcqMarks(parseFloat(e.target.value) || 0)} 
                      className="w-full sys-bg border border-divider text-primary rounded-xl p-3 text-xs focus:outline-none focus:border-[#5B8CFF]/50 transition shadow-inner"
                      min={0}
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-mono font-bold text-muted uppercase tracking-wider mb-2 flex items-center gap-1.5">Negative Marks (Optional)</label>
                    <input 
                      type="number" 
                      value={mcqNegativeMarks} 
                      onChange={e => setMcqNegativeMarks(parseFloat(e.target.value) || 0)} 
                      className="w-full sys-bg border border-divider text-primary rounded-xl p-3 text-xs focus:outline-none focus:border-[#F87171]/50 transition shadow-inner"
                      min={0}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Form actions */}
            <div className="flex justify-end gap-3 pt-6 border-t border-divider">
              <Button 
                type="button" 
                onClick={() => setIsEditing(false)}
                variant="outline"
                className="border-divider bg-hover sys-text-body hover:text-primary rounded-xl text-xs h-10 px-6 cursor-pointer"
              >
                Cancel
              </Button>
              <Button 
                type="submit" 
                className="bg-[#3f6ad5] hover:bg-[#3254a8] hover:shadow-[0_0_15px_rgba(63,106,213,0.6)] active:shadow-[0_0_8px_rgba(63,106,213,0.4)] text-primary rounded-xl text-xs h-10 px-6 font-bold cursor-pointer transition shadow-md"
              >
                Save Challenge
              </Button>
            </div>

          </form>

        </Card>
      )}

    </div>
  )
}
