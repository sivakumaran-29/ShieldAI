import { useState, useEffect } from 'react'
import { Shield, LayoutDashboard, BarChart2, Users, Database,
  FileText, Settings, LogOut, ChevronLeft, ChevronRight,
  Search, User, Sparkles, Command, Library, X, RefreshCw
} from 'lucide-react'
import { useAuthStore } from '../../store/authStore'
import { Button } from '@/components/ui/button'
import { fetchAssessments, Assessment } from '../../lib/assessmentEngine'
import ThemeToggle from '../../components/ThemeToggle'
import { AmbientGlow } from '../../components/AmbientGlow'

// Tabs Imports
import AssessmentTab from '../../components/recruiter/AssessmentTab'
import QuestionTab from '../../components/recruiter/QuestionTab'
import LeaderboardTab from '../../components/recruiter/LeaderboardTab'
import MonitorTab from '../../components/recruiter/MonitorTab'
import AIGenerationTab from '../../components/recruiter/AIGenerationTab'
import ReportsSettingsTab from '../../components/recruiter/ReportsSettingsTab'
import DatabaseTab from '../../components/recruiter/DatabaseTab'

type AdminSection = 'overview' | 'analytics' | 'users' | 'database' | 'roles' | 'permissions' | 'reports' | 'settings' | 'logs' | 'ai-generate' | 'questions'

export default function RecruiterDashboard() {
  const { user, logout } = useAuthStore()
  
  // Layout states
  const [activeSection, setActiveSection] = useState<AdminSection>('overview')
  const [isCollapsed, setIsCollapsed] = useState(false)
  const [assessmentsList, setAssessmentsList] = useState<Assessment[]>([])
  const [selectedAssessment, setSelectedAssessment] = useState<Assessment | null>(null)
  const [loading, setLoading] = useState(true)
  const [isSyncing, setIsSyncing] = useState(false)
  
  const handleSync = async () => {
    setIsSyncing(true)
    await loadAssessments()
    setTimeout(() => {
      window.location.reload()
    }, 500)
  }
  
  // Floating Command Palette state
  const [showPalette, setShowPalette] = useState(false)
  const [paletteSearch, setPaletteSearch] = useState('')

  const loadAssessments = async () => {
    try {
      const data = await fetchAssessments()
      setAssessmentsList(data)
      
      // Update selected assessment references
      if (selectedAssessment) {
        const fresh = data.find(a => a.id === selectedAssessment.id)
        if (fresh) setSelectedAssessment(fresh)
      } else if (data.length > 0) {
        setSelectedAssessment(data[0])
      }


    } catch (err) {
      console.error('Failed to query assessments list:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadAssessments()
  }, [])


  // Keyboard listener for ⌘K or Ctrl+K
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setShowPalette(prev => !prev)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  const handleSelectAssessment = (a: Assessment) => {
    setSelectedAssessment(a)
    setActiveSection('questions')
  }


  if (loading) {
    return (
      <div className="min-h-screen bg-[#000000] flex items-center justify-center text-white font-mono text-xs relative overflow-hidden">
        <div className="grain-overlay" />
        <div className="flex flex-col items-center gap-3 relative z-10">
          <Shield className="w-6 h-6 animate-pulse text-[#5B8CFF]" strokeWidth={1.5} />
          <span className="font-heading font-semibold tracking-wider">Loading ShieldAI Workspace...</span>
        </div>
      </div>
    )
  }

  const navItems = [
    { id: 'overview' as const, label: 'Overview', icon: LayoutDashboard },
    { id: 'analytics' as const, label: 'Analytics', icon: BarChart2 },
    { id: 'users' as const, label: 'Users & Proctors', icon: Users },
    { id: 'database' as const, label: 'Database', icon: Database },
    { id: 'reports' as const, label: 'Reports Console', icon: FileText },
    { id: 'settings' as const, label: 'Platform Settings', icon: Settings },
  ]

  // Filter assessments for Command Palette Search
  const filteredPaletteAssessments = assessmentsList.filter(a => 
    a.title.toLowerCase().includes(paletteSearch.toLowerCase())
  )

  return (
    <div className="min-h-screen sys-bg text-foreground flex font-sans antialiased overflow-hidden relative">
      
      {/* 1. Ambient Background Layer */}
      <AmbientGlow />
      
      {/* 2. cinematic matte noise overlay */}
      <div className="grain-overlay" />

      {/* ================= LEFT SIDEBAR (COLLAPSIBLE OS DOCK) ================= */}
      <aside 
        className={`h-screen bg-[#000000]/40 backdrop-blur-3xl border-r border-white/5 flex flex-col justify-between p-5 shrink-0 z-30 select-none transition-all duration-300 transition-spring ${
          isCollapsed ? 'w-20' : 'w-64'
        }`}
      >
        <div className="space-y-6">
          
          {/* Header Workspace Picker */}
          <div className="flex items-center justify-between select-none">
            <div className="flex items-center space-x-3 overflow-hidden">
              <div className="p-2 bg-background border border-white/5 rounded-xl shrink-0">
                <Shield className="w-5 h-5 text-[#5B8CFF]" strokeWidth={1.5} />
              </div>
              {!isCollapsed && (
                <div className="flex flex-col">
                  <span className="font-heading font-extrabold text-sm tracking-tight text-white">ShieldAI</span>
                  <span className="text-[8px] font-mono sys-text-body uppercase tracking-widest leading-none mt-0.5">V2 Enterprise</span>
                </div>
              )}
            </div>
            
            {!isCollapsed && <ThemeToggle />}
          </div>

          {/* Spotlight command key launcher shortcut */}
          {!isCollapsed && (
            <div 
              onClick={() => setShowPalette(true)}
              className="flex sys-bg/40 border border-white/5 rounded-xl px-3 py-2 items-center gap-2 hover:border-[#5B8CFF]/30 cursor-pointer transition select-none"
            >
              <Search className="w-3.5 h-3.5 sys-text-body" strokeWidth={1.5} />
              <span className="text-[11px] sys-text-body font-medium flex-1">Command Search...</span>
              <span className="text-[8px] font-mono sys-text-body bg-[rgba(28,28,30,0.72)] backdrop-blur-[16px] border border-white/5 px-1.5 py-0.2 rounded">⌘K</span>
            </div>
          )}

          {isCollapsed && (
            <div className="flex justify-center">
              <button 
                onClick={() => setShowPalette(true)}
                className="p-2 rounded-xl sys-bg/40 border border-white/5 sys-text-body hover:text-white transition"
              >
                <Command className="w-4 h-4" strokeWidth={1.5} />
              </button>
            </div>
          )}



          {/* OS Navigation Links */}
          <nav className="flex flex-col gap-1">
            {navItems.map((item) => {
              const IconComp = item.icon
              const isActive = activeSection === item.id || 
                (item.id === 'overview' && (activeSection === 'questions' || activeSection === 'ai-generate'))
              
              return (
                <button 
                  key={item.id}
                  onClick={() => setActiveSection(item.id)}
                  className={`flex items-center gap-3 px-3 py-2.5 text-xs font-medium rounded-xl border transition-all duration-300 cursor-pointer ${
                    isActive 
                      ? 'bg-[#5B8CFF]/10 text-[#5B8CFF] border-[#5B8CFF]/20 font-semibold' 
                      : 'sys-text-body hover:text-white border-transparent hover:bg-[rgba(28,28,30,0.72)] backdrop-blur-[16px]/20'
                  } ${isCollapsed ? 'justify-center' : ''}`}
                  title={item.label}
                >
                  <IconComp className="w-4.5 h-4.5 shrink-0" strokeWidth={1.5} />
                  {!isCollapsed && <span>{item.label}</span>}
                </button>
              )
            })}

            {/* AI Generator navigation link (if active & assessment selected) */}
            {selectedAssessment && !isCollapsed && (activeSection === 'questions' || activeSection === 'ai-generate') && (
              <div className="pl-4 mt-1 border-l border-white/5 flex flex-col gap-1">
                <button 
                  onClick={() => setActiveSection('questions')}
                  className={`flex items-center gap-2 py-1.5 px-3 text-[11px] rounded-lg transition ${
                    activeSection === 'questions' ? 'text-[#5B8CFF] font-semibold' : 'sys-text-body hover:sys-text-primary'
                  }`}
                >
                  <Library className="w-3.5 h-3.5" strokeWidth={1.5} />
                  <span>Questions Bank</span>
                </button>
                <button 
                  onClick={() => setActiveSection('ai-generate')}
                  className={`flex items-center gap-2 py-1.5 px-3 text-[11px] rounded-lg transition ${
                    activeSection === 'ai-generate' ? 'text-[#5B8CFF] font-semibold' : 'sys-text-body hover:sys-text-primary'
                  }`}
                >
                  <Sparkles className="w-3.5 h-3.5" strokeWidth={1.5} />
                  <span>AI Generator</span>
                </button>
              </div>
            )}
          </nav>
        </div>

        {/* Footer Profile & Dock Toggle */}
        <div className="space-y-4 pt-4 border-t border-white/5">
          {isCollapsed && (
            <div className="flex justify-center pb-2">
              <ThemeToggle />
            </div>
          )}

          {/* User profile details */}
          <div className={`flex items-center gap-3 px-1 ${isCollapsed ? 'justify-center' : ''}`}>
            <div className="p-2 bg-[rgba(28,28,30,0.72)] backdrop-blur-[16px]/40 border border-white/5 rounded-xl shrink-0">
              <User className="w-4 h-4 sys-text-body" strokeWidth={1.5} />
            </div>
            {!isCollapsed && (
              <div className="flex flex-col min-w-0">
                <span className="text-xs font-semibold text-white truncate font-heading">{user?.name || 'Recruiter'}</span>
                <span className="text-[9.5px] sys-text-body font-mono truncate">{user?.email}</span>
              </div>
            )}
          </div>

          <div className="flex items-center gap-2">
            <Button 
              onClick={logout} 
              variant="outline" 
              className={`border-white/5 sys-bg/20 !shadow-none hover:!bg-[rgba(28,28,30,0.72)] hover:!shadow-none sys-text-body hover:text-white text-xs h-9 justify-center cursor-pointer transition rounded-xl flex-1 ${
                isCollapsed ? 'p-0' : ''
              }`}
              title="Sign Out"
            >
              <LogOut className="w-3.5 h-3.5" strokeWidth={1.5} />
              {!isCollapsed && <span className="ml-1.5">Sign Out</span>}
            </Button>

            {/* Collapsible toggle button */}
            <button 
              onClick={() => setIsCollapsed(!isCollapsed)}
              className="p-2 border border-white/5 sys-bg/20 hover:sys-card sys-text-body hover:text-white rounded-xl cursor-pointer transition focus:outline-none"
            >
              {isCollapsed ? <ChevronRight className="w-3.5 h-3.5" /> : <ChevronLeft className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>
      </aside>

      {/* ================= CENTER WORKSPACE AREA ================= */}
      <div className="flex-1 flex flex-col h-screen overflow-hidden relative z-10">
        
        {/* TOP BAR FLOATING COMMAND WORKSPACE */}
        <header className="h-16 border-b border-white/5 bg-[rgba(28,28,30,0.72)] backdrop-blur-[16px] flex items-center justify-between px-8 z-25 ">
          {/* Breadcrumbs trail */}
          <div className="flex items-center gap-2 text-[10px] font-heading font-semibold uppercase tracking-widest select-none text-white/60">
            <span>SHIELD_OS</span>
            <span>/</span>
            <span className="text-[#5B8CFF]">{activeSection}</span>
            {selectedAssessment && (activeSection === 'questions' || activeSection === 'ai-generate') && (
              <>
                <span>/</span>
                <span className="text-foreground">{selectedAssessment.title}</span>
              </>
            )}
          </div>

          {/* Heartbeat system status */}
          <div className="flex items-center gap-4">
            <button 
              onClick={handleSync}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-white/5 sys-bg/40 hover:sys-card transition-all cursor-pointer group"
            >
              <RefreshCw className={`w-3.5 h-3.5 sys-text-body group-hover:text-white ${isSyncing ? 'animate-spin text-[#5B8CFF]' : ''}`} />
              <span className="text-[10px] font-mono font-bold uppercase tracking-wider sys-text-body group-hover:text-white">
                {isSyncing ? 'Syncing...' : 'Sync'}
              </span>
            </button>

          </div>
        </header>

        {/* WORKSPACE CONTENT AREA */}
        <main className="flex-1 overflow-y-auto bg-transparent p-8 md:p-12 relative pb-28">
          <div className="max-w-5xl w-full mx-auto space-y-10 animate-fade-in">
            
            {activeSection === 'overview' && (
              <AssessmentTab 
                assessments={assessmentsList} 
                onRefresh={loadAssessments} 
                onSelectAssessment={handleSelectAssessment}
              />
            )}

            {activeSection === 'questions' && selectedAssessment && (
              <QuestionTab 
                selectedAssessment={selectedAssessment} 
                onBack={() => setActiveSection('overview')} 
              />
            )}

            {activeSection === 'ai-generate' && selectedAssessment && (
              <AIGenerationTab 
                selectedAssessment={selectedAssessment} 
                onRefresh={loadAssessments} 
              />
            )}

            {activeSection === 'users' && (
              <MonitorTab 
                assessments={assessmentsList}
              />
            )}

            {activeSection === 'analytics' && (
              <LeaderboardTab 
                assessments={assessmentsList} 
              />
            )}

            {activeSection === 'settings' && (
              <ReportsSettingsTab defaultSection="settings" assessments={assessmentsList} />
            )}

            {activeSection === 'reports' && (
              <ReportsSettingsTab defaultSection="reports" assessments={assessmentsList} />
            )}

            {activeSection === 'database' && (
              <DatabaseTab />
            )}

          </div>
        </main>
      </div>



      {/* ================= FLOATING COMMAND PALETTE WORKSPACE (⌘K) ================= */}
      {showPalette && (
        <div className="fixed inset-0 bg-black/80  z-[9999] flex items-start justify-center pt-24 p-4">
          <div className="w-full max-w-xl command-dialog rounded-2xl p-4 shadow-2xl space-y-4 animate-fade-in relative">
            <div className="absolute top-0 left-0 right-0 h-[2px] sys-bg rounded-t-2xl" />
            
            <div className="flex items-center gap-3 border-b border-white/5 pb-3">
              <Search className="w-5 h-5 sys-text-body" strokeWidth={1.5} />
              <input 
                type="text" 
                value={paletteSearch}
                onChange={e => setPaletteSearch(e.target.value)}
                placeholder="Type a command or query assessments..."
                className="bg-transparent border-0 p-0 text-sm text-white focus:outline-none focus:ring-0 w-full placeholder:sys-text-body"
                autoFocus
              />
              <Button 
                onClick={() => setShowPalette(false)}
                variant="ghost" 
                size="sm" 
                className="h-6 w-6 p-0 hover:sys-card sys-text-body rounded-lg"
              >
                <X className="w-3.5 h-3.5" strokeWidth={1.5} />
              </Button>
            </div>

            {/* List options */}
            <div className="max-h-[300px] overflow-y-auto space-y-3 pr-1 text-xs select-none">
              <div className="space-y-1">
                <span className="text-[9px] font-mono sys-text-body uppercase tracking-widest block px-2">Navigation Shortcuts</span>
                <button 
                  onClick={() => { setActiveSection('overview'); setShowPalette(false); }}
                  className="w-full text-left px-3 py-2 rounded-xl sys-text-body hover:text-white hover:sys-bg/40 flex justify-between items-center"
                >
                  <span>Go to Overview Dashboard</span>
                  <span className="text-[9px] font-mono sys-text-body sys-card px-1.5 py-0.5 rounded">G O</span>
                </button>
                <button 
                  onClick={() => { setActiveSection('analytics'); setShowPalette(false); }}
                  className="w-full text-left px-3 py-2 rounded-xl sys-text-body hover:text-white hover:sys-bg/40 flex justify-between items-center"
                >
                  <span>Go to Analytics Leaderboard</span>
                  <span className="text-[9px] font-mono sys-text-body sys-card px-1.5 py-0.5 rounded">G A</span>
                </button>
                <button 
                  onClick={() => { setActiveSection('users'); setShowPalette(false); }}
                  className="w-full text-left px-3 py-2 rounded-xl sys-text-body hover:text-white hover:sys-bg/40 flex justify-between items-center"
                >
                  <span>Open Users & Proctor feeds</span>
                  <span className="text-[9px] font-mono sys-text-body sys-card px-1.5 py-0.5 rounded">G U</span>
                </button>
              </div>

              {filteredPaletteAssessments.length > 0 && (
                <div className="space-y-1 pt-2 border-t border-white/5">
                  <span className="text-[9px] font-mono sys-text-body uppercase tracking-widest block px-2">Filter Assessments</span>
                  {filteredPaletteAssessments.map(a => (
                    <button 
                      key={a.id}
                      onClick={() => {
                        handleSelectAssessment(a);
                        setShowPalette(false);
                      }}
                      className="w-full text-left px-3 py-2 rounded-xl sys-text-body hover:text-white hover:sys-bg/40 flex justify-between items-center"
                    >
                      <span className="truncate">{a.title}</span>
                      <span className="text-[9px] font-mono text-[#5B8CFF] uppercase font-bold">{a.status}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}


    </div>
  )
}