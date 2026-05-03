import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import type { SeatMapResponse, SeatMapDetailResponse, SeatMapStatsResponse } from '../types/seat'
import { getSeatMapsByEvent, getSeatMapById, getSeatMapStats } from '../api/seatApi'

export function SeatMapsPage() {
  const navigate = useNavigate()
  const [eventId, setEventId] = useState('')
  const [seatMaps, setSeatMaps] = useState<SeatMapResponse[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [searched, setSearched] = useState(false)
  const [detail, setDetail] = useState<SeatMapDetailResponse | null>(null)
  const [loadingDetail, setLoadingDetail] = useState(false)
  const [stats, setStats] = useState<SeatMapStatsResponse | null>(null)
  const [loadingStats, setLoadingStats] = useState(false)

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!eventId.trim()) return
    setLoading(true); setError(null); setSearched(true); setDetail(null); setStats(null)
    try { const r = await getSeatMapsByEvent(eventId.trim()); setSeatMaps(Array.isArray(r) ? r : []) }
    catch (err: any) { setError(err?.response?.data?.message || 'Failed to load seat maps.'); setSeatMaps([]) }
    finally { setLoading(false) }
  }

  const handleViewDetail = async (id: string) => {
    setLoadingDetail(true); setStats(null)
    try { setDetail(await getSeatMapById(id)) } catch { } finally { setLoadingDetail(false) }
  }

  const handleViewStats = async (id: string) => {
    setLoadingStats(true)
    try { setStats(await getSeatMapStats(id)) } catch { } finally { setLoadingStats(false) }
  }

  const statusBadge = (s: string) => s === 'Published' ? 'bg-emerald-500/15 text-emerald-400' : 'bg-slate-700/40 text-slate-400'

  return (
    <div className="fade-in space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1>Seat Maps</h1>
          <p className="text-sm text-slate-400">Search seat maps by Event ID.</p>
        </div>
      </div>

      <form className="flex gap-3" onSubmit={handleSearch}>
        <input className="flex-1" placeholder="Enter Event ID (GUID)..." value={eventId} onChange={e => setEventId(e.target.value)} />
        <button className="rounded-xl bg-indigo-500 px-5 py-2.5 text-sm font-semibold text-white hover:bg-indigo-400 transition-colors" type="submit">Search</button>
      </form>

      {error && <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-2.5 text-sm text-red-400">{error}</div>}

      {loading ? (
        <div className="space-y-3">{Array.from({ length: 3 }).map((_, i) => <div key={i} className="glass p-5"><div className="skeleton h-4 w-3/4 mb-2" /><div className="skeleton h-3 w-1/2" /></div>)}</div>
      ) : searched && seatMaps.length === 0 ? (
        <div className="glass p-8 text-center text-sm text-slate-400">No seat maps found for this Event ID.</div>
      ) : seatMaps.length > 0 && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[300px_1fr]">
          <div className="space-y-3">
            {seatMaps.map(sm => (
              <div key={sm.id} className={`glass p-4 cursor-pointer transition-all hover:border-indigo-500/30 ${detail?.id === sm.id ? 'border-indigo-500/40' : ''}`}
                onClick={() => { handleViewDetail(sm.id); handleViewStats(sm.id) }}>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-semibold text-sm">{sm.name}</h3>
                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase ${statusBadge(sm.status)}`}>{sm.status}</span>
                </div>
                <div className="flex items-center justify-between text-xs text-slate-500">
                  <span>v{sm.version}</span>
                  <span>{new Date(sm.createdAt).toLocaleDateString('en-US')}</span>
                </div>
                <button className="mt-3 w-full rounded-lg bg-indigo-500 py-1.5 text-xs font-semibold text-white hover:bg-indigo-400 transition-colors"
                  onClick={e => { e.stopPropagation(); navigate(`/events/${sm.eventId}/seat-design/${sm.id}`) }}>🎨 Design</button>
              </div>
            ))}
          </div>

          {(detail || loadingDetail) && (
            <div className="space-y-4">
              {loadingDetail ? (
                <div className="glass p-5"><div className="skeleton h-4 w-3/4 mb-2" /><div className="skeleton h-3 w-1/2" /></div>
              ) : detail && (
                <>
                  <div className="glass p-6">
                    <h2 className="mb-4">{detail.name}</h2>
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div className="flex justify-between"><span className="text-slate-400">Status</span><span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase ${statusBadge(detail.status)}`}>{detail.status}</span></div>
                      <div className="flex justify-between"><span className="text-slate-400">Version</span><span>{detail.version}</span></div>
                      <div className="flex justify-between"><span className="text-slate-400">Sections</span><span>{detail.sections?.length ?? 0}</span></div>
                      <div className="flex justify-between"><span className="text-slate-400">Objects</span><span>{detail.objects?.length ?? 0}</span></div>
                    </div>

                    {detail.sections && detail.sections.length > 0 && (
                      <div className="mt-4 space-y-2">
                        <h3 className="text-sm font-semibold text-slate-300">Sections</h3>
                        {detail.sections.map(sec => (
                          <div key={sec.id} className="rounded-lg border border-slate-700/30 bg-slate-900/40 p-3">
                            <div className="flex justify-between text-sm"><strong>{sec.label}</strong><span className="text-slate-500">{sec.sectionType}</span></div>
                            {sec.rows && sec.rows.length > 0 && (
                              <div className="mt-2 space-y-1">{sec.rows.map(row => <div key={row.id} className="text-xs text-slate-400">Row {row.label} — {row.seats?.length ?? 0} seats</div>)}</div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {loadingStats ? <div className="glass p-5"><div className="skeleton h-4 w-3/4" /></div>
                  : stats && (
                    <div className="glass p-6">
                      <h3 className="mb-3 text-sm font-semibold">Statistics</h3>
                      <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
                        {[
                          { label: 'Total', value: stats.totalSeats, color: 'text-slate-200' },
                          { label: 'Available', value: stats.availableSeats, color: 'text-emerald-400' },
                          { label: 'Reserved', value: stats.reservedSeats, color: 'text-yellow-400' },
                          { label: 'Sold', value: stats.soldSeats, color: 'text-red-400' },
                          { label: 'Blocked', value: stats.blockedSeats, color: 'text-slate-500' },
                          { label: 'Sections', value: stats.totalSections, color: 'text-slate-200' },
                          { label: 'Rows', value: stats.totalRows, color: 'text-slate-200' },
                        ].map(s => (
                          <div key={s.label} className="rounded-lg border border-slate-700/30 bg-slate-900/40 p-3 text-center">
                            <div className={`text-xl font-bold ${s.color}`}>{s.value}</div>
                            <div className="text-[10px] text-slate-500 uppercase tracking-wider">{s.label}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
