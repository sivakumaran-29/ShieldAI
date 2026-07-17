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
    // Filter to show active sessions or ones that started recently (testing status)
    const active = data.filter(s => s.status === 'testing')
    setSessions(active)
    setIsRefreshing(false)
    setLoading(false)
  }

  // Poll for real-time telemetry every 5 seconds
  useEffect(() => {
    loadActiveTakers()
    const pollingInterval = setInterval(() => {
      loadActiveTakers()
    }, 5000)

    return () => clearInterval(pollingInterval)
  }, [filterExamId])

  if (loading) {
    return (
      <div className="p-12 text-center text-xs font-mono text-sky-400">
        Syncing live proctor channels...
      </div>
    )
  }

  return (
    <div className="space-y-6">
      
      {/* Tab Header bar */}
      <div className="flex justify-between items-center select-none">
        <div className="flex items-center gap-2">
          <Activity className="w-5 h-5 text-sky-400 animate-pulse" />
          <div>
            <h2 className="text-sm font-bold font-mono tracking-widest text-sky-400 uppercase">Live Proctor Grid</h2>
            <span className="text-[10px] text-neutral-450 mt-0.5 block">Displaying active exam-takers telemetry channels (Auto-polling active)</span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <select 
            value={filterExamId} 
            onChange={e => setFilterExamId(e.target.value)}
            className="bg-neutral-950 border border-sky-955 text-neutral-100 rounded-xl p-2 h-8 text-[11px] outline-none focus:border-sky-500 font-bold cursor-pointer"
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
            className="border-sky-955 h-8 text-[11px] font-bold text-sky-400 hover:bg-sky-950/20 cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${isRefreshing ? 'animate-spin' : ''}`} /> Sync channels
          </Button>
        </div>
      </div>

      {/* Grid of video streams */}
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
          <div className="col-span-full text-center p-12 bg-neutral-900/10 border border-sky-950 rounded-3xl text-xs font-mono text-neutral-500">
            No candidates are currently solving coding challenges.
          </div>
        )}
      </div>

    </div>
  )
}
