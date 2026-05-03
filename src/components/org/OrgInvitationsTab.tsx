import { useState, useEffect, useCallback } from 'react'
import { Popconfirm } from 'antd'
import type { InvitationResponse, CreateInvitationDto, PermissionResponse } from '../../types/index'
import { getOrgInvitations, createInvitation, cancelInvitation } from '../../api/invitationApi'
import { getPermissions } from '../../api/permissionApi'

interface Props {
  orgId: string
  onError: (msg: string) => void
  onSuccess: (msg: string) => void
}

export function OrgInvitationsTab({ orgId, onError, onSuccess }: Props) {
  const [invitations, setInvitations] = useState<InvitationResponse[]>([])
  const [loading, setLoading] = useState(true)
  const [permissions, setPermissions] = useState<PermissionResponse[]>([])
  const [loadingPerm, setLoadingPerm] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState<CreateInvitationDto>({ userEmail: '', permissionId: '' })

  const fetchInvitations = useCallback(async () => {
    setLoading(true)
    try { const r = await getOrgInvitations(orgId, 1, 50); setInvitations(r.data) } catch { }
    finally { setLoading(false) }
  }, [orgId])

  const fetchPermissions = useCallback(async () => {
    setLoadingPerm(true)
    try { 
      const r = await getPermissions(orgId, 1, 50)
      setPermissions(r.data.filter(p => p.name !== 'Owner')) 
    } catch { }
    finally { setLoadingPerm(false) }
  }, [orgId])

  useEffect(() => {
    fetchInvitations()
  }, [fetchInvitations])

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await createInvitation(orgId, form)
      setShowForm(false)
      const sentEmail = form.userEmail
      setForm({ userEmail: '', permissionId: '' })
      onSuccess(`Invitation sent to ${sentEmail}!`)
      fetchInvitations()
    } catch (e: any) { onError(e?.response?.data?.Message || e?.response?.data?.message || 'Failed to send invitation.') }
  }

  const handleCancel = async (id: string) => {
    try { await cancelInvitation(orgId, id); fetchInvitations() }
    catch (e: any) { onError(e?.response?.data?.Message || e?.response?.data?.message || 'Failed to cancel invitation.') }
  }

  const openForm = () => {
    setShowForm(true)
    if (permissions.length === 0) fetchPermissions()
  }

  return (
    <div className="fade-in space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1>Invitations</h1>
          <p className="text-sm text-slate-400">Invite people to join this organization.</p>
        </div>
        <button
          className="rounded-xl bg-indigo-500 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-400 transition-colors"
          onClick={openForm}
        >+ Invite</button>
      </div>

      {showForm && (
        <form onSubmit={handleCreate} className="glass p-5 space-y-4">
          <h3 className="text-sm font-semibold text-slate-200">New Invitation</h3>
          <div>
            <label>Email Address</label>
            <input value={form.userEmail} onChange={e => setForm({ ...form, userEmail: e.target.value })} required placeholder="colleague@example.com" />
          </div>
          <div>
            <label>Permission Role</label>
            {loadingPerm ? (
              <div className="skeleton h-9 w-full rounded-lg" />
            ) : (
              <select
                value={form.permissionId}
                onChange={e => setForm({ ...form, permissionId: e.target.value })}
                required
                className="w-full rounded-lg border border-slate-700/50 bg-slate-900/60 px-3 py-2 text-sm text-slate-200 focus:border-indigo-500/50 focus:outline-none"
              >
                <option value="" disabled>Select a permission...</option>
                {permissions.map(p => (
                  <option key={p.id} value={p.id}>{p.name}{p.isDesigner ? ' (Designer)' : ''}</option>
                ))}
              </select>
            )}
            {!loadingPerm && permissions.length === 0 && (
              <p className="mt-1 text-xs text-amber-400">No permissions yet — create one in the Permissions tab first.</p>
            )}
          </div>
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => { setShowForm(false); setForm({ userEmail: '', permissionId: '' }) }} className="rounded-lg border border-slate-600 px-4 py-2 text-sm text-slate-300 hover:text-white transition-colors">Cancel</button>
            <button className="rounded-lg bg-indigo-500 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-400 transition-colors disabled:opacity-40" disabled={permissions.length === 0}>Send Invite</button>
          </div>
        </form>
      )}

      {loading ? (
        <div className="space-y-2">{Array.from({ length: 3 }).map((_, i) => <div key={i} className="glass p-4"><div className="skeleton h-4 w-3/4" /></div>)}</div>
      ) : invitations.length === 0 ? (
        <div className="glass p-8 text-center text-sm text-slate-400">No invitations sent yet.</div>
      ) : (
        <div className="space-y-2">
          {invitations.map((inv) => (
            <div key={inv.id} className="glass flex items-center justify-between p-4">
              <div>
                <p className="text-sm font-medium text-slate-200">{inv.userEmail}</p>
                <p className="text-xs text-slate-500 mt-0.5">{inv.permissionName || permissions.find(p => p.id === inv.permissionId)?.name || 'Unknown Role'}</p>
                {inv.expiresAt && <p className="text-[11px] text-slate-600 mt-0.5">Expires {new Date(inv.expiresAt).toLocaleDateString('en-US')}</p>}
              </div>
              <div className="flex items-center gap-3">
                <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-semibold uppercase ${inv.status === 'PENDING' ? 'bg-amber-500/15 text-amber-400' : inv.status === 'ACCEPTED' ? 'bg-emerald-500/15 text-emerald-400' : 'bg-red-500/15 text-red-400'}`}>
                  {inv.status}
                </span>
                {inv.status === 'PENDING' && (
                  <Popconfirm
                    title="Cancel invitation"
                    description="Are you sure you want to cancel this invitation?"
                    onConfirm={() => handleCancel(inv.id)}
                    okText="Yes"
                    cancelText="No"
                  >
                    <button className="text-xs text-red-400 hover:text-red-300 transition-colors">Cancel</button>
                  </Popconfirm>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
