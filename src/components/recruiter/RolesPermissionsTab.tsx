import { useState } from 'react'
import { Card } from '@/components/ui/card'
import { 
  Shield, Users, Check
} from 'lucide-react'

interface RolesPermissionsTabProps {
  defaultSection: 'roles' | 'permissions'
}

interface RoleConfig {
  name: string
  key: string
  description: string
  color: string
  usersCount: number
  permissions: string[]
}

const DEFAULT_ROLES: RoleConfig[] = [
  {
    name: 'Proctor Admin',
    key: 'proctor_admin',
    description: 'Complete administrative access to create assessments, review camera streams, and audit all infractions.',
    color: '#5B8CFF',
    usersCount: 2,
    permissions: ['assessments.create', 'assessments.edit', 'assessments.delete', 'streams.view', 'logs.view', 'csv.export']
  },
  {
    name: 'Exam Creator',
    key: 'exam_creator',
    description: 'Build coding challenges, manage test-cases, and duplicate drafts. No access to live proctor streams.',
    color: '#14B8A6',
    usersCount: 3,
    permissions: ['assessments.create', 'assessments.edit', 'questions.manage']
  },
  {
    name: 'Student Reviewer',
    key: 'student_reviewer',
    description: 'Read-only access to leaderboard rankings, final scores, and student compiler audit timeline logs.',
    color: '#A855F7',
    usersCount: 4,
    permissions: ['logs.view', 'csv.export']
  }
]

const PERMISSION_DEFINITIONS = [
  { key: 'assessments.create', name: 'Create Assessments', desc: 'Allows building new evaluations and setting duration defaults.' },
  { key: 'assessments.edit', name: 'Edit Assessments', desc: 'Allows modifying instructions, datetime schedules, and test limits.' },
  { key: 'assessments.delete', name: 'Delete Assessments', desc: 'Permanently remove assessments and questions bank histories.' },
  { key: 'questions.manage', name: 'Manage Questions', desc: 'Allows configuring manual inputs, expected outputs, and AI seeds.' },
  { key: 'streams.view', name: 'Watch Live Feeds', desc: 'Access to active candidate WebRTC camera streams and alarms.' },
  { key: 'logs.view', name: 'View Telemetry Logs', desc: 'Read proctor logs, tab switching infractions, and compiler scores.' },
  { key: 'csv.export', name: 'Export Records', desc: 'Download CSV audit details of candidate ranks and logs.' }
]

export default function RolesPermissionsTab({ defaultSection }: RolesPermissionsTabProps) {
  const [roles, setRoles] = useState<RoleConfig[]>(DEFAULT_ROLES)
  const [selectedRoleKey, setSelectedRoleKey] = useState<string>('proctor_admin')

  const activeRole = roles.find(r => r.key === selectedRoleKey) || roles[0]

  const handleTogglePermission = (roleKey: string, permKey: string) => {
    setRoles(prev => prev.map(r => {
      if (r.key === roleKey) {
        const has = r.permissions.includes(permKey)
        const updated = has 
          ? r.permissions.filter(p => p !== permKey) 
          : [...r.permissions, permKey]
        return { ...r, permissions: updated }
      }
      return r
    }))
  }

  return (
    <div className="space-y-8 select-none">
      
      {/* Header */}
      <div>
        <h2 className="text-[10px] font-mono font-bold tracking-widest text-[#5B8CFF] uppercase">
          {defaultSection === 'roles' ? '// SECURITY ROLES CONFIGURATION' : '// PERMISSION ACCESS CONTROL'}
        </h2>
        <span className="text-[11px] sys-text-body font-sans mt-1 block font-medium">Manage administrator roles, clearance levels, and security permission grids</span>
      </div>

      {defaultSection === 'roles' ? (
        /* ROLES SECTION */
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* Roles list */}
          <div className="lg:col-span-5 space-y-4">
            <span className="text-[9px] font-mono font-bold sys-text-body uppercase tracking-widest block select-none">Active Admin Profiles</span>
            <div className="space-y-3">
              {roles.map(r => (
                <Card 
                  key={r.key} 
                  onClick={() => setSelectedRoleKey(r.key)}
                  className={`border transition-all duration-300 rounded-2xl cursor-pointer p-4 relative overflow-hidden shadow-none ${
                    selectedRoleKey === r.key 
                      ? 'bg-card border-[#5B8CFF]/40' 
                      : 'bg-[rgba(28,28,30,0.72)] backdrop-blur-[16px] border-white/5 hover:border-transparent'
                  }`}
                >
                  <div 
                    className="absolute top-0 left-0 bottom-0 w-[4px]"
                    style={{ backgroundColor: r.color }}
                  />
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="font-bold text-xs text-white font-heading">{r.name}</span>
                      <span className="text-[9px] font-mono sys-text-body flex items-center gap-1">
                        <Users className="w-3 h-3" /> {r.usersCount} users
                      </span>
                    </div>
                    <p className="text-[10.5px] sys-text-body leading-relaxed font-sans line-clamp-2">{r.description}</p>
                  </div>
                </Card>
              ))}
            </div>
          </div>

          {/* Role details & permissions check list */}
          <div className="lg:col-span-7">
            <Card className="bg-[rgba(28,28,30,0.72)] backdrop-blur-[16px] border-white/5 p-6 rounded-2xl relative overflow-hidden shadow-xl space-y-6">
              <div className="absolute top-0 left-0 right-0 h-[2px]" style={{ backgroundColor: activeRole.color }} />
              
              <div className="flex justify-between items-start select-none">
                <div>
                  <span className="text-[9px] font-mono font-bold sys-text-body uppercase tracking-widest block">Clearance Settings</span>
                  <h3 className="font-bold text-sm text-white font-heading mt-2 flex items-center gap-2">
                    <Shield className="w-4 h-4" style={{ color: activeRole.color }} /> {activeRole.name}
                  </h3>
                </div>

                <span className="px-2.5 py-0.5 rounded-xl border text-[9px] font-mono font-bold uppercase tracking-wider sys-bg border-white/5 sys-text-body">
                  cleared profile
                </span>
              </div>

              {/* Permissions list */}
              <div className="space-y-4 pt-4 border-t border-white/5/60">
                <span className="text-[9px] font-mono font-bold sys-text-body uppercase tracking-widest block mb-2">Mapped Permissions Checklist</span>
                
                <div className="space-y-3">
                  {PERMISSION_DEFINITIONS.map(p => {
                    const hasPerm = activeRole.permissions.includes(p.key)
                    return (
                      <div 
                        key={p.key}
                        onClick={() => handleTogglePermission(activeRole.key, p.key)}
                        className="p-3 sys-bg/40 border border-white/5 rounded-xl flex items-center justify-between hover:border-transparent transition cursor-pointer select-none"
                      >
                        <div className="space-y-0.5 pr-4">
                          <span className="text-xs font-bold sys-text-primary block">{p.name}</span>
                          <span className="text-[10px] sys-text-body font-sans leading-normal">{p.desc}</span>
                        </div>

                        <div className={`w-5 h-5 rounded border transition flex items-center justify-center ${
                          hasPerm 
                            ? 'bg-[#34D399] border-[#34D399] text-white' 
                            : 'border-white/5 sys-bg text-transparent'
                        }`}>
                          <Check className="w-3.5 h-3.5" strokeWidth={2.5} />
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>

            </Card>
          </div>

        </div>
      ) : (
        /* PERMISSIONS MATRIX SECTION */
        <Card className="bg-[rgba(28,28,30,0.72)] backdrop-blur-[16px] border-white/5 p-6 rounded-2xl relative overflow-hidden shadow-xl">
          <div className="absolute top-0 left-0 right-0 h-[2px] sys-bg" />
          
          <div className="space-y-4">
            <span className="text-[9px] font-mono font-bold sys-text-body uppercase tracking-widest block select-none">// SYSTEM ACCESS CAPABILITY MATRIX</span>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs select-none">
                <thead>
                  <tr className="border-b border-white/5 sys-text-body font-mono text-[9px] uppercase tracking-wider">
                    <th className="py-3 px-4">Permission Node</th>
                    {roles.map(r => (
                      <th key={r.key} className="py-3 px-4 text-center">{r.name}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {PERMISSION_DEFINITIONS.map(p => (
                    <tr key={p.key} className="hover:sys-bg/20 transition duration-150">
                      <td className="py-3.5 px-4">
                        <div className="flex flex-col">
                          <span className="font-bold text-white">{p.name}</span>
                          <span className="text-[10px] sys-text-body mt-0.5">{p.desc}</span>
                        </div>
                      </td>
                      {roles.map(r => {
                        const hasPerm = r.permissions.includes(p.key)
                        return (
                          <td key={r.key} className="py-3.5 px-4 text-center">
                            <button 
                              onClick={() => handleTogglePermission(r.key, p.key)}
                              className="mx-auto flex focus:outline-none"
                            >
                              <div className={`w-5 h-5 rounded border transition flex items-center justify-center ${
                                hasPerm 
                                  ? 'bg-[#34D399] border-[#34D399] text-white' 
                                  : 'border-white/5 sys-bg text-transparent hover:border-transparent'
                              }`}>
                                <Check className="w-3.5 h-3.5" strokeWidth={2.5} />
                              </div>
                            </button>
                          </td>
                        )
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </Card>
      )}

    </div>
  )
}
