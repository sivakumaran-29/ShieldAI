import { useState } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { 
  Plus, Copy, Check, Edit, Trash, Clock, Settings2, Globe
} from 'lucide-react'
import { Assessment, saveAssessment, deleteAssessment, duplicateAssessment } from '../../lib/assessmentEngine'

interface AssessmentTabProps {
  assessments: Assessment[]
  onRefresh: () => void
  onSelectAssessment: (a: Assessment) => void
}

export default function AssessmentTab({ assessments, onRefresh, onSelectAssessment }: AssessmentTabProps) {
  const [copiedId, setCopiedId] = useState<string | null>(null)
  
  // Form states matching new layout
  const [isEditing, setIsEditing] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [instructions, setInstructions] = useState('')
  const [duration, setDuration] = useState(60)
  const [startTime, setStartTime] = useState('')
  const [endTime, setEndTime] = useState('')
  const [passingScore, setPassingScore] = useState(70)
  const [status, setStatus] = useState<'Draft' | 'Published' | 'Closed'>('Draft')
  const [languages, setLanguages] = useState<string[]>(['python', 'javascript'])

  const handleCopyLink = (id: string) => {
    // Generate Candidate Invitation Link targeting routes
    const url = `${window.location.origin}/exam?id=${id}`
    navigator.clipboard.writeText(url)
    setCopiedId(id)
    setTimeout(() => setCopiedId(null), 2000)
  }

  const handleOpenCreateForm = () => {
    setIsEditing(true)
    setEditId(null)
    setTitle('')
    setDescription('')
    setInstructions('Please make sure your camera is fully active during the entire test duration. Tab switches are strictly monitored.')
    setDuration(60)
    setStartTime(new Date().toISOString().slice(0, 16))
    setEndTime(new Date(Date.now() + 7 * 24 * 3600 * 1000).toISOString().slice(0, 16))
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
    setStartTime(new Date(a.start_time).toISOString().slice(0, 16))
    setEndTime(new Date(a.end_time).toISOString().slice(0, 16))
    setPassingScore(a.passing_score)
    setLanguages(a.allowed_languages)
    setStatus(a.status)
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
      created_at: new Date().toISOString(),
      created_by: 'recruiter'
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
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-sm font-bold font-mono tracking-widest text-sky-400 uppercase">Assessment Registry</h2>
        {!isEditing && (
          <Button onClick={handleOpenCreateForm} className="bg-sky-550 hover:bg-sky-505 text-white text-xs h-9 px-4 rounded-xl cursor-pointer">
            <Plus className="w-4 h-4 mr-1.5" /> Create Assessment
          </Button>
        )}
      </div>

      {isEditing ? (
        <Card className="bg-neutral-900 border-sky-950 p-6 rounded-2xl">
          <form onSubmit={handleSave} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-mono text-neutral-400 uppercase tracking-wider font-bold">Assessment Title</label>
                <input 
                  type="text" 
                  value={title} 
                  onChange={e => setTitle(e.target.value)}
                  className="bg-neutral-950 border border-sky-950 text-neutral-100 rounded-xl p-2.5 text-xs outline-none focus:border-sky-500 font-semibold"
                  placeholder="e.g. Google Frontend Dev Intern Assessment"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-mono text-neutral-400 uppercase tracking-wider font-bold">Status Mode</label>
                <select 
                  value={status} 
                  onChange={e => setStatus(e.target.value as any)}
                  className="bg-neutral-950 border border-sky-950 text-neutral-100 rounded-xl p-2.5 text-xs outline-none focus:border-sky-500 font-semibold"
                >
                  <option value="Draft">Draft</option>
                  <option value="Published">Published (Active Candidates Lobby)</option>
                  <option value="Closed">Closed</option>
                </select>
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-mono text-neutral-400 uppercase tracking-wider font-bold">Brief Subtitle/Description</label>
              <textarea 
                value={description} 
                onChange={e => setDescription(e.target.value)}
                className="bg-neutral-950 border border-sky-950 text-neutral-100 rounded-xl p-2.5 text-xs outline-none focus:border-sky-500 min-h-16"
                placeholder="Overview guidelines shown on candidate lobby cards..."
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-mono text-neutral-400 uppercase tracking-wider font-bold">Explicit Code Shell Instructions</label>
              <textarea 
                value={instructions} 
                onChange={e => setInstructions(e.target.value)}
                className="bg-neutral-950 border border-sky-950 text-neutral-100 rounded-xl p-2.5 text-xs outline-none focus:border-sky-500 min-h-24"
                placeholder="Detail security rules, timers bounds, camera expectations..."
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-mono text-neutral-400 uppercase tracking-wider font-bold">Duration (Minutes)</label>
                <input 
                  type="number" 
                  value={duration} 
                  onChange={e => setDuration(Number(e.target.value))}
                  className="bg-neutral-950 border border-sky-950 text-neutral-100 rounded-xl p-2.5 text-xs outline-none focus:border-sky-500 font-bold"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-mono text-neutral-400 uppercase tracking-wider font-bold">Passing Score %</label>
                <input 
                  type="number" 
                  value={passingScore} 
                  onChange={e => setPassingScore(Number(e.target.value))}
                  className="bg-neutral-950 border border-sky-950 text-neutral-100 rounded-xl p-2.5 text-xs outline-none focus:border-sky-500 font-bold"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-mono text-neutral-400 uppercase tracking-wider font-bold">Start window</label>
                <input 
                  type="datetime-local" 
                  value={startTime} 
                  onChange={e => setStartTime(e.target.value)}
                  className="bg-neutral-950 border border-sky-950 text-neutral-100 rounded-xl p-2.5 text-xs outline-none focus:border-sky-500 font-mono font-bold"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-mono text-neutral-400 uppercase tracking-wider font-bold">End window</label>
                <input 
                  type="datetime-local" 
                  value={endTime} 
                  onChange={e => setEndTime(e.target.value)}
                  className="bg-neutral-950 border border-sky-950 text-neutral-100 rounded-xl p-2.5 text-xs outline-none focus:border-sky-500 font-mono font-bold"
                />
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-mono text-neutral-400 uppercase tracking-wider font-bold">Allowed Languages</label>
              <div className="flex items-center gap-4 py-1.5">
                {['python', 'javascript', 'java'].map(lang => (
                  <label key={lang} className="flex items-center gap-2 cursor-pointer select-none text-xs font-semibold capitalize">
                    <input 
                      type="checkbox" 
                      checked={languages.includes(lang)} 
                      onChange={() => toggleLanguage(lang)}
                      className="w-4 h-4 bg-neutral-900 border-sky-950 rounded text-sky-500 focus:ring-sky-500"
                    />
                    {lang === 'python' ? 'Python 3' : lang === 'javascript' ? 'JavaScript' : 'Java (JDK)'}
                  </label>
                ))}
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-3 border-t border-sky-950">
              <Button type="button" onClick={() => setIsEditing(false)} variant="outline" className="border-sky-950 text-sky-400 text-xs">
                Cancel
              </Button>
              <Button type="submit" className="bg-sky-550 hover:bg-sky-505 text-white text-xs px-6">
                Save
              </Button>
            </div>
          </form>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {assessments.map(a => (
            <Card key={a.id} className="bg-neutral-900/50 border-sky-950 hover:border-sky-900 transition duration-300 rounded-2xl flex flex-col justify-between">
              <div className="p-5 space-y-3">
                <div className="flex justify-between items-start gap-2">
                  <h3 className="font-extrabold text-sm text-neutral-100">{a.title}</h3>
                  <span className={`px-2 py-0.5 rounded border text-[8px] font-mono font-bold uppercase tracking-wider ${
                    a.status === 'Published' 
                      ? 'bg-emerald-950/30 text-emerald-400 border-emerald-900/30' 
                      : a.status === 'Closed' 
                        ? 'bg-neutral-950 text-neutral-500 border-neutral-800' 
                        : 'bg-amber-950/35 text-amber-500 border-amber-900/30'
                  }`}>
                    {a.status}
                  </span>
                </div>

                <p className="text-[11px] text-neutral-400 line-clamp-2 leading-relaxed">{a.description}</p>

                <div className="flex items-center gap-3 pt-2 text-[10px] font-mono text-neutral-500">
                  <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5 text-sky-500/50" /> {a.duration} mins</span>
                  <span className="flex items-center gap-1"><Globe className="w-3.5 h-3.5 text-sky-500/50" /> {a.allowed_languages.join(', ')}</span>
                  <span className="flex items-center gap-1"><Settings2 className="w-3.5 h-3.5 text-sky-500/50" /> Pass: {a.passing_score}%</span>
                </div>
              </div>

              {/* Actions Footer */}
              <div className="p-4 bg-neutral-950/40 border-t border-sky-950 rounded-b-2xl flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <Button 
                    onClick={() => handleCopyLink(a.id)}
                    variant="outline" 
                    size="sm" 
                    className="border-sky-950 h-7 text-[10px] gap-1 px-2.5 font-bold text-sky-400 hover:bg-sky-950/20"
                  >
                    {copiedId === a.id ? (
                      <>
                        <Check className="w-3 h-3 text-emerald-400" />
                        <span className="text-emerald-400">Copied!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3 h-3" />
                        <span>Invite link</span>
                      </>
                    )}
                  </Button>
                  <Button 
                    onClick={() => onSelectAssessment(a)}
                    variant="outline" 
                    size="sm" 
                    className="border-sky-950 h-7 text-[10px] gap-1 px-2.5 font-bold text-neutral-300 hover:bg-sky-950/20"
                  >
                    <span>Manage Qs</span>
                  </Button>
                </div>

                <div className="flex items-center gap-1.5">
                  <Button 
                    onClick={() => handleOpenEditForm(a)}
                    variant="ghost" 
                    size="sm" 
                    className="h-7 w-7 p-0 text-neutral-400 hover:text-neutral-200"
                  >
                    <Edit className="w-3.5 h-3.5" />
                  </Button>
                  <Button 
                    onClick={() => handleDuplicate(a.id)}
                    variant="ghost" 
                    size="sm" 
                    className="h-7 w-7 p-0 text-neutral-400 hover:text-neutral-200"
                    title="Duplicate Assessment"
                  >
                    <Copy className="w-3.5 h-3.5 text-neutral-450" />
                  </Button>
                  <Button 
                    onClick={() => handleDelete(a.id)}
                    variant="ghost" 
                    size="sm" 
                    className="h-7 w-7 p-0 text-red-400 hover:text-red-300"
                  >
                    <Trash className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>
            </Card>
          ))}

          {assessments.length === 0 && (
            <div className="col-span-2 text-center p-12 bg-neutral-900/10 border border-sky-950 rounded-3xl text-xs font-mono text-neutral-500">
              No assessments found. Link and construct your first assessment track!
            </div>
          )}
        </div>
      )}
    </div>
  )
}
