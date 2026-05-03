import { useState, useEffect, useCallback } from 'react'
import { Popconfirm } from 'antd'
import type { MemberResponse } from '../../types/member'
import type { PermissionResponse } from '../../types/index'
import { getMembers, deleteMember, changeMemberPermission } from '../../api/memberApi'
import { getPermissions } from '../../api/permissionApi'

interface Props {
  orgId: string
  isStaffRole: boolean
  onError: (msg: string) => void
  onCountChange?: (count: number) => void
}

export function OrgMembersTab({ orgId, isStaffRole, onError, onCountChange }: Props) {
  const [members, setMembers] = useState<MemberResponse[]>([])
  const [loading, setLoading] = useState(true)
  const [permissions, setPermissions] = useState<PermissionResponse[]>([])
  const [loadingPerm, setLoadingPerm] = useState(false)
  const [changingMemberId, setChangingMemberId] = useState<string | null>(null)

  const fetchMembers = useCallback(async () => {
    setLoading(true)
    try {
      const r = await getMembers(orgId, 1, 50)
      setMembers(r.data)
      if (onCountChange) onCountChange(r.data.length || 0)
    } catch { } // Error silently for list load, or you can onError
    finally { setLoading(false) }
  }, [orgId, onCountChange])

  const fetchPermissions = useCallback(async () => {
    setLoadingPerm(true)
    try {
      const r = await getPermissions(orgId, 1, 50)
      setPermissions(r.data.filter(p => p.name !== 'Owner'))
    } catch { }
    finally { setLoadingPerm(false) }
  }, [orgId])

  useEffect(() => {
    fetchMembers()
    if (!isStaffRole) fetchPermissions()
  }, [fetchMembers, fetchPermissions, isStaffRole])

  const handleChangePermission = async (memberId: string, newPermId: string) => {
    setChangingMemberId(memberId)
    try {
      await changeMemberPermission(orgId, memberId, { permissionId: newPermId })
      fetchMembers()
    }
    catch (e: any) { onError(e?.response?.data?.Message || e?.response?.data?.message || 'Failed to change permission.') }
    finally { setChangingMemberId(null) }
  }

  const handleDeleteMember = async (id: string) => {
    try { await deleteMember(orgId, id); fetchMembers() }
    catch (e: any) { onError(e?.response?.data?.Message || e?.response?.data?.message || 'Failed to remove member.') }
  }

  return (
    <div className="fade-in space-y-4">
      <div>
        <h1>Members</h1>
        <p className="text-sm text-slate-400">People who belong to this organization.</p>
      </div>
      {loading ? (
        <div className="space-y-2">{Array.from({ length: 3 }).map((_, i) => <div key={i} className="glass p-4"><div className="skeleton h-4 w-1/2" /></div>)}</div>
      ) : members.length === 0 ? (
        <div className="glass p-8 text-center text-sm text-slate-400">No members yet. Invite someone from the Invitations tab.</div>
      ) : (
        <div className="glass overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-700/50 text-xs text-slate-500 uppercase">
                <th className="px-4 py-3 text-left">Email</th>
                <th className="px-4 py-3 text-left">Permission</th>
                {!isStaffRole && <th className="px-4 py-3" />}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/40">
              {members.map(m => (
                <tr key={m.id} className="hover:bg-slate-800/20 transition-colors">
                  <td className="px-4 py-3 text-slate-200">{m.email}</td>
                  <td className="px-4 py-3 text-slate-400">
                    {isStaffRole || m.permissionName === 'Owner' ? (
                      <span className={m.permissionName === 'Owner' ? "text-[10px] font-bold text-amber-500/80 uppercase tracking-wider" : ""}>{m.permissionName || '—'}</span>
                    ) : loadingPerm ? (
                      <span className="text-xs">Loading...</span>
                    ) : (
                      <select
                        disabled={changingMemberId === m.id}
                        value={permissions.find(p => p.name === m.permissionName)?.id || ''}
                        onChange={(e) => handleChangePermission(m.id, e.target.value)}
                        className={`rounded-lg border border-slate-700/50 bg-slate-900/60 px-2 py-1 text-xs text-slate-200 focus:border-indigo-500/50 focus:outline-none ${changingMemberId === m.id ? 'opacity-50' : ''}`}
                      >
                        <option value="" disabled>Select role</option>
                        {permissions.map(p => (
                          <option key={p.id} value={p.id}>{p.name}</option>
                        ))}
                      </select>
                    )}
                  </td>
                  {!isStaffRole && (
                    <td className="px-4 py-3 text-right">
                      {m.permissionName !== 'Owner' && (
                        <Popconfirm
                          title="Remove member"
                          description="Are you sure you want to remove this member from the organization?"
                          onConfirm={() => handleDeleteMember(m.id)}
                          okText="Yes"
                          cancelText="No"
                        >
                          <button className="text-xs text-red-400 hover:text-red-300 transition-colors">Remove</button>
                        </Popconfirm>
                      )}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
