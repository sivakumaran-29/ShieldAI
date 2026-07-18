import { useState, useEffect } from 'react'
import { Shield, LayoutDashboard, BarChart2, Users, Database,
  FileText, Settings, LogOut, ChevronLeft, ChevronRight,
  Search, User, Sparkles, Command, Library, X
} from 'lucide-react'
import { useAuthStore } from '../../store/authStore'
import { Button } from '@/components/ui/button'
import { fetchAssessments, Assessment } from '../../lib/assessmentEngine'
import ThemeToggle from '../../components/ThemeToggle'

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
      <div className="min-h-screen bg-[#000000] flex items-center justify-center text-zinc-100 font-mono text-xs relative overflow-hidden">
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
    <div className="min-h-screen bg-background text-foreground flex font-sans antialiased overflow-hidden relative">
      
      {/* 1. Ambient Background Layer */}
      <div className="mesh-bg">
        <div className="mesh-circle-1" />
        <div className="mesh-circle-2" />
      </div>
      
      {/* 2. cinematic matte noise overlay */}
      <div className="grain-overlay" />

      {/* ================= LEFT SIDEBAR (COLLAPSIBLE OS DOCK) ================= */}
      <aside 
        className={`h-screen bg-[#0a0a0a]/80 backdrop-blur-md border-r border-border flex flex-col justify-between p-5 shrink-0 z-30 select-none transition-all duration-300 transition-spring ${
          isCollapsed ? 'w-20' : 'w-64'
        }`}
      >
        <div className="space-y-6">
          
          {/* Header Workspace Picker */}
          <div className="flex items-center justify-between select-none">
            <div className="flex items-center space-x-3 overflow-hidden">
              <div className="p-2 bg-background border border-border rounded-xl shrink-0">
                <Shield className="w-5 h-5 text-[#5B8CFF]" strokeWidth={1.5} />
              </div>
              {!isCollapsed && (
                <div className="flex flex-col">
                  <span className="font-heading font-extrabold text-sm tracking-tight text-white">ShieldAI</span>
                  <span className="text-[8px] font-mono text-zinc-500 uppercase tracking-widest leading-none mt-0.5">V2 Enterprise</span>
                </div>
              )}
            </div>
            
            {!isCollapsed && <ThemeToggle />}
          </div>

          {/* Spotlight command key launcher shortcut */}
          {!isCollapsed && (
            <div 
              onClick={() => setShowPalette(true)}
              className="flex bg-zinc-950/40 border border-border rounded-xl px-3 py-2 items-center gap-2 hover:border-[#5B8CFF]/30 cursor-pointer transition select-none"
            >
              <Search className="w-3.5 h-3.5 text-zinc-500" strokeWidth={1.5} />
              <span className="text-[11px] text-zinc-500 font-medium flex-1">Command Search...</span>
              <span className="text-[8px] font-mono text-zinc-600 bg-[#1c1c1e] border border-border px-1.5 py-0.2 rounded">⌘K</span>
            </div>
          )}

          {isCollapsed && (
            <div className="flex justify-center">
              <button 
                onClick={() => setShowPalette(true)}
                className="p-2 rounded-xl bg-zinc-950/40 border border-border text-zinc-500 hover:text-white transition"
              >
                <Command className="w-4 h-4" strokeWidth={1.5} />
              </button>
            </div>
          )}

          {/* Workspace Switcher indicators */}
          {!isCollapsed && (
            <div className="p-3 bg-[#1c1c1e]/40 border border-border rounded-xl flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-md bg-[#5B8CFF]/15 border border-[#5B8CFF]/35 flex items-center justify-center text-[10px] font-bold text-[#5B8CFF]">
                  AM
                </div>
                <span className="text-xs font-semibold text-zinc-300">Amrita Recruiter</span>
              </div>
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
                      : 'text-zinc-400 hover:text-white border-transparent hover:bg-[#1c1c1e]/20'
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
              <div className="pl-4 mt-1 border-l border-border flex flex-col gap-1">
                <button 
                  onClick={() => setActiveSection('questions')}
                  className={`flex items-center gap-2 py-1.5 px-3 text-[11px] rounded-lg transition ${
                    activeSection === 'questions' ? 'text-[#5B8CFF] font-semibold' : 'text-zinc-500 hover:text-zinc-300'
                  }`}
                >
                  <Library className="w-3.5 h-3.5" strokeWidth={1.5} />
                  <span>Questions Bank</span>
                </button>
                <button 
                  onClick={() => setActiveSection('ai-generate')}
                  className={`flex items-center gap-2 py-1.5 px-3 text-[11px] rounded-lg transition ${
                    activeSection === 'ai-generate' ? 'text-[#5B8CFF] font-semibold' : 'text-zinc-500 hover:text-zinc-300'
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
        <div className="space-y-4 pt-4 border-t border-border">
          {isCollapsed && (
            <div className="flex justify-center pb-2">
              <ThemeToggle />
            </div>
          )}

          {/* User profile details */}
          <div className={`flex items-center gap-3 px-1 ${isCollapsed ? 'justify-center' : ''}`}>
            <div className="p-2 bg-[#1c1c1e]/40 border border-border rounded-xl shrink-0">
              <User className="w-4 h-4 text-zinc-400" strokeWidth={1.5} />
            </div>
            {!isCollapsed && (
              <div className="flex flex-col min-w-0">
                <span className="text-xs font-semibold text-white truncate font-heading">{user?.name || 'Recruiter'}</span>
                <span className="text-[9.5px] text-zinc-500 font-mono truncate">{user?.email}</span>
              </div>
            )}
          </div>

          <div className="flex items-center gap-2">
            <Button 
              onClick={logout} 
              variant="outline" 
              className={`border-border bg-zinc-950/20 hover:bg-zinc-900 text-zinc-400 hover:text-white text-xs h-9 justify-center cursor-pointer transition rounded-xl flex-1 ${
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
              className="p-2 border border-border bg-zinc-950/20 hover:bg-zinc-900 text-zinc-500 hover:text-white rounded-xl cursor-pointer transition focus:outline-none"
            >
              {isCollapsed ? <ChevronRight className="w-3.5 h-3.5" /> : <ChevronLeft className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>
      </aside>

      {/* ================= CENTER WORKSPACE AREA ================= */}
      <div className="flex-1 flex flex-col h-screen overflow-hidden relative z-10">
        
        {/* TOP BAR FLOATING COMMAND WORKSPACE */}
        <header className="h-16 border-b border-border bg-[#0a0a0a]/30 flex items-center justify-between px-8 z-25 backdrop-blur-xl">
          {/* Breadcrumbs trail */}
          <div className="flex items-center gap-2 text-[10px] font-mono text-zinc-500 uppercase tracking-widest select-none">
            <span>SHIELD_OS</span>
            <span>/</span>
            <span className="text-[#5B8CFF] font-bold">{activeSection}</span>
            {selectedAssessment && (activeSection === 'questions' || activeSection === 'ai-generate') && (
              <>
                <span>/</span>
                <span className="text-foreground">{selectedAssessment.title}</span>
              </>
            )}
          </div>

          {/* Heartbeat system status */}
          <div className="flex items-center gap-4">
            

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
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[9999] flex items-start justify-center pt-24 p-4">
          <div className="w-full max-w-xl command-dialog rounded-2xl p-4 shadow-2xl space-y-4 animate-fade-in relative">
            <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-[#5B8CFF] to-[#14B8A6] rounded-t-2xl" />
            
            <div className="flex items-center gap-3 border-b border-border pb-3">
              <Search className="w-5 h-5 text-zinc-500" strokeWidth={1.5} />
              <input 
                type="text" 
                value={paletteSearch}
                onChange={e => setPaletteSearch(e.target.value)}
                placeholder="Type a command or query assessments..."
                className="bg-transparent border-0 p-0 text-sm text-white focus:outline-none focus:ring-0 w-full placeholder:text-zinc-650"
                autoFocus
              />
              <Button 
                onClick={() => setShowPalette(false)}
                variant="ghost" 
                size="sm" 
                className="h-6 w-6 p-0 hover:bg-zinc-900 text-zinc-500 rounded-lg"
              >
                <X className="w-3.5 h-3.5" strokeWidth={1.5} />
              </Button>
            </div>

            {/* List options */}
            <div className="max-h-[300px] overflow-y-auto space-y-3 pr-1 text-xs select-none">
              <div className="space-y-1">
                <span className="text-[9px] font-mono text-zinc-600 uppercase tracking-widest block px-2">Navigation Shortcuts</span>
                <button 
                  onClick={() => { setActiveSection('overview'); setShowPalette(false); }}
                  className="w-full text-left px-3 py-2 rounded-xl text-zinc-400 hover:text-white hover:bg-zinc-950/40 flex justify-between items-center"
                >
                  <span>Go to Overview Dashboard</span>
                  <span className="text-[9px] font-mono text-zinc-650 bg-zinc-900 px-1.5 py-0.5 rounded">G O</span>
                </button>
                <button 
                  onClick={() => { setActiveSection('analytics'); setShowPalette(false); }}
                  className="w-full text-left px-3 py-2 rounded-xl text-zinc-400 hover:text-white hover:bg-zinc-950/40 flex justify-between items-center"
                >
                  <span>Go to Analytics Leaderboard</span>
                  <span className="text-[9px] font-mono text-zinc-650 bg-zinc-900 px-1.5 py-0.5 rounded">G A</span>
                </button>
                <button 
                  onClick={() => { setActiveSection('users'); setShowPalette(false); }}
                  className="w-full text-left px-3 py-2 rounded-xl text-zinc-400 hover:text-white hover:bg-zinc-950/40 flex justify-between items-center"
                >
                  <span>Open Users & Proctor feeds</span>
                  <span className="text-[9px] font-mono text-zinc-650 bg-zinc-900 px-1.5 py-0.5 rounded">G U</span>
                </button>
              </div>

              {filteredPaletteAssessments.length > 0 && (
                <div className="space-y-1 pt-2 border-t border-border">
                  <span className="text-[9px] font-mono text-zinc-600 uppercase tracking-widest block px-2">Filter Assessments</span>
                  {filteredPaletteAssessments.map(a => (
                    <button 
                      key={a.id}
                      onClick={() => {
                        handleSelectAssessment(a);
                        setShowPalette(false);
                      }}
                      className="w-full text-left px-3 py-2 rounded-xl text-zinc-400 hover:text-white hover:bg-zinc-950/40 flex justify-between items-center"
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