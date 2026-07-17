import { useState, useEffect } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { 
  RefreshCw, Activity, User
} from 'lucide-react'
import { CandidateSession, fetchCandidateSessions } from '../../lib/assessmentEngine'

interface MonitorTabProps {
  selectedAssessmentId?: string
}

export default function MonitorTab({ selectedAssessmentId }: MonitorTabProps) {
  const [sessions, setSessions] = useState<CandidateSession[]>([])
  const [loading, setLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)

  const loadActiveTakers = async () => {
    setIsRefreshing(true)
    const data = await fetchCandidateSessions(selectedAssessmentId)
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
  }, [selectedAssessmentId])

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

        <Button 
          onClick={loadActiveTakers} 
          disabled={isRefreshing}
          variant="outline" 
          className="border-sky-955 h-8 text-[11px] font-bold text-sky-400 hover:bg-sky-950/20 cursor-pointer"
        >
          <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${isRefreshing ? 'animate-spin' : ''}`} /> Sync channels
        </Button>
      </div>

      {/* Grid of video streams */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        
        {sessions.map(s => {
          const violationCount = s.violation_logs.filter(l => l.includes('ALERT') || l.includes('violation') || l.includes('lost') || l.includes('switching')).length
          const isCritical = s.integrity_score < 75 || violationCount > 3
          
          return (
            <Card key={s.id} className={`bg-neutral-900 border overflow-hidden rounded-2xl flex flex-col justify-between shadow-2xl transition duration-300 ${
              isCritical ? 'border-red-500/30' : 'border-sky-955/55'
            }`}>
              
              {/* Virtual Camera Feed Frame */}
              <div className="bg-[#030509] aspect-video w-full relative flex items-center justify-center overflow-hidden">
                {/* Visual Camera Scan lines */}
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_40%,rgba(0,0,0,0.4))] z-10" />
                
                {/* Simulating active feed with user representation */}
                <div className="flex flex-col items-center gap-2 z-20 text-center p-4">
                  <div className={`p-4 rounded-full border ${
                    isCritical ? 'border-red-500/20 bg-red-950/10' : 'border-sky-500/10 bg-sky-950/5'
                  }`}>
                    <User className={`w-10 h-10 ${
                      isCritical ? 'text-red-500/70 animate-pulse' : 'text-sky-400/50'
                    }`} />
                  </div>
                  <span className="text-[10px] font-mono text-sky-450 uppercase tracking-widest">
                    WebCam Stream Activated
                  </span>
                </div>

                {/* Secure scan lines box corners */}
                <div className="absolute inset-2 border border-sky-400/10 pointer-events-none z-30">
                  <div className={`absolute top-0 left-0 w-3.5 h-3.5 border-t-2 border-l-2 ${isCritical ? 'border-red-500/50' : 'border-sky-400/50'}`} />
                  <div className={`absolute top-0 right-0 w-3.5 h-3.5 border-t-2 border-r-2 ${isCritical ? 'border-red-500/50' : 'border-sky-400/50'}`} />
                  <div className={`absolute bottom-0 left-0 w-3.5 h-3.5 border-b-2 border-l-2 ${isCritical ? 'border-red-500/50' : 'border-sky-400/50'}`} />
                  <div className={`absolute bottom-0 right-0 w-3.5 h-3.5 border-b-2 border-r-2 ${isCritical ? 'border-red-500/50' : 'border-sky-400/50'}`} />
                </div>

                {/* Score Indicators Overlaid */}
                <div className="absolute top-3 left-3 z-30 flex items-center gap-1.5 select-none">
                  <span className={`px-2 py-0.5 rounded text-[8px] font-mono font-bold uppercase ${
                    isCritical ? 'bg-red-950/80 text-red-400 border border-red-900/50' : 'bg-sky-950/60 text-sky-400 border border-sky-900/40'
                  }`}>
                    ● Live Channel
                  </span>
                </div>

                <div className="absolute top-3 right-3 z-30 select-none">
                  <span className={`px-2.5 py-0.5 rounded-lg border text-[9px] font-mono font-black ${
                    isCritical 
                      ? 'bg-red-950/90 text-red-400 border-red-500/30' 
                      : 'bg-emerald-950/70 text-emerald-450 border-emerald-900/30'
                  }`}>
                    Score: {s.integrity_score}%
                  </span>
                </div>
              </div>

              {/* Candidate Info Block */}
              <div className="p-4 space-y-3.5 flex-1 flex flex-col justify-between">
                <div>
                  <h4 className="font-extrabold text-xs text-neutral-100">{s.name}</h4>
                  <div className="text-[10px] text-neutral-500 font-mono mt-0.5">Roll: {s.roll_number || 'N/A'}</div>
                </div>

                {/* Live infraction counts */}
                <div className="flex gap-4 text-[10px] border-t border-sky-955/30 pt-3 select-none">
                  <div className="space-y-0.5">
                    <span className="text-neutral-500 block uppercase text-[8px] tracking-wider font-mono">Infractions</span>
                    <span className={`font-mono font-bold ${isCritical ? 'text-red-400' : 'text-neutral-350'}`}>{violationCount} count(s)</span>
                  </div>
                  <div className="space-y-0.5 border-l border-sky-955/30 pl-4">
                    <span className="text-neutral-500 block uppercase text-[8px] tracking-wider font-mono">Exam Status</span>
                    <span className="font-mono text-emerald-400 font-bold capitalize">{s.status}...</span>
                  </div>
                </div>

                {/* Recent violation log text */}
                <div className="bg-[#030509] p-2 rounded-lg border border-sky-955/40 text-[8.5px] font-mono min-h-12 max-h-16 overflow-y-auto leading-normal text-neutral-500 flex flex-col gap-1">
                  {s.violation_logs.slice(-3).reverse().map((log, idx) => (
                    <div key={idx} className={log.includes('ALERT') || log.includes('violation') || log.includes('lost') ? 'text-red-400/80 font-bold' : ''}>
                      {log}
                    </div>
                  ))}
                  {s.violation_logs.length === 0 && (
                    <div className="text-center text-neutral-600">No events reported. Integrity verification steady.</div>
                  )}
                </div>
              </div>

            </Card>
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
