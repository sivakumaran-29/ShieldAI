import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { 
  Shield, Clock, HelpCircle, Play, LogOut, 
  AlertCircle, LayoutGrid, CheckCircle2, User, Mail, Hash, BookOpen
} from 'lucide-react'
import { useAuthStore } from '../../store/authStore'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { fetchAssessments, fetchCandidateSessions, saveCandidateSession, Assessment } from '../../lib/assessmentEngine'

export default function CandidateDashboard() {
  const { user, logout } = useAuthStore()
  const navigate = useNavigate()

  // State elements
  const [assessments, setAssessments] = useState<Assessment[]>([])
  const [selectedAssessment, setSelectedAssessment] = useState<Assessment | null>(null)
  const [loading, setLoading] = useState(true)

  // Details form
  const [name, setName] = useState(user?.name || '')
  const [email, setEmail] = useState(user?.email || '')
  const [rollNumber, setRollNumber] = useState('')
  const [readInstructions, setReadInstructions] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Fetch assessments and check pending params
  useEffect(() => {
    async function loadData() {
      try {
        const list = await fetchAssessments()
        // Only show published or active assessments for candidates
        const activeList = list.filter(a => a.status === 'Published')
        setAssessments(activeList)

        // Check if there is a pending assessment ID cached
        const pendingId = localStorage.getItem('pending_exam_id')
        if (pendingId) {
          const match = list.find(a => a.id === pendingId)
          if (match) {
            setSelectedAssessment(match)
          } else if (activeList.length > 0) {
            setSelectedAssessment(activeList[0])
          }
        } else if (activeList.length > 0) {
          setSelectedAssessment(activeList[0])
        }

        // Prepopulate student Roll Number if cached from past attempts
        const cachedRoll = localStorage.getItem('candidate_roll')
        if (cachedRoll) setRollNumber(cachedRoll)

        // Extract Roll number from student email if matching Amrita pattern
        if (user?.email && !cachedRoll) {
          const emailParts = user.email.split('@')[0]
          const rollRegex = /u4cse25\d+/i
          const match = emailParts.match(rollRegex)
          if (match) {
            setRollNumber(match[0].toUpperCase())
          }
        }
      } catch (err) {
        console.error('Failed to load candidate dashboard assessments:', err)
      } finally {
        setLoading(false)
      }
    }
    loadData()
  }, [user])

  // Select another assessment
  const handleSelectAssessment = (a: Assessment) => {
    setSelectedAssessment(a)
    localStorage.setItem('pending_exam_id', a.id)
    setErrorMsg('')
  }

  // Pre-flight check validations
  const isAssessmentTimeWindowValid = (a: Assessment): { valid: boolean; message: string } => {
    const now = new Date()
    const start = new Date(a.start_time)
    const end = new Date(a.end_time)

    if (now < start) {
      return { 
        valid: false, 
        message: `This assessment is scheduled to start on ${start.toLocaleString()}.` 
      }
    }
    if (now > end) {
      return { 
        valid: false, 
        message: `This assessment closed on ${end.toLocaleString()}.` 
      }
    }
    return { valid: true, message: 'Assessment window is open.' }
  }

  // Launch Sequence
  const handleLaunchAssessment = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMsg('')

    if (!selectedAssessment) {
      setErrorMsg('Please select an assessment to proceed.')
      return
    }

    if (!name.trim()) {
      setErrorMsg('Please enter your full name.')
      return
    }

    if (!email.trim() || !email.includes('@')) {
      setErrorMsg('Please enter a valid email address.')
      return
    }

    if (!rollNumber.trim()) {
      setErrorMsg('Please enter your institutional Roll Number.')
      return
    }

    if (!readInstructions) {
      setErrorMsg('You must check and acknowledge that you read the instructions.')
      return
    }

    const timeCheck = isAssessmentTimeWindowValid(selectedAssessment)
    if (!timeCheck.valid) {
      setErrorMsg(timeCheck.message)
      return
    }

    setIsSubmitting(true)

    try {
      // 1. Check if candidate already has a session
      if (!user?.id) throw new Error('User session ID not found. Return to login page.')
      
      const allSessions = await fetchCandidateSessions(selectedAssessment.id)
      const existingSession = allSessions.find(s => s.student_id === user.id)

      if (existingSession && existingSession.status === 'submitted') {
        setErrorMsg('You have already submitted this assessment. Dual submissions are locked.')
        setIsSubmitting(false)
        return
      }

      // Save credentials locally
      localStorage.setItem('candidate_name', name)
      localStorage.setItem('candidate_email', email)
      localStorage.setItem('candidate_roll', rollNumber)
      localStorage.setItem('pending_exam_id', selectedAssessment.id)

      let sessionId = existingSession?.id || 'session-' + crypto.randomUUID().slice(0, 8)

      // 2. Initialize or Update Candidate Session details in Supabase
      const newSessionPayload = {
        id: sessionId,
        assessment_id: selectedAssessment.id,
        student_id: user.id,
        name: name,
        email: email,
        roll_number: rollNumber,
        status: 'testing' as const,
        score: existingSession?.score || 0,
        integrity_score: existingSession?.integrity_score || 100,
        violation_logs: existingSession?.violation_logs || ['[SYSTEM] Exam launched by client.'],
        submissions: existingSession?.submissions || {},
        startedAt: existingSession?.startedAt || new Date().toISOString(),
        submittedAt: '',
        updated_at: new Date().toISOString()
      }

      await saveCandidateSession(newSessionPayload)

      // Enter fullscreen trigger and navigate
      navigate('/exam')
    } catch (err: any) {
      console.error(err)
      setErrorMsg(err.message || 'Verification link error. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#07090e] flex items-center justify-center text-sky-400 font-mono text-sm">
        <div className="flex flex-col items-center gap-3">
          <Shield className="w-8 h-8 animate-pulse text-sky-400" />
          <span>Synchronizing Assessment Data Streams...</span>
        </div>
      </div>
    )
  }

  const timeCheck = selectedAssessment ? isAssessmentTimeWindowValid(selectedAssessment) : { valid: false, message: '' }

  return (
    <div className="min-h-screen bg-[#020306] text-neutral-100 flex flex-col font-sans antialiased relative overflow-x-hidden">
      
      {/* Decorative gradients */}
      <div className="absolute inset-0 bg-gradient-to-r from-[#030712] via-[#091124] via-[#0d1d3a] to-[#0a1e36] z-0" />
      <div className="absolute top-[-10%] right-[-10%] w-[600px] h-[600px] bg-sky-500/[0.05] rounded-full blur-[130px] pointer-events-none z-0" />
      <div className="absolute bottom-[-10%] left-[-10%] w-[600px] h-[600px] bg-blue-600/[0.04] rounded-full blur-[130px] pointer-events-none z-0" />

      {/* HEADER SECTION */}
      <header className="bg-sky-950/20 border-b border-sky-900/30 px-6 py-4 flex items-center justify-between sticky top-0 z-50 backdrop-blur-xl">
        <div className="flex items-center space-x-2.5">
          <div className="p-2 bg-neutral-900/90 border border-neutral-800 rounded-xl">
            <Shield className="w-5 h-5 text-sky-400" />
          </div>
          <span className="font-bold tracking-tight text-lg">Shield<span className="text-sky-400">AI</span></span>
          <span className="hidden sm:inline-block text-[9px] bg-sky-500/10 border border-sky-400/20 text-sky-400 px-2 py-0.5 rounded-md font-mono ml-2 uppercase">
            Candidate Lobby
          </span>
        </div>

        <div className="flex items-center space-x-4">
          <div className="text-right hidden sm:block">
            <p className="text-xs font-semibold text-neutral-200">{user?.name}</p>
            <p className="text-[10px] text-sky-400/70 font-mono truncate">{user?.email}</p>
          </div>
          <Button 
            onClick={logout} 
            variant="outline" 
            className="border-sky-900/50 bg-sky-950/30 hover:bg-sky-950/60 text-sky-300 text-xs h-8 px-3 transition-colors cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5 mr-1.5" />
            <span>Sign Out</span>
          </Button>
        </div>
      </header>

      {/* MAIN LAYOUT */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 md:p-8 grid grid-cols-1 lg:grid-cols-12 gap-8 z-10 relative">
        
        {/* LEFT COLUMN: Assessment Selection List (4 grid size) */}
        <section className="lg:col-span-4 space-y-4">
          <div className="flex items-center gap-2 px-2 text-xs font-bold text-sky-400 font-mono tracking-wider uppercase">
            <LayoutGrid className="w-4 h-4 text-sky-400" /> Available Assessments
          </div>

          <div className="space-y-4 max-h-[600px] overflow-y-auto pr-1">
            {assessments.map((a) => {
              const isActive = selectedAssessment?.id === a.id
              const windowCheck = isAssessmentTimeWindowValid(a)
              
              return (
                <div 
                  key={a.id} 
                  onClick={() => handleSelectAssessment(a)}
                  className={`p-4 rounded-2xl border text-left cursor-pointer transition-all duration-300 relative group overflow-hidden ${
                    isActive 
                      ? 'bg-sky-950/20 border-sky-400/50 text-sky-100 shadow-[0_0_20px_rgba(58,189,248,0.1)]' 
                      : 'bg-neutral-900/40 border-sky-950/50 text-neutral-400 hover:border-sky-900/60'
                  }`}
                >
                  {/* Accent border left block */}
                  <div className={`absolute top-0 left-0 bottom-0 w-[3px] transition ${
                    isActive ? 'bg-sky-400 shadow-[0_0_10px_rgba(58,189,248,0.5)]' : 'bg-transparent'
                  }`} />

                  <h3 className="font-extrabold text-sm text-neutral-200 group-hover:text-sky-300 transition duration-300">
                    {a.title}
                  </h3>
                  <p className="text-[11px] text-neutral-400 mt-1 line-clamp-2">
                    {a.description}
                  </p>

                  <div className="flex flex-wrap items-center gap-3 mt-3 pt-3 border-t border-sky-900/20 text-[10px] font-mono">
                    <span className="flex items-center gap-1 text-neutral-400">
                      <Clock className="w-3.5 h-3.5 text-sky-500/50" /> {a.duration} mins
                    </span>
                    <span className={`px-2 py-0.5 rounded border text-[9px] ${
                      windowCheck.valid 
                        ? 'bg-emerald-950/30 text-emerald-400 border-emerald-900/30' 
                        : 'bg-red-950/30 text-red-400 border-red-900/30'
                    }`}>
                      {windowCheck.valid ? 'Open Schedule' : 'Unavailable'}
                    </span>
                  </div>
                </div>
              )
            })}

            {assessments.length === 0 && (
              <div className="p-8 text-center bg-neutral-900/20 border border-sky-950/40 rounded-2xl text-xs text-neutral-500 font-mono">
                No active published assessments available in candidate registry.
              </div>
            )}
          </div>
        </section>

        {/* RIGHT COLUMN: Details & Instructions Start Form (8 grid size) */}
        <section className="lg:col-span-8">
          {selectedAssessment ? (
            <Card className="bg-sky-950/10 border-sky-400/20 rounded-3xl shadow-[0_20px_50px_rgba(0,0,0,0.7)] backdrop-blur-xl relative overflow-hidden">
              <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-sky-400 to-blue-500" />
              
              <CardHeader className="pb-4 border-b border-sky-900/20">
                <CardTitle className="text-xl font-black text-neutral-100 flex items-center gap-2.5">
                  <BookOpen className="w-5 h-5 text-sky-400" /> Assessment Preparation
                </CardTitle>
                <CardDescription className="text-xs text-neutral-400 mt-1">
                  You are launch-initiating: <span className="text-sky-300 font-bold">{selectedAssessment.title}</span>
                </CardDescription>
              </CardHeader>
              
              <CardContent className="p-6 space-y-6">
                
                {/* Error Banner */}
                {errorMsg && (
                  <div className="text-xs text-red-400 bg-red-950/40 p-3 h-auto rounded-xl border border-red-900/40 flex items-center space-x-2.5">
                    <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
                    <span className="font-semibold">{errorMsg}</span>
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* DETAILS CONFIRMATION BLOCK */}
                  <form onSubmit={handleLaunchAssessment} className="space-y-4">
                    <div className="text-xs font-mono font-bold text-sky-400 uppercase tracking-widest border-b border-sky-900/20 pb-2 flex items-center gap-1.5">
                      <User className="w-4 h-4" /> Identity Parameters
                    </div>
                    
                    <div className="space-y-4 pt-1">
                      {/* Name input */}
                      <div className="bg-neutral-950/70 border border-sky-900/30 rounded-xl p-3 flex flex-col focus-within:border-sky-500 transition duration-300">
                        <label className="text-[9px] font-mono font-bold text-sky-400/80 uppercase tracking-wider mb-1 flex items-center gap-1">
                          <User className="w-3 h-3" /> Candidate Full Name
                        </label>
                        <input 
                          type="text" 
                          value={name} 
                          onChange={(e) => setName(e.target.value)} 
                          className="bg-transparent border-0 p-0 text-xs text-neutral-100 placeholder:text-neutral-700 focus:outline-none focus:ring-0 font-semibold"
                          placeholder="Confirm your spelling name..." 
                        />
                      </div>

                      {/* Email input */}
                      <div className="bg-neutral-950/70 border border-sky-900/30 rounded-xl p-3 flex flex-col focus-within:border-sky-500 transition duration-300">
                        <label className="text-[9px] font-mono font-bold text-sky-400/80 uppercase tracking-wider mb-1 flex items-center gap-1">
                          <Mail className="w-3 h-3" /> Institutional Email
                        </label>
                        <input 
                          type="email" 
                          value={email} 
                          onChange={(e) => setEmail(e.target.value)} 
                          className="bg-transparent border-0 p-0 text-xs text-neutral-100 placeholder:text-neutral-700 focus:outline-none focus:ring-0 font-semibold"
                          placeholder="Confirm your institutional email..." 
                        />
                      </div>

                      {/* Roll Number input */}
                      <div className="bg-neutral-950/70 border border-sky-900/30 rounded-xl p-3 flex flex-col focus-within:border-sky-500 transition duration-300">
                        <label className="text-[9px] font-mono font-bold text-sky-400/80 uppercase tracking-wider mb-1 flex items-center gap-1">
                          <Hash className="w-3 h-3" /> Candidate Roll Number
                        </label>
                        <input 
                          type="text" 
                          value={rollNumber} 
                          onChange={(e) => setRollNumber(e.target.value.toUpperCase())} 
                          className="bg-transparent border-0 p-0 text-xs text-neutral-100 placeholder:text-neutral-750 focus:outline-none focus:ring-0 font-mono font-bold"
                          placeholder="U4CSE25XXX..." 
                        />
                      </div>
                    </div>
                  </form>

                  {/* INSTRUCTIONS CHECKLIST */}
                  <div className="space-y-4 flex flex-col">
                    <div className="text-xs font-mono font-bold text-sky-400 uppercase tracking-widest border-b border-sky-900/20 pb-2 flex items-center gap-1.5">
                      <HelpCircle className="w-4 h-4" /> Proctor Rules Checklist
                    </div>

                    <div className="bg-neutral-950/40 border border-sky-950 p-4 rounded-xl text-neutral-300 text-xs space-y-3 flex-1">
                      <div className="flex gap-2">
                        <CheckCircle2 className="w-4 h-4 text-sky-400 shrink-0 mt-0.5" />
                        <p><strong>Timer Limits:</strong> A countdown of <span className="text-sky-300 font-bold">{selectedAssessment.duration} minutes</span> runs globally. Automatic force-submission triggers upon expiry.</p>
                      </div>
                      <div className="flex gap-2">
                        <CheckCircle2 className="w-4 h-4 text-sky-400 shrink-0 mt-0.5" />
                        <p><strong>Strict Sandbox Controls:</strong> Screen switching, tab changes, and minimizing window focus will immediately flag integrity score reductions.</p>
                      </div>
                      <div className="flex gap-2">
                        <CheckCircle2 className="w-4 h-4 text-sky-400 shrink-0 mt-0.5" />
                        <p><strong>Hardware Lockouts:</strong> Copy-pasting code blocks and mouse right-clicks are intercepted and blocked inside the compiler panel.</p>
                      </div>
                      <div className="flex gap-2">
                        <CheckCircle2 className="w-4 h-4 text-sky-400 shrink-0 mt-0.5" />
                        <p><strong>Optical Verification:</strong> Secure proctor networks utilize client media camera parameters for integrity audit monitors.</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* SCHEDULING TIME RANGE DESCRIPTION */}
                <div className="p-4 bg-sky-950/20 border border-sky-900/30 rounded-2xl flex flex-col md:flex-row md:items-center justify-between text-xs gap-4">
                  <div className="space-y-1">
                    <p className="text-neutral-400 font-medium font-mono text-[10px] uppercase">Evaluation Window Scheduling limits</p>
                    <p className="text-neutral-200">
                      Starts: <span className="text-sky-300">{new Date(selectedAssessment.start_time).toLocaleString()}</span>
                    </p>
                    <p className="text-neutral-200">
                      Ends: <span className="text-sky-300">{new Date(selectedAssessment.end_time).toLocaleString()}</span>
                    </p>
                  </div>
                  <div className="text-right">
                    <span className={`inline-block px-3 py-1.5 rounded-xl border text-[11px] font-bold ${
                      timeCheck.valid 
                        ? 'bg-emerald-950/30 text-emerald-400 border-emerald-900/40' 
                        : 'bg-red-950/30 text-red-400 border-red-900/40'
                    }`}>
                      {timeCheck.valid ? '● Assessment Schedule Active' : '● Assessment Window Closed'}
                    </span>
                  </div>
                </div>

                {/* TERMS OF ENGAGEMENT */}
                <label className="flex items-center gap-3 p-3.5 bg-neutral-950/60 border border-sky-950/60 rounded-xl cursor-pointer select-none">
                  <input 
                    type="checkbox" 
                    checked={readInstructions} 
                    onChange={(e) => setReadInstructions(e.target.checked)} 
                    className="w-4 h-4 rounded border-gray-300 text-sky-500 focus:ring-sky-500 bg-neutral-900" 
                  />
                  <span className="text-xs text-neutral-400 leading-tight">
                    I acknowledge that I have read the security policies, consent to activation of my camera device, and understand that tab switching will log violations against my exam submission.
                  </span>
                </label>

                {/* LAUNCH BUTTON */}
                <div className="flex justify-end pt-4 border-t border-sky-900/20">
                  <Button 
                    onClick={handleLaunchAssessment}
                    disabled={isSubmitting || !timeCheck.valid}
                    className={`h-11 px-8 rounded-xl font-black text-xs tracking-wider transition-all duration-300 flex items-center gap-2 select-none shadow-[0_4px_25px_rgba(58,189,248,0.15)] ${
                      timeCheck.valid 
                        ? 'bg-gradient-to-r from-sky-400 to-blue-500 hover:from-sky-300 hover:to-blue-400 text-neutral-950 cursor-pointer active:scale-95' 
                        : 'bg-neutral-900 text-neutral-600 border border-neutral-800'
                    }`}
                  >
                    {isSubmitting ? (
                      <>
                        <Shield className="w-4 h-4 animate-spin text-neutral-950" />
                        <span>Initializing Compilers...</span>
                      </>
                    ) : (
                      <>
                        <span>Acknowledge & Launch Code Environment</span>
                        <Play className="w-4 h-4 fill-current" />
                      </>
                    )}
                  </Button>
                </div>

              </CardContent>
            </Card>
          ) : (
            <div className="h-[400px] flex items-center justify-center border border-sky-950/30 rounded-3xl bg-neutral-900/20 text-neutral-500 text-xs font-mono">
              Please select an assessment path from the left portal track.
            </div>
          )}
        </section>

      </main>

    </div>
  )
}