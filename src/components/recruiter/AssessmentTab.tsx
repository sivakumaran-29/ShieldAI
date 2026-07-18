import { useState, useEffect } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { 
  Plus, Copy, Edit, Settings2,
  Sparkles, Sliders, Trash2
} from 'lucide-react'
import { Assessment, saveAssessment, deleteAssessment, duplicateAssessment } from '../../lib/assessmentEngine'
import { supabaseAdmin } from '../../lib/supabaseAdmin'

interface AssessmentTabProps {
  assessments: Assessment[]
  onRefresh: () => void
  onSelectAssessment: (a: Assessment) => void
  onSelectInspector?: (a: Assessment) => void
}

export default function AssessmentTab({ assessments, onRefresh, onSelectAssessment, onSelectInspector }: AssessmentTabProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [instructions, setInstructions] = useState('')
  const [duration, setDuration] = useState(60)
  const [startTime, setStartTime] = useState('')
  const [endTime, setEndTime] = useState(new Date(Date.now() + 7 * 24 * 3600 * 1000).toISOString().slice(0, 16))
  const [passingScore, setPassingScore] = useState(70)
  const [languages, setLanguages] = useState<string[]>(['python', 'javascript', 'java'])
  const [status, setStatus] = useState<'Draft' | 'Published' | 'Closed'>('Draft')
  const [targetBatch, setTargetBatch] = useState('CSE_C')

  const toLocalISOString = (date: Date) => {
    const pad = (n: number) => n.toString().padStart(2, '0')
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`
  }

  const [availableDepartments, setAvailableDepartments] = useState<string[]>([])
  const [availableBatches, setAvailableBatches] = useState<string[]>([])

  useEffect(() => {
    const fetchTargets = async () => {
      try {
        let allUsers: any[] = []
        let page = 1
        while (true) {
          const { data } = await supabaseAdmin.auth.admin.listUsers({ page, perPage: 1000 })
          if (!data?.users || data.users.length === 0) break
          allUsers = allUsers.concat(data.users)
          page++
        }
        
        const batches = new Set<string>()
        const depts = new Set<string>()
        
        allUsers.forEach(u => {
          const b = u.user_metadata?.batch
          if (b) {
            batches.add(b)
            depts.add(b.split('_')[0])
          }
        })
        
        setAvailableBatches(Array.from(batches).sort())
        setAvailableDepartments(Array.from(depts).sort())
      } catch (err) {
        console.error('Failed to fetch batches', err)
      }
    }
    fetchTargets()
  }, [])

  const handleOpenCreateForm = () => {
    setIsEditing(true)
    setEditId(null)
    setTitle('')
    setDescription('')
    setInstructions('Please make sure your camera is fully active during the entire test duration. Tab switches are strictly monitored.')
    setDuration(60)
    setStartTime(toLocalISOString(new Date()))
    setEndTime(toLocalISOString(new Date(Date.now() + 7 * 24 * 3600 * 1000)))
    setPassingScore(70)
    setLanguages(['python', 'javascript'])
    setStatus('Draft')
  }

  const handleOpenEditForm = (a: Assessment) => {
    setIsEditing(true)
    setEditId(a.id)
    setTitle(a.title)
    setDescription(a.description)
    setInstructions(a.instructions)
    setDuration(a.duration)
    setStartTime(toLocalISOString(new Date(a.start_time)))
    setEndTime(toLocalISOString(new Date(a.end_time)))
    setPassingScore(a.passing_score)
    setLanguages(a.allowed_languages)
    setStatus(a.status)
    setTargetBatch(a.target_batch || 'CSE_C')
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim()) return

    const id = editId || 'as-' + crypto.randomUUID().slice(0, 8)
    const payload: Assessment = {
      id,
      title,
      description,
      instructions,
      duration: Number(duration),
      start_time: new Date(startTime).toISOString(),
      end_time: new Date(endTime).toISOString(),
      passing_score: Number(passingScore),
      allowed_languages: languages,
      status,
      target_batch: targetBatch,
      created_at: new Date().toISOString(),
      created_by: 'recruiter'
    }

    if (new Date(payload.start_time) >= new Date(payload.end_time)) {
      alert('Start time must be before end time.')
      return
    }

    await saveAssessment(payload)
    setIsEditing(false)
    onRefresh()
  }

  const handleDuplicate = async (id: string) => {
    await duplicateAssessment(id)
    onRefresh()
  }

  const handleDelete = async (id: string) => {
    if (window.confirm('Delete this assessment and its related resources permanently?')) {
      await deleteAssessment(id)
      onRefresh()
    }
  }

  const toggleLanguage = (lang: string) => {
    setLanguages(prev => 
      prev.includes(lang) ? prev.filter(l => l !== lang) : [...prev, lang]
    )
  }

  return (
    <div className="space-y-8 select-none">
      
      {/* 1. Header with action button */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-[12px] font-heading font-bold tracking-wider text-[#5B8CFF] uppercase">// OVERVIEW DASHBOARD</h2>
          <span className="text-[11px] sys-text-body font-sans mt-1 block">Live proctor operations summary and assessment controls</span>
        </div>
        {!isEditing && (
          <Button 
            onClick={handleOpenCreateForm} 
            className="bg-[#0070F3] hover:bg-[#005bb5] text-white text-xs h-10 px-5 rounded-xl font-bold cursor-pointer transition flex items-center gap-1.5 shadow-[0_0_15px_rgba(0,112,243,0.4)]"
          >
            <Plus className="w-4 h-4" strokeWidth={1.5} /> Create Assessment
          </Button>
        )}
      </div>

      {!isEditing ? (
        <div className="space-y-8">
          
          <div className="group p-8 flex flex-col items-center justify-center text-center space-y-4 border border-white/5 rounded-[24px] bg-[rgba(28,28,30,0.72)] backdrop-blur-[16px] mb-8 hover:shadow-[0_0_40px_rgba(91,140,255,0.08)] hover:border-white/10 transition-all duration-500 cursor-pointer">
            <div className="p-4 bg-[#5B8CFF]/10 rounded-full mb-2 group-hover:scale-110 transition-transform duration-500">
              <Sparkles className="w-8 h-8 text-[#5B8CFF]" strokeWidth={1.5} />
            </div>
            <h3 className="text-xl font-bold text-white font-heading">Assessment Creation Engine</h3>
            <p className="text-sm sys-text-body max-w-xl leading-relaxed">
              Build and deploy robust technical assessments instantly. Configure the hosting department, set the strict evaluation timeline, and configure the code playground constraints.
            </p>
            <Button 
              onClick={handleOpenCreateForm}
              className="mt-4 bg-[#0070F3] text-white hover:bg-[#0070F3]/90 text-sm h-11 px-8 rounded-full font-bold cursor-pointer transition-all duration-300 shadow-[0_0_20px_rgba(0,112,243,0.3)] hover:shadow-[0_0_40px_rgba(0,112,243,0.6)] hover:-translate-y-0.5 flex items-center gap-2"
            >
              <Plus className="w-4 h-4" strokeWidth={2} /> Initialize New Assessment
            </Button>
          </div>

          {/* Active Assessments Table Section */}
          <div className="bento-card p-6 space-y-4">
            <span className="text-[11px] font-heading font-semibold sys-text-body uppercase tracking-wider block mb-4">Active Assessment Tracks</span>
            
            <div className="overflow-x-auto pb-4">
              <div className="border border-white/5 rounded-2xl overflow-hidden bg-[rgba(28,28,30,0.2)]">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="bg-[rgba(28,28,30,0.72)] backdrop-blur-[16px] sys-text-body font-sans font-semibold text-[10px] uppercase tracking-wider border-b border-white/5">
                      <th className="py-4 px-5">Evaluation Title</th>
                      <th className="py-4 px-5">Duration</th>
                      <th className="py-4 px-5">Allowed Languages</th>
                      <th className="py-4 px-5">Status</th>
                      <th className="py-4 px-5 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/[0.02]">
                  {assessments.map((a) => (
                    <tr 
                      key={a.id} 
                      onClick={() => onSelectInspector?.(a)}
                      className="hover:bg-white/[0.02] cursor-pointer transition duration-200 group/row"
                    >
                      <td className="py-4 px-5 font-semibold text-white font-heading max-w-sm truncate">{a.title}</td>
                      <td className="py-4 px-5 sys-text-body font-sans">{a.duration} mins</td>
                      <td className="py-4 px-5 sys-text-body uppercase font-sans font-medium">{a.allowed_languages.join(', ')}</td>
                      <td className="py-4 px-5">
                        <span className={`px-2.5 py-1 rounded-md text-[9px] font-mono font-bold uppercase tracking-wider inline-flex items-center gap-1.5 ${
                          a.status === 'Published' 
                            ? 'bg-[#34D399]/10 text-[#34D399] border border-[#34D399]/20 shadow-[0_0_10px_rgba(52,211,153,0.1)]' 
                            : a.status === 'Draft'
                            ? 'bg-[#FBBF24]/10 text-[#FBBF24] border border-[#FBBF24]/20 shadow-[0_0_10px_rgba(251,191,36,0.1)]'
                            : 'bg-white/5 text-white/50 border border-white/5'
                        }`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${
                            a.status === 'Published' ? 'bg-[#34D399] shadow-[0_0_5px_#34D399]' : 
                            a.status === 'Draft' ? 'bg-[#FBBF24] shadow-[0_0_5px_#FBBF24]' : 
                            'bg-white/30'
                          }`} />
                          {a.status}
                        </span>
                      </td>
                      <td className="py-4 px-5 text-right" onClick={e => e.stopPropagation()}>
                        <div className="flex justify-end gap-1.5">
                          <Button 
                            onClick={() => onSelectAssessment(a)}
                            variant="ghost" 
                            size="sm"
                            className="h-8 w-8 p-0 hover:bg-[#5B8CFF]/10 sys-text-body hover:text-[#5B8CFF] rounded-lg cursor-pointer transition-colors"
                            title="Manage Questions"
                          >
                            <Settings2 className="w-4 h-4" />
                          </Button>
                          <Button 
                            onClick={() => handleOpenEditForm(a)}
                            variant="ghost" 
                            size="sm"
                            className="h-8 w-8 p-0 hover:bg-white/5 sys-text-body hover:text-white rounded-lg cursor-pointer transition-colors"
                            title="Edit Parameters"
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button 
                            onClick={() => handleDuplicate(a.id)}
                            variant="ghost" 
                            size="sm"
                            className="h-8 w-8 p-0 hover:bg-white/5 sys-text-body hover:text-white rounded-lg cursor-pointer transition-colors"
                            title="Duplicate"
                          >
                            <Copy className="w-4 h-4" />
                          </Button>
                          <Button 
                            onClick={() => handleDelete(a.id)}
                            variant="ghost" 
                            size="sm"
                            className="h-8 w-8 p-0 hover:bg-[#F87171]/10 sys-text-body hover:text-[#F87171] rounded-lg cursor-pointer transition-colors"
                            title="Delete"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}

                  {assessments.length === 0 && (
                    <tr>
                      <td colSpan={5} className="py-8 text-center sys-text-body font-mono text-xs">
                        No assessments currently stored in local database registry.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
              </div>
            </div>
          </div>

        </div>
      ) : (
        /* Glass-morphic Edit / Create Form overlay */
        <Card className="bg-[rgba(28,28,30,0.72)] backdrop-blur-[16px] border-white/5 p-8 rounded-2xl relative overflow-hidden animate-fade-in shadow-2xl">
          <div className="absolute top-0 left-0 right-0 h-[2.5px] bg-[#5B8CFF]" />
          
          <h3 className="text-sm font-bold text-white mb-6 font-heading flex items-center gap-2">
            <Sliders className="w-4.5 h-4.5 text-[#5B8CFF]" /> 
            {editId ? 'Configure Assessment Parameters' : 'Draft New Evaluation'}
          </h3>

          <form onSubmit={handleSave} className="space-y-6 text-xs select-none">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              {/* Left Column inputs */}
              <div className="space-y-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[9px] font-mono sys-text-body uppercase tracking-wider">Assessment Title</label>
                  <input 
                    type="text" 
                    value={title} 
                    onChange={e => setTitle(e.target.value)}
                    className="sys-bg border border-white/5 text-white rounded-xl p-3 text-xs focus:outline-none focus:border-[#5B8CFF]/50" 
                    placeholder="e.g. Software Engineer Evaluation"
                    required
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-[9px] font-mono sys-text-body uppercase tracking-wider">Description</label>
                  <textarea 
                    value={description} 
                    onChange={e => setDescription(e.target.value)}
                    className="sys-bg border border-white/5 text-white rounded-xl p-3 text-xs focus:outline-none focus:border-[#5B8CFF]/50 min-h-24" 
                    placeholder="Provide overview details..."
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-[9px] font-mono sys-text-body uppercase tracking-wider">Instructions Guidelines</label>
                  <textarea 
                    value={instructions} 
                    onChange={e => setInstructions(e.target.value)}
                    className="sys-bg border border-white/5 text-white rounded-xl p-3 text-xs focus:outline-none focus:border-[#5B8CFF]/50 min-h-24" 
                    placeholder="Rules for the proctored sandbox..."
                  />
                </div>
              </div>

              {/* Right Column settings */}
              <div className="space-y-4">
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[9px] font-mono sys-text-body uppercase tracking-wider">Duration (Minutes)</label>
                    <input 
                      type="number" 
                      value={duration} 
                      onChange={e => setDuration(Number(e.target.value))}
                      className="sys-bg border border-white/5 text-white rounded-xl p-3 text-xs font-mono focus:outline-none focus:border-[#5B8CFF]/50"
                      min={1}
                      required
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[9px] font-mono sys-text-body uppercase tracking-wider">Passing Score %</label>
                    <input 
                      type="number" 
                      value={passingScore} 
                      onChange={e => setPassingScore(Number(e.target.value))}
                      className="sys-bg border border-white/5 text-white rounded-xl p-3 text-xs font-mono focus:outline-none focus:border-[#5B8CFF]/50"
                      min={0}
                      max={100}
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[9px] font-mono sys-text-body uppercase tracking-wider">Start Time</label>
                    <input 
                      type="datetime-local" 
                      value={startTime} 
                      onChange={e => setStartTime(e.target.value)}
                      className="sys-bg border border-white/5 text-white rounded-xl p-3 text-xs font-mono focus:outline-none focus:border-[#5B8CFF]/50"
                      required
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[9px] font-mono sys-text-body uppercase tracking-wider">End Time</label>
                    <input 
                      type="datetime-local" 
                      value={endTime} 
                      onChange={e => setEndTime(e.target.value)}
                      className="sys-bg border border-white/5 text-white rounded-xl p-3 text-xs font-mono focus:outline-none focus:border-[#5B8CFF]/50"
                      required
                    />
                  </div>
                </div>

                <div className="flex flex-col gap-2">
                  <label className="text-[9px] font-mono sys-text-body uppercase tracking-wider">Allowed Languages</label>
                  <div className="flex gap-4">
                    {['python', 'javascript', 'java'].map(lang => (
                      <label key={lang} className="flex items-center gap-2 cursor-pointer select-none">
                        <input 
                          type="checkbox" 
                          checked={languages.includes(lang)}
                          onChange={() => toggleLanguage(lang)}
                          className="w-4 h-4 rounded border-white/5 text-[#5B8CFF] focus:ring-0 sys-bg cursor-pointer"
                        />
                        <span className="text-xs uppercase sys-text-body font-mono">{lang === 'javascript' ? 'JS (ES6)' : lang}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-[9px] font-mono sys-text-body uppercase tracking-wider">Lobby Status</label>
                  <select 
                    value={status} 
                    onChange={e => setStatus(e.target.value as any)}
                    className="sys-bg border border-white/5 text-white rounded-xl p-3 text-xs font-semibold focus:outline-none focus:border-[#5B8CFF]/50 cursor-pointer"
                  >
                    <option value="Draft">Draft</option>
                    <option value="Published">Published</option>
                    <option value="Closed">Closed</option>
                  </select>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-[9px] font-mono sys-text-body uppercase tracking-wider">Target Audience (Host)</label>
                  <select 
                    value={targetBatch} 
                    onChange={e => setTargetBatch(e.target.value)}
                    className="sys-bg border border-white/5 text-white rounded-xl p-3 text-xs font-semibold focus:outline-none focus:border-[#5B8CFF]/50 cursor-pointer"
                  >
                    <optgroup label="Entire Departments">
                      {availableDepartments.map(d => (
                        <option key={`DEPT_${d}`} value={`DEPT_${d}`}>{d} Department (All Batches)</option>
                      ))}
                    </optgroup>
                    <optgroup label="Specific Batches">
                      {availableBatches.map(b => (
                        <option key={b} value={b}>Batch {b}</option>
                      ))}
                    </optgroup>
                    <optgroup label="Global">
                      <option value="ALL">All Candidates (Global)</option>
                    </optgroup>
                  </select>
                </div>

              </div>
            </div>

            {/* Form actions */}
            <div className="flex justify-end gap-3 pt-6 border-t border-white/5">
              <Button 
                type="button" 
                onClick={() => setIsEditing(false)}
                variant="outline"
                className="border-white/5 sys-bg/20 sys-text-body hover:text-white rounded-xl text-xs h-10 px-6 cursor-pointer"
              >
                Cancel
              </Button>
              <Button 
                type="submit" 
                className="bg-[#5B8CFF] hover:bg-[#3b71f3] text-white rounded-xl text-xs h-10 px-6 font-bold cursor-pointer transition shadow-md"
              >
                Save Configuration
              </Button>
            </div>
          </form>
        </Card>
      )}

    </div>
  )
}
