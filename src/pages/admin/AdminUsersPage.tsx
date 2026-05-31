import { useEffect, useState } from 'react'
import type { UserResponse, BanUserRequest } from '../../types/index'
import { getAllUsers, banUser, unbanUser } from '../../api/userApi'
import { Popconfirm } from 'antd'

export function AdminUsersPage() {
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
      const r = await getAllUsers(email || undefined, p, 15)
      setUsers(r.data); setTotal(r.total)
    } catch {
      setError('Failed to load users.')
    } finally {
      setLoading(false)
    }
  }

  const [submittedQuery, setSubmittedQuery] = useState('')

  useEffect(() => { fetchUsers(page, submittedQuery) }, [page, submittedQuery])

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    setSubmittedQuery(searchEmail)
    setPage(1)
  }

  const handleBan = async () => {
    if (!banModal) return
    const dto: BanUserRequest = { banReason: banReason || undefined }
    try {
      await banUser(banModal.userId, dto)
      setBanModal(null); setBanReason(''); fetchUsers(page, submittedQuery)
    } catch (e: unknown) {
      const err = e as { response?: { data?: { Message?: string; message?: string } } }
      setError(err?.response?.data?.Message || err?.response?.data?.message || 'Failed to ban user.')
    }
  }

  const handleUnban = async (userId: string) => {
    try {
      await unbanUser(userId, {})
      fetchUsers(page, submittedQuery)
    } catch (e: unknown) {
      const err = e as { response?: { data?: { Message?: string; message?: string } } }
      setError(err?.response?.data?.Message || err?.response?.data?.message || 'Failed to unban user.')
    }
  }

  const totalPages = Math.ceil(total / 15)

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold text-gray-900">User Management</h1>
        <p className="text-sm text-gray-500">View, search, and manage platform users.</p>
      </div>

      <form className="flex gap-2" onSubmit={handleSearch}>
        <input
          className="flex-1 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder-gray-400 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-colors"
          placeholder="Search by email..."
          value={searchEmail}
          onChange={e => setSearchEmail(e.target.value)}
        />
        <button
          type="submit"
          className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500 transition-colors"
        >
          Search
        </button>
      </form>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-600">{error}</div>
      )}

      {loading ? (
        <div className="rounded-xl border border-gray-200 bg-white p-5 space-y-3">
          {Array.from({ length: 5 }).map((_, i) => <div key={i} className="h-10 w-full animate-pulse rounded-lg bg-gray-100" />)}
        </div>
      ) : (
        <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                  <th className="px-5 py-3">Email</th>
                  <th className="px-5 py-3">Roles</th>
                  <th className="px-5 py-3">Status</th>
                  <th className="px-5 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map(u => (
                  <tr key={u.id} className="border-b border-gray-100 last:border-0 hover:bg-gray-50 transition-colors">
                    <td className="px-5 py-3 text-gray-900">{u.email}</td>
                    <td className="px-5 py-3">
                      {u.roles?.map((r: string) => (
                        <span key={r} className="mr-1 rounded-full bg-indigo-100 px-2 py-0.5 text-[11px] font-medium text-indigo-700">{r}</span>
                      ))}
                    </td>
                    <td className="px-5 py-3">
                      <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold uppercase ${u.isBanned ? 'bg-red-100 text-red-700' : 'bg-emerald-100 text-emerald-700'}`}>
                        {u.isBanned ? 'Banned' : 'Active'}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-right">
                      {u.isBanned ? (
                        <Popconfirm
                          title="Unban User"
                          description="Are you sure you want to unban this user?"
                          onConfirm={() => handleUnban(u.id)}
                          okText="Yes"
                          cancelText="No"
                        >
                          <button className="rounded-lg border border-emerald-200 px-3 py-1 text-xs font-medium text-emerald-700 hover:bg-emerald-50 transition-colors">Unban</button>
                        </Popconfirm>
                      ) : (
                        <button
                          className="rounded-lg border border-red-200 px-3 py-1 text-xs font-medium text-red-600 hover:bg-red-50 transition-colors"
                          onClick={() => setBanModal({ userId: u.id, email: u.email })}
                        >
                          Ban
                        </button>
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
          <button className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm text-gray-600 disabled:opacity-30 hover:bg-gray-50" disabled={page <= 1} onClick={() => setPage(page - 1)}>‹</button>
          <span className="text-sm text-gray-500">{page} / {totalPages}</span>
          <button className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm text-gray-600 disabled:opacity-30 hover:bg-gray-50" disabled={page >= totalPages} onClick={() => setPage(page + 1)}>›</button>
        </div>
      )}

      {banModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30" onClick={() => setBanModal(null)}>
          <div className="w-full max-w-md rounded-xl border border-gray-200 bg-white p-6 shadow-xl" onClick={e => e.stopPropagation()}>
            <h2 className="mb-1 text-base font-semibold text-gray-900">Ban User</h2>
            <p className="mb-4 text-sm text-gray-500">Ban <strong className="text-gray-800">{banModal.email}</strong>?</p>
            <div className="mb-4">
              <label className="mb-1.5 block text-xs font-medium text-gray-600">Reason (optional)</label>
              <textarea
                value={banReason}
                onChange={e => setBanReason(e.target.value)}
                rows={2}
                placeholder="Enter reason..."
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder-gray-400 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-colors resize-none"
              />
            </div>
            <div className="flex justify-end gap-2">
              <button className="rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-600 hover:bg-gray-50 transition-colors" onClick={() => setBanModal(null)}>Cancel</button>
              <button className="rounded-lg bg-red-500 px-4 py-2 text-sm font-semibold text-white hover:bg-red-400 transition-colors" onClick={handleBan}>Ban User</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
