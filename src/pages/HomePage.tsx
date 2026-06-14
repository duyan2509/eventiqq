import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import type { EventQuickViewData, EventDetail } from '../types/event'
import type { SessionResponse, LegendResponse } from '../types/index'
import { getAllEvents, getEventDetail } from '../api/eventApi'
import { getSessions } from '../api/sessionApi'
import { getLegends } from '../api/legendApi'
import { formatPrice } from '../utils/format'

type DetailTab = 'info' | 'sessions' | 'legends'

export function HomePage() {
  const navigate = useNavigate()
  const [events, setEvents] = useState<EventQuickViewData[]>([])
  const [loading, setLoading] = useState(true)

  const [selectedEvent, setSelectedEvent] = useState<EventDetail | null>(null)
  const [loadingDetail, setLoadingDetail] = useState(false)
  const [detailTab, setDetailTab] = useState<DetailTab>('info')
  const [sessions, setSessions] = useState<SessionResponse[]>([])
  const [legends, setLegends] = useState<LegendResponse[]>([])

  useEffect(() => {
    getAllEvents({ page: 1, size: 6, status: 'Approved' })
      .then(r => setEvents(r.data))
      .catch(() => { })
      .finally(() => setLoading(false))
  }, [])

  const handleDetail = async (id: string) => {
    setLoadingDetail(true); setDetailTab('info')
    try { setSelectedEvent(await getEventDetail(id)) } catch { }
    finally { setLoadingDetail(false) }
  }

  const fetchSessions = async (id: string) => { try { const r = await getSessions(id); setSessions(r.data) } catch { } }
  const fetchLegends = async (id: string) => { try { const r = await getLegends(id); setLegends(r.data) } catch { } }

  const handleDetailTab = (t: DetailTab) => {
    if (!selectedEvent) return; setDetailTab(t)
    if (t === 'sessions') fetchSessions(selectedEvent.id)
    else if (t === 'legends') fetchLegends(selectedEvent.id)
  }

  const formatDate = (d: string) => { try { return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) } catch { return d } }
  const statusColor = (s: string) => s === 'Published' ? 'bg-emerald-500/15 text-emerald-400' : s === 'Cancelled' ? 'bg-red-500/15 text-red-400' : s === 'Approved' ? 'bg-blue-500/15 text-blue-400' : 'bg-slate-700/40 text-slate-400'
  const detailTabs: { key: DetailTab; label: string }[] = [{ key: 'info', label: 'Info' }, { key: 'sessions', label: 'Sessions' }, { key: 'legends', label: 'Pricing Tiers' }]

  return (
    <div className="fade-in">
      {/* ── Detail Modal ── */}
      {(selectedEvent || loadingDetail) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={() => setSelectedEvent(null)}>
          <div className="glass w-full max-w-4xl max-h-[90vh] overflow-y-auto fade-in" onClick={e => e.stopPropagation()}>
            {loadingDetail ? <div className="flex justify-center p-10"><div className="spinner" /></div> : selectedEvent && (<>
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
                <div className="flex gap-1 rounded-full bg-slate-900/80 p-1 mb-5">
                  {detailTabs.map(t => <button key={t.key} className={`flex-1 rounded-full py-1.5 text-xs font-medium transition-colors ${detailTab === t.key ? 'bg-indigo-500/20 text-indigo-300' : 'text-slate-400 hover:text-slate-300'}`} onClick={() => handleDetailTab(t.key)}>{t.label}</button>)}
                </div>

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

                {detailTab === 'sessions' && (<>
                  {sessions.length === 0 ? <p className="text-sm text-slate-400">No sessions available.</p> : (
                    <div className="space-y-2">{sessions.map(s => (
                      <div key={s.id} className="flex items-center justify-between rounded-xl border border-slate-700/30 bg-slate-900/40 px-4 py-3 text-sm">
                        <div>
                          <strong className="text-slate-200">{s.name}</strong>
                          <p className="text-xs text-slate-500 mt-0.5">📅 {formatDate(s.startTime)} → {formatDate(s.endTime)}</p>
                          {s.chartName && <p className="text-xs text-indigo-400 mt-0.5">🗺 {s.chartName}</p>}
                        </div>
                        <button
                          className="rounded-lg bg-indigo-500 px-3 py-1.5 text-xs font-semibold text-white hover:bg-indigo-400 transition-colors flex-shrink-0"
                          onClick={() => navigate(`/sessions/${s.id}/book`)}
                        >
                          Book Seats
                        </button>
                      </div>
                    ))}</div>
                  )}
                </>)}

                {detailTab === 'legends' && (<>
                  {legends.length === 0 ? <p className="text-sm text-slate-400">No pricing tiers available.</p> : (
                    <div className="space-y-2">{legends.map(l => (
                      <div key={l.id} className="flex items-center justify-between rounded-xl border border-slate-700/30 bg-slate-900/40 px-4 py-3 text-sm">
                        <div className="flex items-center gap-3">
                          <span className="h-5 w-5 rounded-full flex-shrink-0 border border-white/10" style={{ background: l.color }} />
                          <strong className="text-slate-200">{l.name}</strong>
                        </div>
                        <span className="font-medium text-emerald-400">{formatPrice(l.price)}</span>
                      </div>
                    ))}</div>
                  )}
                </>)}
              </div>
            </>)}
          </div>
        </div>
      )}

      {/* Hero */}
      <section className="relative overflow-hidden rounded-2xl border border-slate-800/60 bg-gradient-to-br from-indigo-950/40 via-slate-900/60 to-slate-950 p-12 text-center mb-10">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(99,102,241,0.12),transparent_70%)]" />
        <div className="relative z-10">
          <h1 className="text-4xl font-extrabold tracking-tight text-white sm:text-5xl">Discover Amazing Events</h1>
          <p className="mx-auto mt-4 max-w-xl text-lg text-slate-400">Browse, create, and manage events with a powerful collaborative seat map designer.</p>
          <div className="mt-8 flex justify-center gap-3">
            <Link to="/events" className="rounded-full bg-indigo-500 px-6 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-indigo-400">
              Browse Events
            </Link>
            <Link to="/switch-role" className="rounded-full border border-indigo-500/40 px-6 py-2.5 text-sm font-semibold text-indigo-300 transition-colors hover:bg-indigo-500/10">
              + Create Organization
            </Link>
            <Link to="/auth" className="rounded-full border border-slate-600 px-6 py-2.5 text-sm font-semibold text-slate-300 transition-colors hover:border-slate-400 hover:text-white">
              Get Started
            </Link>
          </div>
        </div>
      </section>

      {/* Latest Events */}
      <section>
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-xl font-bold">Latest Events</h2>
          <Link to="/events" className="text-sm text-indigo-400 hover:text-indigo-300 transition-colors">View all →</Link>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="glass p-5 space-y-3">
                <div className="skeleton h-4 w-3/4" />
                <div className="skeleton h-3 w-1/2" />
                <div className="skeleton h-3 w-1/3" />
              </div>
            ))}
          </div>
        ) : events.length === 0 ? (
          <div className="glass p-8 text-center text-sm text-slate-400">No events yet. Be the first to create one!</div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {events.map(ev => (
              <div key={ev.id} className="glass group p-5 transition-all hover:border-indigo-500/30 cursor-pointer" onClick={() => handleDetail(ev.id)}>
                <div className="flex items-center justify-between mb-2">
                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase ${ev.status === 'Published' ? 'bg-emerald-500/15 text-emerald-400' : 'bg-slate-700/40 text-slate-400'}`}>
                    {ev.status}
                  </span>
                  {ev.provinceName && <span className="text-xs text-slate-500">📍 {ev.provinceName}</span>}
                </div>
                <h3 className="font-semibold text-slate-100 group-hover:text-indigo-300 transition-colors">{ev.name}</h3>
                <div className="mt-2 flex items-center justify-between text-xs text-slate-500">
                  <span> {formatDate(ev.start)}</span>
                  {ev.lowestPrice !== undefined && ev.lowestPrice !== null && (
                    <span className="font-medium text-emerald-400">{formatPrice(ev.lowestPrice)}</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
