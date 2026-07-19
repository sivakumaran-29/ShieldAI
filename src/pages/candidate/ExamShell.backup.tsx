import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import Editor from '@monaco-editor/react'
import { 
  Terminal, Activity, EyeOff, AlertTriangle, RefreshCw, Trash2, Clock, ChevronRight,
  CornerDownRight, ChevronLeft, Lock
} from 'lucide-react'
import ThemeToggle from '../../components/ThemeToggle'
import { AmbientGlow } from '../../components/AmbientGlow'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { 
  fetchQuestions, fetchAssessments, saveCandidateSession, fetchCandidateSessions,
  evaluateCodeSnippet, simulateTerminalRun, CodingQuestion, Assessment, CandidateSession, QuestionSubmission
} from '../../lib/assessmentEngine'
import { useAuthStore } from '../../store/authStore'
import { getIceServers } from '../../lib/webrtcConfig'
import { supabase } from '../../lib/supabaseClient'
import { useSettingsStore } from '../../store/settingsStore'
import Latex from 'react-latex-next'

const StreamVideo = ({ stream }: { stream: MediaStream | null }) => {
  const videoRef = useRef<HTMLVideoElement>(null)
  
  useEffect(() => {
    if (videoRef.current && stream) {
      console.log('✔ Candidate Video Element Found')
      console.log('✔ Stream Attached', { id: stream.id, active: stream.active, tracks: stream.getVideoTracks().map(t => t.readyState) })
      
      const video = videoRef.current
      video.srcObject = stream
      
      // Explicitly set properties to bypass strict autoplay policies
      video.muted = true
      video.defaultMuted = true
      video.playsInline = true
      video.autoplay = true
      
      video.play().then(() => {
        console.log('✔ video.play() Successful')
        console.log('✔ Candidate Preview Visible', { width: video.videoWidth, height: video.videoHeight })
      }).catch(e => console.error('play() interrupted or autoplay blocked:', e))
    }
  }, [stream])

  return (
    <video 
      ref={videoRef}
      autoPlay 
      playsInline 
      muted 
      className="absolute inset-0 w-full h-full object-cover z-10" 
      style={{ transform: 'scaleX(-1)' }}
    />
  )
}

const codeTemplates: Record<string, string> = {
  python: `def solve():\n    # Read input from standard input\n    # Write your solution here\n    # For Example:\n    # nums = list(map(int, input().split(',')))\n    # target = int(input())\n    # print(two_sum(nums, target))\n    pass\n\nif __name__ == '__main__':\n    solve()`,
  javascript: `function solve() {\n    // Write your solution here\n    // Use console.log() to output results\n}\n\nsolve();`,
  java: `import java.util.Scanner;\n\npublic class Solution {\n    public static void main(String[] args) {\n        Scanner scanner = new Scanner(System.in);\n        // Write your solution here\n    }\n}`
}

export default function ExamShell() {
  const navigate = useNavigate()
  const { user } = useAuthStore()

  // Video/Proctoring Refs
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const lastFrameDataRef = useRef<ImageData | null>(null)
  const localStreamRef = useRef<MediaStream | null>(null)

  // System states
  const [assessment, setAssessment] = useState<Assessment | null>(null)
  const [questions, setQuestions] = useState<CodingQuestion[]>([])
  const [selectedQIndex, setSelectedQIndex] = useState(0)
  const [currentSession, setCurrentSession] = useState<CandidateSession | null>(null)
  const [loading, setLoading] = useState(true)

  // Editor states
  const [language, setLanguage] = useState('python')
  const [codeMap, setCodeMap] = useState<Record<string, Record<string, string>>>({}) // Maps qId -> { lang -> code }
  const [consoleOutput, setConsoleOutput] = useState('Sandbox compilation terminal ready. Awaiting local code execution...')
  const [isRunning, setIsRunning] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [testResults, setTestResults] = useState<any>(null)
  
  // Section Navigation States
  const [activePart, setActivePart] = useState<'menu' | 'mcq' | 'coding'>('menu')
  
  // Custom Terminal Execution
  const [customInput, setCustomInput] = useState('')
  const [terminalTab, setTerminalTab] = useState<'console' | 'testcases'>('console')
  const [reviewMarked, setReviewMarked] = useState<Record<string, boolean>>({})
  const [isSyncing, setIsSyncing] = useState(false)
  
  // Timer & warnings
  const [timeLeft, setTimeLeft] = useState(3600)
  const [timerAlert, setTimerAlert] = useState('')

  // Proctoring states
  const [integrityScore, setIntegrityScore] = useState(100)
  const [proctorLogs, setProctorLogs] = useState<string[]>([
    '[SYSTEM] Proctor encryption pipeline coupled.',
    '[SYSTEM] Optical scanning initialized.'
  ])
  const [isAnomalyActive, setIsAnomalyActive] = useState(false)
  const [anomalyType, setAnomalyType] = useState('')
  const [showWarningModal, setShowWarningModal] = useState(false)
  const [warningModalText, setWarningModalText] = useState('')
  const [localStream, setLocalStream] = useState<MediaStream | null>(null)
  
  // Platform Settings
  const settings = useSettingsStore()

  const hasMcqGlobal = questions.some(q => q.type === 'mcq')
  const hasCodingGlobal = questions.some(q => q.type !== 'mcq')
  const isSingleTypeExam = (hasMcqGlobal && !hasCodingGlobal) || (!hasMcqGlobal && hasCodingGlobal)

  const filteredQuestions = activePart === 'mcq'
    ? questions.filter(q => q.type === 'mcq')
    : activePart === 'coding'
      ? questions.filter(q => q.type !== 'mcq')
      : []

  const activeQuestion = filteredQuestions[selectedQIndex]

  const handleStartPart = (part: 'mcq' | 'coding') => {
    setActivePart(part)
    setSelectedQIndex(0)
    setTestResults(null)
    setConsoleOutput('Sandbox compilation terminal ready. Awaiting local code execution...')
  }

  const handleSubmitPart = async () => {
    if (!currentSession) return

    if (isSingleTypeExam) {
      handleFinishAssessment()
      return
    }

    if (window.confirm(`Submit Part: ${activePart.toUpperCase()}? You will not be able to return to this section.`)) {
      setLoading(true)
      const nextParts = [...(currentSession.completedParts || []), activePart as 'mcq' | 'coding']
      const updatedSession = { ...currentSession, completedParts: nextParts }
      await saveCandidateSession(updatedSession)
      setCurrentSession(updatedSession)
      setActivePart('menu')
      setLoading(false)
    }
  }



  // ==========================================
  // INITIALIZATION & LOADING
  // ==========================================
  useEffect(() => {
    async function loadAssessmentWorkspace() {
      try {
        const examId = localStorage.getItem('pending_exam_id')
        if (!examId || !user?.id) {
          navigate('/candidate')
          return
        }

        // Fetch assessment
        const assessments = await fetchAssessments()
        const matchAss = assessments.find(a => a.id === examId)
        if (!matchAss) {
          navigate('/candidate')
          return
        }

        const candidateBatch = user?.batch || 'CSE_C'
        const candidateDept = candidateBatch.split('_')[0]
        
        const target = matchAss.target_batch
        let isAllowed = false
        if (!target || target === 'ALL') {
          isAllowed = true
        } else if (target.startsWith('DEPT_')) {
          const targetDept = target.replace('DEPT_', '')
          if (targetDept === candidateDept) isAllowed = true
        } else if (target === candidateBatch) {
          isAllowed = true
        }

        if (!isAllowed) {
          alert('SECURITY VIOLATION: You are not authorized to participate in this exam batch.')
          navigate('/candidate')
          return
        }

        setAssessment(matchAss)
        
        // Fetch questions
        const questionsList = await fetchQuestions(examId)
        setQuestions(questionsList)

        // Load Session credentials
        const name = localStorage.getItem('candidate_name') || user.name || 'Candidate'
        const email = localStorage.getItem('candidate_email') || user.email || 'student@school.edu'
        const roll = email.split('@')[0].toUpperCase()

        // Check if there is an existing session
        const sessions = await fetchCandidateSessions(examId)
        const existing = sessions.find(s => s.student_id === user.id)

        // Calculate time left
        let startSecs = matchAss.duration * 60
        if (existing && existing.startedAt) {
          const elapsed = Math.floor((Date.now() - new Date(existing.startedAt).getTime()) / 1000)
          startSecs = Math.max(0, matchAss.duration * 60 - elapsed)
        }
        setTimeLeft(startSecs)

        let initialCodeMap: Record<string, Record<string, string>> = {}
        
        // Set up default codes or load from past session
        questionsList.forEach(q => {
          initialCodeMap[q.id] = {
            python: codeTemplates.python,
            javascript: codeTemplates.javascript,
            java: codeTemplates.java
          }

          if (existing?.submissions?.[q.id]) {
            const sub = existing.submissions[q.id]
            initialCodeMap[q.id][sub.language] = sub.code
          }
        })

        // Also check localStorage cache of code
        const cachedCode = localStorage.getItem(`code_cache_${examId}`)
        if (cachedCode) {
          try {
            const parsedCache = JSON.parse(cachedCode)
            Object.assign(initialCodeMap, parsedCache)
          } catch {
            // ignore
          }
        }

        setCodeMap(initialCodeMap)

        let sessionObj: CandidateSession
        if (existing) {
          sessionObj = {
            ...existing,
            status: 'testing'
          }
        } else {
          sessionObj = {
            id: 'session-' + crypto.randomUUID().slice(0, 8),
            assessment_id: examId,
            student_id: user.id,
            name,
            email,
            roll_number: roll,
            status: 'testing',
            score: 0,
            integrity_score: 100,
            violation_logs: ['[SYSTEM] Session initialized.'],
            submissions: {},
            completedParts: [],
            startedAt: new Date().toISOString(),
            submittedAt: '',
            updated_at: new Date().toISOString()
          }
        }

        setCurrentSession(sessionObj)
        setIntegrityScore(sessionObj.integrity_score)
        setProctorLogs(prev => [...prev, ...sessionObj.violation_logs.map(log => `[LOG] ${log}`)])
        
        // Save initial session
        await saveCandidateSession(sessionObj)

        // Single-type Assessment Auto-Routing
        const hasMcq = questionsList.some(q => q.type === 'mcq')
        const hasCoding = questionsList.some(q => q.type !== 'mcq')
        const completed = sessionObj.completedParts || []

        if (hasMcq && !hasCoding && !completed.includes('mcq')) {
          setActivePart('mcq')
        } else if (hasCoding && !hasMcq && !completed.includes('coding')) {
          setActivePart('coding')
        }

      } catch (err) {
        console.error('Failed to load exam workspace:', err)
        navigate('/candidate')
      } finally {
        setLoading(false)
        if (!document.fullscreenElement) {
          triggerWarningModal('Attention Required: Fullscreen mode is mandatory to begin the assessment.')
        }
      }
    }

    loadAssessmentWorkspace()
  }, [user, navigate])

  const getActiveCode = (): string => {
    if (!activeQuestion) return ''
    if (activeQuestion.type === 'mcq') {
      return currentSession?.mcq_submissions?.[activeQuestion.id] || ''
    }
    return codeMap[activeQuestion.id]?.[language] || codeTemplates[language] || ''
  }

  // Update code in map and save to cache
  const handleCodeChange = (val: string | undefined) => {
    if (!activeQuestion || !val) return
    const newCode = val
    
    setCodeMap(prev => {
      const updated = {
        ...prev,
        [activeQuestion.id]: {
          ...(prev[activeQuestion.id] || {}),
          [language]: newCode
        }
      }
      
      // Cache locally
      if (assessment) {
        localStorage.setItem(`code_cache_${assessment.id}`, JSON.stringify(updated))
      }
      return updated
    })
  }

  const handleSync = async () => {
    try {
      const examId = localStorage.getItem('pending_exam_id')
      if (!examId) return
      
      setIsSyncing(true)
      setTimerAlert('Syncing platform data...')
      
      const [assessments, questionsList] = await Promise.all([
        fetchAssessments(),
        fetchQuestions(examId)
      ])
      
      const matchAss = assessments.find(a => a.id === examId)
      if (matchAss) setAssessment(matchAss)
      if (questionsList) setQuestions(questionsList)
      
      setTimeout(() => setTimerAlert(''), 2000)
    } catch (error) {
      console.error('Failed to sync', error)
      setTimerAlert('Sync failed.')
      setTimeout(() => setTimerAlert(''), 2000)
    } finally {
      setIsSyncing(false)
    }
  }

  const buildSessionSnapshot = (): CandidateSession => {
    if (!currentSession || !assessment) throw new Error('Missing session context')

    const submissionRecords: Record<string, QuestionSubmission> = { ...currentSession.submissions }
    
    // Add current codes structure (ONLY for coding questions)
    const codingQuestions = questions.filter(q => q.type !== 'mcq')
    codingQuestions.forEach(q => {
      const qCode = codeMap[q.id]?.[language] || codeTemplates[language]
        
      if (!submissionRecords[q.id]) {
        submissionRecords[q.id] = {
          code: qCode,
          language: language,
          status: 'Not Attempted',
          cases_passed: 0,
          total_cases: q.test_cases?.length || 1,
          score: 0,
          execution_time: 0,
          memory_usage: 0
        }
      } else {
        // Update code contents
        submissionRecords[q.id].code = qCode
        submissionRecords[q.id].language = language
      }
    })

    // Recalculate average score
    // Recalculate average score
    let totalScore = 0
    let maxPossibleScore = 0
    questions.forEach(q => {
      if (q.type === 'mcq') {
        maxPossibleScore += (q.mcq_marks ?? 1)
        const mcqAns = currentSession.mcq_submissions?.[q.id]
        if (mcqAns && q.mcq_options && q.mcq_correct_index !== undefined) {
          if (mcqAns === q.mcq_options[q.mcq_correct_index]) {
            totalScore += (q.mcq_marks ?? 1)
          } else {
            totalScore -= (q.mcq_negative_marks ?? 0)
          }
        }
      } else {
        maxPossibleScore += 100
        totalScore += submissionRecords[q.id]?.score || 0
      }
    })
    const finalAvg = maxPossibleScore > 0 ? Math.max(0, Math.round((totalScore / maxPossibleScore) * 100)) : 0

    // Remove duplicates from logs
    const sanitizedLogs = Array.from(new Set(proctorLogs.map(l => l.replace(/^\[LOG\] |^\[SYSTEM\] /, ''))))

    return {
      ...currentSession,
      integrity_score: integrityScore,
      violation_logs: sanitizedLogs,
      submissions: submissionRecords,
      score: finalAvg,
      updated_at: new Date().toISOString()
    }
  }

  // ==========================================
  // COUNTDOWN CLOCK & DEADLINE VALIDATION
  // ==========================================
  useEffect(() => {
    if (loading || timeLeft <= 0) return

    const timer = setInterval(() => {
      setTimeLeft(prev => {
        const next = prev - 1
        
        // Alert warnings
        if (next === 300) {
          setTimerAlert('5 minutes remaining! Make sure to verify and run final solutions!')
        } else if (next === 120) {
          setTimerAlert('CRITICAL: 2 minutes remaining! Autosave locking active soon.')
        } else if (next === 60) {
          setTimerAlert('URGENT: 1 minute left! Forced code submission pipeline engaging.')
        }

        if (next <= 0) {
          clearInterval(timer)
          handleForceSubmission()
          return 0
        }

        return next
      })
    }, 1000)

    return () => clearInterval(timer)
  }, [loading, timeLeft])

  const formatTimerString = (totalSecs: number): string => {
    const hours = Math.floor(totalSecs / 3600)
    const minutes = Math.floor((totalSecs % 3600) / 60)
    const seconds = totalSecs % 60

    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
  }

  // ==========================================
  // COMPUTER VISION OPTICAL PROCTOR LOOP
  // ==========================================
  useEffect(() => {
    if (loading || !settings.requireCamera) return
    let streamInstance: MediaStream | null = null
    let animationFrameId: number

    async function startCameraProctor() {
      try {
        console.log('✔ Camera Permission Granted (Attempting getUserMedia)')
        streamInstance = await navigator.mediaDevices.getUserMedia({
          video: { width: 320, height: 240, frameRate: 10 }
        })
        console.log('✔ MediaStream Created')
        console.log('✔ MediaStream Active', streamInstance.active)
        
        localStreamRef.current = streamInstance
        setLocalStream(streamInstance)
        
        // Let the isolated StreamVideo handle the DOM binding
        processFrame()
      } catch (err) {
        logViolation('[SYSTEM] Camera media streams blocked or unavailable.')
      }
    }

    function processFrame() {
      const canvas = canvasRef.current
      if (!canvas || !localStreamRef.current) {
        animationFrameId = requestAnimationFrame(processFrame)
        return
      }
      
      const track = localStreamRef.current.getVideoTracks()[0]
      if (!track || track.readyState !== 'live') {
        animationFrameId = requestAnimationFrame(processFrame)
        return
      }

      // We need a hidden video element just to feed the canvas if we don't have direct access
      const video = document.getElementById('candidate-video') as HTMLVideoElement
      if (!video || video.paused || video.ended) {
        animationFrameId = requestAnimationFrame(processFrame)
        return
      }

      const ctx = canvas.getContext('2d', { willReadFrequently: true })
      if (!ctx) return

      ctx.drawImage(video, 0, 0, canvas.width, canvas.height)

      try {
        const currentFrame = ctx.getImageData(0, 0, canvas.width, canvas.height)
        if (lastFrameDataRef.current) {
          const prev = lastFrameDataRef.current.data
          const curr = currentFrame.data
          let diffSum = 0

          // sampling loop
          for (let i = 0; i < curr.length; i += 32) {
            diffSum += Math.abs(curr[i] - prev[i]) + Math.abs(curr[i+1] - prev[i+1]) + Math.abs(curr[i+2] - prev[i+2])
          }

          const norm = diffSum / (canvas.width * canvas.height)
          if (norm > 45) { // High movement threshold
            setIsAnomalyActive(true)
            setAnomalyType('Suspicious Behavioral Vector')
            logViolation('High motion variance detected. Candidate must remain centered.')
          } else {
            setIsAnomalyActive(false)
          }
        }
        lastFrameDataRef.current = currentFrame
      } catch {
        // ignore cross origin failures
      }

      animationFrameId = requestAnimationFrame(processFrame)
    }

    startCameraProctor()

    return () => {
      cancelAnimationFrame(animationFrameId)
      if (streamInstance) {
        streamInstance.getTracks().forEach(t => t.stop())
      }
      localStreamRef.current = null
    }
  }, [loading])

  // ==========================================
  // BEHAVIORAL INTERNALS / PROCTOR MONITORS
  // ==========================================
  useEffect(() => {
    if (loading) return

    const handleVisibilityChange = () => {
      if (document.hidden) {
        logViolation('Tab switched - Browser lost layout visibility.')
        triggerWarningModal('Focus Alert: Leaving the assessment interface is a violation. The system logs these activities for recruiter review.')
      }
    }

    const handleWindowBlur = () => {
      logViolation('Window focus lost - User engaged tools outside environment.')
      triggerWarningModal('Warning: Browser window focus lost. Keep your cursor inside the coding workspace.')
    }

    const handleFullscreenChange = () => {
      if (!document.fullscreenElement) {
        logViolation('Minimized or Fullscreen mode terminated.')
        triggerWarningModal('Attention Required: Enter Fullscreen mode again to maintain compliance.')
      }
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        e.key === 'F12' || 
        (e.ctrlKey && e.shiftKey && (e.key === 'I' || e.key === 'J' || e.key === 'C')) || 
        (e.ctrlKey && e.key === 'U')
      ) {
        e.preventDefault()
        logViolation('Attempted shortcut for Developer Tools or View Source.')
        triggerWarningModal('Prohibited Action: Inspect tools are restricted during execution.')
      }
    }

    const handleCopy = (e: ClipboardEvent) => {
      e.preventDefault()
      logViolation('Copy attempt intercepted.')
      triggerWarningModal('Restricted: Copy operations are disabled in this editor.')
    }

    const handlePaste = (e: ClipboardEvent) => {
      e.preventDefault()
      logViolation('Paste attempt intercepted.')
      triggerWarningModal('Restricted: Paste operations are disabled in this editor.')
    }

    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault()
      logViolation('Right click context menu attempt blocked.')
      triggerWarningModal('Restricted: Mouse context menu is disabled.')
    }

    if (settings.requireTabFocus) {
      document.addEventListener('visibilitychange', handleVisibilityChange)
      window.addEventListener('blur', handleWindowBlur)
    }
    document.addEventListener('fullscreenchange', handleFullscreenChange)
    window.addEventListener('keydown', handleKeyDown)
    document.addEventListener('copy', handleCopy)
    document.addEventListener('paste', handlePaste)
    document.addEventListener('contextmenu', handleContextMenu)

    return () => {
      if (settings.requireTabFocus) {
        document.removeEventListener('visibilitychange', handleVisibilityChange)
        window.removeEventListener('blur', handleWindowBlur)
      }
      document.removeEventListener('fullscreenchange', handleFullscreenChange)
      window.removeEventListener('keydown', handleKeyDown)
      document.removeEventListener('copy', handleCopy)
      document.removeEventListener('paste', handlePaste)
      document.removeEventListener('contextmenu', handleContextMenu)
    }
  }, [loading])

  // ==========================================
  // WEBRTC SIGNALING HANDSHAKE HOOKS
  // ==========================================
  useEffect(() => {
    if (loading || !user?.id || !assessment?.id) return

    const channelName = `webrtc_stream_${user.id}_${assessment.id}`
    console.log(`[WebRTC] Subscribing candidate to signaling channel: ${channelName}`)
    
    let pc: RTCPeerConnection | null = null
    const channel = supabase.channel(channelName)

    channel
      .on('broadcast', { event: 'request-connection' }, async () => {
        console.log('[WebRTC] Received connection query. Creating WebRTC PeerConnection...')
        
        const localStream = localStreamRef.current
        if (!localStream) {
          console.warn('[WebRTC] Local camera stream not yet ready. Ignoring connection request until camera is active.')
          return
        }

        if (pc) {
          pc.close()
        }

        const config = getIceServers()
        pc = new RTCPeerConnection(config)

        pc.onicecandidate = (event) => {
          if (event.candidate) {
            channel.send({
              type: 'broadcast',
              event: 'ice-candidate',
              payload: event.candidate
            })
          }
        }

        console.log('[WebRTC] Attaching local stream tracks to PC...')
        localStream.getTracks().forEach(track => pc?.addTrack(track, localStream))
        console.log('✔ Stream Sent to Admin')

        try {
          const offer = await pc.createOffer({ offerToReceiveVideo: false, offerToReceiveAudio: false })
          await pc.setLocalDescription(offer)
          
          channel.send({
            type: 'broadcast',
            event: 'offer',
            payload: offer
          })
        } catch (err) {
          console.error('[WebRTC] Failed creating offer SDP:', err)
        }
      })
      .on('broadcast', { event: 'answer' }, async ({ payload }) => {
        console.log('[WebRTC] Received SDP Answer from Recruiter.')
        if (pc) {
          try {
            await pc.setRemoteDescription(new RTCSessionDescription(payload))
          } catch (err) {
            console.error('[WebRTC] Failed setting remote answer SDP:', err)
          }
        }
      })
      .on('broadcast', { event: 'ice-candidate' }, async ({ payload }) => {
        if (pc) {
          try {
            await pc.addIceCandidate(new RTCIceCandidate(payload))
          } catch (err) {
            console.error('[WebRTC] Failed adding remote candidate:', err)
          }
        }
      })
      .subscribe()

    return () => {
      console.log('[WebRTC] Cleaning WebRTC channel connections...')
      channel.unsubscribe()
      if (pc) pc.close()
    }
  }, [loading, user, assessment])

  // ==========================================
  // PROCTORING LOGS LOGGER
  // ==========================================
  const logViolation = (message: string) => {
    const timestamp = new Date().toLocaleTimeString()
    const finalLog = `[ALERT - ${timestamp}] ${message}`
    
    setProctorLogs(prev => {
      // Avoid duplicate spam
      if (prev.length > 0 && prev[prev.length - 1].includes(message)) {
        return prev
      }
      return [...prev, finalLog]
    })

    // Reduce integrity score
    setIntegrityScore(prev => {
      const nextScore = Math.max(0, prev - 8)
      return nextScore
    })
  }

  const triggerWarningModal = (text: string) => {
    setWarningModalText(text)
    setShowWarningModal(true)
  }

  const enterFullscreen = () => {
    const elem = document.documentElement as any
    if (elem.requestFullscreen) {
      elem.requestFullscreen()
    }
    setShowWarningModal(false)
  }

  // ==========================================
  // NAVIGATION GUARD (BACK BUTTON & REFRESH/EXIT)
  // ==========================================
  useEffect(() => {
    if (loading) return

    // 1. Intercept beforeunload (page reload, close tab)
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault()
      e.returnValue = 'Warning: Leaving the assessment will result in progress loss. Are you sure?'
      return e.returnValue
    }
    window.addEventListener('beforeunload', handleBeforeUnload)

    // 2. Intercept popstate (browser back/forward button)
    window.history.pushState(null, '', window.location.href)
    
    const handlePopState = () => {
      window.history.pushState(null, '', window.location.href)
      logViolation('Attempted browser back/forward navigation.')
      triggerWarningModal('Restricted Navigation: Pressing the browser back/forward buttons during the assessment is disabled to prevent progress loss.')
    }
    
    window.addEventListener('popstate', handlePopState)

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload)
      window.removeEventListener('popstate', handlePopState)
    }
  }, [loading, currentSession, assessment])

  // ==========================================
  // CODE RUNNER AND SUBMIT COMPILER CONTROLS
  // ==========================================
  const handleResetCode = () => {
    if (!activeQuestion) return
    if (window.confirm('Reset code editor to initial solution template? Current drafts will be cleared.')) {
      handleCodeChange(codeTemplates[language])
    }
  }

  const handleRunCode = async () => {
    if (!activeQuestion) return
    setIsRunning(true)
    setTerminalTab('console')
    setConsoleOutput('Compiling code natively in sandbox cluster...\n')

    const codeToRun = getActiveCode()

    try {
      const response = await simulateTerminalRun(codeToRun, language, customInput)

      let output = `[Sandbox Status]: Execution complete.\n\n`
      if (response.error) {
        output += `[ERROR SUMMARY]: ${response.error}\n\n`
      }
      if (response.stderr) {
        output += `--- STDERR ---\n${response.stderr}\n\n`
      }
      if (response.stdout) {
        output += `--- STDOUT ---\n${response.stdout}\n`
      }
      
      setConsoleOutput(output)
      setTestResults(null) // hide test cases on native run
    } catch (err: any) {
      setConsoleOutput(`Runtime sandbox error compiled: ${err.message}`)
    } finally {
      setIsRunning(false)
    }
  }
  
  const handleMcqSelect = (index: number) => {
    if (!activeQuestion || activeQuestion.type !== 'mcq') return
    const selectedText = activeQuestion.mcq_options?.[index] || String(index)
    // Save selection temporarily to mcq_submissions with code = selectedText
    setCurrentSession(prev => {
      if (!prev) return null
      const nextMcqSubmissions = {
        ...(prev.mcq_submissions || {}),
        [activeQuestion.id]: selectedText
      }
      return { ...prev, mcq_submissions: nextMcqSubmissions }
    })
  }

  const handleSaveAndNext = () => {
    if (selectedQIndex < filteredQuestions.length - 1) {
      setSelectedQIndex(p => p + 1)
    }
  }

  const handleClearResponse = () => {
    if (!activeQuestion || activeQuestion.type !== 'mcq') return
    setCurrentSession(prev => {
      if (!prev) return null
      const nextMcqSubmissions = { ...prev.mcq_submissions }
      delete nextMcqSubmissions[activeQuestion.id]
      return { ...prev, mcq_submissions: nextMcqSubmissions }
    })
  }

  const handleSubmitQuestion = async () => {
    if (!activeQuestion) return
    setIsSubmitting(true)
    setTerminalTab('testcases')
    setConsoleOutput('Executing final evaluation against all test cases (hidden + public)...')
    setTestResults(null)

    const codeToSubmit = getActiveCode()

    try {
      const response = await evaluateCodeSnippet(
        codeToSubmit,
        language,
        activeQuestion.test_cases,
        settings.maxExecutionTime,
        settings.maxMemoryLimit
      )

      let passedCasesWeight = 0
      let totalCasesWeight = 0
      let passedCount = 0

      response.cases.forEach(c => {
        const originalCase = activeQuestion.test_cases.find(t => t.id === c.testCaseId)
        const weight = originalCase?.weight || 10
        totalCasesWeight += weight
        
        if (c.passed) {
          passedCasesWeight += weight
          passedCount++
        }
      })

      const scoreObtained = totalCasesWeight > 0 
        ? Math.round((passedCasesWeight / totalCasesWeight) * 100) 
        : 0

      const avgTime = Math.round(response.cases.reduce((acc, c) => acc + c.executionTimeMs, 0) / response.cases.length)
      const avgMem = Math.round(response.cases.reduce((acc, c) => acc + c.memoryUsageKb, 0) / response.cases.length)

      setConsoleOutput(
        `Final Verdict: ${response.verdict}\n` +
        `Passed Cases: ${passedCount} / ${response.cases.length}\n` +
        `Target Score obtained: ${scoreObtained}%\n` +
        `Average Time: ${avgTime}ms | Memory Usage: ${avgMem}KB\n` +
        `Compiler Details: ${response.compileMessage || 'None'}`
      )

      setTestResults({
        verdict: response.verdict,
        compileMessage: response.compileMessage,
        cases: response.cases,
        isSubmit: true,
        passedCount,
        totalCount: response.cases.length,
        score: scoreObtained
      })

      setCurrentSession(prev => {
        if (!prev) return null
        const nextSubmissions = {
          ...(prev.submissions || {}),
          [activeQuestion.id]: {
            code: codeToSubmit,
            language: language,
            status: response.verdict,
            cases_passed: passedCount,
            total_cases: response.cases.length,
            score: scoreObtained,
            execution_time: avgTime,
            memory_usage: avgMem
          }
        }
        return {
          ...prev,
          submissions: nextSubmissions
        }
      })
    } catch (err: any) {
      setConsoleOutput(`Compiler evaluation error: ${err.message || 'System crash.'}`)
    } finally {
      setIsSubmitting(false)
    }
  }

  // ==========================================
  // FINISH EXAM SUBMISSIONS SYSTEM
  // ==========================================
  const handleForceSubmission = async () => {
    console.log('[SYSTEM] Duration window expired. Automating sandbox freeze...')
    await executeSubmissionPipeline()
  }

  const handleFinishAssessment = async () => {
    if (window.confirm('Acknowledge and submit assessment? Check test case verdicts before finalizing.')) {
      await executeSubmissionPipeline()
    }
  }

  const executeSubmissionPipeline = async () => {
    if (!currentSession || !assessment) return
    setLoading(true)

    try {
      const finalSnapshot = buildSessionSnapshot()
      finalSnapshot.status = 'submitted'
      finalSnapshot.submittedAt = new Date().toISOString()
      finalSnapshot.updated_at = new Date().toISOString()

      // Zero-Cost Scalability: DB Storage Optimization
      if (finalSnapshot.integrity_score >= 90) {
        finalSnapshot.violation_logs = ['[TRUNCATED] High Integrity Auto-Prune']
      }

      // Kill camera streams
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach(t => t.stop())
      }
      localStreamRef.current = null

      const success = await saveCandidateSession(finalSnapshot)
      if (success) {
        localStorage.removeItem('pending_exam_id')
        // Clean cache
        localStorage.removeItem(`code_cache_${finalSnapshot.assessment_id}`)
        // Redirect back to dashboard to display completion card
        navigate('/candidate')
      } else {
        alert('Cloud sync failed. The browser has cached your results locally. You may exit the window safely.')
        navigate('/candidate')
      }
    } catch (err) {
      console.error(err)
      navigate('/candidate')
    }
  }

  if (loading || !assessment) {
    return (
      <div className="min-h-screen sys-bg flex items-center justify-center text-primary font-mono text-xs relative">
        <AmbientGlow />
        <div className="flex flex-col items-center gap-3 relative z-10">
          <RefreshCw className="w-6 h-6 animate-spin sys-text-body" />
          <span>Synchronizing Assessment Environment...</span>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen w-full flex flex-col font-sans antialiased overflow-hidden sys-bg text-foreground relative">
      
      {/* Ambient Background Layer */}
      <AmbientGlow />
      <div className="grain-overlay" />
      
      <div className="flex-1 flex flex-col z-10 relative">
      {/* EXAM PANEL HEADER */}
      <header className="px-6 py-3 flex items-center justify-between sticky top-0 z-50 border-b border-divider bg-card/65 ">
        <div className="flex items-center space-x-3 select-none">
          <div className="p-1 px-2 border rounded sys-bg/65 border-transparent text-primary flex items-center gap-1.5 font-bold tracking-tight text-[10px] font-mono">
            <Lock className="w-3.5 h-3.5 animate-pulse" strokeWidth={1.5} /> Protected Environment
          </div>
          <span className="font-bold text-xs tracking-wider uppercase font-mono text-muted hidden md:inline-block">
            {assessment.title}
          </span>
        </div>

        {/* TIMER ALERT */}
        {timerAlert && (
          <div className="hidden lg:flex items-center gap-2 p-1.5 px-3 sys-card border border-transparent rounded-xl sys-text-primary font-mono text-[9px] font-bold tracking-wide animate-pulse">
            <AlertTriangle className="w-4 h-4 text-primary shrink-0" strokeWidth={1.5} /> {timerAlert}
          </div>
        )}

        <div className="flex items-center space-x-4">
          {/* INTEGRITY SCALE */}
          <div className={`flex items-center space-x-2 border px-2.5 py-1 rounded ${
            integrityScore > 75 
              ? 'sys-bg border-transparent sys-text-primary' 
              : 'sys-card border-transparent text-primary animate-pulse'
          }`}>
            <Activity className="w-4 h-4" strokeWidth={1.5} />
            <span className="text-[10px] font-mono font-bold">INTEGRITY: {integrityScore}%</span>
          </div>

          {/* TIMER */}
          <div className={`p-1.5 px-3 border rounded text-xs font-mono font-bold ${
            timeLeft < 300 
              ? 'sys-card border-transparent text-primary animate-pulse' 
              : 'sys-bg border-transparent text-primary'
          }`}>
            <Clock className="w-3.5 h-3.5 inline mr-1.5" strokeWidth={1.5} />
            {formatTimerString(timeLeft)}
          </div>

          <Button
            onClick={handleSync}
            disabled={isSyncing}
            variant="outline"
            size="icon"
            className="w-8 h-8 rounded-lg sys-bg border-transparent sys-text-body hover:text-primary transition shadow-sm"
            title="Sync Latest Changes"
          >
            <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin text-[#5B8CFF]' : ''}`} />
          </Button>

          <ThemeToggle />

          {activePart === 'menu' ? (
            <Button 
              onClick={handleFinishAssessment} 
              className="bg-[#3f6ad5] hover:bg-[#3254a8] hover:shadow-[0_0_15px_rgba(63,106,213,0.6)] active:shadow-[0_0_8px_rgba(63,106,213,0.4)] text-primary font-extrabold px-4 h-8 rounded-xl text-xs tracking-wider cursor-pointer select-none active:scale-95 transition"
            >
              Submit Exam
            </Button>
          ) : (
            <Button 
              onClick={handleSubmitPart} 
              className="bg-emerald-600 hover:bg-emerald-500 text-primary font-extrabold px-4 h-8 rounded-xl text-xs tracking-wider cursor-pointer select-none active:scale-95 transition"
            >
              {isSingleTypeExam ? 'Final Submit' : 'Submit Section'}
            </Button>
          )}
        </div>
      </header>

      {/* CORE WORKSPACE GRID */}
      {activePart === 'menu' ? (
        <main className="flex-1 overflow-y-auto p-12 flex flex-col items-center justify-center animate-fade-in relative z-10">
          <div className="max-w-2xl w-full text-center space-y-6">
            <h1 className="text-3xl font-extrabold text-primary tracking-tight">Assessment Overview</h1>
            <p className="sys-text-body text-sm font-mono">Select a section to begin. Once a section is submitted, you cannot return to it.</p>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8">
              {/* Part 1: MCQ */}
              <div className={`p-8 border rounded-2xl flex flex-col items-center text-center transition ${
                currentSession?.completedParts?.includes('mcq') 
                  ? 'sys-bg/50 border-transparent opacity-60' 
                  : 'bg-card/60 border-divider hover:border-[#5B8CFF]/50 shadow-xl hover:-translate-y-1'
              }`}>
                <div className="w-12 h-12 bg-black rounded-full flex items-center justify-center mb-4 border border-transparent">
                  <span className="font-mono font-bold text-[#14B8A6]">P1</span>
                </div>
                <h3 className="text-lg font-bold text-primary mb-2">Multiple Choice</h3>
                <p className="text-xs sys-text-body mb-6 flex-1">Core conceptual knowledge and scenario analysis.</p>
                {currentSession?.completedParts?.includes('mcq') ? (
                  <Button disabled className="w-full sys-card sys-text-body font-bold">SUBMITTED</Button>
                ) : (
                  <Button onClick={() => handleStartPart('mcq')} className="w-full bg-[#3f6ad5] hover:bg-[#3254a8] hover:shadow-[0_0_15px_rgba(63,106,213,0.6)] active:shadow-[0_0_8px_rgba(63,106,213,0.4)] text-primary font-bold cursor-pointer transition">
                    START SECTION
                  </Button>
                )}
              </div>

              {/* Part 2: Coding */}
              <div className={`p-8 border rounded-2xl flex flex-col items-center text-center transition ${
                currentSession?.completedParts?.includes('coding') 
                  ? 'sys-bg/50 border-transparent opacity-60' 
                  : 'bg-card/60 border-divider hover:border-[#5B8CFF]/50 shadow-xl hover:-translate-y-1'
              }`}>
                <div className="w-12 h-12 bg-black rounded-full flex items-center justify-center mb-4 border border-transparent">
                  <span className="font-mono font-bold text-[#5B8CFF]">P2</span>
                </div>
                <h3 className="text-lg font-bold text-primary mb-2">Coding Challenges</h3>
                <p className="text-xs sys-text-body mb-6 flex-1">Algorithmic problem solving and secure logic implementation.</p>
                {currentSession?.completedParts?.includes('coding') ? (
                  <Button disabled className="w-full sys-card sys-text-body font-bold">SUBMITTED</Button>
                ) : (
                  <Button onClick={() => handleStartPart('coding')} className="w-full bg-[#3f6ad5] hover:bg-[#3254a8] hover:shadow-[0_0_15px_rgba(63,106,213,0.6)] active:shadow-[0_0_8px_rgba(63,106,213,0.4)] text-primary font-bold cursor-pointer transition">
                    START SECTION
                  </Button>
                )}
              </div>
            </div>

            {currentSession?.completedParts?.includes('mcq') && currentSession?.completedParts?.includes('coding') && (
              <div className="mt-8">
                <Button onClick={handleFinishAssessment} className="bg-emerald-600 hover:bg-emerald-500 text-primary font-extrabold px-8 h-12 rounded-xl tracking-widest text-sm shadow-lg animate-pulse">
                  FINALIZE EXAM
                </Button>
              </div>
            )}
          </div>
        </main>
      ) : (
      <main className="flex-1 grid grid-cols-1 lg:grid-cols-12 overflow-hidden h-[calc(100vh-57px)] animate-fade-in relative z-10">
        
        {/* LEFT COLUMN: Problem Description & Telemetry */}
        <section className={`p-5 flex flex-col space-y-4 overflow-y-auto border-r border-divider bg-card/30 ${activePart === 'mcq' ? 'lg:col-span-3' : 'lg:col-span-5'}`}>
          
          {/* QUESTION SELECTOR */}
          <div className="flex items-center justify-between border-b border-divider pb-3 select-none">
            <h3 className="text-[10px] font-bold font-mono tracking-widest text-muted uppercase">Part: {activePart === 'mcq' ? 'MCQ' : 'Coding'}</h3>
            <div className="flex items-center gap-1.5">
              <Button 
                variant="outline" 
                size="sm" 
                disabled={selectedQIndex === 0} 
                onClick={() => setSelectedQIndex(p => p - 1)}
                className="h-7 px-2 border border-divider bg-card/45 hover:sys-card"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </Button>
              <span className="text-[10px] font-mono font-bold px-2">
                {selectedQIndex + 1} / {filteredQuestions.length}
              </span>
              <Button 
                variant="outline" 
                size="sm" 
                disabled={selectedQIndex === filteredQuestions.length - 1} 
                onClick={() => setSelectedQIndex(p => p + 1)}
                className="h-7 px-2 border border-divider bg-card/45 hover:sys-card"
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </Button>
            </div>
          </div>

          <div className="py-2 flex gap-2">
            <Button onClick={handleSubmitPart} className="flex-1 bg-[#3f6ad5] hover:bg-[#3254a8] text-primary hover:shadow-[0_0_15px_rgba(63,106,213,0.6)] active:shadow-[0_0_8px_rgba(63,106,213,0.4)] border-none hover:shadow-[0_0_15px_rgba(63,106,213,0.6)] active:shadow-[0_0_8px_rgba(63,106,213,0.4)] text-[10px] font-mono tracking-widest uppercase transition h-8">
              {isSingleTypeExam ? 'Final Submit' : `Submit ${activePart === 'mcq' ? 'MCQ' : 'Coding'} Section`}
            </Button>
          </div>

          {activeQuestion ? (
            <div className="space-y-5 flex-1 flex flex-col">
              {activePart !== 'mcq' && (
                <>
                  <div>
                    <span className="px-2 py-0.5 rounded text-[9px] font-mono bg-background border border-divider text-muted font-bold uppercase tracking-wider">
                      DIFFICULTY: {activeQuestion.difficulty}
                    </span>
                    <h1 className="text-base font-extrabold tracking-tight mt-2.5 flex items-center gap-1.5 text-foreground">
                      <CornerDownRight className="w-4 h-4 sys-text-body" strokeWidth={1.5} /> <Latex>{activeQuestion.title || ''}</Latex>
                    </h1>
                  </div>

                  {/* Description */}
                  <div className="space-y-4 text-xs leading-relaxed text-muted font-sans whitespace-pre-wrap">
                    {activeQuestion.description}
                  </div>
                </>
              )}
              
              {activePart === 'mcq' && (
                <div className="mt-4 p-4 border border-divider bg-card/20 rounded-xl space-y-3">
                  <h4 className="text-[10px] font-mono font-bold text-foreground uppercase tracking-widest border-b border-divider pb-2">Question Navigator</h4>
                  <div className="flex flex-wrap gap-2">
                    {filteredQuestions.map((q, idx) => {
                      const isAnswered = currentSession?.submissions?.[q.id]?.code !== undefined
                      const isMarked = reviewMarked[q.id]
                      const isActive = selectedQIndex === idx
                      
                      let btnColor = 'sys-card sys-text-body border-divider hover:sys-card' // Unanswered default
                      if (isActive) btnColor = 'bg-foreground text-background border-foreground shadow-[0_0_10px_rgba(255,255,255,0.2)]'
                      else if (isMarked) btnColor = 'bg-yellow-500/10 text-yellow-500 border-yellow-500/30'
                      else if (isAnswered) btnColor = 'bg-[#5B8CFF]/15 text-[#5B8CFF] border-[#5B8CFF]/30'

                      return (
                        <button
                          key={q.id}
                          onClick={() => setSelectedQIndex(idx)}
                          className={`w-8 h-8 rounded border flex items-center justify-center text-[10px] font-mono font-bold transition-all ${btnColor}`}
                        >
                          {idx + 1}
                        </button>
                      )
                    })}
                  </div>
                  <div className="flex flex-wrap gap-x-4 gap-y-2 mt-2 pt-2 border-t border-divider/50 text-[9px] font-mono sys-text-body">
                    <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded bg-foreground"></div> Current</div>
                    <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded bg-[#5B8CFF]/60"></div> Answered</div>
                    <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded bg-yellow-500/60"></div> Review</div>
                    <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded sys-card"></div> Unanswered</div>
                  </div>
                </div>
              )}

              {activePart !== 'mcq' && (
                <>
                  {/* Tags */}
                  <div className="flex flex-wrap gap-1.5">
                    {activeQuestion.tags?.map((tag, idx) => (
                      <span key={idx} className="bg-background text-muted border border-divider text-[9px] px-2 py-0.5 rounded font-mono">
                        {tag}
                      </span>
                    ))}
                  </div>

                  {/* Constraints */}
                  <div className="p-4 rounded-xl border bg-card/40 border-divider">
                    <h4 className="text-[9px] font-mono font-bold text-foreground uppercase tracking-widest mb-1.5">Constraints</h4>
                    <pre className="text-xs leading-relaxed font-mono whitespace-pre-wrap sys-text-body">{activeQuestion.constraints}</pre>
                  </div>

                  {/* Format specs */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="p-3.5 rounded-xl border bg-card/40 border-divider">
                      <h4 className="text-[9px] font-mono font-bold text-muted uppercase tracking-wider mb-1">Input Format</h4>
                      <p className="text-[11px] sys-text-body">{activeQuestion.input_format}</p>
                    </div>
                    <div className="p-3.5 rounded-xl border bg-card/40 border-divider">
                      <h4 className="text-[9px] font-mono font-bold text-muted uppercase tracking-wider mb-1">Output Format</h4>
                      <p className="text-[11px] sys-text-body">{activeQuestion.output_format}</p>
                    </div>
                  </div>

                  {/* Samples */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
                    <div className="space-y-1.5 flex flex-col">
                      <span className="text-[9px] font-mono font-bold sys-text-body uppercase tracking-wider px-1">Sample Input</span>
                      <pre className="bg-background p-3 rounded border border-divider text-[11px] font-mono text-muted min-h-16 whitespace-pre-wrap">{activeQuestion.sample_input}</pre>
                    </div>
                    <div className="space-y-1.5 flex flex-col">
                      <span className="text-[9px] font-mono font-bold sys-text-body uppercase tracking-wider px-1">Sample Output</span>
                      <pre className="bg-background p-3 rounded border border-divider text-[11px] font-mono text-foreground min-h-16 whitespace-pre-wrap">{activeQuestion.sample_output}</pre>
                    </div>
                  </div>

                  {activeQuestion.explanation && (
                    <div className="text-[11px] sys-text-body leading-normal italic bg-background border border-divider p-3 rounded-xl">
                      <strong>Explanation:</strong> {activeQuestion.explanation}
                    </div>
                  )}
                </>
              )}
            </div>
          ) : (
            <div className="flex-1 flex items-center justify-center text-xs font-mono sys-text-body">
              No questions linked to assessment lobby.
            </div>
          )}

          {/* PROCTORING TELEMETRY SIDEBAR DRAWER */}
          <div className="pt-4 border-t border-divider grid grid-cols-1 md:grid-cols-2 gap-4">
            
            {/* Visual camera radar card */}
            <Card className="bg-background border-divider overflow-hidden relative shadow-none min-h-28 rounded-xl flex items-center justify-center">
              {isAnomalyActive && (
                <div className="absolute top-2 right-2 z-30 bg-[#EF4444] text-primary font-mono font-bold text-[8px] px-1.5 py-0.5 rounded flex items-center animate-bounce">
                  <EyeOff className="w-2.5 h-2.5 mr-1" strokeWidth={1.5} /> {anomalyType}
                </div>
              )}
              
              <div className="w-full h-28 relative overflow-hidden flex items-center justify-center sys-card rounded-lg">
                <div id="candidate-video-container" className="absolute inset-0 w-full h-full z-[100]">
                  {localStream && <StreamVideo stream={localStream} />}
                  <video id="candidate-video" className="hidden" playsInline muted autoPlay />
                </div>
                <canvas ref={canvasRef} width="160" height="120" className="hidden" />
                
                <div className="absolute inset-0 border border-divider pointer-events-none z-20">
                  <div className="absolute top-2 left-2 w-3.5 h-3.5 border-t border-l border-white/60" />
                  <div className="absolute top-2 right-2 w-3.5 h-3.5 border-t border-r border-white/60" />
                  <div className="absolute bottom-2 left-2 w-3.5 h-3.5 border-b border-l border-white/60" />
                  <div className="absolute bottom-2 right-2 w-3.5 h-3.5 border-b border-r border-white/60" />
                </div>
              </div>
            </Card>

            {/* Telemetry timeline logs */}
            <Card className="bg-card border-divider flex flex-col shadow-none overflow-hidden h-28 rounded-xl">
              <div className="bg-background border-b border-divider px-2.5 py-1.5 text-[8.5px] uppercase font-bold sys-text-body tracking-wider">
                Telemetry Log
              </div>
              <div className="p-2 font-mono text-[9px] space-y-1.5 overflow-y-auto flex-1 sys-text-body max-h-[80px]">
                {proctorLogs.slice(-20).map((log, idx) => (
                  <div key={idx} className={log.includes('ALERT') ? 'text-primary font-bold bg-[#EF4444]/15 border border-[#EF4444]/30 px-1 rounded' : 'sys-text-body'}>
                    {log}
                  </div>
                ))}
              </div>
            </Card>
          </div>
        </section>

        {/* RIGHT COLUMN: Code Workspace & Terminal or MCQ View */}
        <section className={`flex flex-col h-full overflow-hidden bg-background ${activePart === 'mcq' ? 'lg:col-span-9' : 'lg:col-span-7'}`}>
          
          {/* EDITOR SUB-HEADER */}
          {activeQuestion?.type !== 'mcq' && (
            <div className="px-4 py-2 flex items-center justify-between border-b border-divider bg-card">
              <span className="text-[10px] font-mono font-bold text-muted flex items-center gap-1.5 uppercase select-none">
                <Terminal className="w-3.5 h-3.5 sys-text-body" strokeWidth={1.5} /> Compiler Workspace Node
              </span>
              <div className="flex items-center gap-2 select-none">
                <select 
                  value={language} 
                  onChange={(e) => setLanguage(e.target.value)} 
                  className="border border-divider bg-background text-foreground rounded text-xs px-2 py-1 font-semibold outline-none cursor-pointer"
                >
                  {assessment.allowed_languages.includes('python') && settings.allowedLangs.includes('python') && <option value="python">Python 3.10</option>}
                  {assessment.allowed_languages.includes('javascript') && settings.allowedLangs.includes('javascript') && <option value="javascript">JavaScript (ES6)</option>}
                  {assessment.allowed_languages.includes('java') && settings.allowedLangs.includes('java') && <option value="java">Java (JDK 17)</option>}
                </select>
              </div>
            </div>
          )}

          {/* MONACO CODE EDITOR OR MCQ CONTAINER */}
          <div className="flex-1 min-h-0 bg-[#1e1e1e] relative overflow-y-auto">
            {activeQuestion ? (
              activeQuestion.type === 'mcq' ? (
                <div className="flex flex-col h-full">
                  <div className="flex-1 p-8 max-w-4xl mx-auto w-full space-y-6 overflow-y-auto pb-24">
                    
                    <div className="flex items-center gap-4 mb-4 border-b border-divider/50 pb-4 flex-wrap">
                      <h2 className="text-xl font-extrabold text-foreground font-sans">Question {selectedQIndex + 1}</h2>
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-background border border-divider text-muted font-bold uppercase tracking-wider">
                        DIFFICULTY: {activeQuestion.difficulty}
                      </span>
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-[#34D399]/10 border border-[#34D399]/30 text-[#34D399] font-bold uppercase tracking-wider">
                        MARKS: +{activeQuestion.mcq_marks ?? 1}
                      </span>
                      {(activeQuestion.mcq_negative_marks ?? 0) > 0 && (
                        <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-[#F87171]/10 border border-[#F87171]/30 text-[#F87171] font-bold uppercase tracking-wider">
                          NEGATIVE: -{activeQuestion.mcq_negative_marks}
                        </span>
                      )}
                    </div>

                    <h1 className="text-[17px] font-extrabold tracking-tight mt-2.5 mb-4 flex items-center gap-2 text-primary">
                      <CornerDownRight className="w-4 h-4 text-[#5B8CFF]" strokeWidth={2} /> <Latex>{activeQuestion.title || ''}</Latex>
                    </h1>
                    
                    <div className="text-[15px] leading-relaxed sys-text-primary font-sans whitespace-pre-wrap mb-8">
                      <Latex>{activeQuestion.description || ''}</Latex>
                    </div>

                    <div className="grid grid-cols-1 gap-4 mt-8">
                      {activeQuestion.mcq_options?.map((opt, idx) => {
                        const selectedVal = currentSession?.mcq_submissions?.[activeQuestion.id]
                        const isSelected = selectedVal === opt || selectedVal === String(idx)
                        return (
                          <button
                            key={idx}
                            onClick={() => handleMcqSelect(idx)}
                            className={`group w-full flex items-center text-left p-4 rounded-xl border transition-all duration-200 cursor-pointer ${
                              isSelected 
                                ? 'bg-[#5B8CFF]/[0.03] border-[#5B8CFF]/50 shadow-[0_0_15px_rgba(91,140,255,0.05)]' 
                                : 'bg-[#17181C] hover:bg-[#1C1E23] border-white/[0.04] hover:border-white/[0.08]'
                            }`}
                          >
                            <div className={`flex shrink-0 items-center justify-center w-7 h-7 rounded-full mr-4 font-bold font-mono text-[10px] border transition-all duration-200 ${
                              isSelected 
                                ? 'bg-[#5B8CFF] text-primary border-[#5B8CFF]' 
                                : 'bg-transparent text-[#8E93A5] border-border-strong group-hover:border-white/20 group-hover:text-primary'
                            }`}>
                              {String.fromCharCode(65 + idx)}
                            </div>
                            <span className={`text-[15px] font-sans leading-relaxed ${isSelected ? 'text-[#E2E8F0] font-medium' : 'text-[#94A3B8] group-hover:text-[#CBD5E1]'}`}>
                              <Latex>{opt || ''}</Latex>
                            </span>
                          </button>
                        )
                      })}
                    </div>
                  </div>

                  {/* BOTTOM ACTION BAR FOR MCQ */}
                  <div className="h-20 bg-card border-t border-divider flex items-center justify-between px-8 absolute bottom-0 left-0 right-0 z-20 shadow-[0_-10px_30px_rgba(0,0,0,0.5)]">
                    <div className="flex items-center gap-3">
                      <Button 
                        onClick={handleClearResponse}
                        variant="outline"
                        className="h-10 px-5 text-xs font-mono font-bold bg-background sys-text-body border-divider hover:sys-card hover:text-primary uppercase tracking-widest"
                      >
                        Clear Response
                      </Button>
                      <Button 
                        onClick={() => setReviewMarked(prev => ({ ...prev, [activeQuestion.id]: !prev[activeQuestion.id] }))}
                        variant="outline"
                        className={`h-10 px-5 text-xs font-mono font-bold uppercase tracking-widest transition ${reviewMarked[activeQuestion.id] ? 'bg-yellow-500/20 text-yellow-500 border-yellow-500/30' : 'bg-background sys-text-body border-divider hover:sys-card hover:text-primary'}`}
                      >
                        {reviewMarked[activeQuestion.id] ? 'Unmark Review' : 'Mark for Review'}
                      </Button>
                    </div>
                    
                    <div className="flex items-center gap-3">
                      <Button 
                        onClick={() => setSelectedQIndex(p => p - 1)}
                        disabled={selectedQIndex === 0}
                        variant="outline"
                        className="h-10 px-5 text-xs font-mono font-bold bg-background sys-text-body border-divider hover:sys-card hover:text-primary uppercase tracking-widest disabled:opacity-30"
                      >
                        Previous
                      </Button>
                      <Button 
                        onClick={handleSaveAndNext}
                        disabled={selectedQIndex === filteredQuestions.length - 1}
                        className="h-10 px-6 text-xs font-mono font-bold bg-[#3f6ad5] hover:bg-[#3254a8] hover:shadow-[0_0_15px_rgba(63,106,213,0.6)] active:shadow-[0_0_8px_rgba(63,106,213,0.4)] text-primary uppercase tracking-widest shadow-lg"
                      >
                        Save & Next <ChevronRight className="w-4 h-4 ml-2" />
                      </Button>
                    </div>
                  </div>
                </div>
              ) : (
                <Editor 
                  height="100%" 
                  language={language === 'java' ? 'java' : language === 'javascript' ? 'javascript' : 'python'} 
                  theme="vs-dark"
                  value={getActiveCode()} 
                  onChange={handleCodeChange}
                  options={{ 
                    fontSize: 13, 
                    minimap: { enabled: false }, 
                    automaticLayout: true,
                    fontFamily: 'Consolas, monaco, monospace',
                    lineNumbers: 'on',
                    cursorBlinking: 'smooth',
                    tabSize: 4,
                    insertSpaces: true
                  }} 
                />
              )
            ) : (
              <div className="h-full flex items-center justify-center text-xs font-mono sys-text-body bg-black">
                Load a problem set to begin typing code...
              </div>
            )}
          </div>

          {/* SPLIT CONSOLE PANEL */}
          {activeQuestion?.type !== 'mcq' && (
            <div className="h-64 flex flex-col border-t border-divider bg-card">
              {/* Control Bar */}
              <div className="px-4 py-2 flex items-center justify-between text-xs border-b border-divider bg-card/40 select-none">
                <div className="flex items-center gap-4">
                  <button 
                    onClick={() => setTerminalTab('console')}
                    className={`flex items-center uppercase font-mono tracking-wider font-bold text-[9px] pb-1 border-b-2 transition ${terminalTab === 'console' ? 'text-[#14B8A6] border-[#14B8A6]' : 'sys-text-body border-transparent hover:sys-text-body'}`}
                  >
                    <Terminal className="w-3.5 h-3.5 mr-2" strokeWidth={1.5} /> Console Output
                  </button>
                  <button 
                    onClick={() => setTerminalTab('testcases')}
                    className={`flex items-center uppercase font-mono tracking-wider font-bold text-[9px] pb-1 border-b-2 transition ${terminalTab === 'testcases' ? 'text-[#14B8A6] border-[#14B8A6]' : 'sys-text-body border-transparent hover:sys-text-body'}`}
                  >
                    Custom Test Case Input
                  </button>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    onClick={handleResetCode} 
                    variant="outline" 
                    size="sm"
                    className="h-6 text-[9px] font-bold font-mono border border-divider bg-background hover:sys-card px-2.5 rounded text-muted hover:text-foreground"
                  >
                    <RefreshCw className="w-3 h-3 mr-1" strokeWidth={1.5} /> RESET TEMPLATE
                  </Button>
                  <Button
                    onClick={() => setConsoleOutput('Execution console reports cleared.')} 
                  variant="outline" 
                  size="sm"
                  className="h-6 text-[9px] font-bold font-mono border border-divider bg-background hover:sys-card px-2.5 rounded text-muted hover:text-foreground"
                >
                  <Trash2 className="w-3.5 h-3.5 mr-1" strokeWidth={1.5} /> CLEAR OUTPUT
                </Button>
                <Button 
                  onClick={handleRunCode} 
                  disabled={isRunning || isSubmitting} 
                  className="sys-card hover:sys-card text-[#14B8A6] border border-[#14B8A6]/35 font-bold h-6 px-3 text-[9px] font-mono tracking-wider active:scale-95 transition rounded-xl cursor-pointer"
                >
                  {isRunning ? 'RUNNING...' : 'RUN CODE'}
                </Button>
                <Button 
                  onClick={handleSubmitQuestion} 
                  disabled={isRunning || isSubmitting} 
                  className="bg-[#3f6ad5] hover:bg-[#3254a8] hover:shadow-[0_0_15px_rgba(63,106,213,0.6)] active:shadow-[0_0_8px_rgba(63,106,213,0.4)] text-primary font-extrabold h-6 px-3.5 text-[9px] font-mono tracking-wider active:scale-95 transition rounded-xl cursor-pointer"
                >
                  {isSubmitting ? 'EVALUATING...' : 'SUBMIT CODE'}
                </Button>
              </div>
            </div>

            {/* PRE-OUTPUT DIAGNOSTICS & VERDICTS */}
            <div className="flex-1 flex overflow-hidden">
              
              {terminalTab === 'testcases' && (
                <div className="w-64 border-r border-divider p-3 bg-card/80 flex flex-col">
                  <span className="text-[9px] font-mono sys-text-body uppercase mb-2 font-bold tracking-widest">Custom STDIN Input</span>
                  <textarea 
                    value={customInput}
                    onChange={(e) => setCustomInput(e.target.value)}
                    className="flex-1 sys-bg border border-transparent rounded p-2 text-[10px] font-mono sys-text-primary focus:outline-none focus:border-[#5B8CFF]/50 resize-none"
                    placeholder="Enter custom input for 'Run Code' here..."
                  />
                </div>
              )}

              <pre className="flex-1 p-4 font-mono text-[10px] sys-text-body overflow-y-auto whitespace-pre-wrap leading-relaxed select-text bg-black/10">
                {consoleOutput}
              </pre>

              {/* Case Verdict Sidebar */}
              {testResults && (
                <div className="w-64 border-l border-divider p-3 bg-[#050507]/60 overflow-y-auto max-h-full space-y-2 select-none">
                  <div className="text-[9px] font-mono font-bold sys-text-body uppercase tracking-widest border-b border-divider pb-1 flex items-center justify-between">
                    <span>{testResults.isSubmit ? 'Final Verdict' : 'Run Verdict'}</span>
                    <span className={`px-1.5 py-0.5 rounded text-[8px] font-extrabold ${
                      testResults.verdict === 'Accepted' ? 'sys-card border border-transparent text-primary' : 'sys-bg border border-divider sys-text-body animate-pulse'
                    }`}>{testResults.verdict}</span>
                  </div>

                  {testResults.isSubmit && (
                    <div className="text-[10px] sys-text-body space-y-0.5 border-t border-divider pt-1.5">
                      <div>Score Obtained: <span className="text-primary font-bold font-mono">{testResults.score}%</span></div>
                      <div>Passed Cases: <span className="text-primary font-bold font-mono">{testResults.passedCount} / {testResults.totalCount}</span></div>
                    </div>
                  )}

                  <div className="space-y-1.5 pt-1.5 border-t border-divider">
                    {testResults.cases?.map((c: any, index: number) => (
                      <div key={index} className="p-2 bg-background border border-divider rounded text-[9px] flex flex-col space-y-1 font-mono">
                        <div className="flex justify-between items-center">
                          <span className="sys-text-body font-bold">Case #{index + 1}</span>
                          <span className={`p-3 rounded-xl border text-[10px] ${
                            c.passed ? 'sys-card text-primary border-transparent' : 'bg-input shadow-inner shadow-black/20 sys-text-body border-divider'
                          }`}>
                            {c.verdict}
                          </span>
                        </div>
                        <div className="sys-text-body truncate max-w-full">Input: {c.input?.replace(/\n/g, ' ')}</div>
                        <div className="sys-text-body truncate max-w-full">Expected: {c.expected}</div>
                        <div className="sys-text-body truncate max-w-full font-bold">Actual: {c.actual || '(None)'}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              </div>
            </div>
          )}
        </section>
 
      </main>
      )}
      </div>
 
      {/* WARNING POPUP SCREEN */}
      {showWarningModal && (
        <div className="fixed inset-0 bg-black/90  flex items-center justify-center z-[9000] p-4">
          <Card className="w-full max-w-md bg-card border border-divider p-6 text-center shadow-none relative rounded-2xl">
            <div className="absolute top-0 left-0 right-0 h-[3px] bg-[#EF4444]" />
            <AlertTriangle className="w-12 h-12 text-[#EF4444] mx-auto mb-4 animate-bounce" strokeWidth={1.5} />
            <h3 className="text-base font-bold text-foreground tracking-tight uppercase font-mono">Workspace Violation Alert</h3>
            <p className="text-xs text-muted mt-2.5 leading-relaxed">
              {warningModalText}
            </p>
            <div className="mt-6 flex flex-col gap-2">
              <Button 
                onClick={enterFullscreen} 
                className="w-full bg-[#3f6ad5] hover:bg-[#3254a8] hover:shadow-[0_0_15px_rgba(63,106,213,0.6)] active:shadow-[0_0_8px_rgba(63,106,213,0.4)] text-primary font-extrabold text-xs h-10 rounded-xl cursor-pointer"
              >
                Re-enter Secure Fullscreen Mode
              </Button>
              <p className="text-[10px] sys-text-body font-mono mt-2 select-none">
                Multiple infractions will negatively affect your overall assessment score metrics.
              </p>
            </div>
          </Card>
        </div>
      )}
 
    </div>
  )
}