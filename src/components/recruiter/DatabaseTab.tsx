import { useState, useEffect } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Database, Plus, ChevronDown, ChevronRight, Loader2, Search, Trash2, Folder } from 'lucide-react'
import { supabaseAdmin } from '../../lib/supabaseAdmin'

interface BatchCandidate {
  id: string
  email: string
  name: string
  batch: string
  department: string
  created_at: string
}

export default function DatabaseTab() {
  const [candidates, setCandidates] = useState<BatchCandidate[]>([])
  const [loading, setLoading] = useState(true)
  const [errorMsg, setErrorMsg] = useState('')
  
  const [expandedDepts, setExpandedDepts] = useState<Record<string, boolean>>({})
  const [expandedBatches, setExpandedBatches] = useState<Record<string, boolean>>({})
  const [searchQuery, setSearchQuery] = useState('')

  // Create Batch Modal State
  const [isCreating, setIsCreating] = useState(false)
  const [newBatchName, setNewBatchName] = useState('CSE_D')
  const [startRoll, setStartRoll] = useState('ch.sc.u4cse25101')
  const [endRoll, setEndRoll] = useState('ch.sc.u4cse25120')
  const [emailSuffix, setEmailSuffix] = useState('@students.amrita.edu')
  const [createLoading, setCreateLoading] = useState(false)
  const [createProgress, setCreateProgress] = useState('')

  const loadCandidates = async () => {
    setLoading(true)
    try {
      let allUsers: any[] = []
      let page = 1
      while (true) {
        const { data } = await supabaseAdmin.auth.admin.listUsers({ page, perPage: 1000 })
        if (!data?.users || data.users.length === 0) break
        allUsers = allUsers.concat(data.users)
        page++
      }

      const { data: profiles } = await supabaseAdmin.from('profiles').select('id, name, role').eq('role', 'candidate')

      const mapped = allUsers.map(u => {
        const profile = profiles?.find(p => p.id === u.id)
        if (!profile) return null
        
        const batch = u.user_metadata?.batch || 'CSE_C'
        const department = batch.split('_')[0] || 'UNKNOWN'

        return {
          id: u.id,
          email: u.email || '',
          name: profile.name || u.email?.split('@')[0] || 'Unknown',
          batch,
          department,
          created_at: u.created_at
        }
      }).filter(Boolean) as BatchCandidate[]

      setCandidates(mapped)
      
      // Auto-expand available departments
      const depts: Record<string, boolean> = {}
      mapped.forEach(m => { depts[m.department] = true })
      setExpandedDepts(depts)
      
    } catch (err: any) {
      console.error(err)
      setErrorMsg('Failed to load database. ' + err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadCandidates()
  }, [])

  const toggleDept = (dept: string) => setExpandedDepts(prev => ({ ...prev, [dept]: !prev[dept] }))
  const toggleBatch = (batch: string) => setExpandedBatches(prev => ({ ...prev, [batch]: !prev[batch] }))

  const handleDeleteUser = async (e: React.MouseEvent, id: string, name: string) => {
    e.stopPropagation()
    if (!window.confirm(`Are you sure you want to permanently delete candidate ${name}? This revokes all their platform access.`)) return
    
    try {
      await supabaseAdmin.from('profiles').delete().eq('id', id)
      await supabaseAdmin.auth.admin.deleteUser(id)
      setCandidates(prev => prev.filter(c => c.id !== id))
    } catch (err: any) {
      alert('Failed to delete candidate: ' + err.message)
    }
  }

  const handleDeleteDept = async (e: React.MouseEvent, dept: string) => {
    e.stopPropagation()
    const usersInDept = candidates.filter(c => c.department === dept)
    if (!window.confirm(`CRITICAL WARNING: Are you sure you want to permanently delete the ENTIRE ${dept} department and its ${usersInDept.length} candidates?`)) return
    
    setLoading(true)
    try {
      for (const u of usersInDept) {
        await supabaseAdmin.from('profiles').delete().eq('id', u.id)
        await supabaseAdmin.auth.admin.deleteUser(u.id)
      }
      setCandidates(prev => prev.filter(c => c.department !== dept))
    } catch (err: any) {
      alert('Failed to delete department: ' + err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteBatch = async (e: React.MouseEvent, batchName: string) => {
    e.stopPropagation()
    const usersInBatch = candidates.filter(c => c.batch === batchName)
    if (!window.confirm(`CRITICAL WARNING: Are you sure you want to permanently delete the ENTIRE ${batchName} class and its ${usersInBatch.length} candidates?`)) return
    
    setLoading(true)
    try {
      for (const u of usersInBatch) {
        await supabaseAdmin.from('profiles').delete().eq('id', u.id)
        await supabaseAdmin.auth.admin.deleteUser(u.id)
      }
      setCandidates(prev => prev.filter(c => c.batch !== batchName))
    } catch (err: any) {
      alert('Failed to delete batch: ' + err.message)
    } finally {
      setLoading(false)
    }
  }


  const handleCreateBatch = async (e: React.FormEvent) => {
    e.preventDefault()
    setCreateLoading(true)
    setErrorMsg('')
    setCreateProgress('Initializing batch creation...')

    try {
      const startMatch = startRoll.match(/^(.*?)(\d+)$/)
      const endMatch = endRoll.match(/^(.*?)(\d+)$/)

      if (!startMatch || !endMatch || startMatch[1] !== endMatch[1]) {
        throw new Error('Roll numbers must have the same alphabetical prefix followed by numbers.')
      }

      const prefix = startMatch[1]
      const startNumStr = startMatch[2]
      const startNum = parseInt(startNumStr, 10)
      const endNum = parseInt(endMatch[2], 10)
      const numLength = startNumStr.length

      if (startNum > endNum) {
        throw new Error('Start roll number must be less than or equal to end roll number.')
      }

      const total = endNum - startNum + 1
      let successCount = 0

      // Pre-fetch all users to avoid pagination limits and rate limits in the loop
      let allAuthUsers: any[] = []
      let page = 1
      while (true) {
        const { data } = await supabaseAdmin.auth.admin.listUsers({ page, perPage: 1000 })
        if (!data?.users || data.users.length === 0) break
        allAuthUsers = allAuthUsers.concat(data.users)
        page++
      }

      for (let i = startNum; i <= endNum; i++) {
        const paddedNum = i.toString().padStart(numLength, '0')
        const roll = `${prefix}${paddedNum}`
        const email = `${roll}${emailSuffix}`
        const password = roll

        setCreateProgress(`Creating user ${successCount + 1}/${total}: ${email}`)

        const existingUser = allAuthUsers.find(u => u.email === email)
        
        let userId = existingUser?.id

        if (!userId) {
          const { data, error: createErr } = await supabaseAdmin.auth.admin.createUser({
            email,
            password,
            email_confirm: true,
            user_metadata: { batch: newBatchName }
          })
          
          if (createErr && !createErr.message.includes('already been registered')) {
            console.error(`Failed to create ${email}:`, createErr.message)
            continue
          }
          if (data?.user) userId = data.user.id
        }

        if (userId) {
          await supabaseAdmin.from('profiles').upsert([
            { id: userId, email, name: roll.toUpperCase(), role: 'candidate' }
          ], { onConflict: 'id' })
          
          if (existingUser) {
             await supabaseAdmin.auth.admin.updateUserById(userId, { user_metadata: { batch: newBatchName } })
          }
        }
        successCount++
      }

      setIsCreating(false)
      loadCandidates()
    } catch (err: any) {
      setErrorMsg(err.message)
    } finally {
      setCreateLoading(false)
      setCreateProgress('')
    }
  }

  const filteredCandidates = candidates.filter(c => 
    c.email.toLowerCase().includes(searchQuery.toLowerCase()) || 
    c.name.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const departments = Array.from(new Set(candidates.map(c => c.department))).sort()

  return (
    <div className="space-y-8 select-none animate-fade-in pb-20">
      
      {/* Header */}
      <div className="flex justify-between items-center border-b border-divider pb-4">
        <div>
          <h2 className="text-3xl font-semibold tracking-tight text-[#6f8eff] mb-2">
            // CANDIDATE DATABASE REGISTRY
          </h2>
          <span className="text-[11px] sys-text-body font-sans mt-1 block font-medium">
            Manage student batches, authentications, and platform access.
          </span>
        </div>

        <Button 
          onClick={() => setIsCreating(true)}
          className="bg-[#3f6ad5] hover:bg-[#3254a8] hover:shadow-[0_0_15px_rgba(63,106,213,0.6)] active:shadow-[0_0_8px_rgba(63,106,213,0.4)] text-white text-xs h-9 px-4 rounded-xl font-bold cursor-pointer transition flex items-center gap-1.5 shadow-md"
        >
          <Plus className="w-4 h-4" strokeWidth={1.5} /> Inject Batch
        </Button>
      </div>

      {errorMsg && (
        <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-400 text-xs rounded-xl font-mono">
          {errorMsg}
        </div>
      )}

      {loading ? (
        <div className="flex justify-center items-center py-20">
          <Loader2 className="w-6 h-6 text-[#5B8CFF] animate-spin" />
        </div>
      ) : (
        <div className="space-y-6">
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 sys-text-body" />
            <input 
              type="text" 
              placeholder="Search candidate roll or email..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full sys-bg/50 border border-divider text-primary text-xs rounded-xl pl-9 pr-4 py-2.5 focus:outline-none focus:border-[#5B8CFF]/50 transition"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 items-start">
            {departments.map(dept => {
              const deptUsers = filteredCandidates.filter(c => c.department === dept)
              if (deptUsers.length === 0 && searchQuery) return null

              const isDeptExpanded = expandedDepts[dept]
              const deptBatches = Array.from(new Set(deptUsers.map(u => u.batch))).sort()

              return (
                <Card key={dept} className={`bg-card backdrop-blur-[24px] border-divider rounded-[24px] overflow-hidden shadow-2xl transition-all duration-300 hover:shadow-[0_0_40px_rgba(255,255,255,0.03)] hover:border-border-strong ${isDeptExpanded ? 'col-span-1 md:col-span-2 lg:col-span-4' : ''}`}>
                  <div 
                    onClick={() => toggleDept(dept)}
                    className="p-5 bg-transparent hover:bg-hover cursor-pointer flex items-center justify-between transition-colors duration-300 group min-w-0 relative overflow-hidden"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      {isDeptExpanded ? <ChevronDown className="w-4 h-4 sys-text-body shrink-0" /> : <ChevronRight className="w-4 h-4 sys-text-body shrink-0" />}
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="p-2 bg-[#5B8CFF]/10 rounded-xl group-hover:scale-110 transition-transform duration-300 shrink-0">
                          <Folder className="w-4 h-4 text-[#5B8CFF]" />
                        </div>
                        <h3 className="font-bold text-base text-primary font-heading tracking-wide truncate">{dept} Department</h3>
                        <span className="px-2 py-0.5 sys-card sys-text-body text-[9px] font-mono rounded font-bold ml-2 shrink-0 hidden sm:inline-block">
                          {deptUsers.length} Users
                        </span>
                      </div>
                    </div>
                    
                    <Button 
                      onClick={(e) => handleDeleteDept(e, dept)}
                      variant="ghost" 
                      size="sm"
                      className="absolute right-4 h-7 px-3 bg-[#F87171]/5 hover:bg-[#F87171]/15 text-[#F87171]/80 hover:text-[#F87171] rounded-lg cursor-pointer transition opacity-0 group-hover:opacity-100 backdrop-blur-md"
                    >
                      <Trash2 className="w-3.5 h-3.5 mr-1.5" />
                      <span className="text-[10px] font-mono font-bold uppercase tracking-wider hidden sm:inline-block">Delete Dept</span>
                    </Button>
                  </div>

                  {isDeptExpanded && (
                    <div className="border-t border-divider bg-black/20 p-6 space-y-4">
                      {deptBatches.map(batchName => {
                        const batchUsers = deptUsers.filter(c => c.batch === batchName)
                        const isBatchExpanded = expandedBatches[batchName]

                        return (
                          <div key={batchName} className="border border-divider rounded-2xl overflow-hidden bg-panel backdrop-blur-md shadow-sm transition-all duration-300 hover:border-border-strong">
                            <div 
                              onClick={() => toggleBatch(batchName)}
                              className="p-4 hover:bg-hover cursor-pointer flex items-center justify-between transition-colors duration-300 group/batch"
                            >
                              <div className="flex items-center gap-2.5">
                                {isBatchExpanded ? <ChevronDown className="w-3.5 h-3.5 sys-text-body" /> : <ChevronRight className="w-3.5 h-3.5 sys-text-body" />}
                                <Database className="w-3.5 h-3.5 sys-text-body" />
                                <span className="font-bold text-sm text-primary font-heading tracking-wide">{batchName}</span>
                                <span className="px-1.5 py-0.5 bg-[#5B8CFF]/10 text-[#5B8CFF] text-[9px] font-mono rounded font-bold ml-1">
                                  {batchUsers.length}
                                </span>
                              </div>
                              <Button 
                                onClick={(e) => handleDeleteBatch(e, batchName)}
                                variant="ghost" 
                                size="sm"
                                className="h-6 px-2 bg-[#F87171]/5 hover:bg-[#F87171]/15 text-[#F87171]/70 hover:text-[#F87171] rounded-md cursor-pointer transition opacity-0 group-hover/batch:opacity-100"
                              >
                                <Trash2 className="w-3 h-3 mr-1" />
                                <span className="text-[9px] font-mono font-bold uppercase tracking-wider">Delete Class</span>
                              </Button>
                            </div>

                            {isBatchExpanded && (
                              <div className="border-t border-divider pb-2"><div className="overflow-x-auto px-4 pt-4"><table className="w-full text-left text-xs border-collapse min-w-[800px] w-full">
                                  <thead className="table-header-group">
                                    <tr className="bg-panel backdrop-blur-[16px] sys-text-body font-sans font-semibold text-[10px] uppercase tracking-wider"><th className="py-3 px-5 rounded-l-2xl border-y border-l border-divider">Roll Number</th><th className="py-3 px-5 border-y border-divider">Email Address</th><th className="py-3 px-5 rounded-r-2xl border-y border-r border-divider text-right">Actions</th></tr>
                                  </thead>
                                  <tbody className="table-row-group divide-y lg:divide-divider"><tr className="table-row h-2"></tr>
                                    {batchUsers.map(user => (
                                      <tr key={user.id} className="hover:bg-hover transition-colors duration-200 group/row table-row p-4 p-0 mb-4 mb-0 border border-divider  rounded-2xl  bg-panel ">
                                        <td className="py-2 py-3 px-1 px-5 flex flex-col sm:flex-row sm:items-center justify-between table-cell font-semibold font-heading text-primary max-w-xs truncate border-b border-divider ">
                                          
                                          <span>{user.name}</span>
                                        </td>
                                        <td className="py-2 py-3 px-1 px-5 flex flex-col sm:flex-row sm:items-center justify-between table-cell sys-text-body font-sans border-b border-divider ">
                                          
                                          <span>{user.email}</span>
                                        </td>
                                        <td className="py-3 lg:py-2 px-1 px-5 flex justify-end table-cell">
                                          <div className="flex justify-end gap-1.5 w-full w-auto">
                                            <Button 
                                              onClick={(e) => handleDeleteUser(e, user.id, user.name)}
                                              variant="ghost" 
                                              size="sm"
                                              className="h-8 w-8 lg:h-6 lg:w-6 p-0 hover:bg-[#F87171]/10 sys-text-body hover:text-[#F87171] rounded-md cursor-pointer transition"
                                              title="Revoke access and delete"
                                            >
                                              <Trash2 className="w-4 h-4 lg:w-3.5 lg:h-3.5" />
                                            </Button>
                                          </div>
                                        </td>
                                      </tr>
                                    ))}
                                  </tbody></table></div></div>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  )}
                </Card>
              )
            })}
            
            {departments.length === 0 && (
              <div className="text-center py-12 sys-text-body text-xs font-mono">
                No departments found in the database.
              </div>
            )}
          </div>
        </div>
      )}

      {/* CREATE BATCH MODAL */}
      {isCreating && (
        <div className="fixed inset-0 bg-black/80  z-[9999] flex items-center justify-center p-4">
          <Card className="w-full max-w-md bg-panel backdrop-blur-[16px] border-divider rounded-2xl overflow-hidden shadow-2xl animate-fade-in">
            <div className="p-4 border-b border-divider flex justify-between items-center sys-bg/40">
              <h3 className="font-bold text-sm text-primary font-heading flex items-center gap-2">
                <Database className="w-4 h-4 text-[#5B8CFF]" /> Add New Batch
              </h3>
            </div>
            
            <form onSubmit={handleCreateBatch} className="p-6 space-y-5">
              <div className="space-y-1.5">
                <label className="text-[9px] font-mono sys-text-body uppercase">Batch Identifier (e.g. CSE_D)</label>
                <input 
                  type="text" 
                  value={newBatchName}
                  onChange={e => setNewBatchName(e.target.value)}
                  className="w-full bg-panel backdrop-blur-[16px] border border-divider text-primary text-xs rounded-xl p-2.5 focus:outline-none focus:border-[#5B8CFF]/50 transition font-bold"
                  required
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[9px] font-mono sys-text-body uppercase">Start Roll No</label>
                  <input 
                    type="text" 
                    value={startRoll}
                    onChange={e => setStartRoll(e.target.value)}
                    className="w-full bg-panel backdrop-blur-[16px] border border-divider text-primary text-xs rounded-xl p-2.5 focus:outline-none focus:border-[#5B8CFF]/50 transition font-mono"
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[9px] font-mono sys-text-body uppercase">End Roll No</label>
                  <input 
                    type="text" 
                    value={endRoll}
                    onChange={e => setEndRoll(e.target.value)}
                    className="w-full bg-panel backdrop-blur-[16px] border border-divider text-primary text-xs rounded-xl p-2.5 focus:outline-none focus:border-[#5B8CFF]/50 transition font-mono"
                    required
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[9px] font-mono sys-text-body uppercase">Email Suffix</label>
                <input 
                  type="text" 
                  value={emailSuffix}
                  onChange={e => setEmailSuffix(e.target.value)}
                  className="w-full bg-panel backdrop-blur-[16px] border border-divider text-primary text-xs rounded-xl p-2.5 focus:outline-none focus:border-[#5B8CFF]/50 transition font-mono"
                  required
                />
              </div>

              <div className="bg-[#5B8CFF]/10 border border-[#5B8CFF]/20 rounded-xl p-3 text-[10px] text-[#5B8CFF] font-mono leading-relaxed">
                Notice: Passwords will be automatically set identical to the user's generated Roll Number prefix. Auth profiles will be mass-injected.
              </div>

              {createProgress && (
                <div className="text-[9px] text-[#34D399] font-mono animate-pulse text-center">
                  {createProgress}
                </div>
              )}

              <div className="flex justify-end gap-3 pt-2">
                <Button 
                  type="button" 
                  onClick={() => setIsCreating(false)}
                  disabled={createLoading}
                  className="bg-transparent hover:sys-card sys-text-body text-xs h-9 px-4 rounded-xl cursor-pointer"
                >
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  disabled={createLoading}
                  className="bg-[#3f6ad5] hover:bg-[#3254a8] hover:shadow-[0_0_15px_rgba(63,106,213,0.6)] active:shadow-[0_0_8px_rgba(63,106,213,0.4)] text-white text-xs h-9 px-5 rounded-xl font-bold cursor-pointer transition shadow-md flex items-center gap-2"
                >
                  {createLoading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  {createLoading ? 'Injecting...' : 'Confirm Injection'}
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}
    </div>
  )
}
