import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import Editor from '@monaco-editor/react'
import { 
  Terminal, Activity, EyeOff, AlertTriangle, RefreshCw, Trash2, Clock, ChevronRight,
  CornerDownRight, ChevronLeft, Lock
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { 
  fetchQuestions, fetchAssessments, saveCandidateSession, fetchCandidateSessions,
  evaluateCodeSnippet, CodingQuestion, Assessment, CandidateSession, QuestionSubmission
} from '../../lib/assessmentEngine'
import { useAuthStore } from '../../store/authStore'
import { getIceServers } from '../../lib/webrtcConfig'
import { supabase } from '../../lib/supabaseClient'

const codeTemplates: Record<string, string> = {
  python: `def solve():\n    # Read input from standard input\n    # Write your solution here\n    # For Example:\n    # nums = list(map(int, input().split(',')))\n    # target = int(input())\n    # print(two_sum(nums, target))\n    pass\n\nif __name__ == '__main__':\n    solve()`,
  javascript: `function solve() {\n    // Write your solution here\n    // Use console.log() to output results\n}\n\nsolve();`,
  java: `import java.util.Scanner;\n\npublic class Solution {\n    public static void main(String[] args) {\n        Scanner scanner = new Scanner(System.in);\n        // Write your solution here\n    }\n}`
}

export default function ExamShell() {
  const navigate = useNavigate()
  const { user } = useAuthStore()

  // Video/Proctoring Refs
  const videoRef = useRef<HTMLVideoElement>(null)
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
  const editorTheme = 'vs-dark' as string
  const [codeMap, setCodeMap] = useState<Record<string, Record<string, string>>>({}) // Maps qId -> { lang -> code }
  const [consoleOutput, setConsoleOutput] = useState('Sandbox compilation terminal ready. Awaiting local code execution...')
  const [isRunning, setIsRunning] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [testResults, setTestResults] = useState<any>(null)
  
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

  const activeQuestion = questions[selectedQIndex]

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
        setAssessment(matchAss)
        
        // Fetch questions
        const questionsList = await fetchQuestions(examId)
        setQuestions(questionsList)

        // Load Session credentials
        const name = localStorage.getItem('candidate_name') || user.name || 'Candidate'
        const email = localStorage.getItem('candidate_email') || user.email || 'student@school.edu'
        const roll = localStorage.getItem('candidate_roll') || ''

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

  // Get Code for current question/language
  const getActiveCode = (): string => {
    if (!activeQuestion || !codeMap[activeQuestion.id]) return ''
    return codeMap[activeQuestion.id][language] || codeTemplates[language] || ''
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

  // ==========================================
  // AUTOSAVE SEQUENCE
  // ==========================================
  useEffect(() => {
    if (loading || !currentSession || !assessment) return

    const autosaveTimer = setInterval(async () => {
      const syncSession = buildSessionSnapshot()
      console.log('[Autosave] Syncing exam progress state...')
      await saveCandidateSession(syncSession)
    }, 20000) // every 20 seconds

    return () => clearInterval(autosaveTimer)
  }, [loading, currentSession, assessment, codeMap, language, integrityScore, proctorLogs])

  const buildSessionSnapshot = (): CandidateSession => {
    if (!currentSession || !assessment) throw new Error('Missing session context')

    const submissionRecords: Record<string, QuestionSubmission> = { ...currentSession.submissions }
    
    // Add current codes structure
    questions.forEach(q => {
      const qCode = codeMap[q.id]?.[language] || codeTemplates[language]
      if (!submissionRecords[q.id]) {
        submissionRecords[q.id] = {
          code: qCode,
          language: language,
          status: 'Not Attempted',
          cases_passed: 0,
          total_cases: q.test_cases.length,
          score: 0,
          execution_time: 0,
          memory_usage: 0
        }
      } else {
        // Just update code contents
        submissionRecords[q.id].code = qCode
        submissionRecords[q.id].language = language
      }
    })

    // Recalculate average score
    let totalScore = 0
    questions.forEach(q => {
      totalScore += submissionRecords[q.id]?.score || 0
    })
    const finalAvg = Math.round(totalScore / questions.length)

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
        
        // Alert warnings at 5, 2, and 1 minutes
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
    if (loading) return
    let streamInstance: MediaStream | null = null
    let animationFrameId: number

    async function startCameraProctor() {
      try {
        streamInstance = await navigator.mediaDevices.getUserMedia({
          video: { width: 320, height: 240, frameRate: 10 }
        })
        localStreamRef.current = streamInstance
        if (videoRef.current) {
          videoRef.current.srcObject = streamInstance
          videoRef.current.onloadedmetadata = () => {
            processFrame()
          }
        }
      } catch (err) {
        logViolation('[SYSTEM] Camera media streams blocked or unavailable.')
      }
    }

    function processFrame() {
      const video = videoRef.current
      const canvas = canvasRef.current
      if (!video || !canvas) return

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

    // 1. Tab switches (visibility)
    const handleVisibilityChange = () => {
      if (document.hidden) {
        logViolation('Tab switched - Browser lost layout visibility.')
        triggerWarningModal('Focus Alert: Leaving the assessment interface is a violation. The system logs these activities for recruiter review.')
      }
    }

    // 2. Focus loss
    const handleWindowBlur = () => {
      logViolation('Window focus lost - User engaged tools outside environment.')
      triggerWarningModal('Warning: Browser window focus lost. Keep your cursor inside the coding workspace.')
    }

    // 3. Fullscreen check
    const handleFullscreenChange = () => {
      if (!document.fullscreenElement) {
        logViolation('Minimized or Fullscreen mode terminated.')
        triggerWarningModal('Attention Required: Enter Fullscreen mode again to maintain compliance.')
      }
    }

    // 4. Keyboard Shortcuts for DevTools
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

    // 5. Copy/paste intercepts
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

    // 6. Right click intercept
    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault()
      logViolation('Right click context menu attempt blocked.')
      triggerWarningModal('Restricted: Mouse context menu is disabled.')
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    window.addEventListener('blur', handleWindowBlur)
    document.addEventListener('fullscreenchange', handleFullscreenChange)
    window.addEventListener('keydown', handleKeyDown)
    document.addEventListener('copy', handleCopy)
    document.addEventListener('paste', handlePaste)
    document.addEventListener('contextmenu', handleContextMenu)

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      window.removeEventListener('blur', handleWindowBlur)
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
        
        if (pc) {
          pc.close()
        }

        const config = getIceServers()
        pc = new RTCPeerConnection(config)

        const localStream = localStreamRef.current
        if (localStream) {
          console.log('[WebRTC] Attaching local stream tracks to PC...')
          localStream.getTracks().forEach(track => {
            pc?.addTrack(track, localStream)
          })
        } else {
          console.warn('[WebRTC] Local camera stream not available to attach.')
        }

        pc.onicecandidate = (event) => {
          if (event.candidate) {
            channel.send({
              type: 'broadcast',
              event: 'ice-candidate',
              payload: event.candidate
            })
          }
        }

        pc.onconnectionstatechange = () => {
          console.log(`[WebRTC] Connection state changed: ${pc?.connectionState}`)
        }

        try {
          const offer = await pc.createOffer()
          await pc.setLocalDescription(offer)
          channel.send({
            type: 'broadcast',
            event: 'offer',
            payload: offer
          })
        } catch (offerErr) {
          console.error('[WebRTC] Failed to create SDP offer:', offerErr)
        }
      })
      .on('broadcast', { event: 'answer' }, async ({ payload }) => {
        if (!pc) return
        try {
          await pc.setRemoteDescription(new RTCSessionDescription(payload))
        } catch (descErr) {
          console.error('[WebRTC] Failed to set remote description answer:', descErr)
        }
      })
      .on('broadcast', { event: 'ice-candidate' }, async ({ payload }) => {
        if (!pc) return
        try {
          await pc.addIceCandidate(new RTCIceCandidate(payload))
        } catch (iceErr) {
          console.error('[WebRTC] Failed to add remote ICE candidate:', iceErr)
        }
      })
      .subscribe()

    return () => {
      console.log('[WebRTC] Cleaning up candidate signaling channel...')
      channel.unsubscribe()
      if (pc) {
        pc.close()
      }
    }
  }, [loading, user?.id, assessment?.id])

  const logViolation = (message: string) => {
    const now = new Date().toLocaleTimeString()
    const logItem = `[${now}] ALERT: ${message}`
    
    let updatedLogs: string[] = []
    setProctorLogs(prev => {
      // Avoid spamming consecutive identical warnings
      if (prev[prev.length - 1] === logItem) {
        updatedLogs = prev
        return prev
      }
      updatedLogs = [...prev, logItem]
      return updatedLogs
    })
    
    let updatedScore = 100
    setIntegrityScore(prev => {
      updatedScore = Math.max(0, prev - 4)
      return updatedScore
    })

    // Immediately push telemetry violation state to Supabase in real-time
    if (currentSession && assessment) {
      setTimeout(async () => {
        const sanitizedLogs = Array.from(new Set(updatedLogs.map(l => l.replace(/^\[LOG\] |^\[SYSTEM\] /, ''))))
        const syncSession = {
          ...currentSession,
          integrity_score: updatedScore,
          violation_logs: sanitizedLogs,
          updated_at: new Date().toISOString()
        }
        await saveCandidateSession(syncSession)
      }, 100)
    }
  }

  const triggerWarningModal = (text: string) => {
    setWarningModalText(text)
    setShowWarningModal(true)
  }

  const enterFullscreen = () => {
    const elem = document.documentElement
    if (elem.requestFullscreen) {
      elem.requestFullscreen().catch(() => {})
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
  // CODE RUNNER CORE
  // ==========================================
  const handleRunCode = async () => {
    if (!activeQuestion) return
    setIsRunning(true)
    setConsoleOutput('Checking syntax structures against compiler sandboxes...')
    setTestResults(null)

    const codeToRun = getActiveCode()
    
    // Filter only public cases
    const publicCases = activeQuestion.test_cases.filter(c => c.is_public)

    try {
      const response = await evaluateCodeSnippet(
        codeToRun,
        language,
        publicCases,
        activeQuestion.time_limit,
        activeQuestion.memory_limit
      )

      setConsoleOutput(
        `Execution Status: ${response.verdict}\n` +
        `Compiler Message: ${response.compileMessage || 'Success'}\n\n` +
        `Ran ${response.cases.length} Public Test Cases.\n`
      )
      
      setTestResults({
        verdict: response.verdict,
        compileMessage: response.compileMessage,
        cases: response.cases,
        isSubmit: false
      })
    } catch (err: any) {
      setConsoleOutput(`Runtime sandbox error compiled: ${err.message}`)
    } finally {
      setIsRunning(false)
    }
  }

  const handleSubmitQuestion = async () => {
    if (!activeQuestion) return
    setIsSubmitting(true)
    setConsoleOutput('Executing final evaluation against all test cases (hidden + public)...')
    setTestResults(null)

    const codeToSubmit = getActiveCode()

    try {
      const response = await evaluateCodeSnippet(
        codeToSubmit,
        language,
        activeQuestion.test_cases,
        activeQuestion.time_limit,
        activeQuestion.memory_limit
      )

      // Calculate score for this question based on case weights
      let passedCasesWeight = 0
      let totalCasesWeight = 0
      let passedCount = 0

      response.cases.forEach(c => {
        // Find matching original test case for weights
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

      // Get avg execution metrics
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

      // Write submission immediately into local states
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

        let totalS = 0
        questions.forEach(q => {
          totalS += nextSubmissions[q.id]?.score || 0
        })
        const newAvg = Math.round(totalS / questions.length)

        return {
          ...prev,
          submissions: nextSubmissions,
          score: newAvg,
          updated_at: new Date().toISOString()
        }
      })

    } catch (err: any) {
      setConsoleOutput(`System evaluation transaction failed: ${err.message}`)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleResetCode = () => {
    if (!activeQuestion) return
    const defaultVal = codeTemplates[language] || ''
    handleCodeChange(defaultVal)
    setConsoleOutput('Editor reset to default language template.')
  }

  // ==========================================
  // FINAL SUBMIT & TERMINATIONS
  // ==========================================
  const handleFinishAssessment = async () => {
    if (window.confirm('Are you sure you want to finish the assessment? This will lock all submissions.')) {
      await finalizeAndSubmitResult()
    }
  }

  const handleForceSubmission = async () => {
    logViolation('Time limits expired. Force-submission initiated.')
    await finalizeAndSubmitResult()
  }

  const finalizeAndSubmitResult = async () => {
    setLoading(true)
    try {
      const finalSnapshot = buildSessionSnapshot()
      finalSnapshot.status = 'submitted'
      finalSnapshot.submittedAt = new Date().toISOString()
      
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
      <div className="min-h-screen bg-[#07090e] flex items-center justify-center text-sky-400 font-mono text-sm">
        <div className="flex flex-col items-center gap-3">
          <RefreshCw className="w-8 h-8 animate-spin text-sky-400" />
          <span>Synchronizing Assessment Environment...</span>
        </div>
      </div>
    )
  }

  return (
    <div className={`min-h-screen w-full flex flex-col font-sans antialiased overflow-hidden ${
      editorTheme === 'light' ? 'bg-[#f8fafc] text-neutral-900' : 'bg-[#04060a] text-neutral-200'
    }`}>
      
      {/* EXAM PANEL HEADER */}
      <header className={`px-4 py-3 flex items-center justify-between sticky top-0 z-50 border-b ${
        editorTheme === 'light' ? 'bg-white border-neutral-200 shadow-sm' : 'bg-[#090e18]/80 border-sky-950/40 backdrop-blur-xl'
      }`}>
        <div className="flex items-center space-x-3 select-none">
          <div className="p-1 px-2 border rounded-lg bg-sky-950/20 border-sky-950 text-sky-400 flex items-center gap-1.5 font-bold tracking-tight text-xs">
            <Lock className="w-3.5 h-3.5 animate-pulse" /> Protected Environment
          </div>
          <span className="font-extrabold text-sm tracking-tight hidden md:inline-block">
            {assessment.title}
          </span>
        </div>

        {/* TIMER ALERT FLASHER */}
        {timerAlert && (
          <div className="hidden lg:flex items-center gap-2 p-1.5 px-3 bg-red-950/30 border border-red-900/40 rounded-xl text-red-500 font-mono text-[10px] font-bold tracking-wide animate-pulse">
            <AlertTriangle className="w-4 h-4 fill-current" /> {timerAlert}
          </div>
        )}

        <div className="flex items-center space-x-3">

          {/* INTEGRITY INDEX STATUS */}
          <div className={`flex items-center space-x-2 border px-2.5 py-1 rounded-lg ${
            integrityScore > 75 
              ? 'bg-emerald-950/20 border-emerald-950/30 text-emerald-400' 
              : 'bg-red-950/20 border-red-950/30 text-red-400 animate-pulse'
          }`}>
            <Activity className="w-4 h-4" />
            <span className="text-xs font-mono font-bold">Integrity: {integrityScore}%</span>
          </div>

          {/* TIMER */}
          <div className={`p-1.5 px-3 border rounded-lg text-xs font-mono font-black ${
            timeLeft < 300 
              ? 'bg-red-950/50 border-red-500/30 text-red-400 animate-pulse' 
              : editorTheme === 'light' 
                ? 'bg-neutral-100 border-neutral-200 text-neutral-700' 
                : 'bg-sky-950/25 border-sky-950/60 text-sky-400'
          }`}>
            <Clock className="w-3.5 h-3.5 inline mr-1.5" />
            {formatTimerString(timeLeft)}
          </div>

          <Button 
            onClick={handleFinishAssessment} 
            className="bg-emerald-600 hover:bg-emerald-500 text-neutral-950 font-black px-4 h-8 rounded-lg text-xs tracking-wider cursor-pointer select-none active:scale-95"
          >
            Submit Exam
          </Button>
        </div>
      </header>

      {/* CORE WORKSPACE GRID */}
      <main className="flex-1 grid grid-cols-1 lg:grid-cols-12 overflow-hidden h-[calc(100vh-57px)] animate-fade-in">
        
        {/* LEFT COLUMN: Problem descriptions (5 grid size) */}
        <section className={`lg:col-span-5 p-4 flex flex-col space-y-4 overflow-y-auto border-r ${
          editorTheme === 'light' ? 'bg-white border-neutral-200' : 'bg-[#080d14]/70 border-sky-950/30'
        }`}>
          {/* QUESTION SWITCHER */}
          <div className="flex items-center justify-between border-b border-sky-900/10 pb-3 select-none">
            <h3 className="text-xs font-bold font-mono tracking-widest text-sky-500 uppercase">Question Playlist</h3>
            <div className="flex items-center gap-1">
              <Button 
                variant="outline" 
                size="sm" 
                disabled={selectedQIndex === 0} 
                onClick={() => setSelectedQIndex(p => p - 1)}
                className={`h-7 px-2 border ${
                  editorTheme === 'light' ? 'border-neutral-200' : 'border-sky-950/30 bg-sky-950/5'
                }`}
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </Button>
              <span className="text-xs font-mono font-bold px-2">
                {selectedQIndex + 1} / {questions.length}
              </span>
              <Button 
                variant="outline" 
                size="sm" 
                disabled={selectedQIndex === questions.length - 1} 
                onClick={() => setSelectedQIndex(p => p + 1)}
                className={`h-7 px-2 border ${
                  editorTheme === 'light' ? 'border-neutral-200' : 'border-sky-950/30 bg-sky-950/5'
                }`}
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </Button>
            </div>
          </div>

          {activeQuestion ? (
            <div className="space-y-5 flex-1 flex flex-col">
              <div>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-sky-950/30 border border-sky-900/30 text-sky-400 font-bold uppercase tracking-wider">
                  Difficulty: {activeQuestion.difficulty}
                </span>
                <h1 className="text-lg font-extrabold tracking-tight mt-2 flex items-center gap-1.5">
                  <CornerDownRight className="w-4 h-4 text-sky-500" /> {activeQuestion.title}
                </h1>
              </div>

              {/* Problem description text */}
              <div className="space-y-4 text-sm leading-relaxed text-neutral-400 font-sans whitespace-pre-wrap">
                {activeQuestion.description}
              </div>

              {/* Tag badges */}
              <div className="flex flex-wrap gap-1.5">
                {activeQuestion.tags.map((tag, idx) => (
                  <span key={idx} className="bg-neutral-800/40 text-neutral-400 border border-neutral-800 text-[10px] px-2 py-0.5 rounded-md font-mono">
                    {tag}
                  </span>
                ))}
              </div>

              {/* Constraints */}
              <div className={`p-4 rounded-2xl border ${
                editorTheme === 'light' ? 'bg-neutral-50 border-neutral-200' : 'bg-neutral-900/20 border-neutral-900/40'
              }`}>
                <h4 className="text-xs font-mono font-bold text-sky-400 uppercase tracking-widest mb-1.5">Constraints</h4>
                <pre className="text-xs leading-relaxed font-mono whitespace-pre-wrap text-neutral-450">{activeQuestion.constraints}</pre>
              </div>

              {/* Input format & Output format */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className={`p-3.5 rounded-2xl border ${
                  editorTheme === 'light' ? 'bg-neutral-50 border-neutral-200' : 'bg-neutral-900/20 border-neutral-900/40'
                }`}>
                  <h4 className="text-[10px] font-mono font-bold text-sky-450 uppercase tracking-wider mb-1">Input Format</h4>
                  <p className="text-xs text-neutral-450">{activeQuestion.input_format}</p>
                </div>
                <div className={`p-3.5 rounded-2xl border ${
                  editorTheme === 'light' ? 'bg-neutral-50 border-neutral-200' : 'bg-neutral-900/20 border-neutral-900/40'
                }`}>
                  <h4 className="text-[10px] font-mono font-bold text-sky-450 uppercase tracking-wider mb-1">Output Format</h4>
                  <p className="text-xs text-neutral-450">{activeQuestion.output_format}</p>
                </div>
              </div>

              {/* Samples */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
                <div className="space-y-1.5 flex flex-col">
                  <span className="text-[10px] font-mono font-bold text-sky-450 uppercase tracking-wider px-1">Sample Input</span>
                  <pre className="bg-[#030508] p-3 rounded-xl border border-sky-950/20 text-xs font-mono text-sky-300 min-h-16 whitespace-pre-wrap">{activeQuestion.sample_input}</pre>
                </div>
                <div className="space-y-1.5 flex flex-col">
                  <span className="text-[10px] font-mono font-bold text-sky-450 uppercase tracking-wider px-1">Sample Output</span>
                  <pre className="bg-[#030508] p-3 rounded-xl border border-sky-950/20 text-xs font-mono text-emerald-400 min-h-16 whitespace-pre-wrap">{activeQuestion.sample_output}</pre>
                </div>
              </div>

              {activeQuestion.explanation && (
                <div className="text-xs text-neutral-450 leading-relaxed italic bg-sky-950/5 border border-sky-950/20 p-3 rounded-xl">
                  <strong>Explanation:</strong> {activeQuestion.explanation}
                </div>
              )}
            </div>
          ) : (
            <div className="flex-1 flex items-center justify-center text-xs font-mono text-neutral-500">
              No questions linked to dashboard assessment.
            </div>
          )}

          {/* PROCTOR LOGS AND CAMERA DRAWER (AT BOTTOM OF SPEC PANEL) */}
          <div className="pt-4 border-t border-sky-900/10 grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Visual camera card */}
            <Card className="bg-[#030508] border-sky-950/40 overflow-hidden relative shadow-none min-h-28">
              {isAnomalyActive && (
                <div className="absolute top-2 right-2 z-30 bg-red-650 text-white font-mono font-bold text-[8px] px-1.5 py-0.5 rounded flex items-center animate-bounce">
                  <EyeOff className="w-2.5 h-2.5 mr-1" /> {anomalyType}
                </div>
              )}
              
              <div className="w-full h-28 relative overflow-hidden flex items-center justify-center">
                <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover transform -scale-x-100" />
                <canvas ref={canvasRef} width="160" height="120" className="hidden" />
                
                <div className="absolute inset-0 border-2 border-sky-500/10 pointer-events-none z-20">
                  <div className="absolute top-2 left-2 w-3 h-3 border-t-2 border-l-2 border-sky-400" />
                  <div className="absolute top-2 right-2 w-3 h-3 border-t-2 border-r-2 border-sky-400" />
                  <div className="absolute bottom-2 left-2 w-3 h-3 border-b-2 border-l-2 border-sky-400" />
                  <div className="absolute bottom-2 right-2 w-3 h-3 border-b-2 border-r-2 border-sky-400" />
                </div>
              </div>
            </Card>

            {/* Proctor Alert Timeline log */}
            <Card className="bg-[#030508] border-sky-950/40 flex flex-col shadow-none overflow-hidden h-28">
              <div className="bg-neutral-900 px-2 py-1 text-[9px] uppercase font-bold text-neutral-400 tracking-wider">
                Telemetry Log
              </div>
              <div className="p-2 font-mono text-[9px] space-y-1.5 overflow-y-auto flex-1 text-neutral-500 max-h-[80px]">
                {proctorLogs.slice(-20).map((log, idx) => (
                  <div key={idx} className={log.includes('ALERT') ? 'text-red-400 font-bold bg-red-950/20 px-1 rounded' : 'text-neutral-500'}>
                    {log}
                  </div>
                ))}
              </div>
            </Card>
          </div>
        </section>

        {/* RIGHT COLUMN: Monaco editor & execution console (7 grid size) */}
        <section className={`lg:col-span-7 flex flex-col h-full overflow-hidden ${
          editorTheme === 'light' ? 'bg-[#f1f5f9]' : 'bg-[#090e18]'
        }`}>
          {/* EDITOR MENUS */}
          <div className={`px-4 py-2 flex items-center justify-between border-b ${
            editorTheme === 'light' ? 'bg-white border-neutral-200' : 'bg-neutral-950 border-sky-950/30'
          }`}>
            <span className="text-[11px] font-mono font-bold text-neutral-400 flex items-center gap-1.5 uppercase">
              <Terminal className="w-3.5 h-3.5 text-sky-500" /> Sandbox workspace compilation node
            </span>
            <div className="flex items-center gap-2 select-none">
              <select 
                value={language} 
                onChange={(e) => setLanguage(e.target.value)} 
                className={`border rounded-lg text-xs px-2 py-1 font-semibold cursor-pointer outline-none ${
                  editorTheme === 'light' 
                    ? 'border-neutral-200 bg-white text-neutral-700' 
                    : 'border-sky-950/50 bg-[#0c1423] text-sky-305'
                }`}
              >
                {assessment.allowed_languages.includes('python') && <option value="python">Python 3.10</option>}
                {assessment.allowed_languages.includes('javascript') && <option value="javascript">JavaScript (ES6)</option>}
                {assessment.allowed_languages.includes('java') && <option value="java">Java (JDK 17)</option>}
              </select>
            </div>
          </div>

          {/* MONACO CODE EDITOR ENVIRONMENT */}
          <div className="flex-1 min-h-0 bg-[#1e1e1e]">
            {activeQuestion ? (
              <Editor 
                height="100%" 
                language={language === 'java' ? 'java' : language === 'javascript' ? 'javascript' : 'python'} 
                theme={editorTheme === 'vs-dark' ? 'vs-dark' : 'light'} 
                value={getActiveCode()} 
                onChange={handleCodeChange}
                options={{ 
                  fontSize: 13, 
                  minimap: { enabled: false }, 
                  automaticLayout: true,
                  fontFamily: 'Consolas, monaco, monospace',
                  theme: editorTheme === 'vs-dark' ? 'vs-dark' : 'light',
                  lineNumbers: 'on',
                  cursorBlinking: 'smooth',
                  tabSize: 4,
                  insertSpaces: true
                }} 
              />
            ) : (
              <div className="h-full flex items-center justify-center text-xs font-mono text-neutral-500 bg-neutral-950">
                Load a problem set to begin typing code...
              </div>
            )}
          </div>

          {/* SPLIT TRAY: RUNTIME TEST CASES AND CONSOLE OUTPUT */}
          <div className={`h-56 flex flex-col border-t ${
            editorTheme === 'light' ? 'bg-white border-neutral-200' : 'bg-neutral-950 border-sky-950/40'
          }`}>
            {/* Console Output bar */}
            <div className={`px-4 py-2.5 flex items-center justify-between text-xs border-b select-none ${
              editorTheme === 'light' ? 'bg-neutral-100 border-neutral-200' : 'bg-neutral-900 border-sky-950/30'
            }`}>
              <span className="flex items-center text-neutral-450 uppercase font-mono tracking-wider font-bold text-[10px]"><Terminal className="w-3.5 h-3.5 mr-2 text-sky-500" /> Execution Console Terminal</span>
              <div className="flex items-center gap-2">
                <Button 
                  onClick={handleResetCode} 
                  variant="outline" 
                  size="sm"
                  className={`h-6 text-[10px] border px-2.5 font-bold ${
                    editorTheme === 'light' ? 'border-neutral-200' : 'border-sky-950/30 bg-sky-950/5'
                  }`}
                >
                  <RefreshCw className="w-3 h-3 mr-1" /> Reset Code
                </Button>
                <Button 
                  onClick={() => setConsoleOutput('Execution console reports cleared.')} 
                  variant="outline" 
                  size="sm"
                  className={`h-6 text-[10px] border px-2.5 font-bold ${
                    editorTheme === 'light' ? 'border-neutral-200' : 'border-sky-950/30 bg-sky-950/5'
                  }`}
                >
                  <Trash2 className="w-3.5 h-3.5 mr-1" /> Clear Output
                </Button>
                <Button 
                  onClick={handleRunCode} 
                  disabled={isRunning || isSubmitting} 
                  className="bg-sky-650 hover:bg-sky-600 text-white font-bold h-6 px-3 text-[10px] tracking-wider active:scale-95 transition"
                >
                  {isRunning ? 'Running...' : 'Run Code'}
                </Button>
                <Button 
                  onClick={handleSubmitQuestion} 
                  disabled={isRunning || isSubmitting} 
                  className="bg-emerald-650 hover:bg-emerald-600 text-white font-extrabold h-6 px-3.5 text-[10px] tracking-wider active:scale-95 transition shadow-sm"
                >
                  {isSubmitting ? 'Evaluating...' : 'Submit Code'}
                </Button>
              </div>
            </div>

            {/* CONSOLE PRE-BOX LOG OUTPUT & TESTCASE VERDICTS */}
            <div className="flex-1 flex overflow-hidden">
              <pre className="flex-1 p-4 font-mono text-[10.5px] text-neutral-400 overflow-y-auto whitespace-pre-wrap leading-relaxed select-text bg-[#030509]/30">
                {consoleOutput}
              </pre>

              {/* TEST CASE INDIVIDUAL VERDICT PILLS GRID */}
              {testResults && (
                <div className="w-64 border-l border-sky-950/30 p-3 bg-[#030509]/55 overflow-y-auto max-h-full space-y-2 select-none">
                  <div className="text-[9px] font-mono font-bold text-sky-400 uppercase tracking-widest border-b border-sky-900/10 pb-1">
                    {testResults.isSubmit ? 'Final Submission Verdict' : 'Run Output Summary'}
                  </div>

                  <div className="flex items-center justify-between text-xs">
                    <span className="text-neutral-450 font-bold">Overall Status:</span>
                    <span className={`font-mono font-extrabold ${
                      testResults.verdict === 'Accepted' ? 'text-emerald-450' : 'text-red-400 animate-pulse'
                    }`}>{testResults.verdict}</span>
                  </div>

                  {testResults.isSubmit && (
                    <div className="text-[10px] text-neutral-450 space-y-0.5 border-t border-sky-900/10 pt-1.5">
                      <div>Score Obtained: <span className="text-sky-400 font-bold font-mono">{testResults.score}%</span></div>
                      <div>Passed Cases: <span className="text-emerald-450 font-bold font-mono">{testResults.passedCount} / {testResults.totalCount}</span></div>
                    </div>
                  )}

                  <div className="space-y-1.5 pt-1.5 border-t border-sky-900/10">
                    {testResults.cases?.map((c: any, index: number) => (
                      <div key={index} className="p-2 bg-neutral-900/40 border border-neutral-900 rounded-lg text-[9px] flex flex-col space-y-1 font-mono">
                        <div className="flex justify-between items-center text-[10px]">
                          <span className="text-neutral-400 font-bold">Case #{index + 1} ({c.testCaseId})</span>
                          <span className={`px-1 rounded text-[8px] font-bold ${
                            c.passed ? 'bg-emerald-950/35 text-emerald-400' : 'bg-red-950/35 text-red-405'
                          }`}>
                            {c.verdict}
                          </span>
                        </div>
                        <div className="text-neutral-500 truncate max-w-full">In: {c.input?.replace(/\n/g, ' ')}</div>
                        <div className="text-neutral-500 truncate max-w-full">Exp: {c.expected}</div>
                        <div className="text-neutral-400 truncate max-w-full font-bold">Act: {c.actual || '(None)'}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </section>

      </main>

      {/* WARNING POPUP SCREEN (TAB LOSS / VISIBILITY WARNING OVERLAY) */}
      {showWarningModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-[9000] p-4">
          <Card className="w-full max-w-md bg-neutral-900 border-red-500/40 p-6 text-center shadow-2xl relative">
            <div className="absolute top-0 left-0 right-0 h-[3px] bg-red-650" />
            <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4 animate-bounce" />
            <h3 className="text-lg font-black text-white tracking-tight uppercase">Workspace Violation Alert</h3>
            <p className="text-xs text-neutral-300 mt-2 leading-relaxed">
              {warningModalText}
            </p>
            <div className="mt-6 flex flex-col gap-2">
              <Button 
                onClick={enterFullscreen} 
                className="w-full bg-red-600 hover:bg-red-500 text-white font-extrabold text-xs h-10 rounded-xl"
              >
                Re-enter Secure Fullscreen Mode
              </Button>
              <p className="text-[10px] text-neutral-500 font-mono mt-2">
                Multiple infractions will negatively affect your overall assessment score metrics.
              </p>
            </div>
          </Card>
        </div>
      )}

    </div>
  )
}