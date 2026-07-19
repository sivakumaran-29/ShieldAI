import { useState, useEffect } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { 
  CheckCircle2, ChevronRight, AlertTriangle, Send
} from 'lucide-react'
import { fetchCandidateSessions, Assessment, CandidateSession, saveAssessment } from '../../lib/assessmentEngine'

interface PublishResultTabProps {
  assessments: Assessment[]
  onRefresh: () => void
}

export default function PublishResultTab({ assessments, onRefresh }: PublishResultTabProps) {
  const [department, setDepartment] = useState('ALL')
  const [className, setClassName] = useState('ALL')
  const [selectedAssessment, setSelectedAssessment] = useState<Assessment | null>(null)
  
  const [sessions, setSessions] = useState<CandidateSession[]>([])
  const [loadingSessions, setLoadingSessions] = useState(false)

  const filteredAssessments = assessments.filter(a => {
    if (department !== 'ALL' && !a.target_batch?.includes(department)) return false
    if (className !== 'ALL' && !a.target_batch?.endsWith(`_${className}`)) return false
    return true
  })

  useEffect(() => {
    if (selectedAssessment) {
      loadSessionsForAssessment(selectedAssessment.id)
    } else {
      setSessions([])
    }
  }, [selectedAssessment])

  const loadSessionsForAssessment = async (examId: string) => {
    setLoadingSessions(true)
    const data = await fetchCandidateSessions(examId)
    setSessions(data)
    setLoadingSessions(false)
  }

  const handlePublish = async () => {
    if (!selectedAssessment) return
    const confirm = window.confirm(`Are you sure you want to publish results for ${selectedAssessment.title}? This will make marks visible to all candidates in this batch.`)
    if (!confirm) return

    const updated = { ...selectedAssessment, results_published: true }
    await saveAssessment(updated)
    setSelectedAssessment(updated)
    onRefresh()
    alert('Results have been published successfully!')
  }

  const getScoreBreakdown = (s: CandidateSession) => {
    const total = s.score || 0
    let codingScore = 0
    
    if (s.submissions) {
      Object.values(s.submissions).forEach(sub => {
         if (sub.score) codingScore += sub.score
      })
    }
    
    const mcqScore = Math.max(0, total - codingScore)
    return { mcqScore, codingScore, total }
  }

  return (
    <div className="space-y-8 select-none animate-fade-in">
      <div className="flex flex-wrap justify-between items-center gap-4 border-b border-divider pb-4">
        <div>
          <h2 className="text-3xl font-semibold tracking-tight text-[#5B8CFF] mb-2">// PUBLISH RESULTS</h2>
          <span className="text-[11px] sys-text-body font-sans mt-1 block font-medium">Review and publish candidate marks for specific cohorts</span>
        </div>
      </div>

      {!selectedAssessment ? (
        <div className="space-y-6">
          <Card className="bg-panel backdrop-blur-[16px] border-divider p-6 rounded-2xl flex flex-wrap gap-4 items-end shadow-xl">
            <div className="space-y-2">
              <label className="text-[10px] font-mono sys-text-body uppercase tracking-wider block">Department</label>
              <select 
                value={department} 
                onChange={e => setDepartment(e.target.value)}
                className="border border-divider sys-bg text-foreground rounded-xl text-xs px-4 py-2.5 font-semibold outline-none cursor-pointer min-w-[150px] focus:border-[#5B8CFF]/50"
              >
                <option value="ALL">All Departments</option>
                <option value="CSE">Computer Science (CSE)</option>
                <option value="ECE">Electronics (ECE)</option>
                <option value="MECH">Mechanical (MECH)</option>
              </select>
            </div>
            
            <div className="space-y-2">
              <label className="text-[10px] font-mono sys-text-body uppercase tracking-wider block">Class</label>
              <select 
                value={className} 
                onChange={e => setClassName(e.target.value)}
                className="border border-divider sys-bg text-foreground rounded-xl text-xs px-4 py-2.5 font-semibold outline-none cursor-pointer min-w-[150px] focus:border-[#5B8CFF]/50"
              >
                <option value="ALL">All Classes</option>
                <option value="A">Section A</option>
                <option value="B">Section B</option>
                <option value="C">Section C</option>
              </select>
            </div>
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredAssessments.map(a => (
              <Card 
                key={a.id} 
                className="bg-card backdrop-blur-[24px] border border-divider p-6 rounded-2xl flex flex-col justify-between min-h-40 shadow-xl hover:shadow-[0_0_20px_rgba(91,140,255,0.05)] hover:border-[#5B8CFF]/30 transition-all duration-300 cursor-pointer group"
                onClick={() => setSelectedAssessment(a)}
              >
                <div>
                  <div className="flex justify-between items-start mb-3">
                    <span className="text-[10px] font-mono font-bold sys-text-body uppercase tracking-widest bg-input px-2 py-1 rounded">
                      {a.target_batch || 'ANY BATCH'}
                    </span>
                    {a.results_published ? (
                      <span className="text-[#34D399] flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest bg-[#34D399]/10 border border-[#34D399]/20 px-2 py-1 rounded">
                        <CheckCircle2 className="w-3 h-3" /> Published
                      </span>
                    ) : (
                      <span className="text-tertiary flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest bg-divider border border-divider px-2 py-1 rounded">
                        Pending
                      </span>
                    )}
                  </div>
                  <h3 className="text-sm font-bold text-primary font-heading group-hover:text-[#5B8CFF] transition-colors">{a.title}</h3>
                </div>
                
                <div className="flex justify-end items-center mt-4">
                  <span className="text-[10px] sys-text-body flex items-center gap-1 group-hover:text-primary transition-colors">
                    Review Marks <ChevronRight className="w-4 h-4" />
                  </span>
                </div>
              </Card>
            ))}
            {filteredAssessments.length === 0 && (
              <div className="col-span-full py-12 text-center text-xs sys-text-body font-mono border border-dashed border-divider rounded-2xl bg-panel/50">
                No assessments found for the selected department and class.
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="space-y-6 animate-fade-in">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => setSelectedAssessment(null)}
                className="h-9 w-9 p-0 hover:sys-bg rounded-lg border border-divider sys-text-body"
              >
                <ChevronRight className="w-4 h-4 rotate-180" />
              </Button>
              <div>
                <h3 className="font-heading font-bold text-lg text-primary">{selectedAssessment.title}</h3>
                <span className="text-[11px] sys-text-body font-sans block">{selectedAssessment.target_batch || 'All Candidates'}</span>
              </div>
            </div>

            <Button 
              onClick={handlePublish}
              disabled={selectedAssessment.results_published}
              className={`h-10 px-6 rounded-xl font-bold cursor-pointer transition shadow-md flex items-center gap-2 ${
                selectedAssessment.results_published 
                  ? 'bg-panel text-[#34D399] border border-[#34D399]/30 opacity-80' 
                  : 'bg-[#5B8CFF] hover:bg-[#4673d6] text-white shadow-[0_0_15px_rgba(91,140,255,0.4)]'
              }`}
            >
              {selectedAssessment.results_published ? (
                <>
                  <CheckCircle2 className="w-4 h-4" /> Results Published
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" /> Publish Results
                </>
              )}
            </Button>
          </div>

          <Card className="bg-panel backdrop-blur-[16px] border-divider rounded-2xl overflow-hidden shadow-xl">
            {loadingSessions ? (
              <div className="p-12 text-center text-xs font-mono sys-text-body animate-pulse">
                Aggregating student marks...
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="bg-surface/50 sys-text-body font-sans font-semibold text-[10px] uppercase tracking-wider border-b border-divider">
                      <th className="py-4 px-6">Candidate</th>
                      <th className="py-4 px-6 text-center">MCQ Marks</th>
                      <th className="py-4 px-6 text-center">Coding Marks</th>
                      <th className="py-4 px-6 text-center">Total Score</th>
                      <th className="py-4 px-6 text-right">Integrity</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-divider">
                    {sessions.length > 0 ? (
                      sessions.map(s => {
                        const { mcqScore, codingScore, total } = getScoreBreakdown(s)
                        const isSubmitted = s.status === 'submitted'

                        return (
                          <tr key={s.id} className="hover:bg-hover transition duration-150">
                            <td className="py-4 px-6">
                              <div className="font-semibold text-primary font-heading truncate max-w-[200px]">{s.name}</div>
                              <div className="text-[10px] sys-text-body font-mono mt-0.5">{s.roll_number || s.email}</div>
                            </td>
                            
                            <td className="py-4 px-6 text-center">
                              {isSubmitted ? (
                                <span className="font-mono text-primary font-medium bg-input px-2 py-1 rounded border border-divider">{mcqScore}</span>
                              ) : <span className="sys-text-body text-[10px]">-</span>}
                            </td>
                            
                            <td className="py-4 px-6 text-center">
                              {isSubmitted ? (
                                <span className="font-mono text-primary font-medium bg-input px-2 py-1 rounded border border-divider">{codingScore}</span>
                              ) : <span className="sys-text-body text-[10px]">-</span>}
                            </td>
                            
                            <td className="py-4 px-6 text-center">
                              {isSubmitted ? (
                                <span className={`font-mono font-bold px-3 py-1 rounded border ${total >= (selectedAssessment.passing_score || 0) ? 'bg-[#34D399]/15 text-[#34D399] border-[#34D399]/30' : 'bg-[#F87171]/15 text-[#F87171] border-[#F87171]/30'}`}>
                                  {total}%
                                </span>
                              ) : <span className="sys-text-body text-[10px] uppercase font-bold tracking-wider">Unattempted</span>}
                            </td>
                            
                            <td className="py-4 px-6 text-right">
                              {isSubmitted ? (
                                <div className="flex items-center justify-end gap-2">
                                  {s.integrity_score < 75 && <AlertTriangle className="w-3.5 h-3.5 text-[#F87171]" />}
                                  <span className={`font-mono font-bold ${s.integrity_score < 75 ? 'text-[#F87171]' : 'text-primary'}`}>
                                    {s.integrity_score}%
                                  </span>
                                </div>
                              ) : <span className="sys-text-body text-[10px]">-</span>}
                            </td>
                          </tr>
                        )
                      })
                    ) : (
                      <tr>
                        <td colSpan={5} className="py-12 text-center text-xs sys-text-body font-mono">
                          No candidate records found for this assessment yet.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </div>
      )}
    </div>
  )
}
