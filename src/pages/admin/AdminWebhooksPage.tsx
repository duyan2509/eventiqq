import { useEffect, useState } from 'react'
import {
  getWebhookEvents,
  getWebhookEvent,
  type WebhookEventStatus,
  type WebhookEventSummary,
  type WebhookEventDetail,
} from '../../api/paymentApi'

const PAGE_SIZE = 20

const FILTERS: { label: string; value: WebhookEventStatus | undefined }[] = [
  { label: 'All', value: undefined },
  { label: 'Received', value: 'Received' },
  { label: 'Processed', value: 'Processed' },
  { label: 'Failed', value: 'Failed' },
  { label: 'Skipped', value: 'Skipped' },
]

const STATUS_BADGE: Record<WebhookEventStatus, string> = {
  Received: 'bg-blue-100 text-blue-700',
  Processed: 'bg-emerald-100 text-emerald-700',
  Failed: 'bg-red-100 text-red-700',
  Skipped: 'bg-gray-100 text-gray-600',
}

function StatusBadge({ status }: { status: WebhookEventStatus }) {
  return (
    <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold uppercase ${STATUS_BADGE[status]}`}>
      {status}
    </span>
  )
}

function fmt(iso: string | null): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleString('vi-VN', { hour12: false })
}

export function AdminWebhooksPage() {
  const [events, setEvents] = useState<WebhookEventSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [status, setStatus] = useState<WebhookEventStatus | undefined>(undefined)
  const [page, setPage] = useState(1)
  const [detail, setDetail] = useState<WebhookEventDetail | null>(null)
  const [detailLoading, setDetailLoading] = useState(false)

  const fetchEvents = async (p: number, s: WebhookEventStatus | undefined) => {
    setLoading(true); setError(null)
    try {
      const r = await getWebhookEvents(s, p, PAGE_SIZE)
      setEvents(r)
    } catch {
      setError('Failed to load webhook events.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchEvents(page, status) }, [page, status])

  const openDetail = async (id: string) => {
    setDetailLoading(true)
    try {
      setDetail(await getWebhookEvent(id))
    } catch {
      setError('Failed to load webhook detail.')
    } finally {
      setDetailLoading(false)
    }
  }

  // The list endpoint returns a plain array (no total). A full page implies a possible next one.
  const hasNext = events.length === PAGE_SIZE

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold text-gray-900">Stripe Webhooks</h1>
        <p className="text-sm text-gray-500">Audit log of every Stripe webhook received — trace failed deliveries and processing errors.</p>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {FILTERS.map(f => (
          <button
            key={f.label}
            onClick={() => { setStatus(f.value); setPage(1) }}
            className={`rounded-full px-3 py-1 text-[12px] font-medium transition-colors ${
              status === f.value
                ? 'bg-indigo-600 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-600">{error}</div>
      )}

      {loading ? (
        <div className="rounded-xl border border-gray-200 bg-white p-5 space-y-3">
          {Array.from({ length: 6 }).map((_, i) => <div key={i} className="h-10 w-full animate-pulse rounded-lg bg-gray-100" />)}
        </div>
      ) : events.length === 0 ? (
        <div className="rounded-xl border border-gray-200 bg-white p-10 text-center text-sm text-gray-400">
          No webhook events{status ? ` with status "${status}"` : ''}.
        </div>
      ) : (
        <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                  <th className="px-5 py-3">Status</th>
                  <th className="px-5 py-3">Event Type</th>
                  <th className="px-5 py-3">Stripe Event ID</th>
                  <th className="px-5 py-3 text-center">Attempts</th>
                  <th className="px-5 py-3">Received</th>
                  <th className="px-5 py-3">Error</th>
                </tr>
              </thead>
              <tbody>
                {events.map(e => (
                  <tr
                    key={e.id}
                    onClick={() => openDetail(e.id)}
                    className="cursor-pointer border-b border-gray-100 last:border-0 hover:bg-gray-50 transition-colors"
                  >
                    <td className="px-5 py-3"><StatusBadge status={e.status} /></td>
                    <td className="px-5 py-3 font-medium text-gray-900">{e.eventType}</td>
                    <td className="px-5 py-3 font-mono text-[12px] text-gray-500">{e.stripeEventId || '—'}</td>
                    <td className="px-5 py-3 text-center text-gray-700">{e.attemptCount}</td>
                    <td className="px-5 py-3 text-gray-600">{fmt(e.receivedAt)}</td>
                    <td className="px-5 py-3 max-w-xs truncate text-red-600">{e.error ?? ''}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {(page > 1 || hasNext) && (
        <div className="flex items-center justify-center gap-3">
          <button className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm text-gray-600 disabled:opacity-30 hover:bg-gray-50" disabled={page <= 1} onClick={() => setPage(page - 1)}>‹</button>
          <span className="text-sm text-gray-500">Page {page}</span>
          <button className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm text-gray-600 disabled:opacity-30 hover:bg-gray-50" disabled={!hasNext} onClick={() => setPage(page + 1)}>›</button>
        </div>
      )}

      {(detail || detailLoading) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4" onClick={() => setDetail(null)}>
          <div className="w-full max-w-2xl rounded-xl border border-gray-200 bg-white shadow-xl" onClick={e => e.stopPropagation()}>
            {detailLoading || !detail ? (
              <div className="p-10 text-center text-sm text-gray-400">Loading…</div>
            ) : (
              <>
                <div className="flex items-start justify-between border-b border-gray-100 px-6 py-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <StatusBadge status={detail.status} />
                      <h2 className="text-base font-semibold text-gray-900">{detail.eventType}</h2>
                    </div>
                    <p className="mt-1 font-mono text-[12px] text-gray-400">{detail.stripeEventId || '(no event id)'}</p>
                  </div>
                  <button className="text-gray-400 hover:text-gray-600" onClick={() => setDetail(null)}>✕</button>
                </div>
                <div className="max-h-[70vh] overflow-y-auto px-6 py-4 space-y-4">
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div><span className="text-gray-400">Attempts:</span> <span className="text-gray-800">{detail.attemptCount}</span></div>
                    <div><span className="text-gray-400">Received:</span> <span className="text-gray-800">{fmt(detail.receivedAt)}</span></div>
                    <div><span className="text-gray-400">Processed:</span> <span className="text-gray-800">{fmt(detail.processedAt)}</span></div>
                  </div>
                  {detail.error && (
                    <div>
                      <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-gray-500">Error</p>
                      <pre className="overflow-x-auto rounded-lg border border-red-200 bg-red-50 p-3 text-[12px] text-red-700 whitespace-pre-wrap">{detail.error}</pre>
                    </div>
                  )}
                  <div>
                    <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-gray-500">Payload</p>
                    <pre className="overflow-x-auto rounded-lg border border-gray-200 bg-gray-50 p-3 text-[12px] text-gray-700 whitespace-pre-wrap">{detail.payload}</pre>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
