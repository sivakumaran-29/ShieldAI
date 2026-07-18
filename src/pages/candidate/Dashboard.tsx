import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { 
  Shield, Clock, HelpCircle, Play, LogOut, 
  AlertCircle, LayoutGrid, CheckCircle2, User, Mail, Hash, BookOpen, Lock, ChevronRight, RefreshCw,
  Home, History, Calendar, Activity, Check, CircleDot, Search
} from 'lucide-react'
import { useAuthStore } from '../../store/authStore'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { fetchAssessments, fetchCandidateSessions, saveCandidateSession, Assessment, CandidateSession } from '../../lib/assessmentEngine'
import ThemeToggle from '../../components/ThemeToggle'
import { AmbientGlow } from '../../components/AmbientGlow'

export default function CandidateDashboard() {
  const { user, logout } = useAuthStore()
  const navigate = useNavigate()

  // State elements
  const [assessments, setAssessments] = useState<Assessment[]>([])
  const [pastSessions, setPastSessions] = useState<CandidateSession[]>([])
  const [selectedAssessment, setSelectedAssessment] = useState<Assessment | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'overview' | 'lobby' | 'history'>('overview')

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

        // Fetch past sessions for history
        const allSessions = await fetchCandidateSessions()
        const mySessions = allSessions.filter(s => s.student_id === user?.id || s.email === email)
        setPastSessions(mySessions.sort((a, b) => new Date(b.startedAt || 0).getTime() - new Date(a.startedAt || 0).getTime()))

        // Check if there is a pending assessment ID cached
        const pendingId = localStorage.getItem('pending_exam_id')
        if (pendingId) {
          const match = activeList.find(a => a.id === pendingId)
          if (match) {
            setSelectedAssessment(match)
            setActiveTab('lobby')
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
  }, [user, email])

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

      const allSessions = await fetchCandidateSessions()
      const mySessions = allSessions.filter(s => s.student_id === user?.id || s.email === email)
      setPastSessions(mySessions.sort((a, b) => new Date(b.startedAt || 0).getTime() - new Date(a.startedAt || 0).getTime()))

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
      <div className="min-h-screen sys-bg flex items-center justify-center text-white font-mono text-xs relative overflow-hidden">
        <AmbientGlow />
        <div className="flex flex-col items-center gap-3 relative z-10">
          <Shield className="w-6 h-6 animate-pulse text-[#5B8CFF]" strokeWidth={1.5} />
          <span className="font-heading font-semibold tracking-wider">Synchronizing Assessment Data Streams...</span>
        </div>
      </div>
    )
  }

  const isRollDisabled = !!(user?.email && user.email.match(/u4cse25\d+/i)) || !!localStorage.getItem('candidate_roll')
  const timeCheck = selectedAssessment ? isAssessmentTimeWindowValid(selectedAssessment) : { valid: false, message: '' }

  // Metrics calculation
  const completedExams = pastSessions.filter(s => s.status === 'submitted').length;
  const activeExams = assessments.length;
  const avgIntegrity = completedExams > 0 ? Math.round(pastSessions.filter(s => s.status === 'submitted').reduce((acc, s) => acc + (s.integrity_score || 0), 0) / completedExams) : 100;
  
  return (
    <div className="min-h-screen bg-background text-foreground flex font-sans antialiased overflow-hidden relative">
      
      {/* 1. Ambient Background Layer */}
      <AmbientGlow />
      
      {/* 2. Moving Grain Noise Overlay */}
      <div className="grain-overlay opacity-30" />

      {/* ================= LEFT SIDEBAR ================= */}
      <aside className="w-64 h-screen bg-[#0a0a0a]/70 -2xl border-r border-transparent flex flex-col justify-between p-6 shrink-0 z-30 select-none shadow-2xl">
        <div className="space-y-8">
          
          {/* Header Brand & Theme Toggle */}
          <div className="flex items-center justify-between select-none">
            <div className="flex items-center space-x-2.5">
              <div className="p-1.5 sys-bg/80 border border-transparent rounded-xl shadow-[0_0_15px_rgba(91,140,255,0.15)]">
                <Shield className="w-4 h-4 text-[#5B8CFF]" strokeWidth={1.5} />
              </div>
              <div className="flex flex-col">
                <span className="font-bold text-xs tracking-wide text-white font-heading">ShieldAI</span>
                <span className="text-[7.5px] font-mono sys-text-body uppercase tracking-widest leading-none mt-0.5">Candidate</span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                onClick={handleSync}
                disabled={isSyncing}
                variant="ghost"
                size="icon"
                className="w-7 h-7 rounded-lg sys-text-body hover:text-white hover:hover:bg-[#1c1c1e]/80 transition"
                title="Sync Assessments"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin text-[#5B8CFF]' : ''}`} />
              </Button>
              <ThemeToggle />
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="flex flex-col gap-2">
            <button 
              onClick={() => setActiveTab('overview')}
              className={`flex items-center justify-between px-3 py-2.5 text-xs font-medium rounded-xl transition-all duration-300 ${activeTab === 'overview' ? 'bg-[#5B8CFF]/15 text-[#5B8CFF] border border-[#5B8CFF]/30 shadow-[0_0_15px_rgba(91,140,255,0.1)]' : 'sys-text-body hover:sys-text-primary hover:hover:bg-[#1c1c1e]/80 border border-transparent'}`}
            >
              <div className="flex items-center gap-2.5">
                <Home className="w-4 h-4" strokeWidth={1.5} />
                <span>Dashboard Home</span>
              </div>
              {activeTab === 'overview' && <ChevronRight className="w-3 h-3" strokeWidth={1.5} />}
            </button>

            <button 
              onClick={() => setActiveTab('lobby')}
              className={`flex items-center justify-between px-3 py-2.5 text-xs font-medium rounded-xl transition-all duration-300 ${activeTab === 'lobby' ? 'bg-[#5B8CFF]/15 text-[#5B8CFF] border border-[#5B8CFF]/30 shadow-[0_0_15px_rgba(91,140,255,0.1)]' : 'sys-text-body hover:sys-text-primary hover:hover:bg-[#1c1c1e]/80 border border-transparent'}`}
            >
              <div className="flex items-center gap-2.5">
                <LayoutGrid className="w-4 h-4" strokeWidth={1.5} />
                <span>Assessment Lobby</span>
              </div>
              {activeTab === 'lobby' && <ChevronRight className="w-3 h-3" strokeWidth={1.5} />}
            </button>

            <button 
              onClick={() => setActiveTab('history')}
              className={`flex items-center justify-between px-3 py-2.5 text-xs font-medium rounded-xl transition-all duration-300 ${activeTab === 'history' ? 'bg-[#5B8CFF]/15 text-[#5B8CFF] border border-[#5B8CFF]/30 shadow-[0_0_15px_rgba(91,140,255,0.1)]' : 'sys-text-body hover:sys-text-primary hover:hover:bg-[#1c1c1e]/80 border border-transparent'}`}
            >
              <div className="flex items-center gap-2.5">
                <History className="w-4 h-4" strokeWidth={1.5} />
                <span>Past Records</span>
              </div>
              {activeTab === 'history' && <ChevronRight className="w-3 h-3" strokeWidth={1.5} />}
            </button>
          </nav>
        </div>

        {/* Footer Profile & Logout */}
        <div className="space-y-4 pt-4 border-t border-transparent">
          <div className="flex items-center gap-3 px-1">
            <div className="p-2 sys-card border border-transparent rounded-xl">
              <User className="w-4 h-4 sys-text-body" strokeWidth={1.5} />
            </div>
            <div className="flex flex-col min-w-0">
              <span className="text-xs font-semibold text-white truncate font-heading">{user?.name || 'Candidate'}</span>
              <span className="text-[10px] sys-text-body font-mono truncate">{user?.email}</span>
            </div>
          </div>
          <Button 
            onClick={logout} 
            variant="outline" 
            className="w-full border-transparent sys-bg/40 hover:sys-card hover:border-white/20 sys-text-body hover:text-white text-xs h-9 justify-center cursor-pointer transition-all duration-300 rounded-xl shadow-none"
          >
            <LogOut className="w-3.5 h-3.5 mr-2" strokeWidth={1.5} />
            <span>Sign Out</span>
          </Button>
        </div>
      </aside>

      {/* ================= RIGHT MAIN CONTENT AREA ================= */}
      <main className="flex-1 h-screen overflow-y-auto bg-transparent p-8 md:p-12 z-10 relative custom-scrollbar">
        <div className="max-w-6xl w-full mx-auto animate-fade-in pb-12">
          
          {/* Section Breadcrumbs */}
          <div className="flex items-center justify-between select-none mb-8">
            <div className="flex items-center gap-2 text-[9px] font-mono sys-text-body uppercase tracking-widest">
              <span>CANDIDATE PANEL</span>
              <span>/</span>
              <span className="text-[#5B8CFF] font-bold">
                {activeTab === 'overview' ? 'DASHBOARD' : activeTab === 'lobby' ? 'LOBBY' : 'HISTORY'}
              </span>
              {activeTab === 'lobby' && selectedAssessment && (
                <>
                  <span>/</span>
                  <span className="text-muted">{selectedAssessment.title}</span>
                </>
              )}
            </div>
          </div>

          {/* ================= OVERVIEW TAB ================= */}
          {activeTab === 'overview' && (
            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
              {/* Hero Section */}
              <div className="p-8 rounded-3xl sys-bg border border-transparent  shadow-2xl relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-64 h-64 bg-[#5B8CFF]/10 rounded-full blur-[80px] -mr-16 -mt-16 transition-opacity group-hover:opacity-100 opacity-50" />
                <div className="relative z-10">
                  <h1 className="text-3xl font-heading font-extrabold text-white mb-2 tracking-tight">
                    Welcome back, <span className="text-transparent bg-clip-text sys-bg">{name.charAt(0).toUpperCase() + name.slice(1)}</span>
                  </h1>
                  <p className="text-sm sys-text-body max-w-xl leading-relaxed">
                    Access your secure assessment lobby, review past performance, and prepare for your upcoming scheduled evaluations.
                  </p>
                </div>
              </div>

              {/* Metrics Grid */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="p-6 rounded-2xl sys-bg/50 border border-transparent  flex flex-col gap-4 hover:-translate-y-1 hover:border-[#5B8CFF]/30 transition-all duration-300 group shadow-lg">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono font-bold sys-text-body uppercase tracking-widest">Completed</span>
                    <div className="p-2 rounded-lg bg-[#5B8CFF]/10 text-[#5B8CFF] group-hover:bg-[#5B8CFF]/20 transition-colors">
                      <CheckCircle2 className="w-4 h-4" strokeWidth={1.5} />
                    </div>
                  </div>
                  <div>
                    <div className="text-3xl font-heading font-bold text-white">{completedExams}</div>
                    <div className="text-xs sys-text-body mt-1">Total Exams Taken</div>
                  </div>
                </div>

                <div className="p-6 rounded-2xl sys-bg/50 border border-transparent  flex flex-col gap-4 hover:-translate-y-1 hover:border-[#5B8CFF]/20 transition-all duration-300 group shadow-lg">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono font-bold sys-text-body uppercase tracking-widest">Integrity Avg</span>
                    <div className="p-2 rounded-lg bg-[#5B8CFF]/10 text-[#5B8CFF] group-hover:bg-[#5B8CFF]/10 transition-colors">
                      <Shield className="w-4 h-4" strokeWidth={1.5} />
                    </div>
                  </div>
                  <div>
                    <div className="text-3xl font-heading font-bold text-white flex items-baseline gap-1">
                      {avgIntegrity} <span className="text-sm sys-text-body font-medium">%</span>
                    </div>
                    <div className="text-xs sys-text-body mt-1">Average Trust Score</div>
                  </div>
                </div>

                <div className="p-6 rounded-2xl sys-bg/50 border border-transparent  flex flex-col gap-4 hover:-translate-y-1 hover:border-[#5B8CFF]/20 transition-all duration-300 group shadow-lg">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono font-bold sys-text-body uppercase tracking-widest">Available</span>
                    <div className="p-2 rounded-lg bg-[#5B8CFF]/10 text-[#5B8CFF] group-hover:bg-[#5B8CFF]/10 transition-colors">
                      <Calendar className="w-4 h-4" strokeWidth={1.5} />
                    </div>
                  </div>
                  <div>
                    <div className="text-3xl font-heading font-bold text-white">{activeExams}</div>
                    <div className="text-xs sys-text-body mt-1">Pending Assessments</div>
                  </div>
                </div>
              </div>

              {/* Recent Activity */}
              <div className="space-y-4 pt-4">
                <div className="flex items-center gap-2 px-1 text-[10px] font-bold sys-text-body font-mono tracking-widest uppercase select-none">
                  <Activity className="w-4 h-4 sys-text-body" strokeWidth={1.5} /> Recent Activity
                </div>
                
                <div className="sys-bg/40 border border-transparent rounded-2xl p-6  shadow-lg">
                  {pastSessions.length > 0 ? (
                    <div className="space-y-6">
                      {pastSessions.slice(0, 3).map((s, idx) => (
                        <div key={s.id} className="flex gap-4 relative">
                          {idx !== pastSessions.slice(0, 3).length - 1 && (
                            <div className="absolute top-6 bottom-0 left-[15px] w-[1px] bg-white/10" />
                          )}
                          <div className="w-8 h-8 rounded-full sys-card border border-transparent flex items-center justify-center shrink-0 z-10">
                            {s.status === 'submitted' ? (
                              <Check className="w-4 h-4 text-[#5B8CFF]" strokeWidth={2} />
                            ) : (
                              <CircleDot className="w-4 h-4 text-[#5B8CFF]" strokeWidth={2} />
                            )}
                          </div>
                          <div className="flex-1 pb-1">
                            <h4 className="text-sm font-semibold sys-text-primary">{s.status === 'submitted' ? 'Completed Assessment' : 'Started Assessment'}</h4>
                            <p className="text-xs sys-text-body mt-1">ID: {s.assessment_id.slice(0,8).toUpperCase()} • {new Date(s.startedAt || 0).toLocaleString()}</p>
                            {s.status === 'submitted' && (
                              <div className="mt-2 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md sys-card border border-transparent text-[10px] font-mono">
                                <span className="sys-text-body">Score:</span>
                                <span className="text-white font-bold">{s.score} pts</span>
                                <span className="mx-1 sys-text-body">|</span>
                                <span className="sys-text-body">Trust:</span>
                                <span className="text-[#5B8CFF] font-bold">{s.integrity_score}%</span>
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="py-8 text-center sys-text-body text-xs font-mono">
                      No recent activity found.
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ================= LOBBY TAB ================= */}
          {activeTab === 'lobby' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start animate-in fade-in slide-in-from-bottom-4 duration-500">
              
              {/* Available Assessments */}
              <section className="lg:col-span-4 space-y-4">
                <div className="flex items-center gap-2 px-1 text-[10px] font-bold sys-text-body font-mono tracking-widest uppercase select-none">
                  <LayoutGrid className="w-4 h-4 sys-text-body" strokeWidth={1.5} /> Available Assessments
                </div>

                <div className="space-y-4 max-h-[600px] overflow-y-auto pr-2 custom-scrollbar">
                  {assessments.map((a) => {
                    const isActive = selectedAssessment?.id === a.id
                    const windowCheck = isAssessmentTimeWindowValid(a)
                    
                    return (
                      <div 
                        key={a.id} 
                        onClick={() => handleSelectAssessment(a)}
                        className={`p-5 rounded-2xl border text-left cursor-pointer transition-all duration-300 relative group overflow-hidden ${
                          isActive 
                            ? 'sys-bg/80 border-[#5B8CFF]/50 text-foreground shadow-[0_8px_30px_rgba(91,140,255,0.12)]  -translate-y-1' 
                            : 'sys-bg/30 border-transparent text-muted hover:border-white/20 hover:sys-card/50 '
                        }`}
                      >
                        {/* Purple accent border block */}
                        <div className={`absolute top-0 left-0 bottom-0 w-1 transition-all duration-300 ${
                          isActive ? 'bg-[#5B8CFF] shadow-[0_0_12px_rgba(91,140,255,0.8)]' : 'bg-transparent'
                        }`} />

                        <h3 className="font-bold text-sm text-white group-hover:text-[#5B8CFF] transition duration-300 font-heading pr-2">
                          {a.title}
                        </h3>
                        <p className="text-[11px] sys-text-body mt-2 line-clamp-2 leading-relaxed">
                          {a.description}
                        </p>

                        <div className="flex flex-wrap items-center gap-3 mt-5 pt-4 border-t border-transparent text-[9px] font-mono select-none">
                          <span className="flex items-center gap-1.5 sys-text-body font-bold sys-card px-2 py-1 rounded-md border border-transparent">
                            <Clock className="w-3.5 h-3.5 sys-text-body" strokeWidth={1.5} /> {a.duration} MINS
                          </span>
                          <span className={`px-2 py-1 rounded-md border text-[9px] font-bold ${
                            windowCheck.valid 
                              ? 'bg-[#5B8CFF]/10 text-[#5B8CFF] border-[#5B8CFF]/30 shadow-[0_0_10px_rgba(91,140,255,0.1)]' 
                              : 'sys-bg sys-text-body border-transparent'
                          }`}>
                            {windowCheck.valid ? 'OPEN SCHEDULE' : 'UNAVAILABLE'}
                          </span>
                        </div>
                      </div>
                    )
                  })}

                  {assessments.length === 0 && (
                    <div className="p-8 text-center sys-bg/40 border border-transparent  rounded-2xl text-xs sys-text-body font-mono select-none">
                      No active published assessments available in candidate registry.
                    </div>
                  )}
                </div>
              </section>

              {/* Details & Setup Form */}
              <section className="lg:col-span-8">
                {selectedAssessment ? (
                  <Card className="sys-bg border-transparent rounded-3xl shadow-2xl relative overflow-hidden ">
                    <div className="absolute top-0 left-0 right-0 h-1 sys-bg" />
                    
                    <CardHeader className="pb-5 border-b border-transparent select-none pt-8 px-8">
                      <CardTitle className="text-lg font-bold text-white flex items-center gap-3 font-heading">
                        <BookOpen className="w-5 h-5 text-[#5B8CFF]" strokeWidth={2} /> Assessment Preparation
                      </CardTitle>
                      <CardDescription className="text-xs sys-text-body mt-2">
                        You are launching: <span className="text-white font-bold hover:bg-[#1c1c1e]/80 px-2 py-1 rounded-md ml-1">{selectedAssessment.title}</span>
                      </CardDescription>
                    </CardHeader>
                    
                    <CardContent className="p-8 space-y-8">
                      
                      {errorMsg && (
                        <div className="text-xs sys-text-primary bg-[#F87171]/10 p-4 rounded-xl border border-[#F87171]/20 flex items-center space-x-3 animate-in fade-in zoom-in-95 duration-300">
                          <AlertCircle className="w-5 h-5 shrink-0 text-[#F87171]" strokeWidth={1.5} />
                          <span className="font-semibold leading-relaxed">{errorMsg}</span>
                        </div>
                      )}

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        {/* Identity parameters */}
                        <div className="space-y-5">
                          <div className="text-[10px] font-mono font-bold sys-text-body uppercase tracking-widest border-b border-transparent pb-2.5 flex items-center gap-2 select-none">
                            <User className="w-4 h-4 sys-text-body" strokeWidth={1.5} /> Identity Parameters
                          </div>
                          
                          <div className="space-y-4 pt-1">
                            {/* Name */}
                            <div className="sys-card/50 border border-transparent rounded-xl p-4 flex flex-col opacity-60 cursor-not-allowed">
                              <div className="flex items-center justify-between select-none">
                                <label className="text-[9px] font-mono font-bold sys-text-body uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                                  <User className="w-3 h-3" strokeWidth={1.5} /> Candidate Full Name (Locked)
                                </label>
                                <Lock className="w-3 h-3 sys-text-body" strokeWidth={1.5} />
                              </div>
                              <input 
                                type="text" 
                                value={name} 
                                readOnly
                                disabled
                                className="bg-transparent border-0 p-0 text-xs sys-text-primary focus:outline-none focus:ring-0 font-semibold cursor-not-allowed select-none"
                              />
                            </div>

                            {/* Email */}
                            <div className="sys-card/50 border border-transparent rounded-xl p-4 flex flex-col opacity-60 cursor-not-allowed">
                              <div className="flex items-center justify-between select-none">
                                <label className="text-[9px] font-mono font-bold sys-text-body uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                                  <Mail className="w-3 h-3" strokeWidth={1.5} /> Institutional Email
                                </label>
                                <Lock className="w-3 h-3 sys-text-body" strokeWidth={1.5} />
                              </div>
                              <input 
                                type="email" 
                                value={email} 
                                readOnly
                                disabled
                                className="bg-transparent border-0 p-0 text-xs sys-text-primary focus:outline-none focus:ring-0 font-semibold cursor-not-allowed select-none"
                              />
                            </div>

                            {/* Roll */}
                            <div className={`sys-card/50 border border-transparent rounded-xl p-4 flex flex-col transition-colors ${
                              isRollDisabled ? 'opacity-60 cursor-not-allowed border-transparent' : 'hover:border-white/20 focus-within:border-[#5B8CFF]/50 focus-within:ring-1 focus-within:ring-[#5B8CFF]/50 shadow-inner'
                            }`}>
                              <div className="flex items-center justify-between select-none">
                                <label className="text-[9px] font-mono font-bold sys-text-body uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                                  <Hash className="w-3 h-3" strokeWidth={1.5} /> Candidate Roll Number
                                </label>
                                {isRollDisabled && <Lock className="w-3 h-3 sys-text-body" strokeWidth={1.5} />}
                              </div>
                              <input 
                                type="text" 
                                value={rollNumber} 
                                onChange={(e) => setRollNumber(e.target.value.toUpperCase())} 
                                readOnly={isRollDisabled}
                                disabled={isRollDisabled}
                                className={`bg-transparent border-0 p-0 text-xs focus:outline-none focus:ring-0 font-mono font-bold ${
                                  isRollDisabled ? 'sys-text-body cursor-not-allowed select-none' : 'text-white placeholder:sys-text-body'
                                }`}
                                placeholder="U4CSE25XXX..." 
                              />
                            </div>
                          </div>
                        </div>

                        {/* Rules Checklist */}
                        <div className="space-y-5 flex flex-col">
                          <div className="text-[10px] font-mono font-bold sys-text-body uppercase tracking-widest border-b border-transparent pb-2.5 flex items-center gap-2 select-none">
                            <HelpCircle className="w-4 h-4 sys-text-body" strokeWidth={1.5} /> Proctor Rules Checklist
                          </div>

                          <div className="sys-card/40 border border-transparent p-5 rounded-xl sys-text-body text-[11.5px] space-y-4 flex-1 select-none leading-relaxed shadow-inner">
                            <div className="flex gap-3">
                              <CheckCircle2 className="w-4 h-4 text-[#5B8CFF] shrink-0 mt-0.5" strokeWidth={2} />
                              <p><strong>Timer Limits:</strong> A countdown of <span className="text-[#5B8CFF] font-bold font-number">{selectedAssessment.duration} minutes</span> runs globally. Automatic force-submission triggers upon expiry.</p>
                            </div>
                            <div className="flex gap-3">
                              <CheckCircle2 className="w-4 h-4 text-[#5B8CFF] shrink-0 mt-0.5" strokeWidth={2} />
                              <p><strong>Strict Sandbox Controls:</strong> Screen switching, tab changes, and minimizing window focus will immediately flag integrity score reductions.</p>
                            </div>
                            <div className="flex gap-3">
                              <CheckCircle2 className="w-4 h-4 text-[#5B8CFF] shrink-0 mt-0.5" strokeWidth={2} />
                              <p><strong>Hardware Lockouts:</strong> Copy-pasting code blocks and mouse right-clicks are intercepted and blocked inside the compiler panel.</p>
                            </div>
                            <div className="flex gap-3">
                              <CheckCircle2 className="w-4 h-4 text-[#5B8CFF] shrink-0 mt-0.5" strokeWidth={2} />
                              <p><strong>Optical Verification:</strong> Secure proctor networks utilize client media camera parameters for integrity audit monitors.</p>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Schedule details */}
                      <div className="p-5 sys-card/40 border border-transparent rounded-xl flex flex-col md:flex-row md:items-center justify-between text-xs gap-5 select-none shadow-inner">
                        <div className="space-y-1.5">
                          <p className="sys-text-body font-bold font-mono text-[9px] uppercase tracking-widest mb-2">Evaluation Window Scheduling limits</p>
                          <p className="sys-text-body flex items-center gap-2">
                            <span className="w-12 sys-text-body">Starts:</span> <span className="text-white font-semibold font-mono hover:bg-[#1c1c1e]/80 px-2 py-0.5 rounded">{new Date(selectedAssessment.start_time).toLocaleString()}</span>
                          </p>
                          <p className="sys-text-body flex items-center gap-2">
                            <span className="w-12 sys-text-body">Ends:</span> <span className="text-white font-semibold font-mono hover:bg-[#1c1c1e]/80 px-2 py-0.5 rounded">{new Date(selectedAssessment.end_time).toLocaleString()}</span>
                          </p>
                        </div>
                        <div className="text-right">
                          <span className={`inline-block px-4 py-2 rounded-xl border text-[10px] font-bold tracking-wide ${
                            timeCheck.valid 
                              ? 'bg-[#5B8CFF]/10 text-[#5B8CFF] border-[#5B8CFF]/30 shadow-[0_0_15px_rgba(91,140,255,0.1)]' 
                              : 'sys-bg sys-text-body border-transparent'
                          }`}>
                            {timeCheck.valid ? '● Assessment Schedule Active' : '● Assessment Window Closed'}
                          </span>
                        </div>
                      </div>

                      {/* Consent */}
                      <label className="flex items-start gap-4 p-5 bg-[#5B8CFF]/5 hover:bg-[#5B8CFF]/10 border border-[#5B8CFF]/20 rounded-xl cursor-pointer select-none transition-colors group">
                        <div className="relative flex items-center justify-center mt-0.5">
                          <input 
                            type="checkbox" 
                            checked={readInstructions} 
                            onChange={(e) => setReadInstructions(e.target.checked)} 
                            className="peer appearance-none w-5 h-5 rounded border border-[#5B8CFF]/50 sys-bg/50 checked:bg-[#5B8CFF] checked:border-[#5B8CFF] transition-all cursor-pointer" 
                          />
                          <Check className="absolute w-3.5 h-3.5 text-white opacity-0 peer-checked:opacity-100 pointer-events-none transition-opacity" strokeWidth={3} />
                        </div>
                        <span className="text-[11px] sys-text-body group-hover:sys-text-primary leading-relaxed font-sans transition-colors">
                          I acknowledge that I have read the security policies, consent to activation of my camera device, and understand that tab switching will log violations against my exam submission.
                        </span>
                      </label>

                      {/* Launch Button */}
                      <div className="flex justify-end pt-6 border-t border-transparent select-none">
                        <Button 
                          onClick={handleLaunchAssessment}
                          disabled={isSubmitting || !timeCheck.valid}
                          className={`h-12 px-8 rounded-xl font-bold text-sm tracking-wide transition-all duration-300 flex items-center gap-2.5 select-none shadow-lg ${
                            timeCheck.valid 
                              ? 'sys-bg hover:from-blue-500 hover:to-[#5B8CFF] text-white font-extrabold cursor-pointer active:scale-95 hover:shadow-[0_0_20px_rgba(91,140,255,0.4)]' 
                              : 'sys-card sys-text-body border border-transparent cursor-not-allowed shadow-none'
                          }`}
                        >
                          {isSubmitting ? (
                            <>
                              <Shield className="w-5 h-5 animate-spin text-white" strokeWidth={2} />
                              <span>Initializing Security Modules...</span>
                            </>
                          ) : (
                            <>
                              <span>Acknowledge & Launch Environment</span>
                              <Play className="w-4 h-4 fill-current text-white" strokeWidth={2} />
                            </>
                          )}
                        </Button>
                      </div>

                    </CardContent>
                  </Card>
                ) : (
                  <div className="h-[400px] flex flex-col gap-4 items-center justify-center border border-transparent rounded-3xl sys-bg/40  sys-text-body text-xs font-mono select-none">
                    <Search className="w-8 h-8 sys-text-body mb-2" strokeWidth={1} />
                    Please select an assessment path from the left lobby list.
                  </div>
                )}
              </section>

            </div>
          )}

          {/* ================= HISTORY TAB ================= */}
          {activeTab === 'history' && (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="flex items-center gap-2 px-1 text-[10px] font-bold sys-text-body font-mono tracking-widest uppercase select-none">
                <History className="w-4 h-4 sys-text-body" strokeWidth={1.5} /> Past Records & Submissions
              </div>
              
              <div className="sys-bg/50 border border-transparent rounded-2xl overflow-hidden  shadow-xl">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm whitespace-nowrap">
                    <thead className="sys-card border-b border-transparent">
                      <tr>
                        <th className="px-6 py-4 font-mono text-[10px] uppercase sys-text-body tracking-wider">Session ID</th>
                        <th className="px-6 py-4 font-mono text-[10px] uppercase sys-text-body tracking-wider">Assessment</th>
                        <th className="px-6 py-4 font-mono text-[10px] uppercase sys-text-body tracking-wider">Date</th>
                        <th className="px-6 py-4 font-mono text-[10px] uppercase sys-text-body tracking-wider">Status</th>
                        <th className="px-6 py-4 font-mono text-[10px] uppercase sys-text-body tracking-wider">Score</th>
                        <th className="px-6 py-4 font-mono text-[10px] uppercase sys-text-body tracking-wider">Integrity</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {pastSessions.length > 0 ? (
                        pastSessions.map(session => (
                          <tr key={session.id} className="hover:sys-table-row transition-colors">
                            <td className="px-6 py-4 font-mono text-xs sys-text-body">{session.id.slice(0, 8)}</td>
                            <td className="px-6 py-4 font-heading font-semibold sys-text-primary">{session.assessment_id.slice(0, 12)}...</td>
                            <td className="px-6 py-4 text-xs sys-text-body">{new Date(session.startedAt || 0).toLocaleDateString()}</td>
                            <td className="px-6 py-4">
                              <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider ${
                                session.status === 'submitted' 
                                  ? 'bg-[#5B8CFF]/10 text-[#5B8CFF] border border-[#5B8CFF]/20' 
                                  : 'bg-[#5B8CFF]/10 text-[#5B8CFF] border border-[#5B8CFF]/20'
                              }`}>
                                {session.status === 'submitted' ? 'Submitted' : 'Abandoned'}
                              </span>
                            </td>
                            <td className="px-6 py-4 font-mono font-bold text-white">{session.score || 0}</td>
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-2">
                                <div className="w-16 h-1.5 sys-card rounded-full overflow-hidden">
                                  <div 
                                    className={`h-full rounded-full ${session.integrity_score >= 80 ? 'bg-[#5B8CFF]' : session.integrity_score >= 50 ? 'bg-[#1c1c1e]' : 'bg-[#1c1c1e]'}`}
                                    style={{ width: `${session.integrity_score || 0}%` }}
                                  />
                                </div>
                                <span className="font-mono text-xs sys-text-body">{session.integrity_score}%</span>
                              </div>
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={6} className="px-6 py-12 text-center sys-text-body text-xs font-mono">
                            No past session records found.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

        </div>
      </main>

    </div>
  )
}