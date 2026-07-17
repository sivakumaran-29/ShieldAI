import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Shield, AlertCircle, Fingerprint, ArrowRight, Mail, Lock } from 'lucide-react'
import { useAuthStore } from '../../store/authStore'
import { Button } from '@/components/ui/button'

export default function Login() {
  const { login } = useAuthStore()
  const navigate = useNavigate()
  
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [errorMessage, setErrorMessage] = useState('')
  const [loading, setLoading] = useState(false)

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
    <div className="w-full min-h-screen flex font-sans antialiased select-none overflow-hidden relative bg-[#020306]">
      
      {/* --- DARK DOMINATED TO SKY BLUE GRADIENT CORE --- */}
      <div className="absolute inset-0 bg-gradient-to-r from-[#030712] via-[#091124] via-[#0d1d3a] to-[#0c2d54] z-0" />
      
      {/* Dynamic Sky Blue / Cyan Ambient Lighting Core focused right under the form section */}
      <div className="absolute top-1/2 right-[-10%] -translate-y-1/2 w-[700px] h-[700px] bg-sky-500/[0.08] rounded-full blur-[150px] pointer-events-none mix-blend-screen" />
      <div className="absolute top-1/4 right-[10%] w-[400px] h-[400px] bg-blue-600/[0.06] rounded-full blur-[120px] pointer-events-none mix-blend-screen" />

      {/* High-Tech Technical Blueprint Grid Backdrop Overlay */}
      <div className="absolute inset-0 bg-[radial-gradient(#1e293b_1.2px,transparent_1.2px)] opacity-25 pointer-events-none" />

      {/* ================= LEFT HALF CONTENT HUB (52% Width Layout) ================= */}
      <div className="hidden lg:flex lg:w-[52%] flex-col justify-between p-16 relative z-10">
        
        {/* ShieldAI Logo Header & Minimal Tagline */}
        <div className="space-y-2 group cursor-pointer">
          <div className="flex items-center space-x-3.5">
            <div className="p-3 bg-neutral-900/90 border border-neutral-800/80 rounded-2xl shadow-[0_4px_20px_rgba(0,0,0,0.6)] group-hover:border-sky-500/40 transition-all duration-300">
              <Shield className="w-6 h-6 text-sky-400 drop-shadow-[0_0_8px_rgba(56,189,248,0.6)]" />
            </div>
            <span className="text-2xl font-black tracking-tight text-neutral-100">
              Shield<span className="bg-gradient-to-r from-sky-400 to-blue-500 bg-clip-text text-transparent font-black tracking-tighter">AI</span>
            </span>
          </div>
          {/* Minimal Sub-Tagline Line */}
          <p className="text-[11px] text-sky-400/60 font-mono tracking-wider pl-1.5 transition-colors group-hover:text-sky-400/90 duration-300">
            // Real-time systemic behavioral integrity monitoring endpoint.
          </p>
        </div>

        {/* Dynamic Presentation Headlines */}
        <div className="max-w-xl space-y-6 my-auto pl-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-blue-950/40 border border-blue-900/50 text-[10px] font-mono tracking-widest uppercase text-sky-400 rounded-lg shadow-sm">
            <span className="w-1.5 h-1.5 rounded-full bg-sky-400 animate-pulse" /> Live Telemetry Session Active
          </div>
          
          <h1 className="text-4xl lg:text-5xl font-black tracking-tight leading-[1.12] text-neutral-200">
            Intelligent <span className="text-transparent bg-clip-text bg-gradient-to-r from-sky-400 via-blue-400 to-cyan-400 drop-shadow-[0_2px_15px_rgba(56,189,248,0.3)]">behavioral integrity node frameworks.</span>
          </h1>
          
          <p className="text-xs text-neutral-400 font-normal leading-relaxed max-w-sm opacity-70">
            Localized browser proctoring analysis handling secure encrypted state triggers natively within Room 66.
          </p>
        </div>

        {/* Institutional Base Subtext */}
        <div className="text-[9px] font-mono tracking-widest text-neutral-600 uppercase pl-2 opacity-40">
          AMRITA UNIVERSITY INTEGRITY EVALUATION NETWORK
        </div>
      </div>

      {/* ================= CENTRAL TRANSITION ZONE: STYLISH SKY CHEVRONS ================= */}
      <div className="absolute top-1/2 left-[50%] -translate-y-1/2 -translate-x-1/2 z-30 hidden lg:flex items-center space-x-1.5 pointer-events-none tracking-widest font-black text-2xl select-none">
        <span className="animate-pulse duration-[1400ms] text-sky-500/30">&gt;</span>
        <span className="animate-pulse duration-[1200ms] text-sky-400/60">&gt;</span>
        <span className="animate-pulse duration-[1000ms] text-sky-400 drop-shadow-[0_0_8px_rgba(56,189,248,0.6)]">&gt;</span>
      </div>

      {/* ================= RIGHT HALF: PREMIUM SKY GLASS PORTAL HUB (48% Width) ================= */}
      <div className="w-full lg:w-[48%] flex flex-col justify-center items-center p-6 sm:p-16 z-10">
        <div className="w-full max-w-md space-y-8 relative z-10 group transition-all duration-500 ease-out transform hover:-translate-y-1">
          
          {/* Form Header */}
          <div className="space-y-1 text-center lg:text-left pl-1">
            <h2 className="text-3xl font-black tracking-tight text-neutral-100 drop-shadow-[0_4px_12px_rgba(0,0,0,0.3)]">
              Terminal Gateway
            </h2>
            <p className="text-xs text-sky-300/70 font-medium tracking-wide">Provide verified institutional access parameters.</p>
          </div>

          <form onSubmit={handleFormSubmit} className="space-y-6">
            {errorMessage && (
              <div className="text-xs text-red-400 bg-red-950/40 p-3.5 rounded-xl border border-red-900/40 flex items-center space-x-2.5 animate-fadeIn">
                <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
                <span className="font-semibold tracking-wide">{errorMessage}</span>
              </div>
            )}
            
            {/* --- TRUE FROSTED SKY-BLUE GLASS CONTAINER --- */}
            <div className="bg-sky-950/15 border border-sky-400/20 p-6 rounded-3xl shadow-[0_30px_70px_-15px_rgba(0,0,0,0.8)] backdrop-blur-xl space-y-4 transition-all duration-500 group-hover:border-sky-400/40 group-hover:bg-sky-950/20 group-hover:shadow-[0_0_40px_rgba(56,189,248,0.15)] relative overflow-hidden">
              
              {/* Solid Luminous Sky Accent Left Border Strip */}
              <div className="absolute left-0 inset-y-0 w-[4px] bg-gradient-to-b from-sky-400 via-blue-500 to-sky-600 rounded-l-3xl shadow-[0_0_15px_rgba(56,189,248,0.4)]" />

              {/* Email Input Column Wrapper */}
              <div className="bg-neutral-950/60 border border-sky-900/40 rounded-xl p-3.5 focus-within:border-sky-400 focus-within:bg-sky-950/20 focus-within:shadow-[0_0_15px_rgba(56,189,248,0.08)] transition-all duration-300 relative flex flex-col">
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-sky-400/80 font-bold text-[9px] font-mono tracking-widest uppercase">
                    Institutional Email
                  </label>
                  <Mail className="w-3.5 h-3.5 text-sky-500/40 transition-colors focus-within:text-sky-400" />
                </div>
                <input 
                  type="email" 
                  value={email} 
                  onChange={e => setEmail(e.target.value)}
                  className="w-full bg-transparent border-0 p-0 text-xs text-neutral-100 focus:outline-none focus:ring-0 placeholder:text-neutral-700 font-semibold tracking-wide" 
                  placeholder="name@amrita.edu" 
                  required 
                />
              </div>

              {/* Password PIN Input Column Wrapper */}
              <div className="bg-neutral-950/60 border border-sky-900/40 rounded-xl p-3.5 focus-within:border-sky-400 focus-within:bg-sky-950/20 focus-within:shadow-[0_0_15px_rgba(56,189,248,0.08)] transition-all duration-300 relative flex flex-col">
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-sky-400/80 font-bold text-[9px] font-mono tracking-widest uppercase">
                    Security Token PIN
                  </label>
                  <Lock className="w-3.5 h-3.5 text-sky-500/40 transition-colors focus-within:text-sky-400" />
                </div>
                <input 
                  type="password" 
                  value={password} 
                  onChange={e => setPassword(e.target.value)}
                  className="w-full bg-transparent border-0 p-0 text-xs text-neutral-100 focus:outline-none focus:ring-0 placeholder:text-neutral-700 font-mono tracking-widest text-neutral-200" 
                  placeholder="••••••••" 
                  required 
                />
              </div>

            </div>

            {/* Custom Sky-Glowing Action Execution Button */}
            <Button 
              type="submit" 
              disabled={loading} 
              className="w-full bg-gradient-to-r from-sky-400 to-blue-500 hover:from-sky-300 hover:to-blue-400 text-neutral-950 font-black h-12 rounded-xl cursor-pointer transition-all duration-300 disabled:bg-neutral-900 disabled:text-neutral-600 border border-sky-400/30 flex items-center justify-center gap-2 text-xs shadow-[0_4px_25px_rgba(56,189,248,0.2)] active:scale-[0.99] tracking-wider"
            >
              {loading ? (
                <>
                  <Fingerprint className="w-4 h-4 animate-spin text-neutral-950" />
                  <span>Validating Terminal Handshake...</span>
                </>
              ) : (
                <>
                  <span>Initialize Secure Authentication</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </Button>
          </form>

        </div>
      </div>

    </div>
  )
}