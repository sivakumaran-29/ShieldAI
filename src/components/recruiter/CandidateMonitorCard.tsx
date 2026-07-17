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

  useEffect(() => {
    const channelName = `webrtc_stream_${s.student_id}_${s.assessment_id}`
    console.log(`[WebRTC Recruiter] Joining signaling channel: ${channelName}`)

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
          console.log('[WebRTC Recruiter] OnTrack track event received:', event.streams[0])
          if (videoRef.current && event.streams[0]) {
            videoRef.current.srcObject = event.streams[0]
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
          console.log(`[WebRTC Recruiter] Connection state changed for candidate ${s.student_id}: ${pc.connectionState}`)
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
        console.error('[WebRTC Recruiter] Error during SDP negotiation handler:', err)
        setConnectionStatus('failed')
      }
    }

    channel
      .on('broadcast', { event: 'offer' }, ({ payload }) => {
        console.log('[WebRTC Recruiter] Received SDP Offer from Candidate.')
        initConnection(payload)
      })
      .on('broadcast', { event: 'ice-candidate' }, async ({ payload }) => {
        if (pcRef.current) {
          try {
            await pcRef.current.addIceCandidate(new RTCIceCandidate(payload))
          } catch (err) {
            console.error('[WebRTC Recruiter] Error adding candidate ICE:', err)
          }
        }
      })
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.log('[WebRTC Recruiter] Subscribed signaling, sending request connection query...')
          // Push query query request to wake candidate up
          channel.send({
            type: 'broadcast',
            event: 'request-connection',
            payload: {}
          })
        }
      })

    // Periodically re-request connection if state hangs as disconnected/connecting
    const retryInterval = setInterval(() => {
      if (pcRef.current === null || pcRef.current.connectionState === 'disconnected' || pcRef.current.connectionState === 'failed') {
        console.log('[WebRTC Recruiter] Streaming pending. Broadcasting retry connection pulse...')
        channel.send({
          type: 'broadcast',
          event: 'request-connection',
          payload: {}
        })
      }
    }, 8000)

    return () => {
      console.log(`[WebRTC Recruiter] Unsubscribing card for candidate ${s.student_id}`)
      clearInterval(retryInterval)
      channel.unsubscribe()
      if (pcRef.current) {
        pcRef.current.close()
      }
    }
  }, [s.student_id, s.assessment_id])

  return (
    <Card className={`bg-neutral-900 border-2 flex flex-col overflow-hidden max-w-sm rounded-[24px] transition-all duration-350 shadow-2xl relative group ${
      isCritical ? 'border-red-500/30 hover:border-red-500/50 shadow-red-950/20' : 'border-sky-950/60 hover:border-sky-400/30'
    }`}>
      
      {/* Dynamic Camera Feed Container */}
      <div className="bg-[#030509] aspect-video w-full relative flex items-center justify-center overflow-hidden">
        {/* Ambient Dark overlay scan lines */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_40%,rgba(0,0,0,0.4))] z-10 pointer-events-none" />
        
        {/* Render HTML Video tag if status is connected */}
        <video 
          ref={videoRef} 
          autoPlay 
          playsInline 
          muted 
          className={`w-full h-full object-cover transition-opacity duration-500 z-0 ${
            connectionStatus === 'connected' ? 'opacity-100' : 'opacity-0 absolute'
          }`} 
        />

        {connectionStatus !== 'connected' && (
          <div className="flex flex-col items-center gap-2.5 z-20 text-center p-4">
            <div className={`p-4 rounded-full border ${
              isCritical ? 'border-red-500/20 bg-red-950/10' : 'border-sky-500/10 bg-sky-950/5'
            }`}>
              {connectionStatus === 'connecting' ? (
                <Video className="w-10 h-10 text-sky-400/50 animate-pulse" />
              ) : (
                <VideoOff className="w-10 h-10 text-neutral-600" />
              )}
            </div>
            <span className="text-[10px] font-mono text-sky-450 uppercase tracking-widest">
              {connectionStatus === 'connecting' ? 'Establishing Stream...' : 'Camera Feed Offline'}
            </span>
          </div>
        )}

        {/* Secure scan lines box corners */}
        <div className="absolute inset-2 border border-sky-400/10 pointer-events-none z-30">
          <div className={`absolute top-0 left-0 w-3.5 h-3.5 border-t-2 border-l-2 ${isCritical ? 'border-red-500/50' : 'border-sky-400/50'}`} />
          <div className={`absolute top-0 right-0 w-3.5 h-3.5 border-t-2 border-r-2 ${isCritical ? 'border-red-500/50' : 'border-sky-400/50'}`} />
          <div className={`absolute bottom-0 left-0 w-3.5 h-3.5 border-b-2 border-l-2 ${isCritical ? 'border-red-500/50' : 'border-sky-400/50'}`} />
          <div className={`absolute bottom-0 right-0 w-3.5 h-3.5 border-b-2 border-r-2 ${isCritical ? 'border-red-500/50' : 'border-sky-400/50'}`} />
        </div>

        {/* Score & Stream status badges */}
        <div className="absolute top-3 left-3 z-30 flex items-center gap-1.5 select-none">
          <span className={`px-2 py-0.5 rounded text-[8px] font-mono font-bold uppercase flex items-center gap-1 ${
            connectionStatus === 'connected' 
              ? 'bg-emerald-950/80 text-emerald-450 border border-emerald-900/50' 
              : isCritical 
                ? 'bg-red-950/80 text-red-400 border border-red-900/50' 
                : 'bg-sky-950/60 text-sky-400 border border-sky-900/40'
          }`}>
            <span className={`w-1.5 h-1.5 rounded-full ${connectionStatus === 'connected' ? 'bg-emerald-400 animate-ping' : 'bg-red-500'}`} />
            {connectionStatus === 'connected' ? 'Live Stream' : 'Live Channel'}
          </span>
        </div>

        <div className="absolute top-3 right-3 z-30 select-none">
          <span className={`px-2.5 py-0.5 rounded-lg border text-[9px] font-mono font-black ${
            isCritical 
              ? 'bg-red-950/90 text-red-450 border-red-500/30' 
              : 'bg-emerald-950/70 text-emerald-450 border-emerald-900/30'
          }`}>
            Score: {s.integrity_score}%
          </span>
        </div>
      </div>

      {/* Candidate Profile Info Block */}
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

        {/* Recent violation logs */}
        <div className="bg-[#030509] p-2 rounded-lg border border-sky-955/40 text-[8.5px] font-mono min-h-12 max-h-16 overflow-y-auto leading-normal text-neutral-500 flex flex-col gap-1">
          {s.violation_logs?.slice(-3).reverse().map((log, idx) => (
            <div key={idx} className={log.includes('ALERT') || log.includes('violation') || log.includes('lost') ? 'text-red-400/80 font-bold' : ''}>
              {log}
            </div>
          ))}
          {(!s.violation_logs || s.violation_logs.length === 0) && (
            <div className="text-center text-neutral-600">No events reported. Integrity verification steady.</div>
          )}
        </div>
      </div>

    </Card>
  )
}
