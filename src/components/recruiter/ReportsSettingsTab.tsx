import { useState, useEffect } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { 
  FileText, Download, Check, Save,
  Sliders, Database, Cpu, RefreshCw, Terminal as TermIcon, Settings as GearIcon, Shield, Search
} from 'lucide-react'
import { Assessment } from '../../lib/assessmentEngine'

interface ReportsSettingsTabProps {
  defaultSection: 'reports' | 'settings' | 'logs'
  assessments: Assessment[]
}

export default function ReportsSettingsTab({ defaultSection }: ReportsSettingsTabProps) {
  const [activeSub, setActiveSub] = useState<'reports' | 'settings' | 'logs'>(defaultSection)
  const [isRefreshingLogs, setIsRefreshingLogs] = useState(false)
  const [logsSearch, setLogsSearch] = useState('')

  // Settings states
  const [integrityThreshold, setIntegrityThreshold] = useState(75)
  const [proctorCamera, setProctorCamera] = useState(true)
  const [proctorTabs, setProctorTabs] = useState(true)
  const [allowedLangs, setAllowedLangs] = useState(['python', 'javascript'])
  const [saveSuccess, setSaveSuccess] = useState(false)

  // Sub-settings categories for macOS settings panel
  const [settingsCategory, setSettingsCategory] = useState<'general' | 'proctor' | 'compilers'>('general')

  useEffect(() => {
    setActiveSub(defaultSection)
  }, [defaultSection])

  // Mock logs feed
  const [systemLogs, setSystemLogs] = useState<string[]>([
    '[21:40:01] [SYSTEM] Proctor optical analytics server cluster active.',
    '[21:40:15] [WEBRTC] Socket negotiation listening on student channels.',
    '[21:41:02] [SUPABASE] Broadcast channel joined: integrity_audits_lobby.',
    '[21:42:19] [SANDBOX] Gemini evaluations model initialized: gemini-1.5-flash.',
    '[21:43:05] [COMPILER] Python compiler sandbox node initialized successfully.',
    '[21:44:48] [SECURITY] Client session token authenticated: recruiter_session.'
  ])

  const handleRefreshLogs = () => {
    setIsRefreshingLogs(true)
    setTimeout(() => {
      setSystemLogs(prev => [
        `[${new Date().toLocaleTimeString()}] [TELEMETRY] Proctor check: CPU load 12%, Memory usage 184MB.`,
        ...prev
      ])
      setIsRefreshingLogs(false)
    }, 800)
  }

  const handleSaveSettings = (e: React.FormEvent) => {
    e.preventDefault()
    setSaveSuccess(true)
    setTimeout(() => setSaveSuccess(false), 2000)
  }

  const handleToggleLang = (lang: string) => {
    setAllowedLangs(prev => 
      prev.includes(lang) ? prev.filter(l => l !== lang) : [...prev, lang]
    )
  }

  const filteredLogs = systemLogs.filter(log => 
    log.toLowerCase().includes(logsSearch.toLowerCase())
  )

  return (
    <div className="space-y-6 select-none">
      
      {/* Header Info */}
      <div className="flex items-center justify-between select-none border-b border-white/5 pb-4">
        <div>
          <h2 className="text-[10px] font-mono font-bold tracking-widest text-[#5B8CFF] uppercase">
            // {activeSub === 'reports' ? 'COMPLIANCE AUDIT REPORTS' : activeSub === 'settings' ? 'GLOBAL PLATFORM CONFIG' : 'TELEMETRY NETWORK LOGS'}
          </h2>
          <span className="text-[10px] sys-text-body font-mono mt-1 block">
            {activeSub === 'reports' 
              ? 'Download evaluation summary sheets and audit registries' 
              : activeSub === 'settings' 
                ? 'Configure proctoring rules thresholds and defaults' 
                : 'Realtime proctoring cluster events timeline logs'
            }
          </span>
        </div>

        {activeSub === 'logs' && (
          <Button 
            onClick={handleRefreshLogs} 
            disabled={isRefreshingLogs}
            variant="outline" 
            className="border-white/5 sys-bg/20 h-8 text-[11px] font-bold sys-text-body hover:text-white rounded-xl transition cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${isRefreshingLogs ? 'animate-spin' : ''}`} strokeWidth={1.5} /> Update terminal
          </Button>
        )}
      </div>

      {/* ================= REPORTS SECTION ================= */}
      {activeSub === 'reports' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-stretch">
          
          <Card className="bg-[#0a0a0a]/85 border-white/5 p-6 rounded-2xl flex flex-col justify-between min-h-[220px]">
            <div className="space-y-3">
              <div className="p-2 bg-[#5B8CFF]/10 rounded-xl w-10">
                <FileText className="w-5 h-5 text-[#5B8CFF]" strokeWidth={1.5} />
              </div>
              <h4 className="font-bold text-xs text-white font-heading">Cohort Integrity Summary</h4>
              <p className="text-[10.5px] sys-text-body leading-relaxed font-sans">
                Full list details of all registered candidates, overall integrity rating indices, compiler scores, and timing parameters.
              </p>
            </div>
            <div className="pt-4 border-t border-white/5 flex justify-end">
              <Button className="bg-[#5B8CFF] hover:bg-[#3b71f3] text-white rounded-xl text-xs h-9 px-4 flex items-center gap-1.5 shadow-md">
                <Download className="w-3.5 h-3.5" /> Download PDF
              </Button>
            </div>
          </Card>

          <Card className="bg-[#0a0a0a]/85 border-white/5 p-6 rounded-2xl flex flex-col justify-between min-h-[220px]">
            <div className="space-y-3">
              <div className="p-2 bg-[#14B8A6]/10 rounded-xl w-10">
                <Database className="w-5 h-5 text-[#14B8A6]" strokeWidth={1.5} />
              </div>
              <h4 className="font-bold text-xs text-white font-heading">Raw CSV Database Audit</h4>
              <p className="text-[10.5px] sys-text-body leading-relaxed font-sans">
                Compile spreadsheet row listings containing student identifiers, active socket connection logs, and compiler test-case details.
              </p>
            </div>
            <div className="pt-4 border-t border-white/5 flex justify-end">
              <Button className="sys-bg hover:sys-card border border-white/5 sys-text-body hover:text-white rounded-xl text-xs h-9 px-4 flex items-center gap-1.5 transition">
                <Download className="w-3.5 h-3.5" /> Export Data Sheet
              </Button>
            </div>
          </Card>

          <Card className="bg-[#0a0a0a]/85 border-white/5 p-6 rounded-2xl flex flex-col justify-between min-h-[220px]">
            <div className="space-y-3">
              <div className="p-2 bg-[#A855F7]/10 rounded-xl w-10">
                <Sliders className="w-5 h-5 text-[#A855F7]" strokeWidth={1.5} />
              </div>
              <h4 className="font-bold text-xs text-white font-heading">Generative Threat Report</h4>
              <p className="text-[10.5px] sys-text-body leading-relaxed font-sans">
                Gemini security overview details covering tab changes, webcam warning flags, and compiler plagiarism scores.
              </p>
            </div>
            <div className="pt-4 border-t border-white/5 flex justify-end">
              <Button className="sys-bg hover:sys-card border border-white/5 sys-text-body hover:text-white rounded-xl text-xs h-9 px-4 flex items-center gap-1.5 transition">
                <Download className="w-3.5 h-3.5" /> Query AI Report
              </Button>
            </div>
          </Card>

        </div>
      )}

      {/* ================= SETTINGS SECTION (macOS PANELS STYLE) ================= */}
      {activeSub === 'settings' && (
        <Card className="bg-[#0a0a0a]/85 border-white/5 rounded-2xl overflow-hidden shadow-xl grid grid-cols-1 md:grid-cols-12 min-h-[350px]">
          
          {/* macOS settings sub sidebar (3 cols) */}
          <div className="md:col-span-3 sys-bg/20 border-r border-white/5 p-4 flex flex-col gap-1.5">
            <button 
              onClick={() => setSettingsCategory('general')}
              className={`w-full text-left px-3 py-2 rounded-xl text-xs font-medium flex items-center gap-2.5 transition ${
                settingsCategory === 'general' ? 'bg-[#5B8CFF]/10 text-[#5B8CFF] font-bold' : 'sys-text-body hover:text-white hover:sys-bg/20'
              }`}
            >
              <GearIcon className="w-4.5 h-4.5" />
              <span>General Settings</span>
            </button>
            
            <button 
              onClick={() => setSettingsCategory('proctor')}
              className={`w-full text-left px-3 py-2 rounded-xl text-xs font-medium flex items-center gap-2.5 transition ${
                settingsCategory === 'proctor' ? 'bg-[#5B8CFF]/10 text-[#5B8CFF] font-bold' : 'sys-text-body hover:text-white hover:sys-bg/20'
              }`}
            >
              <Shield className="w-4.5 h-4.5" />
              <span>Proctoring Sandbox</span>
            </button>

            <button 
              onClick={() => setSettingsCategory('compilers')}
              className={`w-full text-left px-3 py-2 rounded-xl text-xs font-medium flex items-center gap-2.5 transition ${
                settingsCategory === 'compilers' ? 'bg-[#5B8CFF]/10 text-[#5B8CFF] font-bold' : 'sys-text-body hover:text-white hover:sys-bg/20'
              }`}
            >
              <Cpu className="w-4.5 h-4.5" />
              <span>Compilers Node</span>
            </button>
          </div>

          {/* Settings main panel content (9 cols) */}
          <div className="md:col-span-9 p-6">
            <form onSubmit={handleSaveSettings} className="space-y-6 text-xs h-full flex flex-col justify-between">
              
              <div className="space-y-5">
                {settingsCategory === 'general' && (
                  <div className="space-y-4 animate-fade-in">
                    <span className="text-[9px] font-mono sys-text-body uppercase tracking-widest block mb-2">GENERAL CONFIGURATIONS</span>
                    
                    <div className="p-4 sys-bg/40 border border-white/5 rounded-xl flex items-center justify-between">
                      <div className="space-y-0.5">
                        <span className="text-xs font-bold sys-text-primary block">Workspace Identifier Node</span>
                        <span className="text-[10px] sys-text-body font-sans">Active recruitment cluster location.</span>
                      </div>
                      <span className="text-xs font-mono font-bold sys-text-body">AMRITA_BATCH_2026</span>
                    </div>
                  </div>
                )}

                {settingsCategory === 'proctor' && (
                  <div className="space-y-4 animate-fade-in">
                    <span className="text-[9px] font-mono sys-text-body uppercase tracking-widest block mb-2">PROCTORING CONFIGURATION RULES</span>
                    
                    {/* Integrity threshold slider */}
                    <div className="space-y-2">
                      <div className="flex justify-between select-none">
                        <span className="sys-text-body font-bold">Minimum Integrity Threshold</span>
                        <span className="text-white font-mono font-bold">{integrityThreshold}%</span>
                      </div>
                      <input 
                        type="range" 
                        min={30} 
                        max={95} 
                        value={integrityThreshold}
                        onChange={e => setIntegrityThreshold(Number(e.target.value))}
                        className="w-full h-1 sys-card rounded-lg appearance-none cursor-pointer accent-[#5B8CFF]"
                      />
                      <span className="text-[10px] sys-text-body block leading-normal">
                        Candidates dropping below this compliance mark are flagged as critical on the proctor grid.
                      </span>
                    </div>

                    {/* Checkbox toggle params */}
                    <div className="space-y-3 pt-2">
                      <label className="flex items-center justify-between p-3.5 sys-bg/40 border border-white/5 rounded-xl cursor-pointer select-none">
                        <div className="space-y-0.5 pr-4">
                          <span className="text-xs font-bold sys-text-primary block">Hardware Camera Verification</span>
                          <span className="text-[10px] sys-text-body font-sans">Require active WebRTC camera monitoring feeds.</span>
                        </div>
                        <input 
                          type="checkbox" 
                          checked={proctorCamera} 
                          onChange={e => setProctorCamera(e.target.checked)}
                          className="w-4 h-4 rounded border-white/5 text-[#5B8CFF] focus:ring-0 sys-bg cursor-pointer" 
                        />
                      </label>

                      <label className="flex items-center justify-between p-3.5 sys-bg/40 border border-white/5 rounded-xl cursor-pointer select-none">
                        <div className="space-y-0.5 pr-4">
                          <span className="text-xs font-bold sys-text-primary block">Strict Tab-Switch Blocking</span>
                          <span className="text-[10px] sys-text-body font-sans">Log violations immediately when user loses focus of exam browser.</span>
                        </div>
                        <input 
                          type="checkbox" 
                          checked={proctorTabs} 
                          onChange={e => setProctorTabs(e.target.checked)}
                          className="w-4 h-4 rounded border-white/5 text-[#5B8CFF] focus:ring-0 sys-bg cursor-pointer" 
                        />
                      </label>
                    </div>

                  </div>
                )}

                {settingsCategory === 'compilers' && (
                  <div className="space-y-4 animate-fade-in">
                    <span className="text-[9px] font-mono sys-text-body uppercase tracking-widest block mb-2">ALLOWED COMPILER RUNTIMES</span>
                    
                    <div className="space-y-3">
                      {['python', 'javascript', 'java'].map(lang => (
                        <label key={lang} className="flex items-center justify-between p-3 sys-bg/40 border border-white/5 rounded-xl cursor-pointer select-none">
                          <span className="text-xs uppercase font-mono font-bold sys-text-primary">{lang}</span>
                          <input 
                            type="checkbox" 
                            checked={allowedLangs.includes(lang)}
                            onChange={() => handleToggleLang(lang)}
                            className="w-4 h-4 rounded border-white/5 text-[#5B8CFF] focus:ring-0 sys-bg cursor-pointer"
                          />
                        </label>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Form submit actions */}
              <div className="pt-6 border-t border-white/5 flex justify-end items-center gap-3">
                {saveSuccess && (
                  <span className="text-xs text-[#34D399] font-semibold flex items-center gap-1">
                    <Check className="w-3.5 h-3.5" /> Settings Saved
                  </span>
                )}
                
                <Button 
                  type="submit"
                  className="bg-[#5B8CFF] hover:bg-[#3b71f3] text-white rounded-xl text-xs h-10 px-6 font-bold cursor-pointer transition shadow-md"
                >
                  <Save className="w-4 h-4 mr-1.5" /> Save Changes
                </Button>
              </div>

            </form>
          </div>

        </Card>
      )}

      {/* ================= LOGS SECTION (HIGH FIDELITY TERMINAL) ================= */}
      {activeSub === 'logs' && (
        <Card className="bg-[#000000] border-white/5 rounded-2xl overflow-hidden shadow-2xl flex flex-col min-h-[380px]">
          
          {/* Terminal header controls */}
          <div className="bg-[#0a0a0a]/80 border-b border-white/5 px-4 py-2.5 flex justify-between items-center select-none text-[10px]">
            <span className="flex items-center sys-text-body font-mono font-bold">
              <TermIcon className="w-4.5 h-4.5 mr-2 sys-text-body" /> SYSTEM MONITOR TERMINAL
            </span>

            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1.5 p-1 px-3 sys-bg border border-white/5 rounded-xl">
                <Search className="w-3.5 h-3.5 sys-text-body" />
                <input 
                  type="text" 
                  value={logsSearch}
                  onChange={e => setLogsSearch(e.target.value)}
                  placeholder="Filter logs..."
                  className="bg-transparent border-0 p-0 text-[10px] text-white focus:outline-none focus:ring-0 placeholder:sys-text-body w-28 font-mono"
                />
              </div>
            </div>
          </div>

          {/* Terminal viewport window */}
          <div className="flex-1 p-4 font-mono text-[10px] sys-text-body overflow-y-auto space-y-2 select-text bg-[#000000]/50 leading-relaxed max-h-[300px]">
            {filteredLogs.map((log, index) => {
              let colorClass = 'sys-text-body'
              if (log.includes('[WEBRTC]') || log.includes('[COMPILER]')) colorClass = 'text-[#5B8CFF]'
              if (log.includes('[SECURITY]')) colorClass = 'text-[#34D399]'
              if (log.includes('[SYSTEM]')) colorClass = 'text-white font-bold'
              
              return (
                <div key={index} className={`truncate ${colorClass}`}>
                  {log}
                </div>
              )
            })}

            {filteredLogs.length === 0 && (
              <div className="p-8 text-center sys-text-body select-none">
                No logs matching query index.
              </div>
            )}
          </div>

        </Card>
      )}

    </div>
  )
}
