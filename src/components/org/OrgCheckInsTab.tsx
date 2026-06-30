import { useState, useEffect, useCallback } from 'react'
import { getOrgCheckIns } from '../../api/ticketApi'
import type { OrgCheckInItem } from '../../api/ticketApi'

export function OrgCheckInsTab() {
  const [items, setItems] = useState<OrgCheckInItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      setItems(await getOrgCheckIns())
    } catch {
      setError('Failed to load check-in history.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  return (
    <div className="fade-in space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1>Check-ins</h1>
          <p className="text-sm text-slate-400">All ticket check-ins across your organization.</p>
        </div>
        <button
          onClick={load}
          disabled={loading}
          className="rounded-lg border border-slate-700 px-3 py-1.5 text-xs font-medium text-slate-300 hover:border-slate-600 hover:text-white transition-colors disabled:opacity-40"
        >
          {loading ? 'Loading…' : 'Refresh'}
        </button>
      </div>

      {error && (
        <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-2.5 text-sm text-red-400">{error}</div>
      )}

      {loading ? (
        <div className="glass p-6 space-y-3">
          {[...Array(5)].map((_, i) => <div key={i} className="skeleton h-8 w-full" />)}
        </div>
      ) : items.length === 0 ? (
        <div className="glass border-dashed p-12 text-center">
          <p className="text-sm text-slate-500">No check-ins yet.</p>
        </div>
      ) : (
        <div className="glass overflow-hidden rounded-2xl">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-800/60 text-left text-xs text-slate-500">
                  <th className="px-4 py-3 font-semibold">Event</th>
                  <th className="px-4 py-3 font-semibold">Session</th>
                  <th className="px-4 py-3 font-semibold">Seat</th>
                  <th className="px-4 py-3 font-semibold">Type</th>
                  <th className="px-4 py-3 font-semibold">Price</th>
                  <th className="px-4 py-3 font-semibold">Checked In At</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/40">
                {items.map(item => (
                  <tr key={item.ticketId} className="hover:bg-slate-800/20 transition-colors">
                    <td className="px-4 py-3 font-medium text-slate-200 max-w-[160px] truncate">{item.eventName}</td>
                    <td className="px-4 py-3 text-slate-400">{item.sessionName}</td>
                    <td className="px-4 py-3 font-mono text-slate-300">{item.seatLabel}</td>
                    <td className="px-4 py-3 text-slate-400">{item.legendName}</td>
                    <td className="px-4 py-3 text-slate-300">${item.price.toFixed(2)}</td>
                    <td className="px-4 py-3 text-slate-500 whitespace-nowrap">
                      {new Date(item.checkedInAt).toLocaleString('en-US')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="border-t border-slate-800/60 px-4 py-2.5 text-xs text-slate-500">
            {items.length} check-in{items.length !== 1 ? 's' : ''} total
          </div>
        </div>
      )}
    </div>
  )
}
