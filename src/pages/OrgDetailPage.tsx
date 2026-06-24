import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'

import type { EventQuickViewData, EventDetail } from '../types/event'
import type { OrganizationDetail } from '../types/organization'
import type { SessionResponse, LegendResponse } from '../types/index'
import { getAllEvents, getEventDetail } from '../api/eventApi'
import { getOrganizationById } from '../api/organizationApi'
import { getSessions } from '../api/sessionApi'
import { getLegends } from '../api/legendApi'
import { formatPrice } from '../utils/format'

type DetailTab = 'info' | 'sessions' | 'legends'

export function OrgDetailPage() {
  const { orgId } = useParams<{ orgId: string }>()
  const navigate = useNavigate()

  const [org, setOrg] = useState<OrganizationDetail | null>(null)
  const [events, setEvents] = useState<EventQuickViewData[]>([])
  const [loading, setLoading] = useState(true)
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [error, setError] = useState<string | null>(null)

  const [selectedEvent, setSelectedEvent] = useState<EventDetail | null>(null)
  const [loadingDetail, setLoadingDetail] = useState(false)
  const [detailTab, setDetailTab] = useState<DetailTab>('info')
  const [sessions, setSessions] = useState<SessionResponse[]>([])
  const [legends, setLegends] = useState<LegendResponse[]>([])

  useEffect(() => {
    if (!orgId) return
    getOrganizationById(orgId).then(setOrg).catch(() => setError('Failed to load organization.'))
  }, [orgId])

  useEffect(() => {
    if (!orgId) return
    setLoading(true)
    getAllEvents({ organizationId: orgId, status: 'Approved', page, size: 12 })
      .then(r => { setEvents(r.data); setTotal(r.total) })
      .catch(() => setError('Failed to load events.'))
      .finally(() => setLoading(false))
  }, [orgId, page])

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

  const formatDate = (d: string) => { try { return new Date(d).toLocaleDateString('vi-VN', { month: 'short', day: 'numeric', year: 'numeric' }) } catch { return d } }
  const statusColor = (s: string) => s === 'Published' ? 'bg-emerald-500/15 text-emerald-400' : s === 'Cancelled' ? 'bg-red-500/15 text-red-400' : s === 'Approved' ? 'bg-blue-500/15 text-blue-400' : s === 'Pending' ? 'bg-amber-500/15 text-amber-400' : 'bg-slate-700/40 text-slate-400'
  const totalPages = Math.ceil(total / 12)
  const detailTabs: { key: DetailTab; label: string }[] = [{ key: 'info', label: 'Info' }, { key: 'sessions', label: 'Sessions' }, { key: 'legends', label: 'Pricing Tiers' }]

  return (
    <div className="fade-in space-y-6">
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
                          <strong className="text-slate-200">{s.name as string}</strong>
                          <p className="text-xs text-slate-500 mt-0.5">📅 {formatDate(s.startTime as string)} → {formatDate(s.endTime as string)}</p>
                          {s.chartName ? <p className="text-xs text-indigo-400 mt-0.5">🗺 {s.chartName as string}</p> : null}
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
                          <span className="h-5 w-5 rounded-full flex-shrink-0 border border-white/10" style={{ background: l.color as string }} />
                          <div><strong className="text-slate-200">{l.name as string}</strong></div>
                        </div>
                        <span className="font-medium text-emerald-400">{formatPrice(l.price as number)}</span>
                      </div>
                    ))}</div>
                  )}
                </>)}
              </div>
            </>)}
          </div>
        </div>
      )}

      {/* ── Org Header ── */}
      <div className="glass p-6 flex items-start gap-4">
        <div className="flex h-16 w-16 flex-shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500/30 to-violet-500/20 text-3xl">🏛</div>
        <div className="min-w-0">
          <h1 className="truncate">{org?.name || 'Organization'}</h1>
          {org?.description && <p className="mt-1 text-sm text-slate-400">{org.description}</p>}
          {org && <p className="mt-2 text-xs text-slate-500">👥 {org.size} member{org.size === 1 ? '' : 's'}</p>}
        </div>
      </div>

      {error && <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-2.5 text-sm text-red-400">{error}</div>}

      <h2 className="text-base font-semibold text-slate-200">Events</h2>

      {/* ── Event Grid ── */}
      {loading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="glass overflow-hidden">
              <div className="skeleton h-32 w-full" />
              <div className="p-4"><div className="skeleton h-4 w-3/4 mb-2" /><div className="skeleton h-3 w-1/2" /></div>
            </div>
          ))}
        </div>
      ) : events.length === 0 ? (
        <div className="glass p-10 text-center">
          <div className="text-4xl mb-3">🎪</div>
          <p className="text-sm text-slate-400">This organization has no published events yet.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {events.map(ev => (
            <div key={ev.id} className="glass overflow-hidden cursor-pointer transition-all hover:border-indigo-500/30 hover:-translate-y-0.5" onClick={() => handleDetail(ev.id)}>
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
                    <span className="font-semibold text-emerald-400">{formatPrice(ev.lowestPrice)}</span>
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
