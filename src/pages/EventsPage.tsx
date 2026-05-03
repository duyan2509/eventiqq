import { useEffect, useState } from 'react'

import type { EventQuickViewData, EventDetail } from '../types/event'
import type { SessionResponse, LegendResponse } from '../types/index'
import type { SeatMapResponse, SeatMapDetailResponse, SeatMapStatsResponse } from '../types/seat'
import { getSeatMapsByEvent, getSeatMapById, getSeatMapStats } from '../api/seatApi'
import { getAllEvents, getEventDetail } from '../api/eventApi'
import { getSessions } from '../api/sessionApi'
import { getLegends } from '../api/legendApi'

type DetailTab = 'info' | 'sessions' | 'legends' | 'seatmaps'

export function EventsPage() {
  const [events, setEvents] = useState<EventQuickViewData[]>([])
  const [loading, setLoading] = useState(true)
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [error, setError] = useState<string | null>(null)

  // Filters
  const [searchQuery, setSearchQuery] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [filterProvince] = useState('')

  const [selectedEvent, setSelectedEvent] = useState<EventDetail | null>(null)
  const [loadingDetail, setLoadingDetail] = useState(false)
  const [detailTab, setDetailTab] = useState<DetailTab>('info')

  const [sessions, setSessions] = useState<SessionResponse[]>([])
  const [legends, setLegends] = useState<LegendResponse[]>([])

  const [seatMaps, setSeatMaps] = useState<SeatMapResponse[]>([])
  const [loadingSeatMaps, setLoadingSeatMaps] = useState(false)
  const [seatMapDetail, setSeatMapDetail] = useState<SeatMapDetailResponse | null>(null)
  const [loadingSeatMapDetail, setLoadingSeatMapDetail] = useState(false)
  const [seatMapStats, setSeatMapStats] = useState<SeatMapStatsResponse | null>(null)
  const [loadingSeatMapStats, setLoadingSeatMapStats] = useState(false)

  const fetchEvents = async (p: number, resetPage = false) => {
    setLoading(true)
    const targetPage = resetPage ? 1 : p
    if (resetPage) setPage(1)
    try {
      const r = await getAllEvents({
        page: targetPage,
        size: 12,
        query: searchQuery || undefined,
        status: filterStatus || undefined,
        province: filterProvince || undefined
      })
      setEvents(r.data)
      setTotal(r.total)
    }
    catch { setError('Failed to load events.') }
    finally { setLoading(false) }
  }

  useEffect(() => { fetchEvents(page) }, [page])

  const handleFilter = (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    fetchEvents(1, true)
  }

  const handleDetail = async (id: string) => {
    setLoadingDetail(true); setDetailTab('info')
    try { setSelectedEvent(await getEventDetail(id)) } catch { }
    finally { setLoadingDetail(false) }
  }

  const fetchSessions = async (id: string) => { try { const r = await getSessions(id); setSessions(r.data) } catch { } }
  const fetchLegends = async (id: string) => { try { const r = await getLegends(id); setLegends(r.data) } catch { } }
  const fetchSeatMaps = async (eventId: string) => { setLoadingSeatMaps(true); setSeatMapDetail(null); setSeatMapStats(null); try { const r = await getSeatMapsByEvent(eventId); setSeatMaps(Array.isArray(r) ? r : []) } catch { setSeatMaps([]) } finally { setLoadingSeatMaps(false) } }

  const handleViewSeatMapDetail = async (id: string) => { setLoadingSeatMapDetail(true); setSeatMapStats(null); try { setSeatMapDetail(await getSeatMapById(id)) } catch { } finally { setLoadingSeatMapDetail(false) } }
  const handleViewSeatMapStats = async (id: string) => { setLoadingSeatMapStats(true); try { setSeatMapStats(await getSeatMapStats(id)) } catch { } finally { setLoadingSeatMapStats(false) } }

  const handleDetailTab = (t: DetailTab) => {
    if (!selectedEvent) return; setDetailTab(t)
    if (t === 'sessions') fetchSessions(selectedEvent.id)
    else if (t === 'legends') fetchLegends(selectedEvent.id)
    else if (t === 'seatmaps') fetchSeatMaps(selectedEvent.id)
  }

  const formatDate = (d: string) => { try { return new Date(d).toLocaleDateString('vi-VN', { month: 'short', day: 'numeric', year: 'numeric' }) } catch { return d } }
  const statusColor = (s: string) => s === 'Published' ? 'bg-emerald-500/15 text-emerald-400' : s === 'Cancelled' ? 'bg-red-500/15 text-red-400' : s === 'Approved' ? 'bg-blue-500/15 text-blue-400' : s === 'Pending' ? 'bg-amber-500/15 text-amber-400' : 'bg-slate-700/40 text-slate-400'
  const totalPages = Math.ceil(total / 12)
  const detailTabs: { key: DetailTab; label: string }[] = [{ key: 'info', label: 'Info' }, { key: 'sessions', label: 'Sessions' }, { key: 'legends', label: 'Tickets' }, { key: 'seatmaps', label: 'Seat Maps' }]

  return (
    <div className="fade-in space-y-6">
      {/* ── Detail Modal (Public View) ── */}
      {(selectedEvent || loadingDetail) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={() => setSelectedEvent(null)}>
          <div className="glass w-full max-w-4xl max-h-[90vh] overflow-y-auto fade-in" onClick={e => e.stopPropagation()}>
            {loadingDetail ? <div className="flex justify-center p-10"><div className="spinner" /></div> : selectedEvent && (<>
              {/* Banner header */}
              <div className="relative h-40 w-full overflow-hidden rounded-t-2xl bg-gradient-to-br from-indigo-900/60 to-violet-900/40">
                {selectedEvent.eventBanner
                  ? <img src={selectedEvent.eventBanner} alt="banner" className="h-full w-full object-cover opacity-80" />
                  : <div className="flex h-full items-center justify-center text-4xl opacity-20">🎪</div>
                }
                <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/70 to-transparent" />
                <div className="absolute bottom-4 left-6 right-10">
                  <h2 className="text-xl font-bold text-white drop-shadow">{selectedEvent.name}</h2>
                  <span className={`mt-1 inline-block rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase ${statusColor(selectedEvent.status)}`}>{selectedEvent.status}</span>
                </div>
                <button className="absolute right-4 top-4 rounded-full bg-black/40 p-1.5 text-white/70 hover:bg-black/60 hover:text-white" onClick={() => setSelectedEvent(null)}>✕</button>
              </div>

              <div className="p-6">
                {/* Tabs */}
                <div className="flex gap-1 rounded-full bg-slate-900/80 p-1 mb-5">
                  {detailTabs.map(t => <button key={t.key} className={`flex-1 rounded-full py-1.5 text-xs font-medium transition-colors ${detailTab === t.key ? 'bg-indigo-500/20 text-indigo-300' : 'text-slate-400 hover:text-slate-300'}`} onClick={() => handleDetailTab(t.key)}>{t.label}</button>)}
                </div>

                {/* ── Info Tab ── */}
                {detailTab === 'info' && (<>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div className="flex justify-between"><span className="text-slate-400">Start</span><span>{formatDate(selectedEvent.startTime)}</span></div>
                    <div className="flex justify-between"><span className="text-slate-400">End</span><span>{formatDate(selectedEvent.endTime)}</span></div>
                    <div className="flex justify-between"><span className="text-slate-400">Location</span><span>{selectedEvent.detailAddress || '—'}</span></div>
                    <div className="flex justify-between"><span className="text-slate-400">Province</span><span>{selectedEvent.provinceName || '—'}</span></div>
                    <div className="flex justify-between"><span className="text-slate-400">Commune</span><span>{selectedEvent.communeName || '—'}</span></div>
                  </div>
                  {selectedEvent.description && <div className="mt-3 rounded-lg border border-slate-700/30 bg-slate-900/40 p-3 text-sm text-slate-300">{selectedEvent.description}</div>}
                </>)}

                {/* ── Sessions Tab ── */}
                {detailTab === 'sessions' && (<>
                  {sessions.length === 0 ? <p className="text-sm text-slate-400">No sessions available.</p> : (
                    <div className="space-y-2">{sessions.map(s => (
                      <div key={s.id} className="flex items-center justify-between rounded-xl border border-slate-700/30 bg-slate-900/40 px-4 py-3 text-sm">
                        <div>
                          <strong className="text-slate-200">{s.name}</strong>
                          <p className="text-xs text-slate-500 mt-0.5">📅 {formatDate(s.startTime)} → {formatDate(s.endTime)}</p>
                          {s.chartName && <p className="text-xs text-indigo-400 mt-0.5">🗺 {s.chartName}</p>}
                        </div>
                      </div>
                    ))}</div>
                  )}
                </>)}

                {/* ── Legends Tab ── */}
                {detailTab === 'legends' && (<>
                  {legends.length === 0 ? <p className="text-sm text-slate-400">No tickets available.</p> : (
                    <div className="space-y-2">{legends.map(l => (
                      <div key={l.id} className="flex items-center justify-between rounded-xl border border-slate-700/30 bg-slate-900/40 px-4 py-3 text-sm">
                        <div className="flex items-center gap-3">
                          <span className="h-5 w-5 rounded-full flex-shrink-0 border border-white/10" style={{ background: l.color }} />
                          <div>
                            <strong className="text-slate-200">{l.name}</strong>
                          </div>
                        </div>
                        <span className="font-medium text-emerald-400">{l.price === 0 ? 'Free' : `${l.price.toLocaleString('vi-VN')}₫`}</span>
                      </div>
                    ))}</div>
                  )}
                </>)}

                {/* ── Seat Maps Tab ── */}
                {detailTab === 'seatmaps' && (<>
                  {loadingSeatMaps ? <div className="skeleton h-20 w-full" /> : seatMaps.length === 0 ? (
                    <p className="text-sm text-slate-400">No seat maps for this event.</p>
                  ) : (
                    <div className="grid grid-cols-1 gap-4 lg:grid-cols-[260px_1fr]">
                      <div className="space-y-3">
                        {seatMaps.map(sm => (
                          <div key={sm.id} className={`rounded-xl border p-4 cursor-pointer transition-all hover:border-indigo-500/30 ${seatMapDetail?.id === sm.id ? 'border-indigo-500/40 bg-indigo-500/5' : 'border-slate-700/30 bg-slate-900/40'}`}
                            onClick={() => { handleViewSeatMapDetail(sm.id); handleViewSeatMapStats(sm.id) }}>
                            <div className="flex items-center justify-between mb-1.5">
                              <h4 className="font-semibold text-sm text-slate-200">{sm.name}</h4>
                            </div>
                            <div className="flex items-center justify-between text-xs text-slate-500">
                              <span>{new Date(sm.createdAt).toLocaleDateString('vi-VN')}</span>
                            </div>
                          </div>
                        ))}
                      </div>

                      {(seatMapDetail || loadingSeatMapDetail) && (
                        <div className="space-y-4">
                          {loadingSeatMapDetail ? <div className="rounded-xl border border-slate-700/30 bg-slate-900/40 p-5"><div className="skeleton h-4 w-3/4 mb-2" /><div className="skeleton h-3 w-1/2" /></div> : seatMapDetail && (<>
                            <div className="rounded-xl border border-slate-700/30 bg-slate-900/40 p-5">
                              <h3 className="mb-3 text-sm font-semibold">{seatMapDetail.name}</h3>
                              {seatMapDetail.sections && seatMapDetail.sections.length > 0 && (
                                <div className="space-y-2">
                                  {seatMapDetail.sections.map(sec => (
                                    <div key={sec.id} className="rounded-lg border border-slate-700/20 bg-slate-900/30 p-2.5">
                                      <div className="flex justify-between text-sm"><strong className="text-slate-200">{sec.label}</strong><span className="text-slate-500 text-xs">{sec.sectionType}</span></div>
                                      {sec.rows && sec.rows.length > 0 && <div className="mt-1.5 space-y-0.5">{sec.rows.map(row => <div key={row.id} className="text-xs text-slate-400">Row {row.label} — {row.seats?.length ?? 0} seats</div>)}</div>}
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>

                            {loadingSeatMapStats ? <div className="rounded-xl border border-slate-700/30 bg-slate-900/40 p-5"><div className="skeleton h-4 w-3/4" /></div>
                              : seatMapStats && (
                                <div className="rounded-xl border border-slate-700/30 bg-slate-900/40 p-5">
                                  <h3 className="mb-3 text-sm font-semibold">Availability</h3>
                                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                                    {[
                                      { label: 'Available', value: seatMapStats.availableSeats, color: 'text-emerald-400' },
                                      { label: 'Reserved', value: seatMapStats.reservedSeats, color: 'text-yellow-400' },
                                      { label: 'Sold', value: seatMapStats.soldSeats, color: 'text-red-400' },
                                      { label: 'Total', value: seatMapStats.totalSeats, color: 'text-slate-200' },
                                    ].map(s => (
                                      <div key={s.label} className="rounded-lg border border-slate-700/30 bg-slate-900/30 p-2.5 text-center">
                                        <div className={`text-lg font-bold ${s.color}`}>{s.value}</div>
                                        <div className="text-[10px] text-slate-500 uppercase tracking-wider">{s.label}</div>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}
                          </>)}
                        </div>
                      )}
                    </div>
                  )}
                </>)}
              </div>
            </>)}
          </div>
        </div>
      )}

      {/* ── Page Header & Filters ── */}
      <div className="glass p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1>Explore Events</h1>
          <p className="text-sm text-slate-400">Find the best event tailored for you.</p>
        </div>
        
        <form onSubmit={handleFilter} className="flex w-full sm:w-auto items-center gap-2">
          <input 
            placeholder="Search events..." 
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="flex-1 sm:w-48 rounded-lg border border-slate-700/50 bg-slate-900/60 px-3 py-2 text-sm focus:border-indigo-500/50 focus:outline-none placeholder:text-slate-500"
          />
          <select 
            value={filterStatus}
            onChange={e => setFilterStatus(e.target.value)}
            className="w-32 rounded-lg border border-slate-700/50 bg-slate-900/60 px-3 py-2 text-sm text-slate-300 focus:border-indigo-500/50 focus:outline-none"
          >
            <option value="">All Status</option>
            <option value="Approved">Available</option>
            <option value="Published">Published</option>
          </select>
          <button type="submit" className="rounded-lg bg-indigo-500 px-3 py-2 text-sm font-semibold text-white hover:bg-indigo-400 transition-colors">
            Search
          </button>
        </form>
      </div>

      {error && <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-2.5 text-sm text-red-400">{error}</div>}

      {/* ── Event Grid ── */}
      {loading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 12 }).map((_, i) => (
            <div key={i} className="glass overflow-hidden">
              <div className="skeleton h-32 w-full" />
              <div className="p-4"><div className="skeleton h-4 w-3/4 mb-2" /><div className="skeleton h-3 w-1/2" /></div>
            </div>
          ))}
        </div>
      ) : events.length === 0 ? (
        <div className="glass p-10 text-center">
          <div className="text-4xl mb-3">🎪</div>
          <p className="text-sm text-slate-400">No events found matching your criteria.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {events.map(ev => (
            <div key={ev.id} className="glass overflow-hidden cursor-pointer transition-all hover:border-indigo-500/30 hover:-translate-y-0.5" onClick={() => handleDetail(ev.id)}>
              {/* Banner */}
              <div className="relative h-36 bg-gradient-to-br from-indigo-900/60 to-violet-900/40 overflow-hidden">
                {ev.eventBanner
                  ? <img src={ev.eventBanner} alt={ev.name} className="h-full w-full object-cover" />
                  : <div className="flex h-full items-center justify-center text-3xl opacity-20">🎪</div>
                }
                <div className="absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-black/60 to-transparent" />
                <span className={`absolute top-3 right-3 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase backdrop-blur-sm ${statusColor(ev.status)}`}>{ev.status}</span>
                {ev.provinceName && <span className="absolute bottom-3 left-3 text-xs text-white/80">📍 {ev.provinceName}</span>}
              </div>
              <div className="p-4">
                <h3 className="text-sm font-semibold line-clamp-1">{ev.name}</h3>
                <div className="mt-2 flex items-center justify-between text-xs text-slate-500">
                  <span> {formatDate(ev.start)}</span>
                  {ev.lowestPrice !== undefined && ev.lowestPrice !== null && (
                    <span className="font-semibold text-emerald-400">{ev.lowestPrice === 0 ? 'Free' : `${ev.lowestPrice.toLocaleString('vi-VN')}₫`}</span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Pagination ── */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-3">
          <button className="rounded-lg border border-slate-700 px-3 py-1.5 text-sm text-slate-400 disabled:opacity-30 hover:border-slate-600" disabled={page <= 1} onClick={() => setPage(page - 1)}>‹</button>
          <span className="text-sm text-slate-400">{page} / {totalPages}</span>
          <button className="rounded-lg border border-slate-700 px-3 py-1.5 text-sm text-slate-400 disabled:opacity-30 hover:border-slate-600" disabled={page >= totalPages} onClick={() => setPage(page + 1)}>›</button>
        </div>
      )}
    </div>
  )
}
