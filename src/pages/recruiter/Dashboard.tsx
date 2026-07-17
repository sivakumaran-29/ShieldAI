import { useState, useEffect } from 'react'
import { 
  Shield, Award, LogOut, Activity, FolderKanban, Library, Sparkles
} from 'lucide-react'
import { useAuthStore } from '../../store/authStore'
import { Button } from '@/components/ui/button'
import { fetchAssessments, Assessment } from '../../lib/assessmentEngine'

// Tabs Imports
import AssessmentTab from '../../components/recruiter/AssessmentTab'
import QuestionTab from '../../components/recruiter/QuestionTab'
import LeaderboardTab from '../../components/recruiter/LeaderboardTab'
import MonitorTab from '../../components/recruiter/MonitorTab'
import AIGenerationTab from '../../components/recruiter/AIGenerationTab'

export default function RecruiterDashboard() {
  const { user, logout } = useAuthStore()
  
  // Navigation states
  const [activeTab, setActiveTab] = useState<'assessments' | 'questions' | 'monitor' | 'leaderboard' | 'ai-generate'>('assessments')
  const [assessmentsList, setAssessmentsList] = useState<Assessment[]>([])
  const [selectedAssessment, setSelectedAssessment] = useState<Assessment | null>(null)
  const [loading, setLoading] = useState(true)

  const loadAssessments = async () => {
    try {
      const data = await fetchAssessments()
      setAssessmentsList(data)
      
      // Keep selected assessment references fresh
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

  const handleSelectAssessment = (a: Assessment) => {
    setSelectedAssessment(a)
    setActiveTab('questions')
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#07090e] flex items-center justify-center text-sky-400 font-mono text-sm">
        <div className="flex flex-col items-center gap-3">
          <Shield className="w-8 h-8 animate-pulse text-sky-400" />
          <span>Syncing Recruiter Registry Console...</span>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-black text-neutral-100 flex flex-col font-sans antialiased relative overflow-x-hidden">
      
      {/* Background radial effects */}
      <div className="absolute inset-0 bg-gradient-to-b from-black via-[#0a0a0c] to-[#121215] z-0" />
      <div className="absolute top-[-10%] right-[-10%] w-[600px] h-[600px] bg-zinc-800/[0.03] rounded-full blur-[130px] pointer-events-none z-0" />

      {/* HEADER BAR */}
      <header className="bg-zinc-950/40 border-b border-zinc-900/40 px-6 py-4 flex items-center justify-between sticky top-0 z-50 backdrop-blur-xl">
        <div className="flex items-center space-x-2.5">
          <div className="p-2 bg-neutral-950 border border-zinc-800 rounded-xl">
            <Shield className="w-5 h-5 text-white" />
          </div>
          <span className="font-bold tracking-tight text-lg">Shield<span className="text-white">AI</span></span>
          <span className="hidden sm:inline-block text-[9px] bg-zinc-950/80 border border-zinc-805 text-zinc-400 px-2 py-0.5 rounded-md font-mono ml-2 uppercase">
            Recruiter Suite
          </span>
        </div>

        <div className="flex items-center space-x-4">
          <div className="text-right hidden sm:block">
            <p className="text-xs font-semibold text-neutral-200">{user?.name || 'Recruiter Administrator'}</p>
            <p className="text-[10px] text-zinc-550 font-mono truncate">{user?.email}</p>
          </div>
          <Button 
            onClick={logout} 
            variant="outline" 
            className="border-zinc-800 bg-zinc-955/40 hover:bg-zinc-900 text-zinc-300 text-xs h-8 px-3 cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5 mr-1.5" />
            <span>Sign Out</span>
          </Button>
        </div>
      </header>

      {/* WORKSPACE CONTENT LAYOUT */}
      <div className="flex-1 max-w-7xl w-full mx-auto p-4 md:p-8 flex flex-col space-y-6 z-10 relative animate-fade-in">
        
        {/* TABS SELECTOR MENUS */}
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-zinc-900/40 pb-2.5 select-none">
          <div className="flex flex-wrap gap-1">
            <button 
              onClick={() => setActiveTab('assessments')}
              className={`flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-xl transition duration-300 ${
                activeTab === 'assessments' 
                  ? 'bg-zinc-900/60 text-white border border-zinc-800' 
                  : 'text-zinc-505 hover:text-neutral-200'
              }`}
            >
              <FolderKanban className="w-4 h-4" /> Assessments
            </button>

            {selectedAssessment && (
              <>
                <button 
                  onClick={() => setActiveTab('questions')}
                  className={`flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-xl transition duration-300 ${
                    activeTab === 'questions' 
                      ? 'bg-zinc-900/60 text-white border border-zinc-805' 
                      : 'text-zinc-505 hover:text-neutral-200'
                  }`}
                >
                  <Library className="w-4 h-4" /> Questions Bank
                </button>

                <button 
                  onClick={() => setActiveTab('ai-generate')}
                  className={`flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-xl transition duration-300 ${
                    activeTab === 'ai-generate' 
                      ? 'bg-zinc-900/60 text-white border border-zinc-805' 
                      : 'text-zinc-505 hover:text-neutral-200'
                  }`}
                >
                  <Sparkles className="w-4 h-4 fill-current text-white" /> AI Challenge Spawner
                </button>
              </>
            )}

            <button 
              onClick={() => setActiveTab('monitor')}
              className={`flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-xl transition duration-300 ${
                activeTab === 'monitor' 
                  ? 'bg-zinc-900/60 text-white border border-zinc-805' 
                  : 'text-zinc-505 hover:text-neutral-200'
              }`}
            >
              <Activity className="w-4 h-4" /> Live Proctor Grid
            </button>

            <button 
              onClick={() => setActiveTab('leaderboard')}
              className={`flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-xl transition duration-300 ${
                activeTab === 'leaderboard' 
                  ? 'bg-zinc-900/60 text-white border border-zinc-805' 
                  : 'text-zinc-505 hover:text-neutral-200'
              }`}
            >
              <Award className="w-4 h-4" /> Submissions Leaderboard
            </button>
          </div>

          {selectedAssessment && activeTab !== 'assessments' && (
            <div className="text-[10px] font-mono text-zinc-500 bg-neutral-950 border border-zinc-850 px-3 py-1.5 rounded-xl">
              Focus track: <span className="text-white font-bold">{selectedAssessment.title}</span>
            </div>
          )}
        </div>

        {/* TAB WORKSPACE CONTENT SLOTS */}
        <div className="flex-1 min-h-[500px]">
          {activeTab === 'assessments' && (
            <AssessmentTab 
              assessments={assessmentsList} 
              onRefresh={loadAssessments} 
              onSelectAssessment={handleSelectAssessment} 
            />
          )}

          {activeTab === 'questions' && selectedAssessment && (
            <QuestionTab 
              selectedAssessment={selectedAssessment} 
              onBack={() => setActiveTab('assessments')} 
            />
          )}

          {activeTab === 'ai-generate' && selectedAssessment && (
            <AIGenerationTab 
              selectedAssessment={selectedAssessment} 
              onRefresh={loadAssessments} 
            />
          )}

          {activeTab === 'monitor' && (
            <MonitorTab 
              assessments={assessmentsList}
            />
          )}

          {activeTab === 'leaderboard' && (
            <LeaderboardTab 
              assessments={assessmentsList} 
            />
          )}
        </div>

      </div>

    </div>
  )
}