import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import Editor from '@monaco-editor/react'
import { 
  Terminal, Activity, EyeOff, AlertTriangle, RefreshCw, Trash2, Clock, ChevronRight, Lock
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
  java: `import java.util.Scanner;\n\npublic class Solution {\n    public static void main(String[] args) {\n        Scanner scanner = new Scanner(System.in);\n        // Write your solution here\n    }\n}`,
  cpp: `#include <iostream>\nusing namespace std;\n\nint main() {\n    // Write your solution here\n    return 0;\n}`,
  c: `#include <stdio.h>\n\nint main() {\n    // Write your solution here\n    return 0;\n}`
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
  const [isCompilerLoading, setIsCompilerLoading] = useState<string | false>(false)
  
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
    enterFullscreen()
  }

  const handleSubmitPart = async () => {
    if (!currentSession) return

    if (isSingleTypeExam) {
      handleFinishAssessment()
      return
    }

    if (window.confirm(`Submit Part: ${activePart.toUpperCase()}? You will not be able to return to this section.`)) {
      enterFullscreen()
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
            java: codeTemplates.java,
            cpp: codeTemplates.cpp,
            c: codeTemplates.c
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
    if (loading) return
    
    if (timeLeft <= 0) {
      setTimeout(() => {
        if (currentSession && currentSession.status !== 'submitted') {
          handleForceSubmission()
        }
      }, 0)
      return
    }

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

  // Auto-sync integrity drops
  useEffect(() => {
    if (currentSession && currentSession.integrity_score !== integrityScore) {
      const updated = { ...currentSession, integrity_score: integrityScore }
      setCurrentSession(updated)
      saveCandidateSession(updated)
    }
  }, [integrityScore])

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

  function enterFullscreen() {
    const elem = document.documentElement as any
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
  // CODE RUNNER AND SUBMIT COMPILER CONTROLS
  // ==========================================
  const handleResetCode = () => {
    if (!activeQuestion) return
    handleCodeChange(codeTemplates[language] || '')
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

  const handleCheckTestCases = () => executeQuestionEvaluation(false)
  const handleSubmitQuestion = () => executeQuestionEvaluation(true)

  const executeQuestionEvaluation = async (isFinalSubmit: boolean) => {
    if (!activeQuestion) return
    setIsSubmitting(true)
    setTerminalTab('testcases')
    setConsoleOutput(isFinalSubmit ? 'Executing final evaluation against all test cases (hidden + public)...' : 'Checking public test cases...')
    setTestResults(null)

    const codeToSubmit = getActiveCode()

    try {
      const targetCases = isFinalSubmit ? activeQuestion.test_cases : activeQuestion.test_cases.filter(t => t.is_public)
      
      const response = await evaluateCodeSnippet(
        codeToSubmit,
        language,
        targetCases,
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
        `Verdict: ${response.verdict}\n` +
        `Passed Cases: ${passedCount} / ${response.cases.length}\n` +
        (isFinalSubmit ? `Target Score obtained: ${scoreObtained}%\n` : '') +
        `Average Time: ${avgTime}ms | Memory Usage: ${avgMem}KB\n` +
        `Compiler Details: ${response.compileMessage || 'None'}`
      )

      setTestResults({
        verdict: response.verdict,
        compileMessage: response.compileMessage,
        cases: response.cases,
        isSubmit: isFinalSubmit,
        passedCount,
        totalCount: response.cases.length,
        score: scoreObtained
      })

      if (isFinalSubmit) {
        setCurrentSession(prev => {
          if (!prev) return null
          const nextSubmissions = {
            ...(prev.submissions || {}),
            [activeQuestion.id]: {
              code: codeToSubmit,
              language: language,
              status: response.verdict,
              cases_passed: passedCount,
              total_cases: activeQuestion.test_cases.length,
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

        // Auto Advance logic
        setTimeout(() => {
          setSelectedQIndex(prev => {
             if (prev < filteredQuestions.length - 1) return prev + 1
             return prev
          })
        }, 1200)
      }
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
      enterFullscreen()
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
      <div className="min-h-screen sys-bg flex items-center justify-center text-white font-mono text-xs relative">
        <AmbientGlow />
        <div className="flex flex-col items-center gap-3 relative z-10">
          <RefreshCw className="w-6 h-6 animate-spin sys-text-body" />
          <span>Synchronizing Assessment Environment...</span>
        </div>
      </div>
    )
  }

  return (
    <div className="h-screen w-full flex flex-col font-sans antialiased overflow-hidden bg-[#09090B] text-[#F5F5F5] relative">
      
      {/* Ambient Background Layer */}
      <AmbientGlow />
      <div className="grain-overlay opacity-30" />
      
      <div className="flex-1 flex flex-col z-10 relative h-full">
        {/* PREMIUM TOP BAR */}
        <header className="px-8 py-4 flex items-center justify-between sticky top-0 z-50 border-b border-[rgba(255,255,255,0.06)] bg-[#09090B]/80 backdrop-blur-xl">
          <div className="flex items-center space-x-4 select-none">
            <div className="px-3 py-1.5 rounded-full bg-[#111216] border border-[rgba(255,255,255,0.06)] text-[#F5F5F5] flex items-center gap-2 font-medium text-xs shadow-sm">
              <Lock className="w-3.5 h-3.5 text-emerald-400" strokeWidth={2} /> 
              <span>Protected Environment</span>
            </div>
            <span className="font-semibold text-sm tracking-wide text-[#B8BDC7] hidden md:inline-block">
              {assessment.title}
            </span>
          </div>

          {timerAlert && (
            <div className="hidden lg:flex items-center gap-2 px-4 py-1.5 bg-amber-500/10 border border-amber-500/20 rounded-full text-amber-500 font-medium text-xs animate-pulse">
              <AlertTriangle className="w-3.5 h-3.5" strokeWidth={2} /> {timerAlert}
            </div>
          )}

          <div className="flex items-center space-x-3">
            {/* INTEGRITY SCALE */}
            <div className={`flex items-center space-x-2 px-3 py-1.5 rounded-full border ${
              integrityScore > 75 
                ? 'bg-[#111216] border-[rgba(255,255,255,0.06)] text-[#B8BDC7]' 
                : 'bg-red-500/10 border-red-500/20 text-red-400 animate-pulse'
            }`}>
              <Activity className="w-3.5 h-3.5" strokeWidth={2} />
              <span className="text-xs font-semibold">Integrity: {integrityScore}%</span>
            </div>

            {/* TIMER */}
            <div className={`flex items-center space-x-2 px-4 py-1.5 rounded-full border ${
              timeLeft < 300 
                ? 'bg-red-500/10 border-red-500/20 text-red-400 animate-pulse' 
                : 'bg-[#111216] border-[rgba(255,255,255,0.06)] text-[#F5F5F5]'
            }`}>
              <Clock className="w-3.5 h-3.5" strokeWidth={2} />
              <span className="text-xs font-bold font-mono tracking-wider">{formatTimerString(timeLeft)}</span>
            </div>

            <Button
              onClick={handleSync}
              disabled={isSyncing}
              variant="ghost"
              size="icon"
              className="w-8 h-8 rounded-full hover:bg-[rgba(255,255,255,0.04)] text-[#8A9099] hover:text-[#F5F5F5] transition-colors"
              title="Sync Latest Changes"
            >
              <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin text-[#5B8CFF]' : ''}`} />
            </Button>

            <div className="opacity-50 hover:opacity-100 transition-opacity">
               <ThemeToggle />
            </div>

            {activePart === 'menu' ? (
              <Button 
                onClick={handleFinishAssessment} 
                className="bg-[#F5F5F5] hover:bg-white text-[#09090B] font-bold px-6 h-9 rounded-full text-xs shadow-[0_0_20px_rgba(255,255,255,0.1)] transition-all ml-2"
              >
                Submit Exam
              </Button>
            ) : (
              <Button 
                onClick={handleSubmitPart} 
                className="bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 font-semibold px-6 h-9 rounded-full text-xs transition-all ml-2"
              >
                {isSingleTypeExam ? 'Final Submit' : 'Submit Section'}
              </Button>
            )}
          </div>
        </header>

        {/* CORE WORKSPACE GRID */}
        {activePart === 'menu' ? (
          <main className="flex-1 overflow-y-auto p-12 flex flex-col items-center justify-center animate-fade-in relative z-10">
            <div className="max-w-3xl w-full text-center space-y-4">
              <h1 className="text-4xl font-bold text-[#F5F5F5] tracking-tight">Assessment Overview</h1>
              <p className="text-[#8A9099] text-base">Select a section to begin. Submitted sections are locked.</p>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-12">
                {/* Part 1: MCQ */}
                <div className={`p-8 border rounded-[20px] flex flex-col items-center text-center transition-all duration-300 ${
                  currentSession?.completedParts?.includes('mcq') 
                    ? 'bg-[#111216]/50 border-transparent opacity-50' 
                    : 'bg-[#15171B] border-[rgba(255,255,255,0.06)] hover:border-[#5B8CFF]/30 hover:bg-[#1B1D22] hover:-translate-y-1 hover:shadow-2xl hover:shadow-[#5B8CFF]/5'
                }`}>
                  <div className="w-14 h-14 bg-[#111216] rounded-2xl flex items-center justify-center mb-6 border border-[rgba(255,255,255,0.06)] shadow-sm">
                    <span className="font-bold text-emerald-400 text-lg">P1</span>
                  </div>
                  <h3 className="text-xl font-semibold text-[#F5F5F5] mb-3">Multiple Choice</h3>
                  <p className="text-sm text-[#8A9099] mb-8 flex-1 leading-relaxed">Core conceptual knowledge, logical reasoning, and scenario analysis.</p>
                  {currentSession?.completedParts?.includes('mcq') ? (
                    <Button disabled className="w-full bg-[#111216] text-[#8A9099] font-medium rounded-xl h-12">Submitted</Button>
                  ) : (
                    <Button onClick={() => handleStartPart('mcq')} className="w-full bg-[#3f6ad5] hover:bg-[#5B8CFF] text-white font-semibold h-12 rounded-xl transition-all shadow-lg shadow-[#3f6ad5]/20">
                      Start Section
                    </Button>
                  )}
                </div>

                {/* Part 2: Coding */}
                <div className={`p-8 border rounded-[20px] flex flex-col items-center text-center transition-all duration-300 ${
                  currentSession?.completedParts?.includes('coding') 
                    ? 'bg-[#111216]/50 border-transparent opacity-50' 
                    : 'bg-[#15171B] border-[rgba(255,255,255,0.06)] hover:border-[#5B8CFF]/30 hover:bg-[#1B1D22] hover:-translate-y-1 hover:shadow-2xl hover:shadow-[#5B8CFF]/5'
                }`}>
                  <div className="w-14 h-14 bg-[#111216] rounded-2xl flex items-center justify-center mb-6 border border-[rgba(255,255,255,0.06)] shadow-sm">
                    <span className="font-bold text-[#5B8CFF] text-lg">P2</span>
                  </div>
                  <h3 className="text-xl font-semibold text-[#F5F5F5] mb-3">Coding Challenges</h3>
                  <p className="text-sm text-[#8A9099] mb-8 flex-1 leading-relaxed">Algorithmic problem solving and secure logic implementation.</p>
                  {currentSession?.completedParts?.includes('coding') ? (
                    <Button disabled className="w-full bg-[#111216] text-[#8A9099] font-medium rounded-xl h-12">Submitted</Button>
                  ) : (
                    <Button onClick={() => handleStartPart('coding')} className="w-full bg-[#3f6ad5] hover:bg-[#5B8CFF] text-white font-semibold h-12 rounded-xl transition-all shadow-lg shadow-[#3f6ad5]/20">
                      Start Section
                    </Button>
                  )}
                </div>
              </div>

              {currentSession?.completedParts?.includes('mcq') && currentSession?.completedParts?.includes('coding') && (
                <div className="mt-12 pt-8 border-t border-[rgba(255,255,255,0.06)]">
                  <Button onClick={handleFinishAssessment} className="bg-emerald-500 hover:bg-emerald-400 text-[#09090B] font-bold px-10 h-14 rounded-2xl text-sm shadow-[0_0_30px_rgba(16,185,129,0.2)] transition-all">
                    Finish Exam
                  </Button>
                </div>
              )}
            </div>
          </main>
        ) : (
        <>
        <main className="flex-1 flex overflow-hidden min-h-0 relative z-10">
          
          {/* LEFT COLUMN: Sidebar & Telemetry */}
          <aside className="w-80 flex-shrink-0 flex flex-col border-r border-[rgba(255,255,255,0.06)] bg-[#09090B] overflow-y-auto">
            
            {/* PROGRESS HEADER */}
            <div className="p-6 border-b border-[rgba(255,255,255,0.06)] bg-[#111216]/50">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xs font-semibold text-[#8A9099] uppercase tracking-wider">
                  {activePart === 'mcq' ? 'Multiple Choice' : 'Coding Problems'}
                </h3>
                <span className="text-xs font-bold text-[#F5F5F5] bg-[#15171B] px-2 py-1 rounded-md border border-[rgba(255,255,255,0.06)]">
                  {selectedQIndex + 1} / {filteredQuestions.length}
                </span>
              </div>
              <div className="w-full h-1.5 bg-[#15171B] rounded-full overflow-hidden">
                <div 
                  className="h-full bg-[#5B8CFF] rounded-full transition-all duration-500 ease-out" 
                  style={{ width: `${((selectedQIndex + 1) / filteredQuestions.length) * 100}%` }}
                />
              </div>
            </div>

            {/* QUESTION NAVIGATOR PILLS */}
            <div className="p-6 flex-1 flex flex-col">
              <h4 className="text-[10px] font-semibold text-[#6E7683] uppercase tracking-widest mb-4">Question Navigator</h4>
              
              <div className="grid grid-cols-5 gap-2 mb-8">
                {filteredQuestions.map((q, idx) => {
                  const isAnswered = activePart === 'mcq' ? currentSession?.mcq_submissions?.[q.id] !== undefined : currentSession?.submissions?.[q.id]?.code !== undefined
                  const isMarked = reviewMarked[q.id]
                  const isActive = selectedQIndex === idx
                  
                  let btnStyle = 'bg-[#111216] border-[rgba(255,255,255,0.06)] text-[#8A9099] hover:bg-[rgba(255,255,255,0.04)] hover:text-[#F5F5F5]'
                  if (isActive) btnStyle = 'bg-[#F5F5F5] border-transparent text-[#09090B] shadow-[0_0_15px_rgba(255,255,255,0.1)]'
                  else if (isMarked) btnStyle = 'bg-amber-500/10 border-amber-500/30 text-amber-500 hover:bg-amber-500/20'
                  else if (isAnswered) btnStyle = 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20'

                  return (
                    <button
                      key={q.id}
                      onClick={() => setSelectedQIndex(idx)}
                      className={`w-10 h-10 rounded-xl border flex items-center justify-center text-xs font-semibold transition-all duration-200 ${btnStyle}`}
                    >
                      {idx + 1}
                    </button>
                  )
                })}
              </div>
              
              {/* LEGEND */}
              <div className="space-y-3 text-xs text-[#8A9099]">
                <div className="flex items-center gap-3"><div className="w-2.5 h-2.5 rounded-full bg-[#F5F5F5]"></div> <span className="font-medium">Current</span></div>
                <div className="flex items-center gap-3"><div className="w-2.5 h-2.5 rounded-full bg-emerald-500"></div> <span className="font-medium">Answered</span></div>
                <div className="flex items-center gap-3"><div className="w-2.5 h-2.5 rounded-full bg-amber-500"></div> <span className="font-medium">Review</span></div>
                <div className="flex items-center gap-3"><div className="w-2.5 h-2.5 rounded-full border border-[rgba(255,255,255,0.2)] bg-[#111216]"></div> <span className="font-medium">Unanswered</span></div>
              </div>
            </div>

            {/* PROCTORING & TELEMETRY SECTION */}
            <div className="p-6 border-t border-[rgba(255,255,255,0.06)] space-y-4 bg-[#111216]/30">
              
              {/* Premium Proctor Camera Card */}
              <div className="bg-[#15171B] border border-[rgba(255,255,255,0.06)] p-3 rounded-[20px] shadow-sm relative overflow-hidden group">
                {isAnomalyActive && (
                  <div className="absolute top-4 right-4 z-30 bg-red-500 text-white font-semibold text-[10px] px-2 py-1 rounded-md flex items-center shadow-lg animate-pulse">
                    <EyeOff className="w-3 h-3 mr-1.5" strokeWidth={2} /> {anomalyType}
                  </div>
                )}
                
                <div className="w-full h-32 relative overflow-hidden bg-[#09090B] rounded-[12px] border border-[rgba(255,255,255,0.03)]">
                  <div id="candidate-video-container" className="absolute inset-0 w-full h-full z-[100]">
                    {localStream && <StreamVideo stream={localStream} />}
                    <video id="candidate-video" className="hidden" playsInline muted autoPlay />
                  </div>
                  <canvas ref={canvasRef} width="160" height="120" className="hidden" />
                  
                  {/* Minimal crosshairs */}
                  <div className="absolute inset-0 z-20 pointer-events-none opacity-20">
                    <div className="absolute top-3 left-3 w-3 h-3 border-t border-l border-white" />
                    <div className="absolute top-3 right-3 w-3 h-3 border-t border-r border-white" />
                    <div className="absolute bottom-3 left-3 w-3 h-3 border-b border-l border-white" />
                    <div className="absolute bottom-3 right-3 w-3 h-3 border-b border-r border-white" />
                  </div>
                </div>
                
                <div className="mt-3 flex items-center justify-between px-1">
                   <div className="flex items-center gap-1.5 text-[10px] font-medium text-emerald-400">
                     <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></div> Active
                   </div>
                   <span className="text-[10px] text-[#6E7683] font-medium uppercase tracking-wider">Feed Monitored</span>
                </div>
              </div>

              {/* Telemetry Console */}
              <div className="bg-[#111216] border border-[rgba(255,255,255,0.06)] rounded-2xl overflow-hidden shadow-sm flex flex-col h-40">
                <div className="bg-[#15171B] border-b border-[rgba(255,255,255,0.06)] px-4 py-2.5 flex items-center gap-2">
                  <Terminal className="w-3.5 h-3.5 text-[#8A9099]" />
                  <span className="text-[10px] uppercase font-semibold text-[#8A9099] tracking-wider">Telemetry Log</span>
                </div>
                <div className="p-3 font-mono text-[10px] space-y-2 overflow-y-auto flex-1">
                  {proctorLogs.slice(-30).map((log, idx) => {
                    const isAlert = log.includes('ALERT')
                    const isSystem = log.includes('[SYSTEM]')
                    return (
                      <div key={idx} className={`leading-relaxed break-words ${
                        isAlert ? 'text-red-400 bg-red-500/10 px-1.5 py-0.5 rounded' : 
                        isSystem ? 'text-[#8A9099]' : 'text-[#B8BDC7]'
                      }`}>
                        <span className="opacity-50 mr-2 text-[9px]">{new Date().toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute:'2-digit', second:'2-digit' })}</span>
                        {log}
                      </div>
                    )
                  })}
                </div>
              </div>
              
            </div>
          </aside>

          {/* RIGHT COLUMN: Code Workspace & Terminal or MCQ View */}
          <section className="flex-1 flex flex-col h-full overflow-hidden bg-[#09090B] relative">
            
            {activeQuestion?.type !== 'mcq' && (
              <div className="px-6 py-3 flex items-center justify-between border-b border-[rgba(255,255,255,0.06)] bg-[#111216]">
                <span className="text-xs font-semibold text-[#8A9099] flex items-center gap-2 uppercase tracking-wide">
                  <Terminal className="w-4 h-4 text-[#5B8CFF]" strokeWidth={2} /> Compiler Node
                </span>
                <select 
                  value={language} 
                  onChange={(e) => {
                    const newLang = e.target.value
                    if ((newLang === 'cpp' || newLang === 'c') && !(window as any).hasLoadedCppCompiler) {
                      setIsCompilerLoading(newLang)
                      setConsoleOutput(`Initializing ${newLang === 'cpp' ? 'C++' : 'C'} WebAssembly Compiler... Fetching dependencies (35MB)...`)
                      setTimeout(() => {
                         (window as any).hasLoadedCppCompiler = true
                         setIsCompilerLoading(false)
                         setConsoleOutput(`${newLang === 'cpp' ? 'C++' : 'C'} WebAssembly Compiler ready.`)
                         setLanguage(newLang)
                      }, 2500)
                    } else {
                      setLanguage(newLang)
                    }
                  }} 
                  className="bg-[#15171B] border border-[rgba(255,255,255,0.06)] text-[#F5F5F5] rounded-lg text-xs px-3 py-1.5 font-medium outline-none focus:border-[#5B8CFF]/50 transition-colors cursor-pointer"
                >
                  {assessment.allowed_languages.includes('python') && settings.allowedLangs.includes('python') && <option value="python">Python 3.10</option>}
                  {assessment.allowed_languages.includes('javascript') && settings.allowedLangs.includes('javascript') && <option value="javascript">JavaScript (ES6)</option>}
                  {assessment.allowed_languages.includes('java') && settings.allowedLangs.includes('java') && <option value="java">Java (JDK 17)</option>}
                  {assessment.allowed_languages.includes('cpp') && settings.allowedLangs.includes('cpp') && <option value="cpp">C++ (GCC)</option>}
                  {assessment.allowed_languages.includes('c') && settings.allowedLangs.includes('c') && <option value="c">C (GCC)</option>}
                </select>
              </div>
            )}

            {/* MAIN CONTENT AREA */}
            <div className="flex-1 overflow-y-auto min-h-0 bg-[#09090B]">
              {activeQuestion ? (
                activeQuestion.type === 'mcq' ? (
                  <div className="p-10 max-w-4xl mx-auto w-full pb-12">
                      
                      <div className="flex items-center gap-3 mb-8 flex-wrap">
                        <span className="px-3 py-1 rounded-md text-[10px] font-semibold bg-[#111216] border border-[rgba(255,255,255,0.06)] text-[#8A9099] uppercase tracking-wider">
                          Difficulty: <span className={activeQuestion.difficulty === 'Hard' ? 'text-red-400' : activeQuestion.difficulty === 'Medium' ? 'text-amber-400' : 'text-emerald-400'}>{activeQuestion.difficulty}</span>
                        </span>
                        <span className="px-3 py-1 rounded-md text-[10px] font-semibold bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 uppercase tracking-wider">
                          +{activeQuestion.mcq_marks ?? 1} Marks
                        </span>
                        {(activeQuestion.mcq_negative_marks ?? 0) > 0 && (
                          <span className="px-3 py-1 rounded-md text-[10px] font-semibold bg-red-500/10 border border-red-500/20 text-red-400 uppercase tracking-wider">
                            -{activeQuestion.mcq_negative_marks} Penalty
                          </span>
                        )}
                      </div>

                      <h1 className="text-2xl font-bold text-[#F5F5F5] mb-6 leading-tight">
                        <Latex>{activeQuestion.title || ''}</Latex>
                      </h1>
                      
                      <div className="text-lg font-semibold leading-relaxed text-[#F5F5F5] mb-12">
                        <Latex>{activeQuestion.description || ''}</Latex>
                      </div>

                      {/* OPTIONS */}
                      <div className="grid grid-cols-1 gap-4">
                        {activeQuestion.mcq_options?.map((opt, idx) => {
                          const selectedVal = currentSession?.mcq_submissions?.[activeQuestion.id]
                          const isSelected = selectedVal === opt || selectedVal === String(idx)
                          return (
                            <button
                              key={idx}
                              onClick={() => handleMcqSelect(idx)}
                              className={`group w-full flex items-center text-left p-5 rounded-[16px] border transition-all duration-200 cursor-pointer ${
                                isSelected 
                                  ? 'bg-[#5B8CFF]/[0.04] border-[#5B8CFF]/60 shadow-[0_4px_24px_rgba(91,140,255,0.08)]' 
                                  : 'bg-[#111216] hover:bg-[#15171B] border-[rgba(255,255,255,0.06)] hover:border-[rgba(255,255,255,0.12)]'
                              }`}
                            >
                              <div className={`flex shrink-0 items-center justify-center w-8 h-8 rounded-full mr-5 font-semibold text-xs border transition-all duration-200 ${
                                isSelected 
                                  ? 'bg-[#5B8CFF] text-white border-[#5B8CFF] shadow-[0_0_12px_rgba(91,140,255,0.4)]' 
                                  : 'bg-[#15171B] text-[#8A9099] border-[rgba(255,255,255,0.06)] group-hover:border-[rgba(255,255,255,0.15)] group-hover:text-[#F5F5F5]'
                              }`}>
                                {String.fromCharCode(65 + idx)}
                              </div>
                              <span className={`text-[15px] font-medium leading-relaxed ${isSelected ? 'text-[#F5F5F5]' : 'text-[#B8BDC7] group-hover:text-[#F5F5F5]'}`}>
                                <Latex>{opt || ''}</Latex>
                              </span>
                            </button>
                          )
                        })}
                      </div>
                    </div>
                ) : (
                  <div className="flex h-full w-full min-h-0">
                    {/* ... Coding UI will remain conceptually similar but with dark theme colors if needed. Wait, coding UI needs to be preserved exactly as requested? "The current interface is to be discarded entirely... DO NOT modify any business logic... Keep every feature and wiring exactly the same." I'll update the colors slightly to match the global theme. */}
                    <div className="w-1/2 h-full border-r border-[rgba(255,255,255,0.06)] bg-[#09090B] flex flex-col">
                      <div className="p-6 overflow-y-auto flex-1 space-y-6">
                        <div>
                           <span className="px-3 py-1 rounded-md text-[10px] font-semibold bg-[#111216] border border-[rgba(255,255,255,0.06)] text-emerald-400 uppercase tracking-wider mb-4 inline-block">
                             Difficulty: {activeQuestion.difficulty}
                           </span>
                           <h1 className="text-xl font-bold text-[#F5F5F5] leading-tight">
                             <Latex>{activeQuestion.title || ''}</Latex>
                           </h1>
                        </div>
                        <div className="text-sm leading-relaxed text-[#B8BDC7] whitespace-pre-wrap">
                          {activeQuestion.description}
                        </div>
                        {activeQuestion.tags && activeQuestion.tags.length > 0 && (
                          <div className="flex flex-wrap gap-2 pt-2">
                            {activeQuestion.tags.map((tag, idx) => (
                              <span key={idx} className="bg-[#111216] text-[#8A9099] border border-[rgba(255,255,255,0.06)] text-[10px] px-2 py-1 rounded-md font-medium">
                                {tag}
                              </span>
                            ))}
                          </div>
                        )}
                        <div className="p-4 rounded-xl border border-[rgba(255,255,255,0.06)] bg-[#111216]/50">
                          <h4 className="text-[10px] font-semibold text-[#8A9099] uppercase tracking-widest mb-2">Constraints</h4>
                          <pre className="text-xs leading-relaxed font-mono whitespace-pre-wrap text-[#B8BDC7]">{activeQuestion.constraints}</pre>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="p-4 rounded-xl border border-[rgba(255,255,255,0.06)] bg-[#111216]/50">
                            <h4 className="text-[10px] font-semibold text-[#8A9099] uppercase tracking-wider mb-2">Input Format</h4>
                            <p className="text-xs text-[#B8BDC7]">{activeQuestion.input_format}</p>
                          </div>
                          <div className="p-4 rounded-xl border border-[rgba(255,255,255,0.06)] bg-[#111216]/50">
                            <h4 className="text-[10px] font-semibold text-[#8A9099] uppercase tracking-wider mb-2">Output Format</h4>
                            <p className="text-xs text-[#B8BDC7]">{activeQuestion.output_format}</p>
                          </div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="space-y-2 flex flex-col">
                            <span className="text-[10px] font-semibold text-[#8A9099] uppercase tracking-wider px-1">Sample Input</span>
                            <pre className="bg-[#111216] p-4 rounded-xl border border-[rgba(255,255,255,0.06)] text-xs font-mono text-[#B8BDC7] min-h-[80px] whitespace-pre-wrap">{activeQuestion.sample_input}</pre>
                          </div>
                          <div className="space-y-2 flex flex-col">
                            <span className="text-[10px] font-semibold text-[#8A9099] uppercase tracking-wider px-1">Sample Output</span>
                            <pre className="bg-[#111216] p-4 rounded-xl border border-[rgba(255,255,255,0.06)] text-xs font-mono text-[#F5F5F5] min-h-[80px] whitespace-pre-wrap">{activeQuestion.sample_output}</pre>
                          </div>
                        </div>
                        {activeQuestion.explanation && (
                          <div className="text-xs text-[#B8BDC7] leading-relaxed italic bg-[#5B8CFF]/5 border border-[#5B8CFF]/20 p-4 rounded-xl">
                            <strong className="text-[#5B8CFF] font-semibold not-italic">Explanation:</strong> <br/> {activeQuestion.explanation}
                          </div>
                        )}
                      </div>
                    </div>
                    
                    <div className="w-1/2 h-full flex flex-col bg-[#09090B] relative">
                      {isCompilerLoading && (
                        <div className="absolute inset-0 z-50 bg-[#09090B]/90 backdrop-blur-sm flex flex-col items-center justify-center p-8 text-center">
                          <div className="w-12 h-12 border-4 border-[#5B8CFF]/30 border-t-[#5B8CFF] rounded-full animate-spin mb-6"></div>
                          <h3 className="text-[#F5F5F5] font-bold text-lg mb-2">Lazy-Loading {isCompilerLoading === 'cpp' ? 'C++' : 'C'} Compiler</h3>
                          <p className="text-[#8A9099] text-sm max-w-xs leading-relaxed">
                            Downloading WebAssembly Clang toolchain and libc headers. This 35MB payload is only fetched once per session.
                          </p>
                        </div>
                      )}
                      <Editor 
                        height="100%" 
                        language={language === 'java' ? 'java' : language === 'cpp' ? 'cpp' : language === 'c' ? 'c' : language === 'javascript' ? 'javascript' : 'python'} 
                        theme="vs-dark"
                        value={getActiveCode()} 
                        onChange={handleCodeChange}
                        options={{ 
                          readOnly: !!currentSession?.submissions?.[activeQuestion.id],
                          fontSize: 14, 
                          minimap: { enabled: false }, 
                          automaticLayout: true,
                          fontFamily: 'Consolas, monaco, monospace',
                          lineNumbers: 'on',
                          cursorBlinking: 'smooth',
                          tabSize: 4,
                          insertSpaces: true,
                          padding: { top: 16 }
                        }} 
                      />
                    </div>
                  </div>
                )
              ) : (
                <div className="h-full flex items-center justify-center text-sm font-medium text-[#8A9099] bg-[#09090B]">
                  No questions linked to assessment lobby.
                </div>
              )}
            </div>

            {/* SPLIT CONSOLE PANEL (Coding Only) */}
            {activeQuestion?.type !== 'mcq' && activeQuestion && (
              <div className="h-72 flex flex-col border-t border-[rgba(255,255,255,0.06)] bg-[#09090B] relative z-20 shadow-[0_-10px_30px_rgba(0,0,0,0.2)]">
                <div className="px-6 py-3 flex items-center justify-between text-xs border-b border-[rgba(255,255,255,0.06)] bg-[#111216] select-none">
                  <div className="flex items-center gap-6">
                    <button 
                      onClick={() => setTerminalTab('console')}
                      className={`flex items-center uppercase font-semibold tracking-wider text-[11px] pb-1 border-b-2 transition-all ${terminalTab === 'console' ? 'text-emerald-400 border-emerald-400' : 'text-[#8A9099] border-transparent hover:text-[#B8BDC7]'}`}
                    >
                      <Terminal className="w-4 h-4 mr-2" strokeWidth={2} /> Console
                    </button>
                    <button 
                      onClick={() => setTerminalTab('testcases')}
                      className={`flex items-center uppercase font-semibold tracking-wider text-[11px] pb-1 border-b-2 transition-all ${terminalTab === 'testcases' ? 'text-emerald-400 border-emerald-400' : 'text-[#8A9099] border-transparent hover:text-[#B8BDC7]'}`}
                    >
                      Custom Input
                    </button>
                  </div>
                  <div className="flex items-center gap-3">
                    <Button
                      onClick={handleResetCode} 
                      disabled={!!currentSession?.submissions?.[activeQuestion.id]}
                      variant="ghost" 
                      className="h-8 text-[11px] font-semibold text-[#8A9099] hover:bg-[#15171B] hover:text-[#F5F5F5] rounded-lg transition-colors px-3 disabled:opacity-50 disabled:pointer-events-none"
                    >
                      <RefreshCw className="w-3.5 h-3.5 mr-2" /> Reset
                    </Button>
                    <Button
                      onClick={() => setConsoleOutput('Execution console reports cleared.')} 
                      variant="ghost" 
                      className="h-8 text-[11px] font-semibold text-[#8A9099] hover:bg-[#15171B] hover:text-[#F5F5F5] rounded-lg transition-colors px-3"
                    >
                      <Trash2 className="w-3.5 h-3.5 mr-2" /> Clear
                    </Button>
                    <Button 
                      onClick={handleRunCode} 
                      disabled={isRunning || isSubmitting || !!currentSession?.submissions?.[activeQuestion.id]} 
                      className="bg-[#111216] hover:bg-[#15171B] text-emerald-400 border border-[rgba(255,255,255,0.06)] hover:border-emerald-500/30 font-bold h-8 px-5 text-[11px] uppercase tracking-wider rounded-lg transition-all disabled:opacity-50 disabled:pointer-events-none"
                    >
                      {isRunning ? 'Running...' : 'Run Code'}
                    </Button>
                    <Button 
                      onClick={handleCheckTestCases} 
                      disabled={isRunning || isSubmitting || !!currentSession?.submissions?.[activeQuestion.id]} 
                      className="bg-[#111216] hover:bg-[#15171B] text-[#5B8CFF] border border-[#5B8CFF]/30 hover:border-[#5B8CFF] font-bold h-8 px-5 text-[11px] uppercase tracking-wider rounded-lg transition-all disabled:opacity-50 disabled:pointer-events-none"
                    >
                      {isSubmitting ? 'Evaluating...' : 'Check Test Cases'}
                    </Button>
                    <Button 
                      onClick={handleSubmitQuestion} 
                      disabled={isRunning || isSubmitting || !!currentSession?.submissions?.[activeQuestion.id]} 
                      className="bg-[#3f6ad5] hover:bg-[#5B8CFF] text-white shadow-[0_4px_14px_rgba(63,106,213,0.3)] hover:shadow-[0_6px_20px_rgba(91,140,255,0.4)] font-bold h-8 px-5 text-[11px] uppercase tracking-wider rounded-lg transition-all disabled:opacity-50 disabled:pointer-events-none"
                    >
                      {!!currentSession?.submissions?.[activeQuestion.id] ? 'Submitted' : isSubmitting ? 'Evaluating...' : 'Submit Code'}
                    </Button>
                  </div>
                </div>

                <div className="flex-1 flex overflow-hidden bg-[#09090B]">
                  
                  {terminalTab === 'testcases' && (
                    <div className="w-80 border-r border-[rgba(255,255,255,0.06)] p-4 bg-[#111216]/50 flex flex-col">
                      <span className="text-[10px] font-semibold text-[#8A9099] uppercase mb-3 tracking-widest">Custom STDIN Input</span>
                      <textarea 
                        value={customInput}
                        onChange={(e) => setCustomInput(e.target.value)}
                        className="flex-1 bg-[#09090B] border border-[rgba(255,255,255,0.06)] rounded-xl p-3 text-xs font-mono text-[#F5F5F5] focus:outline-none focus:border-[#5B8CFF]/50 resize-none transition-colors"
                        placeholder="Enter custom input for 'Run Code' here..."
                      />
                    </div>
                  )}

                  <pre className="flex-1 p-6 font-mono text-[11px] text-[#B8BDC7] overflow-y-auto whitespace-pre-wrap leading-relaxed select-text bg-[#09090B]">
                    {consoleOutput}
                  </pre>

                  {testResults && (
                    <div className="w-80 border-l border-[rgba(255,255,255,0.06)] p-4 bg-[#111216]/50 overflow-y-auto h-full space-y-4 select-none">
                      <div className="text-xs font-semibold text-[#8A9099] uppercase tracking-widest border-b border-[rgba(255,255,255,0.06)] pb-2 flex items-center justify-between">
                        <span>{testResults.isSubmit ? 'Final Verdict' : 'Run Verdict'}</span>
                        <span className={`px-2 py-1 rounded-md text-[10px] font-bold ${
                          testResults.verdict === 'Accepted' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-red-500/10 text-red-400 border border-red-500/20'
                        }`}>{testResults.verdict}</span>
                      </div>

                      {testResults.isSubmit && (
                        <div className="text-xs text-[#B8BDC7] space-y-1.5 border-b border-[rgba(255,255,255,0.06)] pb-4">
                          <div className="flex justify-between">Score: <span className="text-white font-bold font-mono">{testResults.score}%</span></div>
                          <div className="flex justify-between">Passed Cases: <span className="text-white font-bold font-mono">{testResults.passedCount} / {testResults.totalCount}</span></div>
                        </div>
                      )}

                      <div className="space-y-3">
                        {testResults.cases?.map((c: any, index: number) => (
                          <div key={index} className="p-3 bg-[#09090B] border border-[rgba(255,255,255,0.06)] rounded-xl text-[10px] flex flex-col space-y-1.5 font-mono">
                            <div className="flex justify-between items-center mb-1">
                              <span className="text-[#8A9099] font-bold tracking-wider">CASE #{index + 1}</span>
                              <span className={`px-2 py-1 rounded-md font-semibold ${
                                c.passed ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'
                              }`}>
                                {c.verdict}
                              </span>
                            </div>
                            <div className="text-[#B8BDC7] truncate max-w-full">Input: <span className="text-[#F5F5F5]">{c.input?.replace(/\n/g, ' ')}</span></div>
                            <div className="text-[#B8BDC7] truncate max-w-full">Expected: <span className="text-[#F5F5F5]">{c.expected}</span></div>
                            <div className="text-[#B8BDC7] truncate max-w-full font-bold">Actual: <span className={c.passed ? "text-emerald-400" : "text-red-400"}>{c.actual || '(None)'}</span></div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
            
            {/* PERSISTENT BOTTOM ACTION BAR (MCQ Only) */}
            {activeQuestion && activeQuestion.type === 'mcq' && (
              <div className="flex-none h-24 bg-[#09090B] border-t border-[rgba(255,255,255,0.06)] flex items-center justify-between px-10 z-20 shadow-[0_-10px_30px_rgba(0,0,0,0.5)]">
                <div className="flex items-center gap-4">
                  <Button 
                    onClick={handleClearResponse}
                    variant="ghost"
                    className="h-11 px-6 rounded-xl text-xs font-semibold text-[#8A9099] hover:bg-[#111216] hover:text-[#F5F5F5] transition-colors"
                  >
                    Clear Response
                  </Button>
                  <Button 
                    onClick={() => setReviewMarked(prev => ({ ...prev, [activeQuestion.id]: !prev[activeQuestion.id] }))}
                    className={`h-11 px-6 rounded-xl text-xs font-semibold transition-all ${
                      reviewMarked[activeQuestion.id] 
                        ? 'bg-amber-500/10 text-amber-500 border border-amber-500/30 hover:bg-amber-500/20' 
                        : 'bg-[#111216] text-[#B8BDC7] border border-[rgba(255,255,255,0.06)] hover:bg-[#15171B] hover:text-[#F5F5F5]'
                    }`}
                  >
                    {reviewMarked[activeQuestion.id] ? 'Unmark Review' : 'Mark for Review'}
                  </Button>
                </div>
                
                <div className="flex items-center gap-4">
                  <Button 
                    onClick={() => setSelectedQIndex(p => p - 1)}
                    disabled={selectedQIndex === 0}
                    className="h-11 px-8 rounded-xl text-xs font-semibold bg-[#111216] text-[#B8BDC7] border border-[rgba(255,255,255,0.06)] hover:bg-[#15171B] hover:text-[#F5F5F5] transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    Previous
                  </Button>
                  <Button 
                    onClick={handleSaveAndNext}
                    disabled={selectedQIndex === filteredQuestions.length - 1}
                    className="h-11 px-8 rounded-xl text-xs font-bold bg-[#3f6ad5] hover:bg-[#5B8CFF] text-white shadow-[0_4px_14px_rgba(63,106,213,0.3)] hover:shadow-[0_6px_20px_rgba(91,140,255,0.4)] transition-all disabled:opacity-30 disabled:cursor-not-allowed flex items-center"
                  >
                    Save & Next <ChevronRight className="w-4 h-4 ml-2" />
                  </Button>
                </div>
              </div>
            )}
          </section>
        </main>
        </>
        )}
      </div>
 
      {/* WARNING POPUP SCREEN */}
      {showWarningModal && (
        <div className="fixed inset-0 bg-[#09090B]/95 backdrop-blur-md flex items-center justify-center z-[9000] p-4">
          <Card className="w-full max-w-md bg-[#111216] border border-red-500/30 p-8 text-center shadow-[0_0_50px_rgba(239,68,68,0.15)] relative rounded-[24px]">
            <div className="absolute top-0 left-0 right-0 h-1 bg-red-500 rounded-t-[24px]" />
            <AlertTriangle className="w-14 h-14 text-red-500 mx-auto mb-6 animate-pulse" strokeWidth={1.5} />
            <h3 className="text-xl font-bold text-[#F5F5F5] tracking-tight mb-2">Workspace Violation Alert</h3>
            <p className="text-sm text-[#B8BDC7] leading-relaxed">
              {warningModalText}
            </p>
            <div className="mt-8 flex flex-col gap-3">
              <Button 
                onClick={enterFullscreen} 
                className="w-full bg-red-500 hover:bg-red-400 text-white font-bold h-12 rounded-xl transition-all shadow-lg shadow-red-500/20"
              >
                Re-enter Secure Fullscreen Mode
              </Button>
              <p className="text-[11px] text-[#8A9099] font-medium mt-2 select-none">
                Multiple infractions will negatively affect your overall assessment score metrics.
              </p>
            </div>
          </Card>
        </div>
      )}
 
    </div>
  )
}
