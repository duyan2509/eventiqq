import { useEffect, useState } from 'react'
import type { UserResponse, BanUserRequest, BanHistoryModel } from '../../types/index'
import type { UserOrganizationItem } from '../../types/organization'
import { getAllUsers, banUser, unbanUser, getUserBanHistory } from '../../api/userApi'
import { getOrgsByUser } from '../../api/organizationApi'
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

  // User detail modal (ban history + organizations)
  const [detailUser, setDetailUser] = useState<UserResponse | null>(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [banHistory, setBanHistory] = useState<BanHistoryModel[]>([])
  const [userOrgs, setUserOrgs] = useState<UserOrganizationItem[]>([])

  const openDetail = async (u: UserResponse) => {
    setDetailUser(u); setDetailLoading(true); setBanHistory([]); setUserOrgs([])
    try {
      const [bh, orgs] = await Promise.all([
        getUserBanHistory(u.id, 1, 50),
        getOrgsByUser(u.id),
      ])
      setBanHistory(bh.data); setUserOrgs(orgs)
    } catch {
      setError('Failed to load user details.')
    } finally {
      setDetailLoading(false)
    }
  }

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
                      <div className="flex justify-end gap-2">
                        <button
                          className="rounded-lg border border-gray-200 px-3 py-1 text-xs font-medium text-gray-600 hover:bg-gray-50 transition-colors"
                          onClick={() => openDetail(u)}
                        >
                          Details
                        </button>
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
                      </div>
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

      {detailUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4" onClick={() => setDetailUser(null)}>
          <div className="w-full max-w-2xl max-h-[85vh] overflow-y-auto rounded-xl border border-gray-200 bg-white p-6 shadow-xl" onClick={e => e.stopPropagation()}>
            <div className="mb-4 flex items-start justify-between">
              <div>
                <h2 className="text-base font-semibold text-gray-900">{detailUser.email}</h2>
                <span className={`mt-1 inline-block rounded-full px-2.5 py-0.5 text-[11px] font-semibold uppercase ${detailUser.isBanned ? 'bg-red-100 text-red-700' : 'bg-emerald-100 text-emerald-700'}`}>
                  {detailUser.isBanned ? 'Banned' : 'Active'}
                </span>
              </div>
              <button className="rounded-full p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600" onClick={() => setDetailUser(null)}>✕</button>
            </div>

            {detailLoading ? (
              <div className="space-y-3">{Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-9 w-full animate-pulse rounded-lg bg-gray-100" />)}</div>
            ) : (
              <div className="space-y-6">
                {/* Organizations */}
                <section>
                  <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-gray-500">Organizations ({userOrgs.length})</h3>
                  {userOrgs.length === 0 ? (
                    <p className="text-sm text-gray-400">Not a member of any organization.</p>
                  ) : (
                    <div className="divide-y divide-gray-100 rounded-lg border border-gray-200">
                      {userOrgs.map(o => (
                        <div key={o.orgId} className="flex items-center justify-between px-4 py-2.5 text-sm">
                          <span className="text-gray-900">{o.orgName}</span>
                          <span className="rounded-full bg-indigo-100 px-2 py-0.5 text-[11px] font-medium text-indigo-700">{o.roleName}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </section>

                {/* Ban history */}
                <section>
                  <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-gray-500">Ban History ({banHistory.length})</h3>
                  {banHistory.length === 0 ? (
                    <p className="text-sm text-gray-400">No ban history.</p>
                  ) : (
                    <div className="space-y-2">
                      {banHistory.map((b, i) => (
                        <div key={i} className="rounded-lg border border-gray-200 px-4 py-2.5 text-sm">
                          <div className="flex items-center justify-between">
                            <span className={`font-medium ${b.reason === 'Unban' ? 'text-emerald-700' : 'text-red-600'}`}>{b.reason === 'Unban' ? 'Unbanned' : 'Banned'}</span>
                            <span className="text-xs text-gray-400">{new Date(b.date).toLocaleString('vi-VN')}</span>
                          </div>
                          {b.reason && b.reason !== 'Unban' && <p className="mt-1 text-gray-600">{b.reason}</p>}
                          <p className="mt-1 text-xs text-gray-400">by {b.adminEmail}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </section>
              </div>
            )}
          </div>
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
