import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { RefreshCw, Activity } from 'lucide-react'
import { CandidateSession, fetchCandidateSessions, Assessment } from '../../lib/assessmentEngine'
import CandidateMonitorCard from './CandidateMonitorCard'

interface MonitorTabProps {
  assessments: Assessment[]
}

export default function MonitorTab({ assessments }: MonitorTabProps) {
  const [sessions, setSessions] = useState<CandidateSession[]>([])
  const [loading, setLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [filterExamId, setFilterExamId] = useState('all')

  const loadActiveTakers = async () => {
    setIsRefreshing(true)
    const targetId = filterExamId === 'all' ? undefined : filterExamId
    const data = await fetchCandidateSessions(targetId)
    const active = data.filter(s => s.status === 'testing')
    setSessions(active)
    setIsRefreshing(false)
    setLoading(false)
  }

  useEffect(() => {
    loadActiveTakers()
    const pollingInterval = setInterval(() => {
      loadActiveTakers()
    }, 5000)

    return () => clearInterval(pollingInterval)
  }, [filterExamId])

  if (loading) {
    return (
      <div className="p-12 text-center text-xs font-mono sys-text-body animate-pulse select-none">
        Syncing live proctor channels...
      </div>
    )
  }

  return (
    <div className="space-y-6 animate-fade-in select-none">
      
      {/* Tab Header bar */}
      <div className="flex flex-wrap justify-between items-center gap-4 select-none border-b border-white/5 pb-4">
        <div className="flex items-center gap-3">
          <Activity className="w-5 h-5 text-[#5B8CFF] animate-pulse" strokeWidth={1.5} />
          <div>
            <h2 className="text-[14px] font-heading font-bold tracking-wider text-[#5B8CFF] uppercase">Live Proctor Grid</h2>
            <span className="text-[11px] sys-text-body mt-1 block font-sans font-medium">Active candidate streams and integrity radar feeds</span>
          </div>
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
            onClick={loadActiveTakers} 
            disabled={isRefreshing}
            variant="outline" 
            className="border-white/5 sys-bg/20 h-8 text-[11px] font-bold sys-text-body hover:text-white cursor-pointer rounded-xl transition"
          >
            <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${isRefreshing ? 'animate-spin' : ''}`} strokeWidth={1.5} /> Sync channels
          </Button>
        </div>
      </div>

      {/* Grid of streams */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        
        {sessions.map(s => {
          const violationCount = (s.violation_logs || []).filter(l => l.includes('ALERT') || l.includes('violation') || l.includes('lost') || l.includes('switching')).length
          const isCritical = (s.integrity_score ?? 100) < 75 || violationCount > 3
          
          return (
            <CandidateMonitorCard 
              key={s.id} 
              s={s} 
              isCritical={isCritical} 
              violationCount={violationCount} 
            />
          )
        })}

        {sessions.length === 0 && (
          <div className="col-span-full text-center p-12 sys-bg/20 border border-white/5 rounded-2xl text-xs font-mono sys-text-body select-none">
            No candidates are currently solving coding challenges.
          </div>
        )}
      </div>

    </div>
  )
}
