import { useState, useEffect } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { 
  Search, ShieldAlert, Award, FileSpreadsheet,
  CheckCircle2, Eye, X, Hash, Mail, User, Code2
} from 'lucide-react'
import { CandidateSession, fetchCandidateSessions, Assessment } from '../../lib/assessmentEngine'

interface LeaderboardTabProps {
  assessments: Assessment[]
  selectedAssessmentId?: string
}

export default function LeaderboardTab({ assessments, selectedAssessmentId }: LeaderboardTabProps) {
  const [sessions, setSessions] = useState<CandidateSession[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedSession, setSelectedSession] = useState<CandidateSession | null>(null)
  
  // Search / filters
  const [search, setSearch] = useState('')
  const [filterExamId, setFilterExamId] = useState(selectedAssessmentId || 'all')

  const loadSessionsData = async () => {
    setLoading(true)
    const targetId = filterExamId === 'all' ? undefined : filterExamId
    const data = await fetchCandidateSessions(targetId)
    setSessions(data)
    setLoading(false)
  }

  useEffect(() => {
    loadSessionsData()
  }, [filterExamId, selectedAssessmentId])

  useEffect(() => {
    if (selectedAssessmentId) {
      setFilterExamId(selectedAssessmentId)
    }
  }, [selectedAssessmentId])

  // Calculations
  const completions = sessions.filter(s => s.status === 'submitted')
  const totalInvited = sessions.length
  const avgScore = completions.length > 0 
    ? Math.round(completions.reduce((acc, s) => acc + s.score, 0) / completions.length) 
    : 0

  const activeAss = assessments.find(a => a.id === filterExamId)
  const passThreshold = activeAss?.passing_score || 70

  const passingCompletions = completions.filter(s => s.score >= passThreshold)
  const passRate = completions.length > 0 
    ? Math.round((passingCompletions.length / completions.length) * 100) 
    : 0

  // Sort Leaderboard
  // Score DESC, Violations ASC, Time Taken ASC
  const getSortedRanks = (): (CandidateSession & { rank: number; violationsCount: number; durationSeconds: number })[] => {
    const formatted = sessions.map(s => {
      // Calculate violations count
      const violationsCount = s.violation_logs.filter(l => l.includes('ALERT') || l.includes('violation') || l.includes('lost') || l.includes('switching')).length
      
      let durationSeconds = 0
      if (s.startedAt && s.submittedAt) {
        durationSeconds = Math.max(0, Math.floor((new Date(s.submittedAt).getTime() - new Date(s.startedAt).getTime()) / 1000))
      }

      return {
        ...s,
        violationsCount,
        durationSeconds
      }
    })

    // Filter by search matching Name, Roll or Email
    const filtered = formatted.filter(s => 
      s.name.toLowerCase().includes(search.toLowerCase()) ||
      s.email.toLowerCase().includes(search.toLowerCase()) ||
      s.roll_number.toLowerCase().includes(search.toLowerCase())
    )

    // Sort by Score (desc), then violations count (asc), then duration (asc)
    return filtered
      .sort((a, b) => {
        if (b.score !== a.score) return b.score - a.score
        if (a.violationsCount !== b.violationsCount) return a.violationsCount - b.violationsCount
        return a.durationSeconds - b.durationSeconds
      })
      .map((s, idx) => ({ ...s, rank: idx + 1 }))
  }

  // Export CSV
  const handleExportCSV = () => {
    if (sessions.length === 0) return
    const headers = ['Rank', 'Name', 'Email', 'Roll Number', 'Assessment ID', 'Status', 'Score (%)', 'Integrity Score (%)', 'Infraction Warnings Count', 'Started Time', 'Submitted Time']
    
    const sorted = getSortedRanks()
    const rows = sorted.map(s => [
      s.rank,
      s.name,
      s.email,
      s.assessment_id,
      s.status,
      s.score,
      s.integrity_score,
      s.violationsCount,
      s.startedAt ? new Date(s.startedAt).toLocaleString() : '',
      s.submittedAt ? new Date(s.submittedAt).toLocaleString() : ''
    ])

    const csvContent = "data:text/csv;charset=utf-8," 
      + [headers.join(','), ...rows.map(e => e.map(val => `"${String(val).replace(/"/g, '""')}"`).join(','))].join('\n')
    
    const encodedUri = encodeURI(csvContent)
    const link = document.createElement("a")
    link.setAttribute("href", encodedUri)
    const activeTitle = activeAss ? activeAss.title.replace(/\s+/g, '_') : 'Cohort'
    link.setAttribute("download", `ShieldAI_${activeTitle}_Leaderboard_${new Date().toISOString().slice(0, 10)}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }



  if (loading) {
    return (
      <div className="p-12 text-center text-xs font-mono text-sky-400">
        Loading evaluations database metrics...
      </div>
    )
  }

  const rankedItems = getSortedRanks()

  return (
    <div className="space-y-6">
      
      {/* STATS OVERVIEW CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* Total Invited */}
        <Card className="bg-neutral-900 border-sky-955 p-4 rounded-2xl flex items-center gap-4">
          <div className="p-3 bg-sky-950/40 rounded-xl border border-sky-900/40">
            <Mail className="w-5 h-5 text-sky-400" />
          </div>
          <div>
            <span className="text-[10px] uppercase font-mono text-neutral-500 font-bold block">Assessed In Lobby</span>
            <span className="text-xl font-bold font-mono text-neutral-100">{totalInvited} Candidates</span>
          </div>
        </Card>

        {/* Completions */}
        <Card className="bg-neutral-900 border-sky-955 p-4 rounded-2xl flex items-center gap-4">
          <div className="p-3 bg-emerald-950/30 rounded-xl border border-emerald-900/30">
            <CheckCircle2 className="w-5 h-5 text-emerald-400" />
          </div>
          <div>
            <span className="text-[10px] uppercase font-mono text-neutral-500 font-bold block">Submissions Sync</span>
            <span className="text-xl font-bold font-mono text-neutral-100">{completions.length} Completed</span>
          </div>
        </Card>

        {/* Average Score */}
        <Card className="bg-neutral-900 border-sky-955 p-4 rounded-2xl flex items-center gap-4">
          <div className="p-3 bg-blue-950/40 rounded-xl border border-blue-900/40">
            <Award className="w-5 h-5 text-blue-400" />
          </div>
          <div>
            <span className="text-[10px] uppercase font-mono text-neutral-500 font-bold block">Average Score</span>
            <span className="text-xl font-bold font-mono text-neutral-100">{avgScore}% Class Avg</span>
          </div>
        </Card>

        {/* Passing Rate */}
        <Card className="bg-neutral-900 border-sky-955 p-4 rounded-2xl flex items-center gap-4">
          <div className="p-3 bg-purple-950/40 rounded-xl border border-purple-900/40">
            <ShieldAlert className="w-5 h-5 text-purple-400" />
          </div>
          <div>
            <span className="text-[10px] uppercase font-mono text-neutral-500 font-bold block">Passing Rate</span>
            <span className="text-xl font-bold font-mono text-neutral-100">{passRate}% (Pass &gt;= {passThreshold}%)</span>
          </div>
        </Card>
      </div>

      {/* FILTER SEARCH GRID */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 bg-neutral-900/10 border border-sky-950 rounded-2xl">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex bg-neutral-950 border border-sky-950 rounded-xl px-3 py-1.5 items-center gap-2 max-w-xs focus-within:border-sky-500 transition duration-300">
            <Search className="w-4 h-4 text-neutral-600" />
            <input 
              type="text" 
              value={search} 
              onChange={e => setSearch(e.target.value)}
              className="bg-transparent border-0 p-0 text-xs text-neutral-100 outline-none w-full font-semibold focus:ring-0"
              placeholder="Search candidate name, email, roll..." 
            />
          </div>

          {!selectedAssessmentId && (
            <select 
              value={filterExamId} 
              onChange={e => setFilterExamId(e.target.value)}
              className="bg-neutral-950 border border-sky-950 text-neutral-100 rounded-xl p-2 text-xs outline-none focus:border-sky-500 font-bold"
            >
              <option value="all">All Assessments</option>
              {assessments.map(a => (
                <option key={a.id} value={a.id}>{a.title}</option>
              ))}
            </select>
          )}
        </div>

        <Button onClick={handleExportCSV} disabled={rankedItems.length === 0} className="bg-sky-950/40 hover:bg-sky-950/60 border border-sky-900/40 text-sky-400 text-xs px-4 h-9 gap-1.5 rounded-xl cursor-pointer">
          <FileSpreadsheet className="w-4 h-4" /> Export Leaderboard CSV
        </Button>
      </div>

      {/* RANKINGS GRID TABLE */}
      <Card className="bg-neutral-900/20 border-sky-950 rounded-2xl overflow-x-auto">
        <table className="w-full border-collapse text-left text-xs text-neutral-350">
          <thead>
            <tr className="bg-neutral-950/70 border-b border-sky-950/40 font-mono text-[9px] uppercase tracking-wider text-sky-400 font-bold">
              <th className="p-4">Rank</th>
              <th className="p-4">Name / Roll</th>
              <th className="p-4">Email</th>
              <th className="p-4 text-center">Status</th>
              <th className="p-4 text-center">Compiler Score</th>
              <th className="p-4 text-center">Integrity Index</th>
              <th className="p-4 text-center">Infractions</th>
              <th className="p-4 text-center">Actions</th>
            </tr>
          </thead>
          <tbody>
            {rankedItems.map(item => (
              <tr key={item.id} className="border-b border-sky-950/15 hover:bg-sky-950/5 transition">
                <td className="p-4 font-mono font-bold text-sky-500">
                  #{item.rank}
                </td>
                <td className="p-4">
                  <div className="font-extrabold text-neutral-100 text-xs">{item.name}</div>
                  <div className="text-[10px] text-neutral-500 font-mono mt-0.5">{item.roll_number || 'N/A'}</div>
                </td>
                <td className="p-4 font-mono text-neutral-400">
                  {item.email}
                </td>
                <td className="p-4 text-center">
                  <span className={`px-2 py-0.5 rounded text-[8px] font-mono font-bold capitalize select-none ${
                    item.status === 'submitted' 
                      ? 'bg-emerald-950/30 text-emerald-400' 
                      : 'bg-amber-955/35 text-amber-500'
                  }`}>
                    {item.status}
                  </span>
                </td>
                <td className="p-4 text-center font-mono font-black text-xs text-sky-400">
                  {item.score}%
                </td>
                <td className="p-4 text-center">
                  <span className={`font-mono font-bold ${
                    item.integrity_score > 75 ? 'text-emerald-400' : 'text-red-400 animate-pulse'
                  }`}>{item.integrity_score}%</span>
                </td>
                <td className="p-4 text-center font-mono text-red-400/80 font-bold">
                  {item.violationsCount} warning(s)
                </td>
                <td className="p-4 text-center">
                  <Button 
                    onClick={() => setSelectedSession(item)}
                    variant="ghost" 
                    size="sm" 
                    className="h-7 px-3 text-[10px] bg-neutral-950 border border-sky-950 text-neutral-350 hover:text-white rounded-lg gap-1 border-sky-955 font-bold hover:bg-sky-950/10 cursor-pointer"
                  >
                    <Eye className="w-3.5 h-3.5" /> Audit Details
                  </Button>
                </td>
              </tr>
            ))}

            {rankedItems.length === 0 && (
              <tr>
                <td colSpan={8} className="text-center p-8 text-neutral-500 font-mono">
                  No active rankings sync found inside the selected parameters.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </Card>

      {/* DETAILED STUDENT COMPILER AND PROCTOR AUDIT MODAL */}
      {selectedSession && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
          <Card className="w-full max-w-4xl bg-neutral-900 border-sky-950 p-6 rounded-3xl relative overflow-hidden h-[90vh] flex flex-col justify-between">
            <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-sky-400 to-blue-500" />
            
            {/* Modal Header */}
            <div className="flex justify-between items-start border-b border-sky-950 pb-4 select-none">
              <div>
                <span className="text-[9px] font-mono font-bold text-sky-400 uppercase tracking-widest leading-none">Security integrity audit registry</span>
                <h3 className="text-base font-black text-neutral-100 flex items-center gap-2 mt-1">
                  <User className="w-4 h-4 text-sky-400" /> {selectedSession.name}
                </h3>
                <div className="flex items-center gap-3 text-[9px] font-mono text-neutral-500 mt-1">
                  <span className="flex items-center gap-0.5"><Hash className="w-3 h-3" /> {selectedSession.roll_number || 'N/A'}</span>
                  <span className="flex items-center gap-0.5"><Mail className="w-3 h-3" /> {selectedSession.email}</span>
                </div>
              </div>

              <Button onClick={() => setSelectedSession(null)} variant="ghost" size="sm" className="h-8 w-8 p-0 hover:bg-neutral-800 text-neutral-400">
                <X className="w-4 h-4" />
              </Button>
            </div>

            {/* Modal Body scrollable area */}
            <div className="flex-1 overflow-y-auto py-5 grid grid-cols-1 md:grid-cols-12 gap-6 min-h-0">
              
              {/* Left Grid: Infraction telemetry alerts list (4 size) */}
              <div className="md:col-span-4 space-y-4">
                <div className="text-[10px] font-mono font-bold text-red-400 uppercase tracking-widest flex items-center gap-1">
                  <ShieldAlert className="w-3.5 h-3.5" /> Infraction Events Log
                </div>

                <div className="bg-[#030508] border border-sky-955 rounded-xl p-3 h-[45vh] overflow-y-auto space-y-3 font-mono text-[9px] text-neutral-400 leading-relaxed">
                  {selectedSession.violation_logs.map((log, idx) => (
                    <div key={idx} className={`p-2 rounded border ${
                      log.includes('ALERT') || log.includes('violation') || log.includes('lost') || log.includes('switching')
                        ? 'bg-red-950/20 border-red-950/30 text-red-400 font-bold' 
                        : 'bg-neutral-900 border-neutral-900 text-neutral-500'
                    }`}>
                      {log}
                    </div>
                  ))}

                  {selectedSession.violation_logs.length === 0 && (
                    <div className="text-center text-neutral-600 p-8">No integrity violations recorded. Passed verification compliance!</div>
                  )}
                </div>
              </div>

              {/* Right Grid: Code Files compiled views (8 size) */}
              <div className="md:col-span-8 space-y-4">
                <div className="text-[10px] font-mono font-bold text-sky-400 uppercase tracking-widest flex items-center gap-1">
                  <Code2 className="w-3.5 h-3.5" /> Code Submissions Inspector
                </div>

                <div className="space-y-4 h-[45vh] overflow-y-auto pr-1">
                  {Object.entries(selectedSession.submissions).map(([qid, sub]) => (
                    <Card key={qid} className="bg-neutral-950 border border-sky-955 rounded-2xl overflow-hidden shadow-none">
                      <div className="bg-neutral-900 px-4 py-2 border-b border-sky-955/50 flex justify-between items-center text-xs">
                        <div className="font-extrabold text-[11px] text-neutral-200">Question ID: {qid}</div>
                        <div className="flex items-center gap-2">
                          <span className="capitalize font-mono text-[9px] text-neutral-400 bg-neutral-950 border border-neutral-800 px-2 py-0.5 rounded">
                            {sub.language}
                          </span>
                          <span className={`px-2 py-0.5 rounded text-[8px] font-mono font-bold uppercase ${
                            sub.status === 'Accepted' 
                              ? 'bg-emerald-950/30 text-emerald-400' 
                              : 'bg-red-950/30 text-red-400'
                          }`}>
                            {sub.status}
                          </span>
                        </div>
                      </div>

                      <CardContent className="p-4 space-y-3.5">
                        <div className="text-[10px] text-neutral-400 grid grid-cols-3 gap-2 font-mono pb-2 border-b border-sky-950/30">
                          <div>Cases: <span className="text-neutral-100 font-bold">{sub.cases_passed} / {sub.total_cases}</span></div>
                          <div>Avg Time: <span className="text-neutral-100 font-bold">{sub.execution_time}ms</span></div>
                          <div>Score: <span className="text-sky-400 font-bold">{sub.score}%</span></div>
                        </div>

                        <div className="relative">
                          <pre className="bg-[#030508] p-3 text-[10.5px] font-mono text-sky-305 border border-sky-950/20 rounded-xl overflow-x-auto whitespace-pre-wrap max-h-56 leading-relaxed select-text">
                            {sub.code}
                          </pre>
                        </div>
                      </CardContent>
                    </Card>
                  ))}

                  {Object.keys(selectedSession.submissions).length === 0 && (
                    <div className="text-center text-neutral-500 font-mono text-xs p-12 bg-neutral-950 border rounded-2xl">
                      No code snapshots submitted yet.
                    </div>
                  )}
                </div>
              </div>

            </div>

            {/* Modal Footer */}
            <div className="border-t border-sky-950 pt-4 flex justify-between items-center select-none text-[10px] font-mono text-neutral-500">
              <div className="flex gap-4">
                <span>Started: <strong>{selectedSession.startedAt ? new Date(selectedSession.startedAt).toLocaleString() : 'N/A'}</strong></span>
                {selectedSession.submittedAt && (
                  <span>Submitted: <strong>{new Date(selectedSession.submittedAt).toLocaleString()}</strong></span>
                )}
              </div>
              <Button onClick={() => setSelectedSession(null)} className="bg-sky-950 border border-sky-900 text-sky-400 text-xs px-5 h-8 hover:bg-sky-900/10 rounded-lg">
                Close Inspector
              </Button>
            </div>

          </Card>
        </div>
      )}

    </div>
  )
}
