import { useState, useEffect } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { 
  Search, FileSpreadsheet, Eye, X, User, Code2, Activity
} from 'lucide-react'
import { CandidateSession, fetchCandidateSessions, Assessment } from '../../lib/assessmentEngine'

interface LeaderboardTabProps {
  assessments: Assessment[]
}

export default function LeaderboardTab({ assessments }: LeaderboardTabProps) {
  const [sessions, setSessions] = useState<CandidateSession[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedSession, setSelectedSession] = useState<CandidateSession | null>(null)
  
  // Search / filters
  const [search, setSearch] = useState('')
  const [filterExamId, setFilterExamId] = useState('all')

  const loadSessionsData = async () => {
    setLoading(true)
    const targetId = filterExamId === 'all' ? undefined : filterExamId
    const data = await fetchCandidateSessions(targetId)
    setSessions(data)
    setLoading(false)
  }

  useEffect(() => {
    loadSessionsData()
  }, [filterExamId])

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
  const getSortedRanks = (): (CandidateSession & { rank: number; violationsCount: number; durationSeconds: number })[] => {
    const formatted = sessions.map(s => {
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

    // Sort by status === submitted first, then by score desc, then by integrity score desc, then by duration asc
    const sorted = [...formatted].sort((a, b) => {
      if (a.status !== b.status) {
        return a.status === 'submitted' ? -1 : 1
      }
      if (b.score !== a.score) {
        return b.score - a.score
      }
      if (b.integrity_score !== a.integrity_score) {
        return b.integrity_score - a.integrity_score
      }
      return a.durationSeconds - b.durationSeconds
    })

    return sorted.map((s, index) => ({
      ...s,
      rank: index + 1
    }))
  }

  const handleExportCSV = () => {
    const sorted = getSortedRanks()
    let csvContent = 'data:text/csv;charset=utf-8,'
    csvContent += 'Rank,Name,Email,Roll Number,Status,Compiler Score %,Integrity Score %,Duration (s),Violations\n'
    
    sorted.forEach(s => {
      csvContent += `${s.rank},"${s.name}","${s.email}","${s.roll_number}",${s.status},${s.score},${s.integrity_score},${s.durationSeconds},${s.violationsCount}\n`
    })

    const encodedUri = encodeURI(csvContent)
    const link = document.createElement('a')
    link.setAttribute('href', encodedUri)
    link.setAttribute('download', `shieldai_audit_export_${filterExamId}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const sortedRanks = getSortedRanks()
  const filteredRanks = sortedRanks.filter(s => 
    s.name.toLowerCase().includes(search.toLowerCase()) || 
    s.email.toLowerCase().includes(search.toLowerCase()) ||
    s.roll_number.toLowerCase().includes(search.toLowerCase())
  )

  if (loading) {
    return (
      <div className="p-12 text-center text-xs font-mono sys-text-body animate-pulse select-none">
        Querying cohort statistics and integrity rankings...
      </div>
    )
  }

  return (
    <div className="space-y-8 select-none">
      
      {/* Header */}
      <div className="flex flex-wrap justify-between items-center gap-4 border-b border-white/5 pb-4">
        <div>
          <h2 className="text-[10px] font-mono font-bold tracking-widest text-[#5B8CFF] uppercase">// COHORT ANALYTICS & LEADERBOARD</h2>
          <span className="text-[10px] sys-text-body font-mono mt-1 block">Inspect student performance, compiler scores, and sandboxed infraction timelines</span>
        </div>

        <div className="flex items-center gap-3">
          <select 
            value={filterExamId} 
            onChange={e => setFilterExamId(e.target.value)}
            className="border border-white/5 bg-[rgba(28,28,30,0.72)] backdrop-blur-[16px] text-foreground rounded-xl text-xs px-3 py-1.5 font-semibold outline-none cursor-pointer focus:border-[#5B8CFF]/50"
          >
            <option value="all">All Assessments</option>
            {assessments.map(a => (
              <option key={a.id} value={a.id}>{a.title}</option>
            ))}
          </select>

          <Button 
            onClick={handleExportCSV}
            variant="outline" 
            className="border-white/5 sys-bg/20 h-9 text-xs font-bold sys-text-body hover:text-white cursor-pointer rounded-xl transition flex items-center gap-1.5"
          >
            <FileSpreadsheet className="w-4 h-4" /> Export CSV
          </Button>
        </div>
      </div>

      {/* Bento grid metric summary cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 select-none">
        <div className="bento-card p-5 flex flex-col justify-between min-h-28">
          <span className="text-[8px] font-mono font-bold sys-text-body uppercase tracking-widest">Invited Cohort</span>
          <div>
            <div className="text-3xl font-extrabold text-white font-number">{totalInvited}</div>
            <span className="text-[9px] sys-text-body font-mono mt-0.5 block">Candidates registered</span>
          </div>
        </div>

        <div className="bento-card p-5 flex flex-col justify-between min-h-28">
          <span className="text-[8px] font-mono font-bold sys-text-body uppercase tracking-widest">Completions</span>
          <div>
            <div className="text-3xl font-extrabold text-white font-number">{completions.length}</div>
            <span className="text-[9px] sys-text-body font-mono mt-0.5 block">Submissions logged</span>
          </div>
        </div>

        <div className="bento-card p-5 flex flex-col justify-between min-h-28">
          <span className="text-[8px] font-mono font-bold sys-text-body uppercase tracking-widest">Average Score</span>
          <div>
            <div className="text-3xl font-extrabold text-white font-number">{avgScore}%</div>
            <span className="text-[9px] sys-text-body font-mono mt-0.5 block">Compiler marks avg</span>
          </div>
        </div>

        <div className="bento-card p-5 flex flex-col justify-between min-h-28">
          <span className="text-[8px] font-mono font-bold sys-text-body uppercase tracking-widest">Pass Rate</span>
          <div>
            <div className="text-3xl font-extrabold text-[#34D399] font-number">{passRate}%</div>
            <span className="text-[9px] sys-text-body font-mono mt-0.5 block">Above {passThreshold}% passing marks</span>
          </div>
        </div>
      </div>

      {/* Ranks list container */}
      <div className="bento-card p-6 space-y-4">
        
        {/* Table controls */}
        <div className="flex flex-wrap justify-between items-center gap-4 select-none">
          <span className="text-[9px] font-mono font-bold sys-text-body uppercase tracking-widest">// COHORT EVALUATION LEADERBOARD</span>
          
          <div className="flex items-center gap-2 max-w-sm w-full sys-bg/40 border border-white/5 rounded-xl px-3 py-1.5">
            <Search className="w-3.5 h-3.5 sys-text-body" />
            <input 
              type="text" 
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search by name, email, roll..."
              className="bg-transparent border-0 p-0 text-xs text-white placeholder:sys-text-body focus:outline-none focus:ring-0 w-full"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-white/5 sys-text-body font-mono text-[9px] uppercase tracking-wider select-none">
                <th className="py-3 px-4">Rank</th>
                <th className="py-3 px-4">Candidate Profile</th>
                <th className="py-3 px-4">Roll Number</th>
                <th className="py-3 px-4">Compiler Marks</th>
                <th className="py-3 px-4">Integrity Auditing</th>
                <th className="py-3 px-4">Timeline status</th>
                <th className="py-3 px-4 text-right">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {filteredRanks.map(s => {
                const isPassed = s.score >= passThreshold
                const isComp = s.status === 'submitted'
                
                return (
                  <tr 
                    key={s.id} 
                    className="hover:sys-bg/20 transition duration-150"
                  >
                    <td className="py-3.5 px-4 font-mono font-bold sys-text-body">#{s.rank}</td>
                    <td className="py-3.5 px-4">
                      <div className="flex flex-col">
                        <span className="font-bold text-white">{s.name}</span>
                        <span className="text-[10px] sys-text-body font-mono mt-0.5">{s.email}</span>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 font-mono font-bold sys-text-body uppercase">{s.roll_number || 'N/A'}</td>
                    <td className="py-3.5 px-4">
                      {isComp ? (
                        <div className="flex items-center gap-1.5">
                          <span className={`font-mono font-bold text-sm ${isPassed ? 'text-[#34D399]' : 'text-[#F87171]'}`}>{s.score}%</span>
                          <span className={`text-[8.5px] px-1.5 py-0.2 rounded font-bold ${isPassed ? 'bg-[#34D399]/15 text-[#34D399]' : 'bg-[#F87171]/15 text-[#F87171]'}`}>
                            {isPassed ? 'Passed' : 'Failed'}
                          </span>
                        </div>
                      ) : (
                        <span className="sys-text-body font-mono font-bold">Unattempted</span>
                      )}
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-2">
                        <span className={`font-mono font-bold ${s.integrity_score < 75 ? 'text-[#F87171]' : 'sys-text-primary'}`}>
                          {s.integrity_score}%
                        </span>
                        <span className="text-[8px] sys-text-body font-mono font-semibold">({s.violationsCount} warnings)</span>
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      <span className={`px-2 py-0.5 rounded text-[8.5px] font-mono font-bold uppercase tracking-wider ${
                        s.status === 'submitted' ? 'bg-[#34D399]/10 text-[#34D399] border border-[#34D399]/35' : 
                        s.status === 'testing' ? 'bg-[#5B8CFF]/10 text-[#5B8CFF] border border-[#5B8CFF]/35 animate-pulse' :
                        'sys-card sys-text-body'
                      }`}>
                        {s.status}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <Button 
                        onClick={() => setSelectedSession(s)}
                        variant="ghost" 
                        size="sm"
                        className="h-8 px-3 hover:sys-card sys-text-body hover:text-white rounded-xl transition cursor-pointer flex items-center gap-1.5 ml-auto"
                      >
                        <Eye className="w-3.5 h-3.5" /> Inspect
                      </Button>
                    </td>
                  </tr>
                )
              })}

              {filteredRanks.length === 0 && (
                <tr>
                  <td colSpan={7} className="py-8 text-center sys-text-body font-mono text-xs">
                    No matching records found in student database ranks.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

      </div>

      {/* Visual Debugger Inspection details Modal overlay */}
      {selectedSession && (
        <div className="fixed inset-0 bg-black/80  z-[9999] flex items-center justify-center p-4">
          <Card className="w-full max-w-4xl bg-[rgba(28,28,30,0.72)] backdrop-blur-[16px] border-white/5 p-6 rounded-2xl relative shadow-2xl overflow-y-auto max-h-[90vh]">
            <div className="absolute top-0 left-0 right-0 h-[3px] sys-bg rounded-t-2xl" />
            
            {/* Modal header */}
            <div className="flex justify-between items-start pb-4 border-b border-white/5 mb-6">
              <div className="flex items-center gap-3">
                <div className="p-2 sys-bg border border-white/5 rounded-xl">
                  <User className="w-5 h-5 text-[#5B8CFF]" strokeWidth={1.5} />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-white font-heading">{selectedSession.name}</h3>
                  <span className="text-[10px] sys-text-body font-mono mt-1 block">Roll: {selectedSession.roll_number} | Email: {selectedSession.email}</span>
                </div>
              </div>

              <Button 
                onClick={() => setSelectedSession(null)}
                variant="ghost" 
                size="sm"
                className="h-8 w-8 p-0 hover:sys-card sys-text-body hover:text-white rounded-lg cursor-pointer"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>

            {/* Modal details columns */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-6 select-none">
              
              {/* Left Column: Stats & logs (5 cols) */}
              <div className="md:col-span-5 space-y-6">
                
                <div className="p-4 sys-bg/40 border border-white/5 rounded-xl space-y-3.5 text-xs">
                  <span className="text-[8.5px] font-mono font-bold sys-text-body uppercase tracking-widest block border-b border-white/5 pb-1.5">// AUDITING SUMMARIES</span>
                  
                  <div className="flex justify-between">
                    <span className="sys-text-body font-mono">Compiler Score:</span>
                    <span className="font-bold text-white">{selectedSession.score}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="sys-text-body font-mono">Security Index:</span>
                    <span className={`font-bold ${selectedSession.integrity_score < 75 ? 'text-[#F87171]' : 'text-[#34D399]'}`}>{selectedSession.integrity_score}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="sys-text-body font-mono">Time Started:</span>
                    <span className="sys-text-body font-mono">{selectedSession.startedAt ? new Date(selectedSession.startedAt).toLocaleTimeString() : 'Unknown'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="sys-text-body font-mono">Time Finished:</span>
                    <span className="sys-text-body font-mono">{selectedSession.submittedAt ? new Date(selectedSession.submittedAt).toLocaleTimeString() : 'In Progress'}</span>
                  </div>
                </div>

                {/* Telemetry warning timeline logs */}
                <div className="bg-black/80 border border-white/5 rounded-xl p-4 font-mono text-[9px] sys-text-body space-y-2 select-text overflow-y-auto h-64">
                  <span className="text-[8px] uppercase font-bold sys-text-body tracking-widest block select-none border-b border-white/5 pb-1.5 mb-2 flex items-center gap-1.5">
                    <Activity className="w-3.5 h-3.5 text-[#F87171]" /> REAL-TIME AUDIT LOGS
                  </span>
                  {selectedSession.violation_logs?.map((log, index) => (
                    <div 
                      key={index}
                      className={`leading-relaxed border-b border-white/5 pb-1.5 ${
                        log.includes('ALERT') || log.includes('lost') || log.includes('switch') 
                          ? 'text-[#F87171] font-bold' 
                          : 'sys-text-body'
                      }`}
                    >
                      {log}
                    </div>
                  ))}
                </div>

              </div>

              {/* Right Column: Code Submissions & Terminal (7 cols) */}
              <div className="md:col-span-7 space-y-6">
                <span className="text-[9px] font-mono font-bold sys-text-body uppercase tracking-widest block select-none">// COMPILER SUBMISSIONS INSPECTOR</span>
                
                <div className="space-y-4 max-h-[380px] overflow-y-auto pr-1">
                  {Object.entries(selectedSession.submissions || {}).map(([qId, sub]) => (
                    <div key={qId} className="p-4 sys-bg/45 border border-white/5 rounded-xl space-y-3.5">
                      <div className="flex justify-between items-center pb-2 border-b border-white/5 select-none">
                        <span className="font-bold text-white text-xs flex items-center gap-1.5 font-heading">
                          <Code2 className="w-4 h-4 sys-text-body" /> Challenge #{qId.slice(0, 4)}
                        </span>
                        
                        <span className={`px-2 py-0.5 rounded text-[8.5px] font-mono font-bold uppercase tracking-wider ${
                          sub.status === 'Accepted' ? 'bg-[#34D399]/15 text-[#34D399] border border-[#34D399]/35' : 'bg-[#F87171]/15 text-[#F87171] border border-[#F87171]/35'
                        }`}>
                          {sub.status}
                        </span>
                      </div>

                      {/* Code Block display */}
                      <div className="space-y-1">
                        <span className="text-[8px] font-mono sys-text-body uppercase select-none">Submitted Code ({sub.language})</span>
                        <pre className="p-3 bg-black rounded-lg border border-white/5 text-[9.5px] font-mono sys-text-primary overflow-x-auto select-text leading-relaxed whitespace-pre">
                          {sub.code}
                        </pre>
                      </div>

                      {/* Passed cases metrics */}
                      <div className="flex justify-between text-[9px] font-mono sys-text-body select-none">
                        <span>Cases Passed: <strong className="text-white">{sub.cases_passed} / {sub.total_cases}</strong></span>
                        <span>Execution time: <strong className="text-white">{sub.execution_time} ms</strong></span>
                      </div>
                    </div>
                  ))}

                  {Object.keys(selectedSession.submissions || {}).length === 0 && (
                    <div className="p-8 text-center border border-dashed border-white/5 rounded-xl text-xs font-mono sys-text-body select-none">
                      No code submissions saved for this session checklist yet.
                    </div>
                  )}
                </div>

              </div>

            </div>
          </Card>
        </div>
      )}

    </div>
  )
}
