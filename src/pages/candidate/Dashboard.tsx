import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { 
  Shield, Clock, HelpCircle, Play, LogOut, 
  AlertCircle, LayoutGrid, CheckCircle2, User, Mail, Hash, BookOpen, Lock, ChevronRight, RefreshCw
} from 'lucide-react'
import { useAuthStore } from '../../store/authStore'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { fetchAssessments, fetchCandidateSessions, saveCandidateSession, Assessment } from '../../lib/assessmentEngine'
import ThemeToggle from '../../components/ThemeToggle'

export default function CandidateDashboard() {
  const { user, logout } = useAuthStore()
  const navigate = useNavigate()

  // State elements
  const [assessments, setAssessments] = useState<Assessment[]>([])
  const [selectedAssessment, setSelectedAssessment] = useState<Assessment | null>(null)
  const [loading, setLoading] = useState(true)

  // Details form
  const email = user?.email || ''
  const name = email ? email.split('@')[0] : 'student'
  const [rollNumber, setRollNumber] = useState('')
  const [readInstructions, setReadInstructions] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSyncing, setIsSyncing] = useState(false)

  // Fetch assessments and check pending params
  useEffect(() => {
    async function loadData() {
      try {
        const list = await fetchAssessments()
        const candidateBatch = user?.batch || 'CSE_C'
        const candidateDept = candidateBatch.split('_')[0]

        // Only show published assessments that target this candidate's batch or dept
        const activeList = list.filter(a => {
          if (a.status !== 'Published') return false
          
          const target = a.target_batch
          if (!target || target === 'ALL') return true
          
          if (target.startsWith('DEPT_')) {
            const targetDept = target.replace('DEPT_', '')
            return targetDept === candidateDept
          }
          
          return target === candidateBatch
        })
        setAssessments(activeList)

        // Check if there is a pending assessment ID cached
        const pendingId = localStorage.getItem('pending_exam_id')
        if (pendingId) {
          const match = activeList.find(a => a.id === pendingId)
          if (match) {
            setSelectedAssessment(match)
          } else if (activeList.length > 0) {
            setSelectedAssessment(activeList[0])
            localStorage.removeItem('pending_exam_id')
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

  const handleSync = async () => {
    try {
      setIsSyncing(true)
      const list = await fetchAssessments()
      const candidateBatch = user?.batch || 'CSE_C'
      const candidateDept = candidateBatch.split('_')[0]

      const activeList = list.filter(a => {
        if (a.status !== 'Published') return false
        
        const target = a.target_batch
        if (!target || target === 'ALL') return true
        
        if (target.startsWith('DEPT_')) {
          const targetDept = target.replace('DEPT_', '')
          return targetDept === candidateDept
        }
        
        return target === candidateBatch
      })
      setAssessments(activeList)

      const pendingId = localStorage.getItem('pending_exam_id')
      if (pendingId) {
        const match = activeList.find(a => a.id === pendingId)
        if (match) setSelectedAssessment(match)
      } else if (activeList.length > 0) {
        setSelectedAssessment(activeList[0])
      }
    } catch (err) {
      console.error(err)
    } finally {
      setTimeout(() => setIsSyncing(false), 500)
    }
  }

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

    // Request fullscreen immediately while user interaction gesture is active
    const elem = document.documentElement as any
    if (elem.requestFullscreen) {
      elem.requestFullscreen().catch((err: any) => {
        console.warn('Fullscreen entry deferred by browser:', err)
      })
    }

    try {
      // Check if session already exists
      const existingSessions = await fetchCandidateSessions(selectedAssessment.id)
      const existing = existingSessions.find(s => s.student_id === user?.id)

      if (existing) {
        if (existing.status === 'submitted') {
          setErrorMsg('You have already submitted this assessment. Multiple attempts are not allowed.')
          setIsSubmitting(false)
          return
        }

        // Cache credentials locally and launch workspace compiler
        localStorage.setItem('candidate_name', name.trim())
        localStorage.setItem('candidate_email', email.trim())
        localStorage.setItem('candidate_roll', rollNumber.trim().toUpperCase())
        localStorage.setItem('pending_exam_id', selectedAssessment.id)
        
        navigate(`/exam`)
      } else {
        // Build new session object
        const sessionObj = {
          id: 'session-' + crypto.randomUUID().slice(0, 8),
          assessment_id: selectedAssessment.id,
          student_id: user?.id || 'candidate-id',
          name: name.trim(),
          email: email.trim(),
          roll_number: rollNumber.trim().toUpperCase(),
          status: 'testing' as const,
          score: 0,
          integrity_score: 100,
          startedAt: new Date().toISOString(),
          submittedAt: '',
          updated_at: new Date().toISOString(),
          violation_logs: [
            `[${new Date().toLocaleTimeString()}] [SYSTEM] Secure socket connection initialized.`,
            `[${new Date().toLocaleTimeString()}] [SYSTEM] Candidate joined the secure lobby.`
          ],
          submissions: {}
        }

        const success = await saveCandidateSession(sessionObj)
        if (success) {
          localStorage.setItem('candidate_name', name.trim())
          localStorage.setItem('candidate_email', email.trim())
          localStorage.setItem('candidate_roll', rollNumber.trim().toUpperCase())
          localStorage.setItem('pending_exam_id', selectedAssessment.id)
          
          navigate(`/exam`)
        } else {
          setErrorMsg('Lobby transaction failed. Confirm connection status.')
        }
      }
    } catch (err: any) {
      console.error(err)
      setErrorMsg(err.message || 'Lobby launch failed. Check network link.')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#000000] flex items-center justify-center text-white font-mono text-xs relative overflow-hidden">
        <div className="grain-overlay" />
        <div className="flex flex-col items-center gap-3 relative z-10">
          <Shield className="w-6 h-6 animate-pulse text-[#5B8CFF]" strokeWidth={1.5} />
          <span className="font-heading font-semibold tracking-wider">Synchronizing Assessment Data Streams...</span>
        </div>
      </div>
    )
  }

  const isRollDisabled = !!(user?.email && user.email.match(/u4cse25\d+/i)) || !!localStorage.getItem('candidate_roll')
  const timeCheck = selectedAssessment ? isAssessmentTimeWindowValid(selectedAssessment) : { valid: false, message: '' }

  return (
    <div className="min-h-screen bg-background text-foreground flex font-sans antialiased overflow-hidden relative">
      
      {/* 1. Ambient Background Layer */}
      <div className="mesh-bg">
        <div className="mesh-circle-1" />
        <div className="mesh-circle-2" />
      </div>
      
      {/* 2. Moving Grain Noise Overlay */}
      <div className="grain-overlay" />

      {/* ================= LEFT SIDEBAR ================= */}
      <aside className="w-64 h-screen bg-[#0a0a0a]/80 backdrop-blur-md border-r border-border flex flex-col justify-between p-6 shrink-0 z-30 select-none">
        <div className="space-y-8">
          
          {/* Header Brand & Theme Toggle */}
          <div className="flex items-center justify-between select-none">
            <div className="flex items-center space-x-2.5">
              <div className="p-1.5 bg-zinc-950 border border-border rounded-xl">
                <Shield className="w-4 h-4 text-[#5B8CFF]" strokeWidth={1.5} />
              </div>
              <div className="flex flex-col">
                <span className="font-bold text-xs tracking-wide text-white font-heading">ShieldAI</span>
                <span className="text-[7.5px] font-mono text-zinc-500 uppercase tracking-widest leading-none mt-0.5">Candidate</span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                onClick={handleSync}
                disabled={isSyncing}
                variant="outline"
                size="icon"
                className="w-8 h-8 rounded-lg bg-zinc-950 border-zinc-800 text-zinc-400 hover:text-white transition shadow-sm"
                title="Sync Assessments"
              >
                <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin text-[#5B8CFF]' : ''}`} />
              </Button>
              <ThemeToggle />
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="flex flex-col gap-1.5">
            <button 
              className="flex items-center justify-between px-3 py-2.5 text-xs font-medium rounded-xl border bg-[#5B8CFF]/10 text-[#5B8CFF] border-[#5B8CFF]/20 select-none cursor-default"
            >
              <div className="flex items-center gap-2.5">
                <LayoutGrid className="w-4 h-4" strokeWidth={1.5} />
                <span>Assessment Lobby</span>
              </div>
              <ChevronRight className="w-3 h-3 opacity-100" strokeWidth={1.5} />
            </button>
          </nav>
        </div>

        {/* Footer Profile & Logout */}
        <div className="space-y-4 pt-4 border-t border-border">
          <div className="flex items-center gap-3 px-1">
            <div className="p-2 bg-zinc-900 border border-border rounded-xl">
              <User className="w-4 h-4 text-zinc-400" strokeWidth={1.5} />
            </div>
            <div className="flex flex-col min-w-0">
              <span className="text-xs font-semibold text-white truncate font-heading">{user?.name || 'Candidate'}</span>
              <span className="text-[10px] text-zinc-500 font-mono truncate">{user?.email}</span>
            </div>
          </div>
          <Button 
            onClick={logout} 
            variant="outline" 
            className="w-full border-border bg-zinc-950/40 hover:bg-zinc-900 text-zinc-400 hover:text-white text-xs h-9 justify-center cursor-pointer transition rounded-xl"
          >
            <LogOut className="w-3.5 h-3.5 mr-2" strokeWidth={1.5} />
            <span>Sign Out</span>
          </Button>
        </div>
      </aside>

      {/* ================= RIGHT MAIN CONTENT AREA ================= */}
      <main className="flex-1 h-screen overflow-y-auto bg-transparent p-8 md:p-12 z-10 relative">
        <div className="max-w-6xl w-full mx-auto space-y-8 animate-fade-in pb-12">
          
          {/* Section Breadcrumbs */}
          <div className="flex items-center justify-between select-none">
            <div className="flex items-center gap-2 text-[9px] font-mono text-zinc-500 uppercase tracking-widest">
              <span>CANDIDATE PANEL</span>
              <span>/</span>
              <span className="text-[#5B8CFF] font-bold">Lobby</span>
              {selectedAssessment && (
                <>
                  <span>/</span>
                  <span className="text-muted">{selectedAssessment.title}</span>
                </>
              )}
            </div>
          </div>

          {/* Grid Area */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            
            {/* Available Assessments */}
            <section className="lg:col-span-4 space-y-4">
              <div className="flex items-center gap-2 px-1 text-[10px] font-bold text-zinc-500 font-mono tracking-widest uppercase select-none">
                <LayoutGrid className="w-4 h-4 text-zinc-550" strokeWidth={1.5} /> Available Assessments
              </div>

              <div className="space-y-4 max-h-[600px] overflow-y-auto pr-1">
                {assessments.map((a) => {
                  const isActive = selectedAssessment?.id === a.id
                  const windowCheck = isAssessmentTimeWindowValid(a)
                  
                  return (
                    <div 
                      key={a.id} 
                      onClick={() => handleSelectAssessment(a)}
                      className={`p-4 rounded-xl border text-left cursor-pointer transition-all duration-300 relative group overflow-hidden ${
                        isActive 
                          ? 'bg-[#0a0a0a]/90 border-[#5B8CFF]/45 text-foreground shadow-xl' 
                          : 'bg-[#0a0a0a]/35 border-border text-muted hover:border-zinc-800'
                      }`}
                    >
                      {/* Purple accent border block */}
                      <div className={`absolute top-0 left-0 bottom-0 w-[3px] transition ${
                        isActive ? 'bg-[#5B8CFF] shadow-[0_0_8px_rgba(91,140,255,0.4)]' : 'bg-transparent'
                      }`} />

                      <h3 className="font-bold text-xs text-white group-hover:text-primary transition duration-300 font-heading">
                        {a.title}
                      </h3>
                      <p className="text-[10px] text-zinc-500 mt-1.5 line-clamp-2 leading-relaxed">
                        {a.description}
                      </p>

                      <div className="flex flex-wrap items-center gap-3 mt-4 pt-3 border-t border-border text-[9px] font-mono select-none">
                        <span className="flex items-center gap-1.5 text-zinc-550 font-bold">
                          <Clock className="w-3.5 h-3.5" strokeWidth={1.5} /> {a.duration} MINS
                        </span>
                        <span className={`px-2 py-0.5 rounded border text-[8px] font-bold ${
                          windowCheck.valid 
                            ? 'bg-[#5B8CFF]/10 text-[#5B8CFF] border-[#5B8CFF]/30' 
                            : 'bg-zinc-950 text-zinc-600 border-border'
                        }`}>
                          {windowCheck.valid ? 'OPEN SCHEDULE' : 'UNAVAILABLE'}
                        </span>
                      </div>
                    </div>
                  )
                })}

                {assessments.length === 0 && (
                  <div className="p-8 text-center bg-card border border-border rounded-xl text-xs text-zinc-600 font-mono select-none">
                    No active published assessments available in candidate registry.
                  </div>
                )}
              </div>
            </section>

            {/* Details & Setup Form */}
            <section className="lg:col-span-8">
              {selectedAssessment ? (
                <Card className="bg-[#0a0a0a]/90 border-border rounded-2xl shadow-none relative overflow-hidden">
                  <div className="absolute top-0 left-0 right-0 h-[2.5px] bg-[#5B8CFF]" />
                  
                  <CardHeader className="pb-4 border-b border-border select-none">
                    <CardTitle className="text-sm font-bold text-white flex items-center gap-2.5 font-heading">
                      <BookOpen className="w-5 h-5 text-zinc-400" strokeWidth={1.5} /> Assessment Preparation
                    </CardTitle>
                    <CardDescription className="text-xs text-zinc-500 mt-1">
                      You are launching: <span className="text-white font-bold">{selectedAssessment.title}</span>
                    </CardDescription>
                  </CardHeader>
                  
                  <CardContent className="p-6 space-y-6">
                    
                    {errorMsg && (
                      <div className="text-xs text-zinc-200 bg-[#F87171]/10 p-3.5 rounded-xl border border-[#F87171]/20 flex items-center space-x-2.5 animate-fade-in">
                        <AlertCircle className="w-4 h-4 shrink-0 text-[#F87171]" strokeWidth={1.5} />
                        <span className="font-semibold">{errorMsg}</span>
                      </div>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {/* Identity parameters */}
                      <div className="space-y-4">
                        <div className="text-[10px] font-mono font-bold text-zinc-500 uppercase tracking-widest border-b border-border pb-2 flex items-center gap-1.5 select-none">
                          <User className="w-4 h-4 text-zinc-500" strokeWidth={1.5} /> Identity Parameters
                        </div>
                        
                        <div className="space-y-4 pt-1">
                          {/* Name */}
                          <div className="bg-zinc-950/60 border border-border rounded-xl p-3.5 flex flex-col opacity-50 cursor-not-allowed">
                            <div className="flex items-center justify-between select-none">
                              <label className="text-[9px] font-mono font-bold text-zinc-550 uppercase tracking-wider mb-1 flex items-center gap-1">
                                <User className="w-3 h-3" strokeWidth={1.5} /> Candidate Full Name (Locked)
                              </label>
                              <Lock className="w-3 h-3 text-zinc-600" strokeWidth={1.5} />
                            </div>
                            <input 
                              type="text" 
                              value={name} 
                              readOnly
                              disabled
                              className="bg-transparent border-0 p-0 text-xs text-zinc-400 focus:outline-none focus:ring-0 font-semibold cursor-not-allowed select-none"
                            />
                          </div>

                          {/* Email */}
                          <div className="bg-zinc-950/60 border border-border rounded-xl p-3.5 flex flex-col opacity-50 cursor-not-allowed">
                            <div className="flex items-center justify-between select-none">
                              <label className="text-[9px] font-mono font-bold text-zinc-555 uppercase tracking-wider mb-1 flex items-center gap-1">
                                <Mail className="w-3 h-3" strokeWidth={1.5} /> Institutional Email
                              </label>
                              <Lock className="w-3 h-3 text-zinc-600" strokeWidth={1.5} />
                            </div>
                            <input 
                              type="email" 
                              value={email} 
                              readOnly
                              disabled
                              className="bg-transparent border-0 p-0 text-xs text-zinc-400 focus:outline-none focus:ring-0 font-semibold cursor-not-allowed select-none"
                            />
                          </div>

                          {/* Roll */}
                          <div className={`bg-zinc-950/60 border border-border rounded-xl p-3.5 flex flex-col ${
                            isRollDisabled ? 'opacity-50 cursor-not-allowed' : ''
                          }`}>
                            <div className="flex items-center justify-between select-none">
                              <label className="text-[9px] font-mono font-bold text-zinc-550 uppercase tracking-wider mb-1 flex items-center gap-1">
                                <Hash className="w-3 h-3" strokeWidth={1.5} /> Candidate Roll Number
                              </label>
                              {isRollDisabled && <Lock className="w-3 h-3 text-zinc-600" strokeWidth={1.5} />}
                            </div>
                            <input 
                              type="text" 
                              value={rollNumber} 
                              onChange={(e) => setRollNumber(e.target.value.toUpperCase())} 
                              readOnly={isRollDisabled}
                              disabled={isRollDisabled}
                              className={`bg-transparent border-0 p-0 text-xs focus:outline-none focus:ring-0 font-mono font-bold ${
                                isRollDisabled ? 'text-zinc-450 cursor-not-allowed select-none' : 'text-white placeholder:text-zinc-700'
                              }`}
                              placeholder="U4CSE25XXX..." 
                            />
                          </div>
                        </div>
                      </div>

                      {/* Rules Checklist */}
                      <div className="space-y-4 flex flex-col">
                        <div className="text-[10px] font-mono font-bold text-zinc-500 uppercase tracking-widest border-b border-border pb-2 flex items-center gap-1.5 select-none">
                          <HelpCircle className="w-4 h-4 text-zinc-500" strokeWidth={1.5} /> Proctor Rules Checklist
                        </div>

                        <div className="bg-zinc-950/20 border border-border p-4 rounded-xl text-zinc-450 text-[11px] space-y-3.5 flex-1 select-none leading-relaxed">
                          <div className="flex gap-2.5">
                            <CheckCircle2 className="w-4 h-4 text-[#14B8A6] shrink-0 mt-0.5" strokeWidth={1.5} />
                            <p><strong>Timer Limits:</strong> A countdown of <span className="text-[#5B8CFF] font-bold font-number">{selectedAssessment.duration} minutes</span> runs globally. Automatic force-submission triggers upon expiry.</p>
                          </div>
                          <div className="flex gap-2.5">
                            <CheckCircle2 className="w-4 h-4 text-[#14B8A6] shrink-0 mt-0.5" strokeWidth={1.5} />
                            <p><strong>Strict Sandbox Controls:</strong> Screen switching, tab changes, and minimizing window focus will immediately flag integrity score reductions.</p>
                          </div>
                          <div className="flex gap-2.5">
                            <CheckCircle2 className="w-4 h-4 text-[#14B8A6] shrink-0 mt-0.5" strokeWidth={1.5} />
                            <p><strong>Hardware Lockouts:</strong> Copy-pasting code blocks and mouse right-clicks are intercepted and blocked inside the compiler panel.</p>
                          </div>
                          <div className="flex gap-2.5">
                            <CheckCircle2 className="w-4 h-4 text-[#14B8A6] shrink-0 mt-0.5" strokeWidth={1.5} />
                            <p><strong>Optical Verification:</strong> Secure proctor networks utilize client media camera parameters for integrity audit monitors.</p>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Schedule details */}
                    <div className="p-4 bg-zinc-950/20 border border-border rounded-xl flex flex-col md:flex-row md:items-center justify-between text-xs gap-4 select-none">
                      <div className="space-y-1">
                        <p className="text-zinc-500 font-bold font-mono text-[9px] uppercase tracking-wider">Evaluation Window Scheduling limits</p>
                        <p className="text-zinc-450">
                          Starts: <span className="text-white font-semibold font-mono">{new Date(selectedAssessment.start_time).toLocaleString()}</span>
                        </p>
                        <p className="text-zinc-450">
                          Ends: <span className="text-white font-semibold font-mono">{new Date(selectedAssessment.end_time).toLocaleString()}</span>
                        </p>
                      </div>
                      <div className="text-right">
                        <span className={`inline-block px-3 py-1.5 rounded-xl border text-[10px] font-bold ${
                          timeCheck.valid 
                            ? 'bg-[#5B8CFF]/10 text-[#5B8CFF] border-[#5B8CFF]/30' 
                            : 'bg-zinc-950 text-zinc-500 border-border'
                        }`}>
                          {timeCheck.valid ? '● Assessment Schedule Active' : '● Assessment Window Closed'}
                        </span>
                      </div>
                    </div>

                    {/* Consent */}
                    <label className="flex items-start gap-3.5 p-3.5 bg-zinc-950/20 border border-border rounded-xl cursor-pointer select-none">
                      <input 
                        type="checkbox" 
                        checked={readInstructions} 
                        onChange={(e) => setReadInstructions(e.target.checked)} 
                        className="w-4 h-4 rounded border-border text-[#5B8CFF] focus:ring-0 bg-background cursor-pointer mt-0.5" 
                      />
                      <span className="text-[10px] text-zinc-500 leading-relaxed font-sans">
                        I acknowledge that I have read the security policies, consent to activation of my camera device, and understand that tab switching will log violations against my exam submission.
                      </span>
                    </label>

                    {/* Launch Button */}
                    <div className="flex justify-end pt-4 border-t border-border select-none">
                      <Button 
                        onClick={handleLaunchAssessment}
                        disabled={isSubmitting || !timeCheck.valid}
                        className={`h-11 px-8 rounded-xl font-bold text-xs tracking-wider transition-all duration-300 flex items-center gap-2 select-none shadow-md ${
                          timeCheck.valid 
                            ? 'bg-[#5B8CFF] hover:bg-[#3b71f3] text-white font-extrabold cursor-pointer active:scale-95' 
                            : 'bg-zinc-950 text-zinc-500 border border-border cursor-not-allowed'
                        }`}
                      >
                        {isSubmitting ? (
                          <>
                            <Shield className="w-4 h-4 animate-spin text-white" strokeWidth={1.5} />
                            <span>Initializing Compilers...</span>
                          </>
                        ) : (
                          <>
                            <span>Acknowledge & Launch Code Environment</span>
                            <Play className="w-4 h-4 fill-current text-white" strokeWidth={1.5} />
                          </>
                        )}
                      </Button>
                    </div>

                  </CardContent>
                </Card>
              ) : (
                <div className="h-[400px] flex items-center justify-center border border-border rounded-2xl bg-[#0a0a0a]/20 text-zinc-500 text-xs font-mono select-none">
                  Please select an assessment path from the left lobby list.
                </div>
              )}
            </section>

          </div>

        </div>
      </main>

    </div>
  )
}