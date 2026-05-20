import { useEffect, useRef, useState } from 'react'
import { message, Popconfirm } from 'antd'
import { useNavigate } from 'react-router-dom'
import type { EventQuickViewData, EventDetail, CreateEventDto } from '../../types/event'
import type { SessionResponse, LegendResponse, ChartResponse, SubmissionResponse, CreateSessionDto, CreateLegendDto } from '../../types/index'
import type { SeatMapResponse, SeatMapDetailResponse, SeatMapStatsResponse } from '../../types/seat'
import { getSeatMapsByEvent, getSeatMapById, getSeatMapStats, deleteSeatMap, publishSeatMap } from '../../api/seatApi'
import { getAllEvents, getEventDetail, createEvent } from '../../api/eventApi'
import { getSessions, createSession, deleteSession } from '../../api/sessionApi'
import { getLegends, createLegend, deleteLegend } from '../../api/legendApi'
import { getCharts, createChart, deleteChart } from '../../api/chartApi'
import { getSubmissions, submitEvent, acceptSubmission, rejectSubmission } from '../../api/submissionApi'

type DetailTab = 'info' | 'sessions' | 'legends' | 'charts' | 'submissions' | 'seatmaps'

export function OrgEventsTab({ orgId }: { orgId: string }) {
  const navigate = useNavigate()
  const [events, setEvents] = useState<EventQuickViewData[]>([])
  const [loading, setLoading] = useState(true)
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [error, setError] = useState<string | null>(null)

  const [showCreate, setShowCreate] = useState(false)
  const [createForm, setCreateForm] = useState<CreateEventDto>({ name: '', description: '', startTime: '', endTime: '', detailAddress: '', provinceCode: '', communeCode: '', provinceName: '', communeName: '' })
  const [creating, setCreating] = useState(false)
  const [bannerFile, setBannerFile] = useState<File | null>(null)
  const [bannerPreview, setBannerPreview] = useState<string | null>(null)
  const bannerRef = useRef<HTMLInputElement>(null)

  const [selectedEvent, setSelectedEvent] = useState<EventDetail | null>(null)
  const [loadingDetail, setLoadingDetail] = useState(false)
  const [detailTab, setDetailTab] = useState<DetailTab>('info')

  const [sessions, setSessions] = useState<SessionResponse[]>([])
  const [legends, setLegends] = useState<LegendResponse[]>([])
  const [charts, setCharts] = useState<ChartResponse[]>([])
  const [submissions, setSubmissions] = useState<SubmissionResponse[]>([])
  const [loadingSub, setLoadingSub] = useState(false)

  const [seatMaps, setSeatMaps] = useState<SeatMapResponse[]>([])
  const [loadingSeatMaps, setLoadingSeatMaps] = useState(false)
  const [seatMapDetail, setSeatMapDetail] = useState<SeatMapDetailResponse | null>(null)
  const [loadingSeatMapDetail, setLoadingSeatMapDetail] = useState(false)
  const [seatMapStats, setSeatMapStats] = useState<SeatMapStatsResponse | null>(null)
  const [loadingSeatMapStats, setLoadingSeatMapStats] = useState(false)

  const [showSessionForm, setShowSessionForm] = useState(false)
  const [sessionForm, setSessionForm] = useState<CreateSessionDto>({ name: '', startTime: '', endTime: '', chartId: '' })
  const [showLegendForm, setShowLegendForm] = useState(false)
  const [legendForm, setLegendForm] = useState<CreateLegendDto>({ name: '', color: '#6366f1', price: 0 })
  const [showChartForm, setShowChartForm] = useState(false)
  const [chartName, setChartName] = useState('')

  const [showRejectModal, setShowRejectModal] = useState(false)
  const [rejectMessage, setRejectMessage] = useState('')

  const fetchEvents = async (p: number) => {
    setLoading(true)
    try { const r = await getAllEvents({ organizationId: orgId, page: p, size: 12 }); setEvents(r.data); setTotal(r.total) }
    catch { setError('Failed to load events.') }
    finally { setLoading(false) }
  }

  useEffect(() => { fetchEvents(page) }, [page, orgId])

  const handleBannerChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] ?? null
    setBannerFile(file)
    if (file) {
      const reader = new FileReader()
      reader.onload = ev => setBannerPreview(ev.target?.result as string)
      reader.readAsDataURL(file)
    } else {
      setBannerPreview(null)
    }
  }

  const handleDetail = async (id: string) => {
    setLoadingDetail(true); setDetailTab('info')
    try { setSelectedEvent(await getEventDetail(id)) } catch { }
    finally { setLoadingDetail(false) }
  }

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault(); setCreating(true); setError(null)
    try {
      await createEvent(orgId, createForm, bannerFile ?? undefined)
      setShowCreate(false)
      setBannerFile(null)
      setBannerPreview(null)
      message.success('Event created successfully')
      fetchEvents(1); setPage(1)
    }
    catch (e: any) { setError(e?.response?.data?.message || 'Failed to create event.') }
    finally { setCreating(false) }
  }

  const fetchSessions = async (id: string) => { try { const r = await getSessions(id); setSessions(r.data) } catch { } }
  const fetchLegends = async (id: string) => { try { const r = await getLegends(id); setLegends(r.data) } catch { } }
  const fetchCharts = async (id: string) => { try { const r = await getCharts(id); setCharts(r.data) } catch { } }
  const fetchSubmissions = async (id: string) => { setLoadingSub(true); try { const r = await getSubmissions(id); setSubmissions(r.data) } catch { } finally { setLoadingSub(false) } }

  const fetchSeatMaps = async (eventId: string) => { setLoadingSeatMaps(true); setSeatMapDetail(null); setSeatMapStats(null); try { const r = await getSeatMapsByEvent(eventId); setSeatMaps(Array.isArray(r) ? r : []) } catch { setSeatMaps([]) } finally { setLoadingSeatMaps(false) } }
  const handleViewSeatMapDetail = async (id: string) => { setLoadingSeatMapDetail(true); setSeatMapStats(null); try { setSeatMapDetail(await getSeatMapById(id)) } catch { } finally { setLoadingSeatMapDetail(false) } }
  const handleViewSeatMapStats = async (id: string) => { setLoadingSeatMapStats(true); try { setSeatMapStats(await getSeatMapStats(id)) } catch { } finally { setLoadingSeatMapStats(false) } }
  const handleDeleteSeatMap = async (id: string) => { if (!selectedEvent) return; try { await deleteSeatMap(id); fetchSeatMaps(selectedEvent.id) } catch { } }
  const handlePublishSeatMap = async (id: string) => { if (!selectedEvent) return; try { await publishSeatMap(id); fetchSeatMaps(selectedEvent.id) } catch (e: any) { setError(e?.response?.data?.message || 'Failed to publish.') } }

  const handleDetailTab = (t: DetailTab) => {
    if (!selectedEvent) return; setDetailTab(t)
    if (t === 'sessions') { fetchSessions(selectedEvent.id); fetchCharts(selectedEvent.id) }
    else if (t === 'legends') fetchLegends(selectedEvent.id)
    else if (t === 'charts') fetchCharts(selectedEvent.id)
    else if (t === 'submissions') { fetchSubmissions(selectedEvent.id) }
    else if (t === 'seatmaps') fetchSeatMaps(selectedEvent.id)
  }

  const handleCreateSession = async (e: React.FormEvent) => { e.preventDefault(); if (!selectedEvent) return; try { await createSession(selectedEvent.id, orgId, sessionForm); message.success('Session created'); setShowSessionForm(false); setSessionForm({ name: '', startTime: '', endTime: '', chartId: '' }); fetchSessions(selectedEvent.id) } catch (e: any) { setError(e?.response?.data?.message || 'Failed.') } }
  const handleDeleteSession = async (id: string) => { if (!selectedEvent) return; try { await deleteSession(selectedEvent.id, id, orgId); message.success('Session deleted'); fetchSessions(selectedEvent.id) } catch { } }
  const handleCreateLegend = async (e: React.FormEvent) => { e.preventDefault(); if (!selectedEvent) return; try { await createLegend(selectedEvent.id, orgId, legendForm); message.success('Legend created'); setShowLegendForm(false); setLegendForm({ name: '', color: '#6366f1', price: 0 }); fetchLegends(selectedEvent.id) } catch (e: any) { setError(e?.response?.data?.message || 'Failed.') } }
  const handleDeleteLegend = async (id: string) => { if (!selectedEvent) return; try { await deleteLegend(selectedEvent.id, id, orgId); message.success('Legend deleted'); fetchLegends(selectedEvent.id) } catch { } }
  const handleCreateChart = async (e: React.FormEvent) => { e.preventDefault(); if (!selectedEvent) return; try { await createChart(selectedEvent.id, orgId, { name: chartName }); message.success('Chart created'); setShowChartForm(false); setChartName(''); fetchCharts(selectedEvent.id) } catch (e: any) { setError(e?.response?.data?.message || 'Failed.') } }
  const handleDeleteChart = async (id: string) => { if (!selectedEvent) return; try { await deleteChart(selectedEvent.id, id, orgId); message.success('Chart deleted'); fetchCharts(selectedEvent.id) } catch { } }

  const handleSubmitEvent = async () => {
    if (!selectedEvent) return
    try {
      await submitEvent(selectedEvent.id, orgId)
      message.success('Submitted for review')
      fetchSubmissions(selectedEvent.id)
      fetchEvents(page)
    } catch (e: any) { setError(e?.response?.data?.message || 'Failed to submit event.') }
  }

  const handleAcceptSub = async (_adminId: string) => {
    if (!selectedEvent) return
    try { await acceptSubmission(selectedEvent.id, {}); fetchSubmissions(selectedEvent.id) } catch { }
  }
  const handleRejectSub = (_adminId: string) => { setRejectMessage(''); setShowRejectModal(true) }
  const handleConfirmReject = async () => {
    if (!selectedEvent) return
    try { await rejectSubmission(selectedEvent.id, { message: rejectMessage || undefined }); fetchSubmissions(selectedEvent.id); setShowRejectModal(false) } catch { }
  }

  const formatDate = (d: string) => { try { return new Date(d).toLocaleDateString('vi-VN', { month: 'short', day: 'numeric', year: 'numeric' }) } catch { return d } }
  const statusColor = (s: string) => s === 'Published' ? 'bg-emerald-500/15 text-emerald-400' : s === 'Cancelled' ? 'bg-red-500/15 text-red-400' : s === 'Approved' ? 'bg-blue-500/15 text-blue-400' : s === 'Pending' ? 'bg-amber-500/15 text-amber-400' : 'bg-slate-700/40 text-slate-400'
  const totalPages = Math.ceil(total / 12)
  const detailTabs: { key: DetailTab; label: string }[] = [{ key: 'info', label: 'Info' }, { key: 'sessions', label: 'Sessions' }, { key: 'legends', label: 'Legends' }, { key: 'charts', label: 'Charts' }, { key: 'seatmaps', label: 'Seat Maps' }, { key: 'submissions', label: 'Submissions' }]

  return (
    <div className="fade-in space-y-6">
      {/* ── Detail Modal ── */}
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
                  <button className="mb-3 rounded-lg bg-indigo-500 px-3 py-1.5 text-xs font-semibold text-white hover:bg-indigo-400" onClick={() => setShowSessionForm(true)}>+ New Session</button>
                  {showSessionForm && (
                    <form onSubmit={handleCreateSession} className="mb-4 space-y-3 rounded-xl border border-indigo-500/20 bg-indigo-500/5 p-4">
                      <h4 className="text-sm font-semibold text-indigo-300">Create Session</h4>
                      <div><label className="text-xs text-slate-400">Session Name</label><input value={sessionForm.name} onChange={e => setSessionForm({ ...sessionForm, name: e.target.value })} placeholder="e.g. Morning Show" required /></div>
                      <div className="grid grid-cols-2 gap-2">
                        <div><label className="text-xs text-slate-400">Start</label><input type="datetime-local" value={sessionForm.startTime} onChange={e => setSessionForm({ ...sessionForm, startTime: e.target.value })} required /></div>
                        <div><label className="text-xs text-slate-400">End</label><input type="datetime-local" value={sessionForm.endTime} onChange={e => setSessionForm({ ...sessionForm, endTime: e.target.value })} required /></div>
                      </div>
                      <div>
                        <label className="text-xs text-slate-400">Chart (Seat Layout)</label>
                        <select value={sessionForm.chartId} onChange={e => setSessionForm({ ...sessionForm, chartId: e.target.value })} required className="w-full rounded-lg border border-slate-700/50 bg-slate-900/60 px-3 py-2 text-sm text-slate-200 focus:border-indigo-500/50 focus:outline-none">
                          <option value="" disabled>Select chart...</option>
                          {charts.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                        </select>
                        {charts.length === 0 && <p className="mt-1 text-xs text-amber-400">No charts yet. Create a chart in the Charts tab first.</p>}
                      </div>
                      <div className="flex gap-2 pt-1">
                        <button type="button" className="text-sm text-slate-400 hover:text-slate-200" onClick={() => setShowSessionForm(false)}>Cancel</button>
                        <button className="rounded-lg bg-indigo-500 px-4 py-1.5 text-xs font-semibold text-white hover:bg-indigo-400">Create</button>
                      </div>
                    </form>
                  )}
                  {sessions.length === 0 ? <p className="text-sm text-slate-400">No sessions yet.</p> : (
                    <div className="space-y-2">{sessions.map(s => (
                      <div key={s.id} className="flex items-center justify-between rounded-xl border border-slate-700/30 bg-slate-900/40 px-4 py-3 text-sm">
                        <div>
                          <strong className="text-slate-200">{s.name}</strong>
                          <p className="text-xs text-slate-500 mt-0.5">📅 {formatDate(s.startTime)} → {formatDate(s.endTime)}</p>
                          {s.chartName && <p className="text-xs text-indigo-400 mt-0.5">🗺 {s.chartName}</p>}
                        </div>
                        <Popconfirm title="Delete session?" onConfirm={() => handleDeleteSession(s.id)}>
                          <button className="text-xs text-red-400 hover:text-red-300">Delete</button>
                        </Popconfirm>
                      </div>
                    ))}</div>
                  )}
                </>)}

                {/* ── Legends Tab ── */}
                {detailTab === 'legends' && (<>
                  <button className="mb-3 rounded-lg bg-indigo-500 px-3 py-1.5 text-xs font-semibold text-white hover:bg-indigo-400" onClick={() => setShowLegendForm(true)}>+ New Legend</button>
                  {showLegendForm && (
                    <form onSubmit={handleCreateLegend} className="mb-4 space-y-3 rounded-xl border border-indigo-500/20 bg-indigo-500/5 p-4">
                      <h4 className="text-sm font-semibold text-indigo-300">Create Legend (Ticket Tier)</h4>
                      <div><label className="text-xs text-slate-400">Name</label><input value={legendForm.name} onChange={e => setLegendForm({ ...legendForm, name: e.target.value })} placeholder="e.g. VIP, General" required /></div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="text-xs text-slate-400">Color</label>
                          <div className="flex items-center gap-2 mt-1">
                            <input type="color" value={legendForm.color} onChange={e => setLegendForm({ ...legendForm, color: e.target.value })} className="h-9 w-12 cursor-pointer rounded border border-slate-700 bg-transparent p-0.5" />
                            <span className="text-xs text-slate-400 font-mono">{legendForm.color}</span>
                          </div>
                        </div>
                        <div>
                          <label className="text-xs text-slate-400">Price (VNĐ)</label>
                          <input type="number" min="0" value={legendForm.price} onChange={e => setLegendForm({ ...legendForm, price: Number(e.target.value) })} placeholder="0 = Free" />
                        </div>
                      </div>
                      <div className="flex gap-2 pt-1">
                        <button type="button" className="text-sm text-slate-400 hover:text-slate-200" onClick={() => setShowLegendForm(false)}>Cancel</button>
                        <button className="rounded-lg bg-indigo-500 px-4 py-1.5 text-xs font-semibold text-white hover:bg-indigo-400">Create</button>
                      </div>
                    </form>
                  )}
                  {legends.length === 0 ? <p className="text-sm text-slate-400">No legends yet.</p> : (
                    <div className="space-y-2">{legends.map(l => (
                      <div key={l.id} className="flex items-center justify-between rounded-xl border border-slate-700/30 bg-slate-900/40 px-4 py-3 text-sm">
                        <div className="flex items-center gap-3">
                          <span className="h-5 w-5 rounded-full flex-shrink-0 border border-white/10" style={{ background: l.color }} />
                          <div>
                            <strong className="text-slate-200">{l.name}</strong>
                            <p className="text-xs text-slate-500 mt-0.5">{l.price === 0 ? 'Free' : `${l.price.toLocaleString('vi-VN')}₫`}</p>
                          </div>
                        </div>
                        <Popconfirm title="Delete legend?" onConfirm={() => handleDeleteLegend(l.id)}>
                          <button className="text-xs text-red-400 hover:text-red-300">Delete</button>
                        </Popconfirm>
                      </div>
                    ))}</div>
                  )}
                </>)}

                {/* ── Charts Tab ── */}
                {detailTab === 'charts' && (<>
                  <button className="mb-3 rounded-lg bg-indigo-500 px-3 py-1.5 text-xs font-semibold text-white hover:bg-indigo-400" onClick={() => setShowChartForm(true)}>+ New Chart</button>
                  {showChartForm && (
                    <form onSubmit={handleCreateChart} className="mb-4 space-y-3 rounded-xl border border-indigo-500/20 bg-indigo-500/5 p-4">
                      <h4 className="text-sm font-semibold text-indigo-300">Create Chart (Seat Layout)</h4>
                      <div><label className="text-xs text-slate-400">Chart Name</label><input value={chartName} onChange={e => setChartName(e.target.value)} placeholder="e.g. Main Hall, Floor A" required /></div>
                      <p className="text-xs text-slate-500">A chart defines the physical seat layout. After creating, go to Seat Maps to design the seats.</p>
                      <div className="flex gap-2 pt-1">
                        <button type="button" className="text-sm text-slate-400 hover:text-slate-200" onClick={() => setShowChartForm(false)}>Cancel</button>
                        <button className="rounded-lg bg-indigo-500 px-4 py-1.5 text-xs font-semibold text-white hover:bg-indigo-400">Create</button>
                      </div>
                    </form>
                  )}
                  {charts.length === 0 ? <p className="text-sm text-slate-400">No charts yet.</p> : (
                    <div className="space-y-2">{charts.map(c => (
                      <div key={c.id} className="flex items-center justify-between rounded-xl border border-slate-700/30 bg-slate-900/40 px-4 py-3 text-sm">
                        <div className="flex items-center gap-2">
                          <span className="text-base">🗺</span>
                          <span className="text-slate-200 font-medium">{c.name}</span>
                        </div>
                        <Popconfirm title="Delete chart?" onConfirm={() => handleDeleteChart(c.id)}>
                          <button className="text-xs text-red-400 hover:text-red-300">Delete</button>
                        </Popconfirm>
                      </div>
                    ))}</div>
                  )}
                </>)}

                {/* ── Submissions Tab ── */}
                {detailTab === 'submissions' && (<>
                  {submissions.length === 0 && (
                    <div className="mb-4">
                      <Popconfirm title="Submit this event for review?" onConfirm={handleSubmitEvent} okText="Submit" cancelText="Cancel">
                        <button className="rounded-lg bg-indigo-500 px-3 py-1.5 text-xs font-semibold text-white hover:bg-indigo-400">Submit for Review</button>
                      </Popconfirm>
                    </div>
                  )}
                  {loadingSub ? <div className="skeleton h-20 w-full" /> : submissions.length === 0 ? <p className="text-sm text-slate-400">No submissions.</p> : (
                    <div className="space-y-2">{submissions.map(s => (
                      <div key={s.adminId} className="flex items-center justify-between rounded-xl border border-slate-700/30 bg-slate-900/40 px-4 py-3 text-sm">
                        <div><span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${s.status === 0 ? 'bg-amber-500/15 text-amber-400' : s.status === 1 ? 'bg-emerald-500/15 text-emerald-400' : 'bg-red-500/15 text-red-400'}`}>{s.status === 0 ? 'Pending' : s.status === 1 ? 'Accepted' : 'Rejected'}</span><span className="ml-2 text-xs text-slate-500">{formatDate(s.createdAt)}</span></div>
                        {s.status === 0 && (
                          <div className="flex gap-2">
                            <button className="text-xs text-emerald-400 hover:text-emerald-300" onClick={() => handleAcceptSub(s.adminId)}>Accept</button>
                            <button className="text-xs text-red-400 hover:text-red-300" onClick={() => handleRejectSub(s.adminId)}>Reject</button>
                          </div>
                        )}
                      </div>
                    ))}</div>
                  )}
                </>)}

                {/* ── Seat Maps Tab ── */}
                {detailTab === 'seatmaps' && (<>
                  {loadingSeatMaps ? <div className="skeleton h-20 w-full" /> : seatMaps.length === 0 ? (
                    <div className="space-y-3">
                      <p className="text-sm text-slate-400">No seat maps for this event.</p>
                      <button className="w-full rounded-xl bg-indigo-500 py-2.5 text-sm font-semibold text-white hover:bg-indigo-400 transition-colors" onClick={() => { setSelectedEvent(null); navigate(`/events/${selectedEvent.id}/seat-design`) }}>🎨 Create Seat Map</button>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 gap-4 lg:grid-cols-[260px_1fr]">
                      <div className="space-y-3">
                        {seatMaps.map(sm => (
                          <div key={sm.id} className={`rounded-xl border p-4 cursor-pointer transition-all hover:border-indigo-500/30 ${seatMapDetail?.id === sm.id ? 'border-indigo-500/40 bg-indigo-500/5' : 'border-slate-700/30 bg-slate-900/40'}`}
                            onClick={() => { handleViewSeatMapDetail(sm.id); handleViewSeatMapStats(sm.id) }}>
                            <div className="flex items-center justify-between mb-1.5">
                              <h4 className="font-semibold text-sm text-slate-200">{sm.name}</h4>
                              <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase ${sm.status === 'Published' ? 'bg-emerald-500/15 text-emerald-400' : 'bg-slate-700/40 text-slate-400'}`}>{sm.status}</span>
                            </div>
                            <div className="flex items-center justify-between text-xs text-slate-500">
                              <span>v{sm.version}</span>
                              <span>{new Date(sm.createdAt).toLocaleDateString('vi-VN')}</span>
                            </div>
                            <div className="mt-2.5 flex gap-2">
                              <button className="flex-1 rounded-lg bg-indigo-500 py-1.5 text-xs font-semibold text-white hover:bg-indigo-400 transition-colors"
                                onClick={e => { e.stopPropagation(); setSelectedEvent(null); navigate(`/events/${sm.eventId}/seat-design/${sm.id}`) }}>🎨 Design</button>
                              {sm.status !== 'Published' && <button className="rounded-lg border border-emerald-500/30 px-3 py-1.5 text-xs font-medium text-emerald-400 hover:bg-emerald-500/10 transition-colors"
                                onClick={e => { e.stopPropagation(); handlePublishSeatMap(sm.id) }}>Publish</button>}
                              <Popconfirm title="Delete seat map?" onConfirm={e => { e?.stopPropagation(); handleDeleteSeatMap(sm.id) }}>
                                <button className="rounded-lg border border-red-500/30 px-3 py-1.5 text-xs font-medium text-red-400 hover:bg-red-500/10 transition-colors"
                                  onClick={e => e.stopPropagation()}>Delete</button>
                              </Popconfirm>
                            </div>
                          </div>
                        ))}
                        <button className="w-full rounded-xl border border-dashed border-slate-700/50 py-2.5 text-xs font-medium text-slate-400 hover:border-indigo-500/30 hover:text-indigo-400 transition-colors" onClick={() => { setSelectedEvent(null); navigate(`/events/${selectedEvent.id}/seat-design`) }}>+ New Seat Map</button>
                      </div>

                      {(seatMapDetail || loadingSeatMapDetail) && (
                        <div className="space-y-4">
                          {loadingSeatMapDetail ? <div className="rounded-xl border border-slate-700/30 bg-slate-900/40 p-5"><div className="skeleton h-4 w-3/4 mb-2" /><div className="skeleton h-3 w-1/2" /></div> : seatMapDetail && (<>
                            <div className="rounded-xl border border-slate-700/30 bg-slate-900/40 p-5">
                              <h3 className="mb-3 text-sm font-semibold">{seatMapDetail.name}</h3>
                              <div className="grid grid-cols-2 gap-2 text-sm">
                                <div className="flex justify-between"><span className="text-slate-400">Status</span><span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase ${seatMapDetail.status === 'Published' ? 'bg-emerald-500/15 text-emerald-400' : 'bg-slate-700/40 text-slate-400'}`}>{seatMapDetail.status}</span></div>
                                <div className="flex justify-between"><span className="text-slate-400">Version</span><span>{seatMapDetail.version}</span></div>
                                <div className="flex justify-between"><span className="text-slate-400">Sections</span><span>{seatMapDetail.sections?.length ?? 0}</span></div>
                                <div className="flex justify-between"><span className="text-slate-400">Objects</span><span>{seatMapDetail.objects?.length ?? 0}</span></div>
                              </div>
                              {seatMapDetail.sections && seatMapDetail.sections.length > 0 && (
                                <div className="mt-3 space-y-2">
                                  <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Sections</h4>
                                  {seatMapDetail.sections.map((sec: any) => (
                                    <div key={sec.id} className="rounded-lg border border-slate-700/20 bg-slate-900/30 p-2.5">
                                      <div className="flex justify-between text-sm"><strong className="text-slate-200">{sec.label}</strong><span className="text-slate-500 text-xs">{sec.sectionType}</span></div>
                                      {sec.rows && sec.rows.length > 0 && <div className="mt-1.5 space-y-0.5">{sec.rows.map((row: any) => <div key={row.id} className="text-xs text-slate-400">Row {row.label} — {row.seats?.length ?? 0} seats</div>)}</div>}
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>

                            {loadingSeatMapStats ? <div className="rounded-xl border border-slate-700/30 bg-slate-900/40 p-5"><div className="skeleton h-4 w-3/4" /></div>
                              : seatMapStats && (
                                <div className="rounded-xl border border-slate-700/30 bg-slate-900/40 p-5">
                                  <h3 className="mb-3 text-sm font-semibold">Statistics</h3>
                                  <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                                    {[
                                      { label: 'Total', value: seatMapStats.totalSeats, color: 'text-slate-200' },
                                      { label: 'Available', value: seatMapStats.availableSeats, color: 'text-emerald-400' },
                                      { label: 'Reserved', value: seatMapStats.reservedSeats, color: 'text-yellow-400' },
                                      { label: 'Sold', value: seatMapStats.soldSeats, color: 'text-red-400' },
                                      { label: 'Blocked', value: seatMapStats.blockedSeats, color: 'text-slate-500' },
                                      { label: 'Sections', value: seatMapStats.totalSections, color: 'text-slate-200' },
                                      { label: 'Rows', value: seatMapStats.totalRows, color: 'text-slate-200' },
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

      {/* ── Create Modal ── */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={() => setShowCreate(false)}>
          <div className="glass w-full max-w-lg max-h-[90vh] overflow-y-auto p-6 fade-in" onClick={e => e.stopPropagation()}>
            <h2 className="mb-5">Create Event</h2>
            <form onSubmit={handleCreate} className="space-y-4">

              {/* Banner Upload */}
              <div>
                <label className="text-xs font-medium text-slate-400 uppercase tracking-wider">Event Banner</label>
                <div
                  className="mt-2 relative flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-700/60 bg-slate-900/40 overflow-hidden transition-colors hover:border-indigo-500/40 cursor-pointer"
                  style={{ minHeight: bannerPreview ? 160 : 100 }}
                  onClick={() => bannerRef.current?.click()}
                >
                  {bannerPreview ? (
                    <>
                      <img src={bannerPreview} alt="preview" className="w-full h-40 object-cover" />
                      <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 hover:opacity-100 transition-opacity">
                        <span className="text-xs font-semibold text-white">Click to change</span>
                      </div>
                    </>
                  ) : (
                    <div className="py-6 text-center">
                      <div className="text-2xl mb-1">🖼</div>
                      <p className="text-xs text-slate-400">Click to upload banner</p>
                      <p className="text-[10px] text-slate-600 mt-1">JPG, PNG, WEBP — max 5MB</p>
                    </div>
                  )}
                  <input ref={bannerRef} type="file" accept="image/*" className="hidden" onChange={handleBannerChange} />
                </div>
                {bannerFile && <p className="mt-1 text-[10px] text-indigo-400 truncate">📎 {bannerFile.name}</p>}
              </div>



              <div><label>Event Name</label><input value={createForm.name} onChange={e => setCreateForm({ ...createForm, name: e.target.value })} placeholder="e.g. Summer Music Festival 2026" required /></div>
              <div><label>Description</label><textarea value={createForm.description} onChange={e => setCreateForm({ ...createForm, description: e.target.value })} rows={2} placeholder="Short description of the event..." /></div>

              <div className="grid grid-cols-2 gap-3">
                <div><label>Start Date &amp; Time</label><input type="datetime-local" value={createForm.startTime} onChange={e => setCreateForm({ ...createForm, startTime: e.target.value })} required /></div>
                <div><label>End Date &amp; Time</label><input type="datetime-local" value={createForm.endTime} onChange={e => setCreateForm({ ...createForm, endTime: e.target.value })} required /></div>
              </div>

              <div><label>Address</label><input value={createForm.detailAddress} onChange={e => setCreateForm({ ...createForm, detailAddress: e.target.value })} placeholder="123 Main Street" /></div>

              <div className="grid grid-cols-2 gap-3">
                <div><label>Province</label><input value={createForm.provinceName} onChange={e => setCreateForm({ ...createForm, provinceName: e.target.value })} placeholder="Hồ Chí Minh" /></div>
                <div><label>Commune</label><input value={createForm.communeName} onChange={e => setCreateForm({ ...createForm, communeName: e.target.value })} placeholder="Quận 1" /></div>
              </div>

              {error && <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-400">{error}</div>}

              <div className="flex justify-end gap-2 pt-2">
                <button type="button" className="rounded-lg border border-slate-600 px-4 py-2 text-sm text-slate-300 hover:border-slate-500" onClick={() => { setShowCreate(false); setBannerFile(null); setBannerPreview(null) }}>Cancel</button>
                <button className="rounded-lg bg-indigo-500 px-5 py-2 text-sm font-semibold text-white hover:bg-indigo-400 disabled:opacity-50" disabled={creating}>{creating ? 'Creating…' : 'Create Event'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Page Header ── */}
      <div className="flex items-center justify-between">
        <div>
          <h1>Events</h1>
          <p className="text-sm text-slate-400">Browse and manage events.</p>
        </div>
        <button
          className="rounded-xl bg-indigo-500 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-400 transition-colors"
          onClick={() => { setShowCreate(true) }}
        >+ Create Event</button>
      </div>

      {error && !showCreate && <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-2.5 text-sm text-red-400">{error}</div>}

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

      {/* ── Reject Modal ── */}
      {showRejectModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={() => setShowRejectModal(false)}>
          <div className="glass w-full max-w-sm p-6 fade-in" onClick={e => e.stopPropagation()}>
            <h2 className="mb-1">Reject Submission</h2>
            <p className="text-xs text-slate-400 mb-4">Provide a reason (optional) so the organizer knows what to fix.</p>
            <textarea
              value={rejectMessage}
              onChange={e => setRejectMessage(e.target.value)}
              rows={3}
              placeholder="e.g. Missing session details, incomplete venue address…"
              className="w-full rounded-lg border border-slate-700 bg-slate-900/60 px-3 py-2 text-sm text-slate-200 placeholder-slate-500 focus:border-indigo-500/50 focus:outline-none resize-none"
            />
            <div className="mt-4 flex justify-end gap-2">
              <button className="rounded-lg border border-slate-600 px-4 py-2 text-sm text-slate-300 hover:text-white" onClick={() => setShowRejectModal(false)}>Cancel</button>
              <button className="rounded-lg bg-red-500 px-4 py-2 text-sm font-semibold text-white hover:bg-red-400" onClick={handleConfirmReject}>Reject</button>
            </div>
          </div>
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
