import { useEffect, useState } from 'react'
import type { EventQuickViewData, EventDetail } from '../../types/event'
import type { Province } from '../../api/addressApi'
import { getAllEvents, getEventDetail } from '../../api/eventApi'
import { getProvinces } from '../../api/addressApi'
import { CreateEventModal } from './CreateEventModal'
import { EventInfoTab } from './tabs/EventInfoTab'
import { EventChartsTab } from './tabs/EventChartsTab'
import { EventSessionsTab } from './tabs/EventSessionsTab'
import { EventLegendsTab } from './tabs/EventLegendsTab'
import { EventSubmissionsTab } from './tabs/EventSubmissionsTab'
import { formatDate, formatPrice, statusColor } from '../../utils/format'

type DetailTab = 'info' | 'charts' | 'sessions' | 'legends' | 'submissions'

const DETAIL_TABS: { key: DetailTab; label: string }[] = [
  { key: 'info', label: 'Info' },
  { key: 'legends', label: 'Legends' },
  { key: 'charts', label: 'Charts' },
  { key: 'sessions', label: 'Sessions' },
  { key: 'submissions', label: 'Submissions' },
]

export function OrgEventsTab({ orgId, canEdit, isDesigner, isOrg }: { orgId: string; canEdit: boolean; isDesigner?: boolean; isOrg?: boolean }) {
  const [events, setEvents] = useState<EventQuickViewData[]>([])
  const [loading, setLoading] = useState(true)
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [error, setError] = useState<string | null>(null)

  const [showCreate, setShowCreate] = useState(false)
  const [provinces, setProvinces] = useState<Province[]>([])

  const [selectedEvent, setSelectedEvent] = useState<EventDetail | null>(null)
  const [loadingDetail, setLoadingDetail] = useState(false)
  const [detailTab, setDetailTab] = useState<DetailTab>('info')

  const totalPages = Math.ceil(total / 12)

  const fetchEvents = async (p: number) => {
    setLoading(true)
    try { const r = await getAllEvents({ organizationId: orgId, page: p, size: 12 }); setEvents(r.data); setTotal(r.total) }
    catch { setError('Failed to load events.') }
    finally { setLoading(false) }
  }

  useEffect(() => { fetchEvents(page) }, [page, orgId])
  useEffect(() => { getProvinces().then(setProvinces).catch(() => {}) }, [])

  const handleDetail = async (id: string) => {
    setLoadingDetail(true); setDetailTab('info')
    try { setSelectedEvent(await getEventDetail(id)) } catch { }
    finally { setLoadingDetail(false) }
  }

  const refreshSelectedEvent = async () => {
    if (!selectedEvent) return
    try { setSelectedEvent(await getEventDetail(selectedEvent.id)) } catch {}
  }

  const handleClose = () => setSelectedEvent(null)

  return (
    <div className="fade-in space-y-6">

      {/* ── Detail Modal ── */}
      {(selectedEvent || loadingDetail) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={handleClose}>
          <div className="glass w-full max-w-4xl max-h-[90vh] overflow-y-auto fade-in" onClick={e => e.stopPropagation()}>
            {loadingDetail
              ? <div className="flex justify-center p-10"><div className="spinner" /></div>
              : selectedEvent && (<>
                <div className="relative h-40 w-full overflow-hidden rounded-t-2xl bg-gradient-to-br from-indigo-900/60 to-violet-900/40">
                  {selectedEvent.eventBanner
                    ? <img src={selectedEvent.eventBanner} alt="banner" className="h-full w-full object-cover opacity-80" />
                    : <div className="flex h-full items-center justify-center text-4xl opacity-20">🎪</div>}
                  <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/70 to-transparent" />
                  <div className="absolute bottom-4 left-6 right-10">
                    <h2 className="text-xl font-bold text-white drop-shadow">{selectedEvent.name}</h2>
                    <span className={`mt-1 inline-block rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase ${statusColor(selectedEvent.status)}`}>{selectedEvent.status}</span>
                  </div>
                  <button className="absolute right-4 top-4 rounded-full bg-black/40 p-1.5 text-white/70 hover:bg-black/60 hover:text-white" onClick={handleClose}>✕</button>
                </div>

                <div className="p-6">
                  <div className="flex gap-1 rounded-full bg-slate-900/80 p-1 mb-5">
                    {DETAIL_TABS.map(t => (
                      <button key={t.key} className={`flex-1 rounded-full py-1.5 text-xs font-medium transition-colors ${detailTab === t.key ? 'bg-indigo-500/20 text-indigo-300' : 'text-slate-400 hover:text-slate-300'}`} onClick={() => setDetailTab(t.key)}>{t.label}</button>
                    ))}
                  </div>

                  {detailTab === 'info' && <EventInfoTab event={selectedEvent} onUpdated={ev => { setSelectedEvent(ev); fetchEvents(page) }} canEdit={canEdit} />}
                  {detailTab === 'charts' && <EventChartsTab eventId={selectedEvent.id} orgId={orgId} onClose={handleClose} canEdit={canEdit} isDesigner={isDesigner} eventStatus={selectedEvent.status} />}
                  {detailTab === 'sessions' && <EventSessionsTab eventId={selectedEvent.id} orgId={orgId} canEdit={canEdit} eventStatus={selectedEvent.status} />}
                  {detailTab === 'legends' && <EventLegendsTab eventId={selectedEvent.id} orgId={orgId} canEdit={canEdit} eventStatus={selectedEvent.status} />}
                  {detailTab === 'submissions' && <EventSubmissionsTab event={selectedEvent} orgId={orgId} onRefreshList={() => { fetchEvents(page); refreshSelectedEvent() }} isOrg={isOrg} />}
                </div>
              </>)}
          </div>
        </div>
      )}

      {/* ── Create Modal ── */}
      {showCreate && (
        <CreateEventModal
          orgId={orgId}
          provinces={provinces}
          onCreated={() => { setShowCreate(false); fetchEvents(1); setPage(1) }}
          onClose={() => setShowCreate(false)}
        />
      )}

      {/* ── Page Header ── */}
      <div className="flex items-center justify-between">
        <div>
          <h1>Events</h1>
          <p className="text-sm text-slate-400">Browse and manage events.</p>
        </div>
        {canEdit && <button className="rounded-xl bg-indigo-500 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-400 transition-colors" onClick={() => setShowCreate(true)}>+ Create Event</button>}
      </div>

      {error && <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-2.5 text-sm text-red-400">{error}</div>}

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
          <p className="text-sm text-slate-400">No events found. Create your first event!</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {events.map(ev => (
            <div key={ev.id} className="glass overflow-hidden cursor-pointer transition-all hover:border-indigo-500/30 hover:-translate-y-0.5" onClick={() => handleDetail(ev.id)}>
              <div className="relative h-36 bg-gradient-to-br from-indigo-900/60 to-violet-900/40 overflow-hidden">
                {ev.eventBanner
                  ? <img src={ev.eventBanner} alt={ev.name} className="h-full w-full object-cover" />
                  : <div className="flex h-full items-center justify-center text-3xl opacity-20">🎪</div>}
                <div className="absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-black/60 to-transparent" />
                <span className={`absolute top-3 right-3 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase backdrop-blur-sm ${statusColor(ev.status)}`}>{ev.status}</span>
                {ev.provinceName && <span className="absolute bottom-3 left-3 text-xs text-white/80">📍 {ev.provinceName}</span>}
              </div>
              <div className="p-4">
                <h3 className="text-sm font-semibold line-clamp-1">{ev.name}</h3>
                <div className="mt-2 flex items-center justify-between text-xs text-slate-500">
                  <span>{formatDate(ev.start)}</span>
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
