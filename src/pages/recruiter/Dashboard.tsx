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
    <div className="min-h-screen bg-[#020306] text-neutral-100 flex flex-col font-sans antialiased relative overflow-x-hidden">
      
      {/* Background radial effects */}
      <div className="absolute inset-0 bg-gradient-to-r from-[#030712] via-[#091124] to-[#0d1d3a] z-0" />
      <div className="absolute top-[-10%] right-[-10%] w-[600px] h-[600px] bg-sky-500/[0.04] rounded-full blur-[130px] pointer-events-none z-0" />

      {/* HEADER BAR */}
      <header className="bg-sky-950/20 border-b border-sky-900/30 px-6 py-4 flex items-center justify-between sticky top-0 z-50 backdrop-blur-xl">
        <div className="flex items-center space-x-2.5">
          <div className="p-2 bg-neutral-900/90 border border-neutral-800 rounded-xl">
            <Shield className="w-5 h-5 text-sky-400" />
          </div>
          <span className="font-bold tracking-tight text-lg">Shield<span className="text-sky-400">AI</span></span>
          <span className="hidden sm:inline-block text-[9px] bg-sky-500/10 border border-sky-400/20 text-sky-400 px-2 py-0.5 rounded-md font-mono ml-2 uppercase">
            Recruiter Suite
          </span>
        </div>

        <div className="flex items-center space-x-4">
          <div className="text-right hidden sm:block">
            <p className="text-xs font-semibold text-neutral-200">{user?.name || 'Recruiter Administrator'}</p>
            <p className="text-[10px] text-sky-405 font-mono truncate">{user?.email}</p>
          </div>
          <Button 
            onClick={logout} 
            variant="outline" 
            className="border-sky-900/50 bg-sky-950/30 hover:bg-sky-950/60 text-sky-305 text-xs h-8 px-3 cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5 mr-1.5" />
            <span>Sign Out</span>
          </Button>
        </div>
      </header>

      {/* WORKSPACE CONTENT LAYOUT */}
      <div className="flex-1 max-w-7xl w-full mx-auto p-4 md:p-8 flex flex-col space-y-6 z-10 relative">
        
        {/* TABS SELECTOR MENUS */}
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-sky-950 pb-2.5 select-none">
          <div className="flex flex-wrap gap-1">
            <button 
              onClick={() => setActiveTab('assessments')}
              className={`flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-xl transition duration-300 ${
                activeTab === 'assessments' 
                  ? 'bg-sky-950/30 text-sky-400 border border-sky-900/40' 
                  : 'text-neutral-450 hover:text-neutral-205'
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
                      ? 'bg-sky-950/30 text-sky-400 border border-sky-900/40' 
                      : 'text-neutral-450 hover:text-neutral-205'
                  }`}
                >
                  <Library className="w-4 h-4" /> Questions Bank
                </button>

                <button 
                  onClick={() => setActiveTab('ai-generate')}
                  className={`flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-xl transition duration-300 ${
                    activeTab === 'ai-generate' 
                      ? 'bg-sky-950/30 text-sky-400 border border-sky-900/40' 
                      : 'text-neutral-450 hover:text-neutral-205'
                  }`}
                >
                  <Sparkles className="w-4 h-4 fill-current text-sky-400" /> AI Challenge Spawner
                </button>
              </>
            )}

            <button 
              onClick={() => setActiveTab('monitor')}
              className={`flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-xl transition duration-300 ${
                activeTab === 'monitor' 
                  ? 'bg-sky-950/30 text-sky-400 border border-sky-900/40' 
                  : 'text-neutral-450 hover:text-neutral-205'
              }`}
            >
              <Activity className="w-4 h-4" /> Live Proctor Grid
            </button>

            <button 
              onClick={() => setActiveTab('leaderboard')}
              className={`flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-xl transition duration-300 ${
                activeTab === 'leaderboard' 
                  ? 'bg-sky-950/30 text-sky-400 border border-sky-900/40' 
                  : 'text-neutral-450 hover:text-neutral-205'
              }`}
            >
              <Award className="w-4 h-4" /> Submissions Leaderboard
            </button>
          </div>

          {selectedAssessment && activeTab !== 'assessments' && (
            <div className="text-[10px] font-mono text-neutral-500 bg-neutral-950 border border-sky-955 px-3 py-1.5 rounded-xl">
              Focus track: <span className="text-sky-400 font-bold">{selectedAssessment.title}</span>
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
            <MonitorTab selectedAssessmentId={selectedAssessment?.id} />
          )}

          {activeTab === 'leaderboard' && (
            <LeaderboardTab 
              assessments={assessmentsList} 
              selectedAssessmentId={selectedAssessment?.id} 
            />
          )}
        </div>

      </div>

    </div>
  )
}