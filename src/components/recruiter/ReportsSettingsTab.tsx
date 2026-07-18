import { useState, useEffect } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { 
  FileText, Download, Check, Save,
  Database, Cpu, RefreshCw, Terminal as TermIcon, Settings as GearIcon, Shield, Search
} from 'lucide-react'
import { Assessment, fetchCandidateSessions, fetchQuestions } from '../../lib/assessmentEngine'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import { useSettingsStore } from '../../store/settingsStore'

interface ReportsSettingsTabProps {
  defaultSection: 'reports' | 'settings' | 'logs'
  assessments: Assessment[]
}

export default function ReportsSettingsTab({ defaultSection, assessments }: ReportsSettingsTabProps) {
  const [activeSub, setActiveSub] = useState<'reports' | 'settings' | 'logs'>(defaultSection)
  const [isRefreshingLogs, setIsRefreshingLogs] = useState(false)
  const [logsSearch, setLogsSearch] = useState('')

  const settings = useSettingsStore()
  
  // Settings states (initialized from global store)
  const [integrityThreshold, setIntegrityThreshold] = useState(settings.integrityThreshold)
  const [proctorCamera, setProctorCamera] = useState(settings.requireCamera)
  const [proctorTabs, setProctorTabs] = useState(settings.requireTabFocus)
  const [allowedLangs, setAllowedLangs] = useState(settings.allowedLangs)
  const [maxExecutionTime, setMaxExecutionTime] = useState(settings.maxExecutionTime)
  const [maxMemoryLimit, setMaxMemoryLimit] = useState(settings.maxMemoryLimit)
  const [saveSuccess, setSaveSuccess] = useState(false)
  const [exportExamId, setExportExamId] = useState<string>('')
  const [isExporting, setIsExporting] = useState(false)
  const [pdfExportExamId, setPdfExportExamId] = useState<string>('')
  const [isExportingPDF, setIsExportingPDF] = useState(false)
  const [pdfQuestionBankExamId, setPdfQuestionBankExamId] = useState<string>('')
  const [isExportingQuestionBank, setIsExportingQuestionBank] = useState(false)

  useEffect(() => {
    if (assessments.length > 0) {
      if (!exportExamId) setExportExamId(assessments[assessments.length - 1].id)
      if (!pdfExportExamId) setPdfExportExamId(assessments[assessments.length - 1].id)
      if (!pdfQuestionBankExamId) setPdfQuestionBankExamId(assessments[assessments.length - 1].id)
    }
  }, [assessments, exportExamId, pdfExportExamId, pdfQuestionBankExamId])

  // Sub-settings categories for macOS settings panel
  const [settingsCategory, setSettingsCategory] = useState<'general' | 'proctor' | 'compilers'>('general')

  useEffect(() => {
    setActiveSub(defaultSection)
    if (assessments.length > 0 && !exportExamId) {
      setExportExamId(assessments[0].id)
    }
  }, [defaultSection, assessments, exportExamId])

  // Mock logs feed
  const [systemLogs, setSystemLogs] = useState<string[]>([
    '[21:40:01] [SYSTEM] Proctor optical analytics server cluster active.',
    '[21:40:15] [WEBRTC] Socket negotiation listening on student channels.',
    '[21:41:02] [SUPABASE] Broadcast channel joined: integrity_audits_lobby.',
    '[21:42:19] [SANDBOX] Gemini evaluations model initialized: gemini-1.5-flash.',
    '[21:43:05] [COMPILER] Python compiler sandbox node initialized successfully.',
    '[21:44:48] [SECURITY] Client session token authenticated: recruiter_session.'
  ])

  const handleRefreshLogs = () => {
    setIsRefreshingLogs(true)
    setTimeout(() => {
      setSystemLogs(prev => [
        `[${new Date().toLocaleTimeString()}] [TELEMETRY] Proctor check: CPU load 12%, Memory usage 184MB.`,
        ...prev
      ])
      setIsRefreshingLogs(false)
    }, 800)
  }

  const handleSaveSettings = (e: React.FormEvent) => {
    e.preventDefault()
    settings.updateSettings({
      integrityThreshold,
      requireCamera: proctorCamera,
      requireTabFocus: proctorTabs,
      allowedLangs,
      maxExecutionTime,
      maxMemoryLimit
    })
    setSaveSuccess(true)
    setTimeout(() => setSaveSuccess(false), 2000)
  }

  const handleDownloadPDF = async () => {
    if (!pdfExportExamId) return
    setIsExportingPDF(true)
    try {
      const assessment = assessments.find(a => a.id === pdfExportExamId)
      const sessions = await fetchCandidateSessions(pdfExportExamId)
      
      const doc = new jsPDF()
      
      // Header
      doc.setFontSize(18)
      doc.text('Cohort Integrity Summary', 14, 22)
      
      doc.setFontSize(11)
      doc.setTextColor(100)
      doc.text(`Assessment: ${assessment?.title || 'Unknown'}`, 14, 30)
      doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 36)

      // Metrics
      const totalCandidates = sessions.length
      const avgScore = totalCandidates > 0 ? Math.round(sessions.reduce((acc, s) => acc + (s.score || 0), 0) / totalCandidates) : 0
      const avgIntegrity = totalCandidates > 0 ? Math.round(sessions.reduce((acc, s) => acc + (s.integrity_score ?? 100), 0) / totalCandidates) : 0
      
      doc.setFontSize(12)
      doc.setTextColor(0)
      doc.text('Cohort Metrics', 14, 48)
      doc.setFontSize(10)
      doc.setTextColor(80)
      doc.text(`Total Candidates: ${totalCandidates}`, 14, 55)
      doc.text(`Average Score: ${avgScore}%`, 14, 61)
      doc.text(`Average Integrity Rating: ${avgIntegrity}%`, 14, 67)

      // High Risk Candidates
      const highRisk = sessions.filter(s => (s.integrity_score ?? 100) < 70).sort((a,b) => (a.integrity_score ?? 100) - (b.integrity_score ?? 100))
      let startY = 75

      if (highRisk.length > 0) {
        doc.setFontSize(12)
        doc.setTextColor(220, 38, 38)
        doc.text('High-Risk Candidates (Flagged for Review)', 14, startY + 8)
        
        autoTable(doc, {
          startY: startY + 12,
          head: [['Roll Number', 'Name', 'Integrity', 'Score']],
          body: highRisk.map(s => [s.roll_number || 'N/A', s.name || 'Unknown', `${s.integrity_score ?? 100}%`, `${s.score ?? 0}%`]),
          headStyles: { fillColor: [220, 38, 38] },
          theme: 'grid'
        })
        startY = (doc as any).lastAutoTable.finalY + 10
      } else {
        startY += 10
      }

      // Full Roster
      doc.setFontSize(12)
      doc.setTextColor(0)
      doc.text('Full Candidate Roster', 14, startY + 8)

      autoTable(doc, {
        startY: startY + 12,
        head: [['Roll Number', 'Name', 'Status', 'Integrity', 'Score']],
        body: sessions.map(s => [s.roll_number || 'N/A', s.name || 'Unknown', s.status || 'not started', `${s.integrity_score ?? 100}%`, `${s.score ?? 0}%`]),
        headStyles: { fillColor: [91, 140, 255] },
        theme: 'grid'
      })

      doc.save(`Cohort_Integrity_${pdfExportExamId}.pdf`)
    } catch (err) {
      console.error(err)
      alert("Failed to generate PDF.")
    } finally {
      setIsExportingPDF(false)
    }
  }

  const handleDownloadQuestionBankPDF = async () => {
    if (!pdfQuestionBankExamId) return
    setIsExportingQuestionBank(true)
    try {
      const assessment = assessments.find(a => a.id === pdfQuestionBankExamId)
      const questionsList = await fetchQuestions(pdfQuestionBankExamId)
      
      const doc = new jsPDF()
      
      // Header
      doc.setFontSize(18)
      doc.text('Assessment Question Bank', 14, 22)
      
      doc.setFontSize(11)
      doc.setTextColor(100)
      doc.text(`Assessment: ${assessment?.title || 'Unknown'}`, 14, 30)
      doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 36)

      let startY = 48
      
      const mcqs = questionsList.filter(q => q.type === 'mcq')
      if (mcqs.length > 0) {
        doc.setFontSize(14)
        doc.setTextColor(0)
        doc.text(`Multiple Choice Questions (${mcqs.length})`, 14, startY)
        startY += 8
        
        mcqs.forEach((q, idx) => {
          if (startY > 260) { doc.addPage(); startY = 20; }
          
          doc.setFontSize(11)
          doc.setTextColor(0)
          const titleLines = doc.splitTextToSize(`${idx + 1}. ${q.description || q.title || 'Question'}`, 180)
          doc.text(titleLines, 14, startY)
          startY += (titleLines.length * 6)
          
          doc.setFontSize(9)
          doc.setTextColor(100)
          doc.text(`[ Marks: +${q.mcq_marks ?? 1} | Negative: -${q.mcq_negative_marks ?? 0} ]`, 18, startY)
          startY += 6
          
          q.mcq_options?.forEach((opt, oIdx) => {
             if (startY > 275) { doc.addPage(); startY = 20; }
             const isCorrect = oIdx === q.mcq_correct_index
             if (isCorrect) doc.setTextColor(20, 160, 20)
             else doc.setTextColor(80)
             
             doc.text(`${String.fromCharCode(65 + oIdx)}. ${opt} ${isCorrect ? '(Correct Answer)' : ''}`, 18, startY)
             startY += 5
          })
          startY += 6
        })
      }

      const codings = questionsList.filter(q => q.type !== 'mcq')
      if (codings.length > 0) {
        if (startY > 240) { doc.addPage(); startY = 20; } else { startY += 10; }
        
        doc.setFontSize(14)
        doc.setTextColor(0)
        doc.text(`Coding Challenges (${codings.length})`, 14, startY)
        startY += 8
        
        codings.forEach((q, idx) => {
          if (startY > 250) { doc.addPage(); startY = 20; }
          
          doc.setFontSize(12)
          doc.setTextColor(0)
          doc.text(`Challenge ${idx + 1}: ${q.title || 'Coding Question'}`, 14, startY)
          startY += 6
          
          doc.setFontSize(10)
          doc.setTextColor(80)
          const descLines = doc.splitTextToSize(q.description || '', 180)
          doc.text(descLines, 14, startY)
          startY += (descLines.length * 5) + 4
          
          if (q.input_format) {
            if (startY > 270) { doc.addPage(); startY = 20; }
            doc.setFontSize(9)
            doc.setTextColor(0)
            doc.text("Input Format:", 14, startY)
            startY += 4
            doc.setTextColor(100)
            const inputLines = doc.splitTextToSize(q.input_format, 180)
            doc.text(inputLines, 14, startY)
            startY += (inputLines.length * 4) + 4
          }
          
          if (q.constraints) {
            if (startY > 270) { doc.addPage(); startY = 20; }
            doc.setFontSize(9)
            doc.setTextColor(0)
            doc.text("Constraints:", 14, startY)
            startY += 4
            doc.setTextColor(100)
            const conLines = doc.splitTextToSize(q.constraints, 180)
            doc.text(conLines, 14, startY)
            startY += (conLines.length * 4) + 4
          }
          
          if (q.test_cases && q.test_cases.length > 0) {
            if (startY > 260) { doc.addPage(); startY = 20; }
            doc.setFontSize(10)
            doc.setTextColor(0)
            doc.text(`Test Cases (${q.test_cases.length})`, 14, startY)
            startY += 6
            
            autoTable(doc, {
              startY: startY,
              head: [['Type', 'Input', 'Expected Output']],
              body: q.test_cases.map(tc => [!tc.is_public ? 'Hidden' : 'Public', tc.input || '', tc.expected_output || '']),
              theme: 'grid',
              headStyles: { fillColor: [91, 140, 255] }
            })
            startY = (doc as any).lastAutoTable.finalY + 10
          }
        })
      }

      doc.save(`Question_Bank_${pdfQuestionBankExamId}.pdf`)
    } catch (err) {
      console.error(err)
      alert("Failed to generate PDF.")
    } finally {
      setIsExportingQuestionBank(false)
    }
  }

  const handleExportCSV = async (type: 'mcq' | 'coding') => {
    if (!exportExamId) return
    setIsExporting(true)
    try {
      const match = assessments.find(a => a.id === exportExamId)
      const examTitle = match ? match.title : 'Assessment'

      const rawQuestions = await fetchQuestions(exportExamId)
      const questionsList = rawQuestions.filter(q => type === 'mcq' ? q.type === 'mcq' : q.type !== 'mcq')

      if (questionsList.length === 0) {
        alert(`No ${type === 'mcq' ? 'MCQ' : 'Coding'} questions found for this assessment!`)
        setIsExporting(false)
        return
      }

      const sessions = await fetchCandidateSessions(exportExamId)

      let csvContent = ""
      
      if (type === 'mcq') {
        csvContent = "Candidate Name,Roll Number,Email,Status,"
        questionsList.forEach(q => {
          const qHeading = q.description || q.title || 'Question'
          const correctOption = q.mcq_correct_index !== undefined && q.mcq_options ? q.mcq_options[q.mcq_correct_index] : ''
          const headerText = correctOption ? `${qHeading} (Correct: ${correctOption})` : qHeading
          csvContent += `"${headerText.replace(/"/g, '""')}",`
        })
        csvContent += "MCQ Score,Max Score\n"

        sessions.forEach(s => {
          const row = [
            `"${s.name || ''}"`,
            `"${s.roll_number || ''}"`,
            `"${s.email || ''}"`,
            `"${s.status || ''}"`
          ]

          let mcqScore = 0
          let maxScore = 0
          questionsList.forEach(q => { maxScore += (q.mcq_marks ?? 1) })

          questionsList.forEach(q => {
            const mcqAns = s.mcq_submissions?.[q.id]
            const legacySub = s.submissions?.[q.id]
            
            // Check new isolated dictionary first, then fallback to old submission structure
            let textToPrint = mcqAns || (legacySub && legacySub.code ? legacySub.code : '')

            if (textToPrint) {
              // Legacy fallback just in case the db holds a raw index like "0"
              const asInt = parseInt(textToPrint, 10)
              if (!isNaN(asInt) && String(asInt) === textToPrint && q.mcq_options && q.mcq_options[asInt]) {
                textToPrint = q.mcq_options[asInt]
              }

              // Failsafe for corrupted legacy database entries (where "def solve():" was accidentally saved)
              const isValidOption = q.mcq_options?.includes(textToPrint)
              if (!isValidOption) {
                textToPrint = 'Not Attempted'
              }

              row.push(`"${textToPrint.replace(/"/g, '""')}"`)
            } else {
              row.push('"Not Attempted"')
            }

            const correctOption = q.mcq_correct_index !== undefined && q.mcq_options ? q.mcq_options[q.mcq_correct_index] : ''
            if (textToPrint !== 'Not Attempted') {
              if (textToPrint === correctOption) {
                mcqScore += (q.mcq_marks ?? 1)
              } else {
                mcqScore -= (q.mcq_negative_marks ?? 0)
              }
            }
          })
          
          row.push(`"${mcqScore}"`)
          row.push(`"${maxScore}"`)
          
          csvContent += row.join(",") + "\n"
        })
      } else {
        csvContent = "Candidate Name,Roll Number,Email,Status,Integrity Score,Total Score,"
        questionsList.forEach(q => {
          csvContent += `"${q.title} - Score","${q.title} - Code",`
        })
        csvContent += "\n"

        sessions.forEach(s => {
          const row = [
            `"${s.name || ''}"`,
            `"${s.roll_number || ''}"`,
            `"${s.email || ''}"`,
            `"${s.status || ''}"`,
            `"${s.integrity_score ?? 100}"`,
            `"${s.score || 0}"`
          ]

          questionsList.forEach(q => {
            const sub = s.submissions?.[q.id]
            if (sub) {
              row.push(`"${sub.score ?? 0}"`)
              const safeCode = (sub.code || '').replace(/"/g, '""')
              row.push(`"${safeCode}"`)
            } else {
              row.push('"0"')
              row.push('""')
            }
          })
          
          csvContent += row.join(",") + "\n"
        })
      }

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
      const url = URL.createObjectURL(blob)
      const link = document.createElement("a")
      link.setAttribute("href", url)
      link.setAttribute("download", `${examTitle.replace(/\s+/g, '_')}_${type.toUpperCase()}_Responses.csv`)
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
    } catch (err) {
      console.error('Failed to export CSV', err)
    } finally {
      setIsExporting(false)
    }
  }

  const handleToggleLang = (lang: string) => {
    setAllowedLangs(prev => 
      prev.includes(lang) ? prev.filter(l => l !== lang) : [...prev, lang]
    )
  }

  const filteredLogs = systemLogs.filter(log => 
    log.toLowerCase().includes(logsSearch.toLowerCase())
  )

  return (
    <div className="space-y-6 select-none">
      
      {/* Header Info */}
      <div className="flex items-center justify-between select-none border-b border-white/5 pb-4">
        <div>
          <h2 className="text-3xl font-semibold tracking-tight text-[#6f8eff] mb-2">
            // {activeSub === 'reports' ? 'COMPLIANCE AUDIT REPORTS' : activeSub === 'settings' ? 'GLOBAL PLATFORM CONFIG' : 'Telemetry Network Logs'}
          </h2>
          <span className="text-[11px] sys-text-body font-sans mt-1 block font-medium">
            {activeSub === 'reports' 
              ? 'Download evaluation summary sheets and audit registries' 
              : activeSub === 'settings' 
                ? 'Configure proctoring rules thresholds and defaults' 
                : 'Realtime proctoring cluster events timeline logs'
            }
          </span>
        </div>

        {activeSub === 'logs' && (
          <Button 
            onClick={handleRefreshLogs} 
            disabled={isRefreshingLogs}
            variant="outline" 
            className="border-white/5 sys-bg/20 h-8 text-[11px] font-bold sys-text-body hover:text-white rounded-xl transition cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${isRefreshingLogs ? 'animate-spin' : ''}`} strokeWidth={1.5} /> Update terminal
          </Button>
        )}
      </div>

      {/* ================= REPORTS SECTION ================= */}
      {activeSub === 'reports' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-stretch">
          
          <Card className="bg-[rgba(28,28,30,0.72)] backdrop-blur-[16px] border-white/5 p-8 rounded-2xl flex flex-col justify-between min-h-[420px]">
            <div className="space-y-4">
              <div className="p-3 bg-[#5B8CFF]/10 rounded-2xl w-12 h-12 flex items-center justify-center">
                <FileText className="w-6 h-6 text-[#5B8CFF]" strokeWidth={1.5} />
              </div>
              <h4 className="font-bold text-base text-white font-heading">Cohort Integrity Summary</h4>
              <p className="text-sm sys-text-body leading-relaxed font-sans">
                Full list details of all registered candidates, overall integrity rating indices, compiler scores, and timing parameters.
              </p>
            </div>
            <div className="pt-4 border-t border-white/5 flex flex-col gap-2">
              <select 
                value={pdfExportExamId} 
                onChange={e => setPdfExportExamId(e.target.value)}
                className="border border-white/5 bg-[rgba(28,28,30,0.72)] text-foreground rounded-xl text-xs px-3 py-1.5 outline-none cursor-pointer w-full focus:border-[#5B8CFF]/50"
              >
                {assessments.length === 0 && <option value="">No Assessments</option>}
                {assessments.map(a => (
                  <option key={a.id} value={a.id}>{a.title}</option>
                ))}
              </select>
              <Button 
                onClick={handleDownloadPDF}
                disabled={isExportingPDF || !pdfExportExamId}
                className="bg-[#3f6ad5] hover:bg-[#3254a8] text-white hover:shadow-[0_0_15px_rgba(63,106,213,0.6)] active:shadow-[0_0_8px_rgba(63,106,213,0.4)] rounded-xl text-xs h-9 px-4 flex items-center justify-center gap-1.5 shadow-md w-full disabled:opacity-50 transition"
              >
                <Download className="w-3.5 h-3.5" /> {isExportingPDF ? 'Generating...' : 'Download PDF'}
              </Button>
            </div>
          </Card>

          <Card className="bg-[rgba(28,28,30,0.72)] backdrop-blur-[16px] border-white/5 p-8 rounded-2xl flex flex-col justify-between min-h-[420px]">
            <div className="space-y-4">
              <div className="p-3 bg-[#14B8A6]/10 rounded-2xl w-12 h-12 flex items-center justify-center">
                <Database className="w-6 h-6 text-[#14B8A6]" strokeWidth={1.5} />
              </div>
              <h4 className="font-bold text-base text-white font-heading">Raw CSV Database Audit</h4>
              <p className="text-sm sys-text-body leading-relaxed font-sans">
                Compile spreadsheet row listings containing student identifiers, active socket connection logs, and compiler test-case details.
              </p>
            </div>
            <div className="pt-4 border-t border-white/5 flex flex-col gap-2">
              <select 
                value={exportExamId} 
                onChange={e => setExportExamId(e.target.value)}
                className="border border-white/5 bg-[rgba(28,28,30,0.72)] text-foreground rounded-xl text-xs px-3 py-1.5 outline-none cursor-pointer w-full focus:border-[#5B8CFF]/50"
              >
                {assessments.length === 0 && <option value="">No Assessments</option>}
                {assessments.map(a => (
                  <option key={a.id} value={a.id}>{a.title}</option>
                ))}
              </select>
              <div className="flex gap-2">
                <Button 
                  onClick={() => handleExportCSV('mcq')}
                  disabled={isExporting || !exportExamId}
                  className="flex-1 bg-[#3f6ad5] hover:bg-[#3254a8] text-white hover:shadow-[0_0_15px_rgba(63,106,213,0.6)] active:shadow-[0_0_8px_rgba(63,106,213,0.4)] rounded-xl text-xs h-9 px-4 flex items-center justify-center gap-1.5 shadow-md transition disabled:opacity-50"
                >
                  <Download className="w-3.5 h-3.5" /> 
                  {isExporting ? '...' : 'MCQ Data'}
                </Button>
                <Button 
                  onClick={() => handleExportCSV('coding')}
                  disabled={isExporting || !exportExamId}
                  className="flex-1 bg-[#3f6ad5] hover:bg-[#3254a8] text-white hover:shadow-[0_0_15px_rgba(63,106,213,0.6)] active:shadow-[0_0_8px_rgba(63,106,213,0.4)] rounded-xl text-xs h-9 px-4 flex items-center justify-center gap-1.5 shadow-md transition disabled:opacity-50"
                >
                  <Download className="w-3.5 h-3.5" /> 
                  {isExporting ? '...' : 'Coding Data'}
                </Button>
              </div>
            </div>
          </Card>

          <Card className="bg-[rgba(28,28,30,0.72)] backdrop-blur-[16px] border-white/5 p-8 rounded-2xl flex flex-col justify-between min-h-[420px]">
            <div className="space-y-4">
              <div className="p-3 bg-[#A855F7]/10 rounded-2xl w-12 h-12 flex items-center justify-center">
                <FileText className="w-6 h-6 text-[#A855F7]" strokeWidth={1.5} />
              </div>
              <h4 className="font-bold text-base text-white font-heading">Assessment Question Bank</h4>
              <p className="text-sm sys-text-body leading-relaxed font-sans">
                Export a beautifully formatted PDF containing all MCQs with answers, and coding challenges with complete constraints and test cases.
              </p>
            </div>
            <div className="pt-4 border-t border-white/5 flex flex-col gap-2">
              <select 
                value={pdfQuestionBankExamId} 
                onChange={e => setPdfQuestionBankExamId(e.target.value)}
                className="border border-white/5 bg-[rgba(28,28,30,0.72)] text-foreground rounded-xl text-xs px-3 py-1.5 outline-none cursor-pointer w-full focus:border-[#5B8CFF]/50"
              >
                {assessments.length === 0 && <option value="">No Assessments</option>}
                {assessments.map(a => (
                  <option key={a.id} value={a.id}>{a.title}</option>
                ))}
              </select>
              <Button 
                onClick={handleDownloadQuestionBankPDF}
                disabled={isExportingQuestionBank || !pdfQuestionBankExamId}
                className="w-full bg-[#3f6ad5] hover:bg-[#3254a8] text-white hover:shadow-[0_0_15px_rgba(63,106,213,0.6)] active:shadow-[0_0_8px_rgba(63,106,213,0.4)] rounded-xl text-xs h-9 px-4 flex items-center justify-center gap-1.5 shadow-md transition disabled:opacity-50"
              >
                <Download className="w-3.5 h-3.5" /> {isExportingQuestionBank ? 'Generating...' : 'Download PDF'}
              </Button>
            </div>
          </Card>

        </div>
      )}

      {/* ================= SETTINGS SECTION (macOS PANELS STYLE) ================= */}
      {activeSub === 'settings' && (
        <Card className="bg-[rgba(28,28,30,0.72)] backdrop-blur-[16px] border-white/5 rounded-2xl overflow-hidden shadow-xl grid grid-cols-1 md:grid-cols-12 min-h-[350px]">
          
          {/* macOS settings sub sidebar (3 cols) */}
          <div className="md:col-span-3 sys-bg/20 border-r border-white/5 p-4 flex flex-col gap-1.5">
            <button 
              onClick={() => setSettingsCategory('general')}
              className={`w-full text-left px-3 py-2 rounded-xl text-xs font-medium flex items-center gap-2.5 transition ${
                settingsCategory === 'general' ? 'bg-[#5B8CFF]/10 text-[#5B8CFF] font-bold' : 'sys-text-body hover:text-white hover:sys-bg/20'
              }`}
            >
              <GearIcon className="w-4.5 h-4.5" />
              <span>General Settings</span>
            </button>
            
            <button 
              onClick={() => setSettingsCategory('proctor')}
              className={`w-full text-left px-3 py-2 rounded-xl text-xs font-medium flex items-center gap-2.5 transition ${
                settingsCategory === 'proctor' ? 'bg-[#5B8CFF]/10 text-[#5B8CFF] font-bold' : 'sys-text-body hover:text-white hover:sys-bg/20'
              }`}
            >
              <Shield className="w-4.5 h-4.5" />
              <span>Proctoring Sandbox</span>
            </button>

            <button 
              onClick={() => setSettingsCategory('compilers')}
              className={`w-full text-left px-3 py-2 rounded-xl text-xs font-medium flex items-center gap-2.5 transition ${
                settingsCategory === 'compilers' ? 'bg-[#5B8CFF]/10 text-[#5B8CFF] font-bold' : 'sys-text-body hover:text-white hover:sys-bg/20'
              }`}
            >
              <Cpu className="w-4.5 h-4.5" />
              <span>Compilers Node</span>
            </button>
          </div>

          {/* Settings main panel content (9 cols) */}
          <div className="md:col-span-9 p-6">
            <form onSubmit={handleSaveSettings} className="space-y-6 text-xs h-full flex flex-col justify-between">
              
              <div className="space-y-5">
                {settingsCategory === 'general' && (
                  <div className="space-y-4 animate-fade-in">
                    <span className="text-[9px] font-mono sys-text-body uppercase tracking-widest block mb-2">GENERAL CONFIGURATIONS</span>
                    
                    <div className="p-4 sys-bg/40 border border-white/5 rounded-xl flex items-center justify-between">
                      <div className="space-y-0.5">
                        <span className="text-xs font-bold sys-text-primary block">Workspace Identifier Node</span>
                        <span className="text-[10px] sys-text-body font-sans">Active recruitment cluster location.</span>
                      </div>
                      <span className="text-xs font-mono font-bold sys-text-body">AMRITA_BATCH_2026</span>
                    </div>
                  </div>
                )}

                {settingsCategory === 'proctor' && (
                  <div className="space-y-4 animate-fade-in">
                    <span className="text-[9px] font-mono sys-text-body uppercase tracking-widest block mb-2">PROCTORING CONFIGURATION RULES</span>
                    
                    {/* Integrity threshold slider */}
                    <div className="space-y-2">
                      <div className="flex justify-between select-none">
                        <span className="sys-text-body font-bold">Minimum Integrity Threshold</span>
                        <span className="text-white font-mono font-bold">{integrityThreshold}%</span>
                      </div>
                      <input 
                        type="range" 
                        min={30} 
                        max={95} 
                        value={integrityThreshold}
                        onChange={e => setIntegrityThreshold(Number(e.target.value))}
                        className="w-full h-1 sys-card rounded-lg appearance-none cursor-pointer accent-[#5B8CFF]"
                      />
                      <span className="text-[10px] sys-text-body block leading-normal">
                        Candidates dropping below this compliance mark are flagged as critical on the proctor grid.
                      </span>
                    </div>

                    {/* Checkbox toggle params */}
                    <div className="space-y-3 pt-2">
                      <label className="flex items-center justify-between p-3.5 sys-bg/40 border border-white/5 rounded-xl cursor-pointer select-none">
                        <div className="space-y-0.5 pr-4">
                          <span className="text-xs font-bold sys-text-primary block">Hardware Camera Verification</span>
                          <span className="text-[10px] sys-text-body font-sans">Require active WebRTC camera monitoring feeds.</span>
                        </div>
                        <input 
                          type="checkbox" 
                          checked={proctorCamera} 
                          onChange={e => setProctorCamera(e.target.checked)}
                          className="w-4 h-4 rounded border-white/5 text-[#5B8CFF] focus:ring-0 sys-bg cursor-pointer" 
                        />
                      </label>

                      <label className="flex items-center justify-between p-3.5 sys-bg/40 border border-white/5 rounded-xl cursor-pointer select-none">
                        <div className="space-y-0.5 pr-4">
                          <span className="text-xs font-bold sys-text-primary block">Strict Tab-Switch Blocking</span>
                          <span className="text-[10px] sys-text-body font-sans">Log violations immediately when user loses focus of exam browser.</span>
                        </div>
                        <input 
                          type="checkbox" 
                          checked={proctorTabs} 
                          onChange={e => setProctorTabs(e.target.checked)}
                          className="w-4 h-4 rounded border-white/5 text-[#5B8CFF] focus:ring-0 sys-bg cursor-pointer" 
                        />
                      </label>
                    </div>

                  </div>
                )}

                {settingsCategory === 'compilers' && (
                  <div className="space-y-4 animate-fade-in">
                    <span className="text-[9px] font-mono sys-text-body uppercase tracking-widest block mb-2">ALLOWED COMPILER RUNTIMES</span>
                    
                    <div className="space-y-3">
                      {['python', 'javascript', 'java'].map(lang => (
                        <label key={lang} className="flex items-center justify-between p-3 sys-bg/40 border border-white/5 rounded-xl cursor-pointer select-none">
                          <span className="text-xs uppercase font-mono font-bold sys-text-primary">{lang}</span>
                          <input 
                            type="checkbox" 
                            checked={allowedLangs.includes(lang)}
                            onChange={() => handleToggleLang(lang)}
                            className="w-4 h-4 rounded border-white/5 text-[#5B8CFF] focus:ring-0 sys-bg cursor-pointer"
                          />
                        </label>
                      ))}
                    </div>

                    <div className="mt-8 pt-6 border-t border-white/5 space-y-4">
                      <span className="text-[9px] font-mono sys-text-body uppercase tracking-widest block mb-2">SANDBOX LIMITS</span>
                      
                      <div className="space-y-2">
                        <div className="flex justify-between select-none">
                          <span className="sys-text-body font-bold">Max Execution Time</span>
                          <span className="text-white font-mono font-bold">{maxExecutionTime}ms</span>
                        </div>
                        <input 
                          type="range" 
                          min={500} 
                          max={10000}
                          step={100}
                          value={maxExecutionTime}
                          onChange={e => setMaxExecutionTime(Number(e.target.value))}
                          className="w-full h-1 sys-card rounded-lg appearance-none cursor-pointer accent-[#5B8CFF]"
                        />
                      </div>
                      
                      <div className="space-y-2 pt-4">
                        <div className="flex justify-between select-none">
                          <span className="sys-text-body font-bold">Max Memory Allocation</span>
                          <span className="text-white font-mono font-bold">{maxMemoryLimit}MB</span>
                        </div>
                        <input 
                          type="range" 
                          min={64} 
                          max={1024}
                          step={32}
                          value={maxMemoryLimit}
                          onChange={e => setMaxMemoryLimit(Number(e.target.value))}
                          className="w-full h-1 sys-card rounded-lg appearance-none cursor-pointer accent-[#5B8CFF]"
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Form submit actions */}
              <div className="pt-6 border-t border-white/5 flex justify-end items-center gap-3">
                {saveSuccess && (
                  <span className="text-xs text-[#34D399] font-semibold flex items-center gap-1">
                    <Check className="w-3.5 h-3.5" /> Settings Saved
                  </span>
                )}
                
                <Button 
                  type="submit"
                  className="bg-[#3f6ad5] hover:bg-[#3254a8] hover:shadow-[0_0_15px_rgba(63,106,213,0.6)] active:shadow-[0_0_8px_rgba(63,106,213,0.4)] text-white rounded-xl text-xs h-10 px-6 font-bold cursor-pointer transition shadow-md"
                >
                  <Save className="w-4 h-4 mr-1.5" /> Save Changes
                </Button>
              </div>

            </form>
          </div>

        </Card>
      )}

      {/* ================= LOGS SECTION (HIGH FIDELITY TERMINAL) ================= */}
      {activeSub === 'logs' && (
        <Card className="bg-[#000000] border-white/5 rounded-2xl overflow-hidden shadow-2xl flex flex-col min-h-[380px]">
          
          {/* Terminal header controls */}
          <div className="bg-[rgba(28,28,30,0.72)] backdrop-blur-[16px] border-b border-white/5 px-4 py-2.5 flex justify-between items-center select-none text-[10px]">
            <span className="flex items-center sys-text-body font-mono font-bold">
              <TermIcon className="w-4.5 h-4.5 mr-2 sys-text-body" /> SYSTEM MONITOR TERMINAL
            </span>

            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1.5 p-1 px-3 sys-bg border border-white/5 rounded-xl">
                <Search className="w-3.5 h-3.5 sys-text-body" />
                <input 
                  type="text" 
                  value={logsSearch}
                  onChange={e => setLogsSearch(e.target.value)}
                  placeholder="Filter logs..."
                  className="bg-transparent border-0 p-0 text-[10px] text-white focus:outline-none focus:ring-0 placeholder:sys-text-body w-28 font-mono"
                />
              </div>
            </div>
          </div>

          {/* Terminal viewport window */}
          <div className="flex-1 p-4 font-mono text-[10px] sys-text-body overflow-y-auto space-y-2 select-text bg-[#000000]/50 leading-relaxed max-h-[300px]">
            {filteredLogs.map((log, index) => {
              let colorClass = 'sys-text-body'
              if (log.includes('[WEBRTC]') || log.includes('[COMPILER]')) colorClass = 'text-[#5B8CFF]'
              if (log.includes('[SECURITY]')) colorClass = 'text-[#34D399]'
              if (log.includes('[SYSTEM]')) colorClass = 'text-white font-bold'
              
              return (
                <div key={index} className={`truncate ${colorClass}`}>
                  {log}
                </div>
              )
            })}

            {filteredLogs.length === 0 && (
              <div className="p-8 text-center sys-text-body select-none">
                No logs matching query index.
              </div>
            )}
          </div>

        </Card>
      )}

    </div>
  )
}
