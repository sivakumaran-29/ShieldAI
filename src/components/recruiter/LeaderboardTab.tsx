import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { 
  Search, FileSpreadsheet, X, User, Code2, Activity, ChevronRight
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
      <div className="flex flex-wrap justify-between items-center gap-4 border-b border-divider pb-4">
        <div>
          <h2 className="text-3xl font-semibold tracking-tight text-[#6f8eff] mb-2">// COHORT ANALYTICS & LEADERBOARD</h2>
          <span className="text-[11px] sys-text-body font-sans mt-1 block font-medium">Inspect student performance, compiler scores, and sandboxed infraction timelines</span>
        </div>

        <div className="flex items-center gap-3">
          <select 
            value={filterExamId} 
            onChange={e => setFilterExamId(e.target.value)}
            className="border border-divider bg-panel backdrop-blur-[16px] text-foreground rounded-xl text-xs px-3 py-1.5 font-semibold outline-none cursor-pointer focus:border-[#5B8CFF]/50"
          >
            <option value="all">All Assessments</option>
            {assessments.map(a => (
              <option key={a.id} value={a.id}>{a.title}</option>
            ))}
          </select>

          <Button 
            onClick={handleExportCSV}
            variant="outline" 
            className="border-divider bg-hover h-9 text-xs font-bold sys-text-body hover:text-primary cursor-pointer rounded-xl transition flex items-center gap-1.5"
          >
            <FileSpreadsheet className="w-4 h-4" /> Export CSV
          </Button>
        </div>
      </div>

      {/* Bento grid metric summary cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 select-none">
        <div className="bg-card backdrop-blur-[24px] border border-divider p-6 rounded-2xl flex flex-col justify-between min-h-32 shadow-xl hover:shadow-[0_0_30px_rgba(255,255,255,0.03)] hover:border-border-strong transition-all duration-300">
          <span className="text-[11px] font-heading font-semibold text-tertiary uppercase tracking-widest">Invited Cohort</span>
          <div className="mt-4">
            <div className="text-4xl font-extrabold text-primary font-number">{totalInvited}</div>
            <span className="text-xs sys-text-body font-sans mt-1 block">Candidates registered</span>
          </div>
        </div>

        <div className="bg-card backdrop-blur-[24px] border border-divider p-6 rounded-2xl flex flex-col justify-between min-h-32 shadow-xl hover:shadow-[0_0_30px_rgba(255,255,255,0.03)] hover:border-border-strong transition-all duration-300">
          <span className="text-[11px] font-heading font-semibold text-tertiary uppercase tracking-widest">Completions</span>
          <div className="mt-4">
            <div className="text-4xl font-extrabold text-primary font-number">{completions.length}</div>
            <span className="text-xs sys-text-body font-sans mt-1 block">Submissions logged</span>
          </div>
        </div>

        <div className="bg-card backdrop-blur-[24px] border border-divider p-6 rounded-2xl flex flex-col justify-between min-h-32 shadow-xl hover:shadow-[0_0_30px_rgba(255,255,255,0.03)] hover:border-border-strong transition-all duration-300">
          <span className="text-[11px] font-heading font-semibold text-tertiary uppercase tracking-widest">Average Score</span>
          <div className="mt-4">
            <div className="text-4xl font-extrabold text-primary font-number">{avgScore}%</div>
            <span className="text-xs sys-text-body font-sans mt-1 block">Compiler marks avg</span>
          </div>
        </div>

        <div className="bg-card backdrop-blur-[24px] border border-divider p-6 rounded-2xl flex flex-col justify-between min-h-32 shadow-xl hover:shadow-[0_0_30px_rgba(255,255,255,0.03)] hover:border-border-strong transition-all duration-300">
          <span className="text-[11px] font-heading font-semibold text-tertiary uppercase tracking-widest">Pass Rate</span>
          <div className="mt-4">
            <div className="text-4xl font-extrabold text-[#34D399] font-number">{passRate}%</div>
            <span className="text-xs sys-text-body font-sans mt-1 block">Above {passThreshold}% passing marks</span>
          </div>
        </div>
      </div>

      {/* Ranks list container */}
      <div className="bento-card p-6 space-y-4">
        
        {/* Table controls */}
        <div className="flex flex-wrap justify-between items-center gap-4 select-none">
          <span className="text-[12px] font-heading font-bold text-[#6f8eff] uppercase tracking-wider">// COHORT ANALYTICS & LEADERBOARD</span>
          
          <div className="flex items-center gap-2 max-w-sm w-full sys-bg/40 border border-divider rounded-xl px-3 py-1.5">
            <Search className="w-3.5 h-3.5 sys-text-body" />
            <input 
              type="text" 
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search by name, email, roll..."
              className="bg-transparent border-0 p-0 text-xs text-primary placeholder:sys-text-body focus:outline-none focus:ring-0 w-full"
            />
          </div>
        </div>

        <div className="overflow-hidden pb-4">
          <div className="border border-divider rounded-2xl overflow-hidden bg-panel w-full">
            <table className="w-full text-left text-xs table-fixed">
              <thead className="table-header-group">
                <tr className="bg-panel backdrop-blur-[16px] sys-text-body font-sans font-semibold text-[8px] md:text-[10px] uppercase tracking-wider border-b border-divider select-none">
                  <th className="py-2 lg:py-4 px-2 lg:px-5">Rank</th>
                  <th className="py-2 lg:py-4 px-2 lg:px-5">Candidate Profile</th>
                  <th className="py-2 lg:py-4 px-2 lg:px-5">Roll Number</th>
                  <th className="py-2 lg:py-4 px-2 lg:px-5">Compiler Marks</th>
                  <th className="py-2 lg:py-4 px-2 lg:px-5">Integrity Auditing</th>
                  <th className="py-2 lg:py-4 px-2 lg:px-5">Timeline status</th>
                  <th className="py-2 lg:py-4 px-2 lg:px-5 text-center">Details</th>
                </tr>
              </thead>
            <tbody className="table-row-group divide-y lg:divide-divider">
              {filteredRanks.map(s => {
                const isPassed = s.score >= passThreshold
                const isComp = s.status === 'submitted'
                
                return (
                  <tr 
                    key={s.id} 
                    className="hover:bg-hover transition duration-150 group/row table-row p-4 p-0 mb-4 mb-0 border border-divider  rounded-2xl  bg-panel "
                  >
                    <td className="py-2 lg:py-4 px-2 lg:px-5 font-mono font-bold text-primary table-cell border-b border-divider align-middle text-[10px] lg:text-xs w-[10%]">
                      
                      <span>#{s.rank}</span>
                    </td>
                    <td className="py-2 lg:py-4 px-2 lg:px-5 table-cell border-b border-divider align-middle w-[25%]">
                      
                      <div className="flex flex-col sm:text-right lg:text-left">
                        <span className="font-semibold text-primary font-heading truncate max-w-[100px] lg:max-w-[180px] text-[10px] lg:text-xs">{s.name}</span>
                        <span className="text-[9px] lg:text-[11px] sys-text-body font-sans mt-0.5 truncate max-w-[100px] lg:max-w-[180px] inline-block" title={s.email}>{s.email}</span>
                      </div>
                    </td>
                    <td className="py-2 lg:py-4 px-2 lg:px-5 font-mono font-semibold sys-text-body uppercase table-cell border-b border-divider align-middle text-[9px] lg:text-[11px] w-[18%] whitespace-nowrap">
                      
                      <span className="block">{s.roll_number || 'N/A'}</span>
                    </td>
                    <td className="py-2 lg:py-4 px-2 lg:px-5 table-cell border-b border-divider align-middle w-[15%]">
                      
                      {isComp ? (
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className={`font-mono font-bold text-[10px] lg:text-sm ${isPassed ? 'text-[#34D399]' : 'text-[#F87171]'}`}>{s.score}%</span>
                          <span className={`text-[8px] lg:text-[9px] px-1.5 py-0.5 rounded font-bold ${isPassed ? 'bg-[#34D399]/15 text-[#34D399]' : 'bg-[#F87171]/15 text-[#F87171]'}`}>
                            {isPassed ? 'Passed' : 'Failed'}
                          </span>
                        </div>
                      ) : (
                        <span className="sys-text-body font-sans font-semibold text-[9px] lg:text-[11px]">Unattempted</span>
                      )}
                    </td>
                    <td className="py-2 lg:py-4 px-2 lg:px-5 table-cell border-b border-divider align-middle w-[15%]">
                      
                      <div className="flex items-center gap-1 lg:gap-2 flex-wrap">
                        <span className={`font-mono font-bold text-[10px] lg:text-sm ${s.integrity_score < 75 ? 'text-[#F87171]' : 'text-primary'}`}>
                          {s.integrity_score}%
                        </span>
                        <span className="text-[7px] lg:text-[8px] sys-text-body font-mono font-semibold">({s.violationsCount} warnings)</span>
                      </div>
                    </td>
                    <td className="py-2 lg:py-4 px-2 lg:px-5 table-cell border-b border-divider align-middle w-[10%]">
                      
                      <span className={`px-1.5 py-0.5 rounded text-[7px] lg:text-[9px] font-mono font-bold uppercase tracking-wider inline-block ${
                        s.status === 'submitted' ? 'bg-[#34D399]/10 text-[#34D399] border border-[#34D399]/20' : 
                        s.status === 'testing' ? 'bg-[#5B8CFF]/10 text-[#5B8CFF] border border-[#5B8CFF]/20 animate-pulse' :
                        'bg-divider text-tertiary border border-divider'
                      }`}>
                        {s.status}
                      </span>
                    </td>
                    <td className="py-2 lg:py-4 px-2 lg:px-5 text-center table-cell align-middle whitespace-nowrap w-[10%]">
                      <Button 
                        onClick={() => setSelectedSession(s)}
                        variant="ghost" 
                        size="sm"
                        className="h-6 lg:h-8 px-1.5 lg:px-3 hover:bg-hover text-tertiary hover:text-primary rounded-lg cursor-pointer transition-colors text-[9px] lg:text-xs"
                      >
                        <ChevronRight className="w-3 h-3 lg:w-4 lg:h-4 mr-1" /> View Profile
                      </Button>
                    </td>
                  </tr>
                )
              })}

              {filteredRanks.length === 0 && (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-tertiary font-mono text-xs">
                    No matching records found in student database ranks.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
          </div>
        </div>

      </div>

      {/* Visual Debugger Inspection details Modal overlay */}
      {selectedSession && createPortal(
        <div className="fixed inset-0 bg-black/80  z-[9999] flex items-center justify-center p-4">
          <Card className="w-full max-w-4xl bg-panel backdrop-blur-[16px] border-divider p-6 rounded-2xl relative shadow-2xl overflow-y-auto max-h-[90vh]">
            <div className="absolute top-0 left-0 right-0 h-[3px] sys-bg rounded-t-2xl" />
            
            {/* Modal header */}
            <div className="flex justify-between items-start pb-4 border-b border-divider mb-6">
              <div className="flex items-center gap-3">
                <div className="p-2 sys-bg border border-divider rounded-xl">
                  <User className="w-5 h-5 text-[#5B8CFF]" strokeWidth={1.5} />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-primary font-heading">{selectedSession.name}</h3>
                  <span className="text-[11px] sys-text-body font-sans mt-1 block font-medium">Roll: {selectedSession.roll_number} | Email: {selectedSession.email}</span>
                </div>
              </div>

              <Button 
                onClick={() => setSelectedSession(null)}
                variant="ghost" 
                size="sm"
                className="h-8 w-8 p-0 hover:sys-card sys-text-body hover:text-primary rounded-lg cursor-pointer"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>

            {/* Modal details columns */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-6 select-none">
              
              {/* Left Column: Stats & logs (5 cols) */}
              <div className="md:col-span-5 space-y-6">
                
                <div className="p-4 sys-bg/40 border border-divider rounded-xl space-y-3.5 text-xs">
                  <span className="text-[8.5px] font-mono font-bold sys-text-body uppercase tracking-widest block border-b border-divider pb-1.5">// AUDITING SUMMARIES</span>
                  
                  <div className="flex justify-between">
                    <span className="sys-text-body font-mono">Compiler Score:</span>
                    <span className="font-bold text-primary">{selectedSession.score}%</span>
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
                <div className="bg-panel border border-divider rounded-xl p-4 font-mono text-[9px] sys-text-body space-y-2 select-text overflow-y-auto h-64">
                  <span className="text-[8px] uppercase font-bold sys-text-body tracking-widest block select-none border-b border-divider pb-1.5 mb-2 flex items-center gap-1.5">
                    <Activity className="w-3.5 h-3.5 text-[#F87171]" /> REAL-TIME AUDIT LOGS
                  </span>
                  {selectedSession.violation_logs?.map((log, index) => (
                    <div 
                      key={index}
                      className={`leading-relaxed border-b border-divider pb-1.5 ${
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
                    <div key={qId} className="p-4 sys-bg/45 border border-divider rounded-xl space-y-3.5">
                      <div className="flex justify-between items-center pb-2 border-b border-divider select-none">
                        <span className="font-bold text-primary text-xs flex items-center gap-1.5 font-heading">
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
                        <pre className="p-3 bg-surface rounded-lg border border-divider text-[9.5px] font-mono sys-text-primary overflow-hidden select-text leading-relaxed whitespace-pre">
                          {sub.code}
                        </pre>
                      </div>

                      {/* Passed cases metrics */}
                      <div className="flex justify-between text-[9px] font-mono sys-text-body select-none">
                        <span>Cases Passed: <strong className="text-primary">{sub.cases_passed} / {sub.total_cases}</strong></span>
                        <span>Execution time: <strong className="text-primary">{sub.execution_time} ms</strong></span>
                      </div>
                    </div>
                  ))}

                  {Object.keys(selectedSession.submissions || {}).length === 0 && (
                    <div className="p-8 text-center border border-dashed border-divider rounded-xl text-xs font-mono sys-text-body select-none">
                      No code submissions saved for this session checklist yet.
                    </div>
                  )}
                </div>

              </div>

            </div>
          </Card>
        </div>,
        document.body
      )}

    </div>
  )
}
