import { useEffect, useState } from 'react'
import { Popconfirm } from 'antd'
import { useNavigate } from 'react-router-dom'
import type { SeatMapResponse, SeatMapMetaResponse, SeatMapStatsResponse } from '../../../types/seat'
import type { EventDetail } from '../../../types/event'
import { getSeatMapsByEvent, getSeatMapById, getSeatMapStats, deleteSeatMap, publishSeatMap } from '../../../api/seatApi'

interface Props {
  event: EventDetail
  onClose: () => void
}

export function EventSeatMapsTab({ event, onClose }: Props) {
  const navigate = useNavigate()
  const [seatMaps, setSeatMaps] = useState<SeatMapResponse[]>([])
  const [loading, setLoading] = useState(false)
  const [detail, setDetail] = useState<SeatMapMetaResponse | null>(null)
  const [loadingDetail, setLoadingDetail] = useState(false)
  const [stats, setStats] = useState<SeatMapStatsResponse | null>(null)
  const [loadingStats, setLoadingStats] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchSeatMaps = async () => {
    setLoading(true); setDetail(null); setStats(null)
    try { const r = await getSeatMapsByEvent(event.id); setSeatMaps(Array.isArray(r) ? r : []) }
    catch { setSeatMaps([]) }
    finally { setLoading(false) }
  }

  useEffect(() => { fetchSeatMaps() }, [event.id])

  const handleSelect = async (id: string) => {
    setLoadingDetail(true); setStats(null)
    try { setDetail(await getSeatMapById(id)) } catch { } finally { setLoadingDetail(false) }
    setLoadingStats(true)
    try { setStats(await getSeatMapStats(id)) } catch { } finally { setLoadingStats(false) }
  }

  const handleDelete = async (id: string) => {
    try { await deleteSeatMap(id); fetchSeatMaps() } catch { }
  }

  const handlePublish = async (id: string) => {
    try { await publishSeatMap(id); fetchSeatMaps() }
    catch (e: any) { setError(e?.response?.data?.message || 'Failed to publish.') }
  }

  if (loading) return <div className="skeleton h-20 w-full" />

  if (seatMaps.length === 0) return (
    <div className="space-y-3">
      <p className="text-sm text-slate-400">No seat maps for this event.</p>
      <button className="w-full rounded-xl bg-indigo-500 py-2.5 text-sm font-semibold text-white hover:bg-indigo-400 transition-colors" onClick={() => { onClose(); navigate(`/events/${event.id}/seat-design`) }}>🎨 Create Seat Map</button>
    </div>
  )

  return (
    <>
      {error && <p className="mb-3 text-xs text-red-400">{error}</p>}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[260px_1fr]">
        <div className="space-y-3">
          {seatMaps.map(sm => (
            <div key={sm.id} className={`rounded-xl border p-4 cursor-pointer transition-all hover:border-indigo-500/30 ${detail?.id === sm.id ? 'border-indigo-500/40 bg-indigo-500/5' : 'border-slate-700/30 bg-slate-900/40'}`} onClick={() => handleSelect(sm.id)}>
              <div className="flex items-center justify-between mb-1.5">
                <h4 className="font-semibold text-sm text-slate-200">{sm.name}</h4>
                <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase ${sm.status === 'Published' ? 'bg-emerald-500/15 text-emerald-400' : 'bg-slate-700/40 text-slate-400'}`}>{sm.status}</span>
              </div>
              <div className="flex items-center justify-between text-xs text-slate-500">
                <span>v{sm.version}</span>
                <span>{new Date(sm.createdAt).toLocaleDateString('vi-VN')}</span>
              </div>
              <div className="mt-2.5 flex gap-2">
                <button className="flex-1 rounded-lg bg-indigo-500 py-1.5 text-xs font-semibold text-white hover:bg-indigo-400 transition-colors" onClick={e => { e.stopPropagation(); onClose(); navigate(`/events/${sm.eventId}/seat-design/${sm.id}`) }}>🎨 Design</button>
                {sm.status !== 'Published' && <button className="rounded-lg border border-emerald-500/30 px-3 py-1.5 text-xs font-medium text-emerald-400 hover:bg-emerald-500/10 transition-colors" onClick={e => { e.stopPropagation(); handlePublish(sm.id) }}>Publish</button>}
                <Popconfirm title="Delete seat map?" onConfirm={e => { e?.stopPropagation(); handleDelete(sm.id) }}>
                  <button className="rounded-lg border border-red-500/30 px-3 py-1.5 text-xs font-medium text-red-400 hover:bg-red-500/10 transition-colors" onClick={e => e.stopPropagation()}>Delete</button>
                </Popconfirm>
              </div>
            </div>
          ))}
          <button className="w-full rounded-xl border border-dashed border-slate-700/50 py-2.5 text-xs font-medium text-slate-400 hover:border-indigo-500/30 hover:text-indigo-400 transition-colors" onClick={() => { onClose(); navigate(`/events/${event.id}/seat-design`) }}>+ New Seat Map</button>
        </div>

        {(detail || loadingDetail) && (
          <div className="space-y-4">
            {loadingDetail ? <div className="rounded-xl border border-slate-700/30 bg-slate-900/40 p-5"><div className="skeleton h-4 w-3/4 mb-2" /><div className="skeleton h-3 w-1/2" /></div> : detail && (<>
              <div className="rounded-xl border border-slate-700/30 bg-slate-900/40 p-5">
                <h3 className="mb-3 text-sm font-semibold">{detail.name}</h3>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div className="flex justify-between"><span className="text-slate-400">Status</span><span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase ${detail.status === 'Published' ? 'bg-emerald-500/15 text-emerald-400' : 'bg-slate-700/40 text-slate-400'}`}>{detail.status}</span></div>
                  <div className="flex justify-between"><span className="text-slate-400">Version</span><span>{detail.version}</span></div>
                  <div className="flex justify-between"><span className="text-slate-400">Sections</span><span>{detail.sections?.length ?? 0}</span></div>
                  <div className="flex justify-between"><span className="text-slate-400">Objects</span><span>{detail.objects?.length ?? 0}</span></div>
                </div>
                {detail.sections && detail.sections.length > 0 && (
                  <div className="mt-3 space-y-2">
                    <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Sections</h4>
                    {detail.sections.map((sec: any) => (
                      <div key={sec.id} className="rounded-lg border border-slate-700/20 bg-slate-900/30 p-2.5">
                        <div className="flex justify-between text-sm"><strong className="text-slate-200">{sec.label}</strong><span className="text-slate-500 text-xs">{sec.sectionType}</span></div>
                        {sec.rows?.length > 0 && <div className="mt-1.5 space-y-0.5">{sec.rows.map((row: any) => <div key={row.id} className="text-xs text-slate-400">Row {row.label} — {row.seats?.length ?? 0} seats</div>)}</div>}
                      </div>
                    ))}
                  </div>
                )}
              </div>
              {loadingStats ? <div className="rounded-xl border border-slate-700/30 bg-slate-900/40 p-5"><div className="skeleton h-4 w-3/4" /></div>
                : stats && (
                  <div className="rounded-xl border border-slate-700/30 bg-slate-900/40 p-5">
                    <h3 className="mb-3 text-sm font-semibold">Statistics</h3>
                    <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                      {[
                        { label: 'Total', value: stats.totalSeats, color: 'text-slate-200' },
                        { label: 'Available', value: stats.availableSeats, color: 'text-emerald-400' },
                        { label: 'Reserved', value: stats.reservedSeats, color: 'text-yellow-400' },
                        { label: 'Sold', value: stats.soldSeats, color: 'text-red-400' },
                        { label: 'Blocked', value: stats.blockedSeats, color: 'text-slate-500' },
                        { label: 'Sections', value: stats.totalSections, color: 'text-slate-200' },
                        { label: 'Rows', value: stats.totalRows, color: 'text-slate-200' },
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
    </>
  )
}
