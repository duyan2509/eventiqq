import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ConfigProvider, DatePicker, Select, message, theme } from 'antd'
import dayjs, { type Dayjs } from 'dayjs'

import type { EventQuickViewData, EventDetail } from '../types/event'
import type { SessionResponse, LegendResponse } from '../types/index'
import { getAllEvents, getEventDetail } from '../api/eventApi'
import { getProvinces, type Province } from '../api/addressApi'
import { getSessions } from '../api/sessionApi'
import { getLegends } from '../api/legendApi'
import { formatPrice } from '../utils/format'
import { getAccessToken } from '../store/authStore'

type DetailTab = 'info' | 'sessions' | 'legends'

// Shared dark theme for the antd controls in the search bar (transparent so they blend into the pill).
const antdTheme = {
  algorithm: theme.darkAlgorithm,
  token: { colorPrimary: '#6366f1', colorBgContainer: 'transparent', colorBorder: 'transparent', fontFamily: 'inherit' },
}

export function EventsPage() {
  const navigate = useNavigate()
  const [events, setEvents] = useState<EventQuickViewData[]>([])
  const [loading, setLoading] = useState(true)
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [error, setError] = useState<string | null>(null)

  // Filters
  const [searchQuery, setSearchQuery] = useState('')
  const [filterProvince, setFilterProvince] = useState('')
  const [startFrom, setStartFrom] = useState('')
  const [startTo, setStartTo] = useState('')

  const [selectedEvent, setSelectedEvent] = useState<EventDetail | null>(null)
  const [loadingDetail, setLoadingDetail] = useState(false)
  const [detailTab, setDetailTab] = useState<DetailTab>('info')

  const [sessions, setSessions] = useState<SessionResponse[]>([])
  const [legends, setLegends] = useState<LegendResponse[]>([])

  const [provinces, setProvinces] = useState<Province[]>([])
  // Sort by event start_time: false = soonest first (ASC), true = latest first (DESC)
  const [sortNewest, setSortNewest] = useState(true)

  const fetchEvents = async (p: number, resetPage = false, newest = sortNewest) => {
    setLoading(true)
    const targetPage = resetPage ? 1 : p
    if (resetPage) setPage(1)
    try {
      const r = await getAllEvents({
        page: targetPage,
        size: 12,
        query: searchQuery || undefined,
        status: 'Approved',
        province: filterProvince || undefined,
        startFrom: startFrom || undefined,
        // include the whole selected end day
        startTo: startTo ? `${startTo}T23:59:59` : undefined,
        newest
      })
      setEvents(r.data)
      setTotal(r.total)
    }
    catch { setError('Failed to load events.') }
    finally { setLoading(false) }
  }

  useEffect(() => { fetchEvents(page) }, [page])
  useEffect(() => { getProvinces().then(setProvinces).catch(() => {}) }, [])

  const handleFilter = (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    fetchEvents(1, true)
  }

  const handleSort = (newest: boolean) => {
    setSortNewest(newest)
    fetchEvents(1, true, newest)
  }

  const hasActiveFilters = !!(searchQuery || filterProvince || startFrom || startTo)
  const clearFilters = () => {
    setSearchQuery(''); setFilterProvince(''); setStartFrom(''); setStartTo('')
    fetchEvents(1, true)
  }

  const dateRange: [Dayjs | null, Dayjs | null] = [startFrom ? dayjs(startFrom) : null, startTo ? dayjs(startTo) : null]
  const handleDateRange = (vals: [Dayjs | null, Dayjs | null] | null) => {
    setStartFrom(vals?.[0] ? vals[0].format('YYYY-MM-DD') : '')
    setStartTo(vals?.[1] ? vals[1].format('YYYY-MM-DD') : '')
  }

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
                    <button
                      className="col-span-2 flex items-center justify-between rounded-lg border border-slate-700/30 bg-slate-900/40 px-3 py-2 text-left hover:border-indigo-500/40 transition-colors"
                      onClick={() => navigate(`/org/${selectedEvent.organizationId}`)}
                    >
                      <span className="text-slate-400">Organizer</span>
                      <span className="text-indigo-300">View organization →</span>
                    </button>
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
                        {new Date(s.endTime) >= new Date() && (
                          <button
                            className="rounded-lg bg-indigo-500 px-3 py-1.5 text-xs font-semibold text-white hover:bg-indigo-400 transition-colors flex-shrink-0"
                            onClick={() => {
                              if (!getAccessToken()) { message.warning('Please log in to book seats'); return }
                              navigate(`/sessions/${s.id}/book`)
                            }}
                          >
                            Book Seats
                          </button>
                        )}
                      </div>
                    ))}</div>
                  )}
                </>)}

                {/* ── Legends Tab ── */}
                {detailTab === 'legends' && (<>
                  {legends.length === 0 ? <p className="text-sm text-slate-400">No pricing tiers available.</p> : (
                    <div className="space-y-2">{legends.map(l => (
                      <div key={l.id} className="flex items-center justify-between rounded-xl border border-slate-700/30 bg-slate-900/40 px-4 py-3 text-sm">
                        <div className="flex items-center gap-3">
                          <span className="h-5 w-5 rounded-full flex-shrink-0 border border-white/10" style={{ background: l.color }} />
                          <div>
                            <strong className="text-slate-200">{l.name}</strong>
                          </div>
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

      {/* ── Explore Header & Search ── */}
      <div className="space-y-4">
        {hasActiveFilters && (
          <div className="flex justify-end">
            <button type="button" onClick={clearFilters} className="flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-medium text-slate-400 transition-colors hover:border-white/20 hover:text-slate-200">
              <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6 6 18M6 6l12 12" strokeLinecap="round" /></svg>
              Clear filters
            </button>
          </div>
        )}

        {/* segmented search bar */}
        <form
          onSubmit={handleFilter}
          className="flex flex-col gap-1 rounded-3xl border border-white/10 bg-slate-900/60 p-2 shadow-xl shadow-black/30 backdrop-blur-xl md:flex-row md:items-center md:rounded-full md:p-1.5"
        >
          {/* event name */}
          <label className="group flex flex-1 cursor-text items-center gap-3 rounded-2xl px-4 py-2 transition-colors hover:bg-white/5 md:rounded-full">
            <svg className="h-5 w-5 shrink-0 text-slate-500 transition-colors group-focus-within:text-indigo-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="7" /><path d="m21 21-4.3-4.3" strokeLinecap="round" /></svg>
            <span className="flex min-w-0 flex-1 flex-col">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">Event</span>
              <input
                placeholder="Search by name…"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full border-0 bg-transparent p-0 text-sm leading-tight text-slate-100 placeholder:text-slate-500 focus:border-0 focus:outline-none focus:ring-0"
              />
            </span>
          </label>

          <div className="hidden h-9 w-px shrink-0 bg-white/10 md:block" />

          {/* province */}
          <div className="group flex items-center gap-3 rounded-2xl px-4 py-2 transition-colors hover:bg-white/5 md:w-48 md:rounded-full">
            <svg className="h-5 w-5 shrink-0 text-slate-500 transition-colors group-focus-within:text-indigo-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 21s-7-5.5-7-11a7 7 0 1 1 14 0c0 5.5-7 11-7 11Z" /><circle cx="12" cy="10" r="2.5" /></svg>
            <span className="flex min-w-0 flex-1 flex-col">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">Location</span>
              <ConfigProvider theme={antdTheme}>
                <Select
                  value={filterProvince || undefined}
                  onChange={v => setFilterProvince(v ?? '')}
                  showSearch
                  allowClear
                  variant="borderless"
                  placeholder="Any province"
                  optionFilterProp="label"
                  suffixIcon={null}
                  popupMatchSelectWidth={240}
                  className="eventiq-province-select w-full [&_.ant-select-selector]:!px-0 [&_.ant-select-selection-item]:!text-sm [&_.ant-select-selection-item]:!text-slate-100 [&_.ant-select-selection-placeholder]:!text-slate-500"
                  options={provinces.map(p => ({ value: p.code, label: p.name }))}
                />
              </ConfigProvider>
            </span>
          </div>

          <div className="hidden h-9 w-px shrink-0 bg-white/10 md:block" />

          {/* date range */}
          <div className="flex items-center gap-3 rounded-2xl px-4 py-2 md:rounded-full">
            <svg className="h-5 w-5 shrink-0 text-slate-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2" /><path d="M16 2v4M8 2v4M3 10h18" strokeLinecap="round" /></svg>
            <span className="flex min-w-0 flex-col">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">When</span>
              <ConfigProvider
                theme={{
                  ...antdTheme,
                  components: { DatePicker: { activeBorderColor: 'transparent', hoverBorderColor: 'transparent', paddingInline: 0, paddingBlock: 0 } },
                }}
              >
                <DatePicker.RangePicker
                  value={dateRange}
                  onChange={handleDateRange}
                  variant="borderless"
                  suffixIcon={null}
                  allowEmpty={[true, true]}
                  format="MMM D"
                  separator={<span className="text-slate-600">→</span>}
                  placeholder={['Start', 'End']}
                  popupClassName="eventiq-rangepicker-popup"
                  className="!p-0 [&_input]:!text-sm [&_input]:!text-slate-200 [&_input::placeholder]:!text-slate-500"
                />
              </ConfigProvider>
            </span>
          </div>

          {/* submit */}
          <button
            type="submit"
            className="flex shrink-0 items-center justify-center gap-2 rounded-full bg-gradient-to-r from-indigo-500 to-violet-500 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-indigo-500/25 transition-all hover:from-indigo-400 hover:to-violet-400 hover:shadow-indigo-500/40 active:scale-95 md:h-12 md:w-12 md:px-0"
          >
            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="11" cy="11" r="7" /><path d="m21 21-4.3-4.3" strokeLinecap="round" /></svg>
            <span className="md:hidden">Search</span>
          </button>
        </form>
      </div>

      {error && <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-2.5 text-sm text-red-400">{error}</div>}

      {/* ── Result count & Sort ── */}
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-slate-400">{loading ? 'Loading…' : `${total} event${total === 1 ? '' : 's'}`}</p>
        <div className="flex items-center gap-2 rounded-full border border-white/10 bg-slate-900/60 py-1.5 pl-3 pr-1 backdrop-blur-md">
          <svg className="h-4 w-4 shrink-0 text-slate-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 6h18M7 12h10m-6 6h2" strokeLinecap="round" /></svg>
          <ConfigProvider theme={antdTheme}>
            <Select
              value={sortNewest ? 'newest' : 'soonest'}
              onChange={v => handleSort(v === 'newest')}
              variant="borderless"
              popupMatchSelectWidth={170}
              className="w-36 [&_.ant-select-selection-item]:!text-sm [&_.ant-select-selection-item]:!text-slate-200"
              options={[
                { value: 'soonest', label: 'Soonest first' },
                { value: 'newest', label: 'Latest first' },
              ]}
            />
          </ConfigProvider>
        </div>
      </div>

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
