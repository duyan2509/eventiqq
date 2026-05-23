import { useState, useEffect, useCallback } from 'react'
import { getAllEvents } from '../../api/eventApi'
import { acceptSubmission, rejectSubmission } from '../../api/submissionApi'
import type { EventQuickViewData } from '../../types/event'

const STATUS_TABS = ['All', 'Pending', 'Approved', 'Draft', 'Rejected'] as const
type StatusTab = typeof STATUS_TABS[number]

const PAGE_SIZE = 15

function statusBadge(status: string) {
  switch (status.toLowerCase()) {
    case 'approved': return 'bg-emerald-100 text-emerald-700'
    case 'pending':  return 'bg-amber-100 text-amber-700'
    case 'rejected': return 'bg-red-100 text-red-700'
    case 'published': return 'bg-blue-100 text-blue-700'
    default:         return 'bg-gray-100 text-gray-600'
  }
}

function formatDate(iso: string) {
  const d = new Date(iso)
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
}

type ActionModal = { eventId: string; name: string; mode: 'reject' | 'cancel' }

export function AdminEventsPage() {
  const [events, setEvents] = useState<EventQuickViewData[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<StatusTab>('All')
  const [searchQuery, setSearchQuery] = useState('')
  const [searchOrg, setSearchOrg] = useState('')
  const [appliedQuery, setAppliedQuery] = useState('')
  const [appliedOrg, setAppliedOrg] = useState('')
  const [actionModal, setActionModal] = useState<ActionModal | null>(null)
  const [actionMsg, setActionMsg] = useState('')
  const [actionLoading, setActionLoading] = useState<string | null>(null)

  const fetchEvents = useCallback(async (p: number, tab: StatusTab, q: string, org: string) => {
    setLoading(true)
    setError(null)
    try {
      const result = await getAllEvents({
        status: tab === 'All' ? undefined : tab,
        query: q || undefined,
        organizationName: org || undefined,
        page: p,
        size: PAGE_SIZE,
      })
      setEvents(result.data)
      setTotal(result.total)
    } catch {
      setError('Failed to load events.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchEvents(page, activeTab, appliedQuery, appliedOrg) }, [page, activeTab, appliedQuery, appliedOrg, fetchEvents])

  const handleTabChange = (tab: StatusTab) => { setActiveTab(tab); setPage(1) }

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    setAppliedQuery(searchQuery)
    setAppliedOrg(searchOrg)
    setPage(1)
  }

  const handleAccept = async (eventId: string) => {
    setActionLoading(eventId)
    setError(null)
    try {
      await acceptSubmission(eventId, {})
      fetchEvents(page, activeTab, appliedQuery, appliedOrg)
    } catch (e: unknown) {
      const err = e as { response?: { data?: { Message?: string; message?: string } } }
      setError(err?.response?.data?.Message || err?.response?.data?.message || 'Failed to approve event.')
    } finally {
      setActionLoading(null)
    }
  }

  const handleActionConfirm = async () => {
    if (!actionModal) return
    setActionLoading(actionModal.eventId)
    setError(null)
    try {
      await rejectSubmission(actionModal.eventId, { message: actionMsg || undefined })
      setActionModal(null)
      setActionMsg('')
      fetchEvents(page, activeTab, appliedQuery, appliedOrg)
    } catch (e: unknown) {
      const err = e as { response?: { data?: { Message?: string; message?: string } } }
      setError(err?.response?.data?.Message || err?.response?.data?.message || 'Action failed.')
    } finally {
      setActionLoading(null)
    }
  }

  const totalPages = Math.ceil(total / PAGE_SIZE)

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold text-gray-900">Event Management</h1>
        <p className="text-sm text-gray-500">Review, approve, or cancel event submissions.</p>
      </div>

      {/* Search bar */}
      <form className="flex gap-2" onSubmit={handleSearch}>
        <input
          className="flex-1 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder-gray-400 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-colors"
          placeholder="Search by event name..."
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
        />
        <input
          className="w-52 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder-gray-400 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-colors"
          placeholder="Filter by organizer..."
          value={searchOrg}
          onChange={e => setSearchOrg(e.target.value)}
        />
        <button
          type="submit"
          className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500 transition-colors"
        >
          Search
        </button>
      </form>

      {/* Status tabs */}
      <div className="flex flex-wrap items-center gap-1.5">
        {STATUS_TABS.map(tab => (
          <button
            key={tab}
            onClick={() => handleTabChange(tab)}
            className={`rounded-full px-4 py-1.5 text-[13px] font-medium transition-colors ${
              activeTab === tab
                ? 'bg-indigo-600 text-white'
                : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50 hover:text-gray-900'
            }`}
          >
            {tab}
          </button>
        ))}
        <span className="ml-auto text-sm text-gray-400">{total} event{total !== 1 ? 's' : ''}</span>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-600">
          {error}
        </div>
      )}

      {/* Table */}
      {loading ? (
        <div className="rounded-xl border border-gray-200 bg-white p-5 space-y-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-10 w-full animate-pulse rounded-lg bg-gray-100" />
          ))}
        </div>
      ) : (
        <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                  <th className="px-5 py-3">Event</th>
                  <th className="px-5 py-3">Organizer</th>
                  <th className="px-5 py-3">Start Date</th>
                  <th className="px-5 py-3">Province</th>
                  <th className="px-5 py-3">Status</th>
                  <th className="px-5 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {events.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-5 py-12 text-center text-gray-400">
                      No events found for this filter.
                    </td>
                  </tr>
                ) : events.map(evt => (
                  <tr key={evt.id} className="border-b border-gray-100 last:border-0 hover:bg-gray-50 transition-colors">
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-3">
                        {evt.eventBanner ? (
                          <img src={evt.eventBanner} className="h-9 w-14 flex-shrink-0 rounded object-cover" alt="" />
                        ) : (
                          <div className="h-9 w-14 flex-shrink-0 rounded bg-gray-100 flex items-center justify-center text-[10px] text-gray-400">
                            No img
                          </div>
                        )}
                        <span className="font-medium text-gray-900 line-clamp-1">{evt.name}</span>
                      </div>
                    </td>
                    <td className="px-5 py-3 text-gray-600 text-[13px]">{evt.organizationName || '—'}</td>
                    <td className="px-5 py-3 text-gray-500 text-[13px] whitespace-nowrap">{evt.start ? formatDate(evt.start) : '—'}</td>
                    <td className="px-5 py-3 text-gray-500 text-[13px]">{evt.provinceName || '—'}</td>
                    <td className="px-5 py-3">
                      <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold uppercase ${statusBadge(evt.status)}`}>
                        {evt.status}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-right">
                      {evt.status.toLowerCase() === 'pending' && (
                        <div className="flex items-center justify-end gap-2">
                          <button
                            disabled={actionLoading === evt.id}
                            onClick={() => handleAccept(evt.id)}
                            className="rounded-lg border border-emerald-200 px-3 py-1 text-xs font-medium text-emerald-700 hover:bg-emerald-50 transition-colors disabled:opacity-40"
                          >
                            {actionLoading === evt.id ? '…' : 'Approve'}
                          </button>
                          <button
                            disabled={actionLoading === evt.id}
                            onClick={() => { setActionModal({ eventId: evt.id, name: evt.name, mode: 'reject' }); setActionMsg('') }}
                            className="rounded-lg border border-red-200 px-3 py-1 text-xs font-medium text-red-600 hover:bg-red-50 transition-colors disabled:opacity-40"
                          >
                            Reject
                          </button>
                        </div>
                      )}
                      {evt.status.toLowerCase() === 'approved' && (
                        <button
                          disabled={actionLoading === evt.id}
                          onClick={() => { setActionModal({ eventId: evt.id, name: evt.name, mode: 'cancel' }); setActionMsg('') }}
                          className="rounded-lg border border-orange-200 px-3 py-1 text-xs font-medium text-orange-600 hover:bg-orange-50 transition-colors disabled:opacity-40"
                        >
                          Cancel
                        </button>
                      )}
                      {!['pending', 'approved'].includes(evt.status.toLowerCase()) && (
                        <span className="text-xs text-gray-300">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-3">
          <button
            disabled={page <= 1}
            onClick={() => setPage(p => p - 1)}
            className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm text-gray-600 disabled:opacity-30 hover:bg-gray-50 transition-colors"
          >
            ‹
          </button>
          <span className="text-sm text-gray-500">{page} / {totalPages}</span>
          <button
            disabled={page >= totalPages}
            onClick={() => setPage(p => p + 1)}
            className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm text-gray-600 disabled:opacity-30 hover:bg-gray-50 transition-colors"
          >
            ›
          </button>
        </div>
      )}

      {/* Reject / Cancel modal */}
      {actionModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/30"
          onClick={() => { setActionModal(null); setActionMsg('') }}
        >
          <div
            className="w-full max-w-md rounded-xl border border-gray-200 bg-white p-6 shadow-xl"
            onClick={e => e.stopPropagation()}
          >
            <h2 className="mb-1 text-base font-semibold text-gray-900">
              {actionModal.mode === 'cancel' ? 'Cancel Event' : 'Reject Event'}
            </h2>
            <p className="mb-4 text-sm text-gray-500">
              {actionModal.mode === 'cancel' ? 'Cancel' : 'Reject'}{' '}
              <strong className="text-gray-800">{actionModal.name}</strong>?
              {actionModal.mode === 'cancel' && (
                <span className="block mt-1 text-xs text-orange-600">This will revert the event to Draft status.</span>
              )}
            </p>
            <div className="mb-4">
              <label className="mb-1.5 block text-xs font-medium text-gray-600">Reason (optional)</label>
              <textarea
                value={actionMsg}
                onChange={e => setActionMsg(e.target.value)}
                rows={3}
                placeholder="Enter reason..."
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder-gray-400 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-colors resize-none"
              />
            </div>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => { setActionModal(null); setActionMsg('') }}
                className="rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-600 hover:bg-gray-50 transition-colors"
              >
                Close
              </button>
              <button
                disabled={!!actionLoading}
                onClick={handleActionConfirm}
                className={`rounded-lg px-4 py-2 text-sm font-semibold text-white transition-colors disabled:opacity-50 ${
                  actionModal.mode === 'cancel' ? 'bg-orange-500 hover:bg-orange-400' : 'bg-red-500 hover:bg-red-400'
                }`}
              >
                {actionLoading ? '…' : actionModal.mode === 'cancel' ? 'Cancel Event' : 'Reject'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
