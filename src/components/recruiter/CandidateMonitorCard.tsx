import { useEffect, useRef, useState } from 'react'
import { Card } from '@/components/ui/card'
import { Video, VideoOff } from 'lucide-react'
import { CandidateSession } from '../../lib/assessmentEngine'
import { getIceServers } from '../../lib/webrtcConfig'
import { supabase } from '../../lib/supabaseClient'

interface CandidateMonitorCardProps {
  s: CandidateSession
  isCritical: boolean
  violationCount: number
}

type ConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'failed'

export default function CandidateMonitorCard({ s, isCritical, violationCount }: CandidateMonitorCardProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('disconnected')
  const pcRef = useRef<RTCPeerConnection | null>(null)
  const [isWatching, setIsWatching] = useState<boolean>(false)
  
  const shouldWatch = isCritical || isWatching

  useEffect(() => {
    if (!shouldWatch) {
      if (pcRef.current) pcRef.current.close()
      return
    }

    const channelName = `webrtc_stream_${s.student_id}_${s.assessment_id}`
    console.log(`[WebRTC Recruiter] Joining signaling: ${channelName}`)

    setConnectionStatus('connecting')
    const channel = supabase.channel(channelName)

    const initConnection = async (offer: any) => {
      try {
        if (pcRef.current) {
          pcRef.current.close()
        }

        const config = getIceServers()
        const pc = new RTCPeerConnection(config)
        pcRef.current = pc

        pc.ontrack = (event) => {
          if (videoRef.current && event.streams[0]) {
            videoRef.current.srcObject = event.streams[0]
            videoRef.current.play().catch(e => console.warn('Play failed', e))
            setConnectionStatus('connected')
          }
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
          if (pc.connectionState === 'connected') {
            setConnectionStatus('connected')
          } else if (pc.connectionState === 'disconnected' || pc.connectionState === 'closed') {
            setConnectionStatus('disconnected')
          } else if (pc.connectionState === 'failed') {
            setConnectionStatus('failed')
          }
        }

        await pc.setRemoteDescription(new RTCSessionDescription(offer))
        const answer = await pc.createAnswer()
        await pc.setLocalDescription(answer)

        channel.send({
          type: 'broadcast',
          event: 'answer',
          payload: answer
        })
      } catch (err) {
        console.error('[WebRTC Recruiter] SDP negotiation error:', err)
        setConnectionStatus('failed')
      }
    }

    channel
      .on('broadcast', { event: 'offer' }, ({ payload }) => {
        initConnection(payload)
      })
      .on('broadcast', { event: 'ice-candidate' }, async ({ payload }) => {
        if (pcRef.current) {
          try {
            await pcRef.current.addIceCandidate(new RTCIceCandidate(payload))
          } catch (err) {
            console.error('[WebRTC Recruiter] Add ICE candidate error:', err)
          }
        }
      })
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          channel.send({
            type: 'broadcast',
            event: 'request-connection',
            payload: {}
          })
        }
      })

    const retryInterval = setInterval(() => {
      if (pcRef.current === null || pcRef.current.connectionState === 'disconnected' || pcRef.current.connectionState === 'failed') {
        channel.send({
          type: 'broadcast',
          event: 'request-connection',
          payload: {}
        })
      }
    }, 8000)

    return () => {
      clearInterval(retryInterval)
      channel.unsubscribe()
      if (pcRef.current) {
        pcRef.current.close()
      }
    }
  }, [s.student_id, s.assessment_id, shouldWatch])

  return (
    <Card className={`bg-card border flex flex-col overflow-hidden max-w-sm rounded-2xl transition-all duration-300 shadow-none relative group ${
      isCritical ? 'border-[#F87171]' : 'border-divider hover:border-[#5B8CFF]/45'
    }`}>
      
      {/* Camera Feed Container */}
      <div className="bg-black aspect-video w-full relative flex items-center justify-center overflow-hidden border-b border-divider">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_50%,rgba(0,0,0,0.8))] z-10 pointer-events-none" />
        
        <video 
          ref={videoRef} 
          autoPlay 
          playsInline 
          muted 
          className={`w-full h-full object-cover transition-opacity duration-500 z-0 ${
            connectionStatus === 'connected' ? 'opacity-90' : 'opacity-0 absolute'
          }`} 
        />

        {connectionStatus !== 'connected' && (
          <div className="flex flex-col items-center gap-2.5 z-20 text-center p-4 select-none">
            <div 
              className="p-3.5 rounded-full border border-divider sys-bg cursor-pointer hover:bg-white/10 transition-colors"
              onClick={() => !isCritical && setIsWatching(true)}
            >
              {connectionStatus === 'connecting' ? (
                <Video className="w-8 h-8 sys-text-body animate-pulse" strokeWidth={1.5} />
              ) : (
                <VideoOff className="w-8 h-8 sys-text-body" strokeWidth={1.5} />
              )}
            </div>
            <span className="text-[9px] font-mono sys-text-body uppercase tracking-widest">
              {connectionStatus === 'connecting' ? 'Establishing Stream...' : 'Dormant Stream (Click to Watch)'}
            </span>
          </div>
        )}

        {/* Secure scan lines box corners */}
        <div className="absolute inset-3 border border-transparent pointer-events-none z-30">
          <div className="absolute top-0 left-0 w-3 h-3 border-t border-l border-white/20" />
          <div className="absolute top-0 right-0 w-3 h-3 border-t border-r border-white/20" />
          <div className="absolute bottom-0 left-0 w-3 h-3 border-b border-l border-white/20" />
          <div className="absolute bottom-0 right-0 w-3 h-3 border-b border-r border-white/20" />
        </div>

        {/* Score & Stream status badges */}
        <div className="absolute top-3 left-3 z-30 flex flex-col items-start gap-1.5 select-none font-mono">
          <span className="px-2 py-0.5 rounded text-[8px] font-bold uppercase flex items-center gap-1 sys-bg border border-divider sys-text-primary">
            <span className={`w-1.5 h-1.5 rounded-full ${connectionStatus === 'connected' ? 'bg-[#34D399] animate-ping' : 'sys-card'}`} />
            {connectionStatus === 'connected' ? 'Live Stream' : 'Live Channel'}
          </span>
          {isCritical && (
            <span className="px-2 py-0.5 rounded text-[8px] font-bold uppercase flex items-center gap-1 bg-[#F87171]/20 text-[#F87171] border border-[#F87171]/30">
              🚨 AI Auto-Triggered Feed
            </span>
          )}
        </div>

        <div className="absolute top-3 right-3 z-30 select-none">
          <span className={`px-2 py-0.5 rounded border text-[9px] font-mono font-bold ${
            isCritical 
              ? 'bg-[#F87171]/20 text-[#F87171] border-[#F87171]/35' 
              : 'sys-bg sys-text-primary border-divider'
          }`}>
            INTEGRITY: {s.integrity_score}%
          </span>
        </div>
      </div>

      {/* Candidate Profile Info */}
      <div className="p-4 space-y-4 flex-1 flex flex-col justify-between">
        <div className="select-none flex justify-between items-start">
          <div>
            <h4 className="font-bold text-sm text-foreground font-heading">{s.name}</h4>
            <div className="text-[10px] sys-text-body font-sans font-semibold mt-1 uppercase tracking-wider">Roll: {s.roll_number || 'N/A'}</div>
          </div>
          <button 
            onClick={() => setIsWatching(!isWatching)}
            disabled={isCritical}
            className={`text-[9px] px-2 py-1 rounded font-bold uppercase border transition-colors ${
              isCritical ? 'opacity-50 cursor-not-allowed bg-surface/50 text-white/50 border-divider' :
              isWatching ? 'bg-[#5B8CFF]/20 text-[#5B8CFF] border-[#5B8CFF]/40 hover:bg-[#5B8CFF]/30' : 'sys-bg text-primary hover:bg-white/10 border-border-strong'
            }`}
          >
            {isWatching || isCritical ? 'Stop Feed' : 'Watch Feed'}
          </button>
        </div>

        {/* Live infractions */}
        <div className="flex gap-4 border-t border-divider pt-3 select-none">
          <div className="space-y-1 w-1/2">
            <span className="text-[10px] sys-text-body block uppercase tracking-wider font-sans font-bold">Infractions</span>
            <span className={`text-[11px] font-sans font-semibold ${isCritical ? 'text-[#F87171]' : 'text-primary'}`}>{violationCount} warning(s)</span>
          </div>
          <div className="space-y-1 border-l border-divider pl-4 w-1/2">
            <span className="text-[10px] sys-text-body block uppercase tracking-wider font-sans font-bold">Exam Status</span>
            <span className="text-[11px] font-sans font-semibold text-primary capitalize">{s.status}...</span>
          </div>
        </div>

        {/* Terminal warning timeline */}
        <div className="bg-black/65 border border-divider rounded-xl p-2.5 font-mono text-[8px] sys-text-body space-y-1.5 select-text overflow-y-auto max-h-16">
          <span className="text-[7.5px] uppercase font-bold sys-text-body tracking-widest block select-none border-b border-divider pb-1 mb-1">// Infraction logs</span>
          {(s.violation_logs || []).slice(-3).map((log, idx) => (
            <div key={idx} className={log.includes('ALERT') || log.includes('lost') || log.includes('switch') ? 'text-primary bg-[#F87171]/15 px-1 rounded border border-[#F87171]/25' : 'sys-text-body'}>
              {log}
            </div>
          ))}
        </div>
      </div>
    </Card>
  )
}
