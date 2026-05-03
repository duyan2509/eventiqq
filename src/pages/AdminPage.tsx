import { useEffect, useState } from 'react'
import type { UserResponse, BanUserRequest } from '../types/index'
import { getAllUsers, banUser, unbanUser } from '../api/userApi'
import { Popconfirm } from 'antd'

export function AdminPage() {
  const [users, setUsers] = useState<UserResponse[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [searchEmail, setSearchEmail] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [banModal, setBanModal] = useState<{ userId: string; email: string } | null>(null)
  const [banReason, setBanReason] = useState('')

  const fetchUsers = async (p: number, email?: string) => {
    setLoading(true); setError(null)
    try {
      const r = await getAllUsers(email || undefined, p, 15); setUsers(r.data); setTotal(r.total)
    }
    catch {
      setError('Failed to load users.')
    }
    finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchUsers(page, searchEmail) }, [page])

  const handleSearch = (e: React.FormEvent) => { e.preventDefault(); setPage(1); fetchUsers(1, searchEmail) }

  const handleBan = async () => {
    if (!banModal) return
    const dto: BanUserRequest = { banReason: banReason || undefined }
    try {
      await banUser(banModal.userId, dto); setBanModal(null); setBanReason(''); fetchUsers(page, searchEmail)
    }
    catch (e: any) {
      setError(e?.response?.data?.Message || e?.response?.data?.message || 'Failed to ban user.')
    }
  }

  const handleUnban = async (userId: string) => {
    try {
      await unbanUser(userId, {});
      fetchUsers(page, searchEmail)
    }
    catch (e: any) {
      setError(e?.response?.data?.Message || e?.response?.data?.message || 'Failed to unban user.')
    }
  }

  const totalPages = Math.ceil(total / 15)

  return (
    <div className="fade-in space-y-6">
      <div>
        <h1>User Management</h1>
        <p className="text-sm text-slate-400">View, search, and manage platform users.</p>
      </div>

      <form className="flex gap-3" onSubmit={handleSearch}>
        <input className="flex-1" placeholder="Search by email..." value={searchEmail} onChange={e => setSearchEmail(e.target.value)} />
        <button className="rounded-xl bg-indigo-500 px-5 py-2.5 text-sm font-semibold text-white hover:bg-indigo-400 transition-colors" type="submit">Search</button>
      </form>

      {error && <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-2.5 text-sm text-red-400">{error}</div>}

      {loading ? (
        <div className="glass p-5 space-y-3">{Array.from({ length: 5 }).map((_, i) => <div key={i} className="skeleton h-10 w-full" />)}</div>
      ) : (
        <div className="glass overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-700/50 text-left text-xs uppercase tracking-wider text-slate-500">
                  <th className="px-4 py-3">Email</th>
                  <th className="px-4 py-3">Roles</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map(u => (
                  <tr key={u.id} className="border-b border-slate-800/40 transition-colors hover:bg-slate-800/20">
                    <td className="px-4 py-3 text-slate-200">{u.email}</td>
                    <td className="px-4 py-3">{u.roles?.map((r: string) => <span key={r} className="mr-1 rounded-full bg-indigo-500/10 px-2 py-0.5 text-[10px] font-medium text-indigo-400">{r}</span>)}</td>
                    <td className="px-4 py-3"><span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase ${u.isBanned ? 'bg-red-500/15 text-red-400' : 'bg-emerald-500/15 text-emerald-400'}`}>{u.isBanned ? 'Banned' : 'Active'}</span></td>
                    <td className="px-4 py-3 text-right">
                      {u.isBanned ? (
                        <Popconfirm
                          title="Unban User"
                          description="Are you sure you want to unban this user?"
                          onConfirm={() => handleUnban(u.id)}
                          okText="Yes"
                          cancelText="No"
                        >
                          <button className="rounded-lg border border-emerald-500/30 px-3 py-1 text-xs font-medium text-emerald-400 hover:bg-emerald-500/10 transition-colors">Unban</button>
                        </Popconfirm>
                      ) : (
                        <button className="rounded-lg border border-red-500/30 px-3 py-1 text-xs font-medium text-red-400 hover:bg-red-500/10 transition-colors" onClick={() => setBanModal({ userId: u.id, email: u.email })}>Ban</button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-3">
          <button className="rounded-lg border border-slate-700 px-3 py-1.5 text-sm text-slate-400 disabled:opacity-30" disabled={page <= 1} onClick={() => setPage(page - 1)}>‹</button>
          <span className="text-sm text-slate-400">{page} / {totalPages}</span>
          <button className="rounded-lg border border-slate-700 px-3 py-1.5 text-sm text-slate-400 disabled:opacity-30" disabled={page >= totalPages} onClick={() => setPage(page + 1)}>›</button>
        </div>
      )}

      {/* Ban Modal */}
      {banModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={() => setBanModal(null)}>
          <div className="glass w-full max-w-md p-6 fade-in" onClick={e => e.stopPropagation()}>
            <h2 className="mb-1">Ban User</h2>
            <p className="text-sm text-slate-400 mb-4">Ban <strong className="text-slate-200">{banModal.email}</strong>?</p>
            <div className="mb-4">
              <label>Reason (optional)</label>
              <textarea value={banReason} onChange={e => setBanReason(e.target.value)} rows={2} placeholder="Enter reason..." />
            </div>
            <div className="flex justify-end gap-2">
              <button className="rounded-lg border border-slate-600 px-4 py-2 text-sm text-slate-300 hover:text-white transition-colors" onClick={() => setBanModal(null)}>Cancel</button>
              <button className="rounded-lg bg-red-500 px-4 py-2 text-sm font-semibold text-white hover:bg-red-400 transition-colors" onClick={handleBan}>Ban User</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
