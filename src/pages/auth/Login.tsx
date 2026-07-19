import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Shield, AlertCircle, Fingerprint, ArrowRight, Mail, Lock, Terminal } from 'lucide-react'
import { useAuthStore } from '../../store/authStore'
import { Button } from '@/components/ui/button'

export default function Login() {
  const { login } = useAuthStore()
  const navigate = useNavigate()
  
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [errorMessage, setErrorMessage] = useState('')
  const [loading, setLoading] = useState(false)
  const [telemetryLogs, setTelemetryLogs] = useState<string[]>([])

  useEffect(() => {
    const systems = [
      'SECURE_TUNNEL_ESTABLISHED',
      'INTEGRITY_SHIELD_READY',
      'OPTICAL_SENSOR_STANDBY',
      'COMPILER_SANDBOX_IDLE',
      'DATABASE_POOL_CONNECTED',
      'TELEMETRY_PIPELINE_ACTIVE'
    ]
    
    setTelemetryLogs([
      `[${new Date().toLocaleTimeString()}] SHIELD_AI INIT_GATEWAY_SESSION`,
      `[${new Date().toLocaleTimeString()}] CRYPTO_KEY_NEGOTIATION COMPLETED`
    ])

    const interval = setInterval(() => {
      const randomSys = systems[Math.floor(Math.random() * systems.length)]
      const timestamp = new Date().toLocaleTimeString()
      setTelemetryLogs(prev => [
        `[${timestamp}] ${randomSys}`,
        ...prev.slice(0, 5)
      ])
    }, 4000)

    return () => clearInterval(interval)
  }, [])

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMessage('')
    setLoading(true)

    try {
      const result = await login(email, password)
      setLoading(false)

      if (result.success) {
        const currentUser = useAuthStore.getState().user
        if (currentUser?.role === 'recruiter') {
          navigate('/recruiter')
        } else {
          navigate('/candidate')
        }
      } else {
        setErrorMessage(result.error || 'Authentication handshake rejected.')
      }
    } catch (err: any) {
      setLoading(false)
      setErrorMessage(err.message || 'Network communication fault.')
    }
  }

  return (
    <div className="fixed inset-0 w-full h-[100dvh] flex font-sans antialiased overflow-hidden bg-background text-[#f5f5f7]">
      
      {/* Subtle Apple-style Glow in background */}
      <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-[#5B8CFF]/10 rounded-full blur-[150px] pointer-events-none" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-[#14B8A6]/10 rounded-full blur-[150px] pointer-events-none" />

      <div className="flex w-full h-full relative z-10">
        
        {/* LEFT PANEL: Branding & Visuals (Apple style clean typography) */}
        <div className="hidden lg:flex w-1/2 flex-col justify-between p-12 lg:p-20 bg-background/40 backdrop-blur-3xl">
          
          <div className="flex items-center space-x-3 select-none">
            <div className="p-2 bg-[#1c1c1e] rounded-xl border border-[#38383a]">
              <Shield className="w-5 h-5 text-[#5B8CFF]" strokeWidth={1.5} />
            </div>
            <span className="text-xl font-bold tracking-tight text-primary font-sans">
              ShieldAI
            </span>
          </div>

          <div className="max-w-md space-y-6">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-[#1c1c1e] border border-[#38383a] text-[10px] font-semibold tracking-widest uppercase text-primary rounded-full">
              <span className="w-1.5 h-1.5 rounded-full bg-[#34D399] animate-pulse" /> Live Telemetry Active
            </div>
            
            <h1 className="text-4xl lg:text-5xl font-semibold tracking-[-0.04em] leading-[1.1] text-primary">
              Intelligent integrity <br />
              <span className="text-tertiary">verification frameworks.</span>
            </h1>
            
            <p className="text-[15px] text-tertiary font-medium leading-relaxed max-w-sm">
              High-fidelity behavior telemetry and secure localized coding environments designed to verify talent authenticity.
            </p>

            <div className="mt-8 border border-[#38383a] rounded-2xl bg-[#1c1c1e]/50 p-5 font-mono text-[10px] text-tertiary space-y-2.5 backdrop-blur-xl">
              <div className="flex items-center gap-2 text-primary border-b border-[#38383a] pb-3 mb-3">
                <Terminal className="w-4 h-4" />
                <span className="font-semibold tracking-widest uppercase">System Terminal</span>
              </div>
              <div className="space-y-1.5 opacity-80">
                {telemetryLogs.map((log, idx) => (
                  <div key={idx} className="truncate tracking-wide">{log}</div>
                ))}
              </div>
            </div>
          </div>

          <div className="text-[11px] font-medium tracking-widest text-tertiary uppercase select-none">
            ShieldAI Enterprise v4.0
          </div>
        </div>

        {/* RIGHT PANEL: Minimalist Gateway Form */}
        <div className="w-full lg:w-1/2 flex flex-col justify-center items-center p-8 lg:p-0 bg-transparent">
          <div className="w-full max-w-[380px] space-y-8">
            
            <div className="text-center space-y-2 select-none">
              <h2 className="text-3xl font-semibold tracking-tight text-primary">
                Gateway Access
              </h2>
              <p className="text-[14px] text-tertiary font-medium">Verify credentials for secure institutional assessment.</p>
            </div>

            <form onSubmit={handleFormSubmit} className="space-y-5">
              {errorMessage && (
                <div className="text-[13px] text-primary bg-[#F87171]/20 p-4 rounded-2xl border border-[#F87171]/30 flex items-center space-x-3">
                  <AlertCircle className="w-4 h-4 shrink-0 text-[#F87171]" />
                  <span className="font-medium">{errorMessage}</span>
                </div>
              )}
              
              <div className="space-y-4">
                <div className="bg-[#1c1c1e] border border-[#38383a] rounded-2xl p-4 flex flex-col focus-within:border-[#5B8CFF] focus-within:ring-1 focus-within:ring-[#5B8CFF] transition-all">
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-[10px] font-semibold text-tertiary uppercase tracking-widest">
                      Institutional Email
                    </label>
                    <Mail className="w-4 h-4 text-tertiary" />
                  </div>
                  <input 
                    type="email" 
                    value={email} 
                    onChange={e => setEmail(e.target.value)}
                    className="w-full bg-transparent border-0 p-0 text-[15px] text-primary focus:outline-none focus:ring-0 placeholder:text-[#48484a] font-medium" 
                    placeholder="name@institution.edu" 
                    required 
                  />
                </div>

                <div className="bg-[#1c1c1e] border border-[#38383a] rounded-2xl p-4 flex flex-col focus-within:border-[#5B8CFF] focus-within:ring-1 focus-within:ring-[#5B8CFF] transition-all">
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-[10px] font-semibold text-tertiary uppercase tracking-widest">
                      Security Token PIN
                    </label>
                    <Lock className="w-4 h-4 text-tertiary" />
                  </div>
                  <input 
                    type="password" 
                    value={password} 
                    onChange={e => setPassword(e.target.value)}
                    className="w-full bg-transparent border-0 p-0 text-[15px] text-primary focus:outline-none focus:ring-0 placeholder:text-[#48484a] font-medium tracking-widest" 
                    placeholder="••••••••" 
                    required 
                  />
                </div>
              </div>

              <Button 
                type="submit" 
                disabled={loading} 
                className="w-full bg-[#f5f5f7] hover:bg-white text-black font-semibold h-[52px] rounded-2xl cursor-pointer transition-all duration-300 disabled:opacity-50 text-[14px] shadow-lg active:scale-[0.98] select-none flex items-center justify-center gap-2 mt-4"
              >
                {loading ? (
                  <>
                    <Fingerprint className="w-4 h-4 animate-pulse text-black" />
                    <span>VERIFYING...</span>
                  </>
                ) : (
                  <>
                    <span>CONTINUE TO DASHBOARD</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </Button>
            </form>

          </div>
        </div>

      </div>
    </div>
  )
}