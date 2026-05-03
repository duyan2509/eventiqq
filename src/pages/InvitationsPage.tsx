import { useEffect, useState } from 'react'
import type { InvitationResponse } from '../types/index'
import { getMyInvitations, acceptInvitation, rejectInvitation } from '../api/invitationApi'
import { Popconfirm } from 'antd'

export function InvitationsPage() {
  const [invitations, setInvitations] = useState<InvitationResponse[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [error, setError] = useState<string | null>(null)

  const fetchInvitations = async (p: number) => {
    setLoading(true); setError(null)
    try {
      const r = await getMyInvitations(p, 10);
      setInvitations(r.data); setTotal(r.total)
    }
    catch {
      setError('Failed to load invitations.')
    }
    finally { setLoading(false) }
  }

  useEffect(() => { fetchInvitations(page) }, [page])

  const handleAccept = async (orgId: string, invId: string) => {
    try { await acceptInvitation(orgId, invId); fetchInvitations(page) }
    catch (e: any) { setError(e?.response?.data?.Message || e?.response?.data?.message || 'Failed to accept.') }
  }

  const handleReject = async (orgId: string, invId: string) => {
    try { await rejectInvitation(orgId, invId); fetchInvitations(page) }
    catch (e: any) { setError(e?.response?.data?.Message || e?.response?.data?.message || 'Failed to reject.') }
  }

  const totalPages = Math.ceil(total / 10)
  const statusBadge = (s: string) => s === 'ACCEPTED' ? 'bg-emerald-500/15 text-emerald-400' : s === 'REJECTED' ? 'bg-red-500/15 text-red-400' : s === 'CANCELED' ? 'bg-slate-700/40 text-slate-400' : 'bg-amber-500/15 text-amber-400'

  return (
    <div className="fade-in space-y-6">
      <div>
        <h1>Invitations</h1>
        <p className="text-sm text-slate-400">Your organization invitations.</p>
      </div>

      {error && <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-2.5 text-sm text-red-400">{error}</div>}

      {loading ? (
        <div className="space-y-3">{Array.from({ length: 3 }).map((_, i) => <div key={i} className="glass p-5"><div className="skeleton h-4 w-3/4 mb-2" /><div className="skeleton h-3 w-1/2" /></div>)}</div>
      ) : invitations.length === 0 ? (
        <div className="glass p-8 text-center text-sm text-slate-400">No invitations.</div>
      ) : (
        <div className="space-y-3">
          {invitations.map(inv => (
            <div key={inv.id} className="glass p-5 transition-all hover:border-indigo-500/30">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-semibold">{inv.organizationName || 'Organization'}</h3>
                  <p className="mt-1 text-xs text-slate-400">Permission: {inv.permissionName || inv.permissionId}</p>
                  {inv.expiresAt && <p className="text-[11px] text-slate-500">Expires: {new Date(inv.expiresAt).toLocaleDateString('en-US')}</p>}
                </div>
                <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-semibold uppercase ${statusBadge(inv.status)}`}>{inv.status}</span>
              </div>
              {inv.status === 'PENDING' && (
                <div className="mt-3 flex gap-2">
                  <Popconfirm
                    title="Accept Invitation"
                    description="Are you sure you want to accept this invitation?"
                    onConfirm={() => handleAccept(inv.organizationId, inv.id)}
                    okText="Yes"
                    cancelText="No"
                  >
                    <button className="rounded-lg bg-emerald-500 px-4 py-1.5 text-xs font-semibold text-white hover:bg-emerald-400 transition-colors">Accept</button>
                  </Popconfirm>
                  <Popconfirm
                    title="Reject Invitation"
                    description="Are you sure you want to reject this invitation?"
                    onConfirm={() => handleReject(inv.organizationId, inv.id)}
                    okText="Yes"
                    cancelText="No"
                  >
                    <button className="rounded-lg border border-slate-600 px-4 py-1.5 text-xs font-semibold text-slate-300 hover:border-red-500/50 hover:text-red-400 transition-colors">Reject</button>
                  </Popconfirm>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-3">
          <button className="rounded-lg border border-slate-700 px-3 py-1.5 text-sm text-slate-400 disabled:opacity-30" disabled={page <= 1} onClick={() => setPage(page - 1)}>‹</button>
          <span className="text-sm text-slate-400">{page} / {totalPages}</span>
          <button className="rounded-lg border border-slate-700 px-3 py-1.5 text-sm text-slate-400 disabled:opacity-30" disabled={page >= totalPages} onClick={() => setPage(page + 1)}>›</button>
        </div>
      )}
    </div>
  )
}
