import { useEffect, useRef, useState, useCallback, useMemo } from 'react'
import { useParams, useNavigate, useSearchParams, Link } from 'react-router-dom'
import type { UserInfo } from '../types/auth'
import { getMyMembership } from '../api/memberApi'
import { getSeatMapById, getSeatMapSeats, getSeatMapsByEvent, createSeatMap } from '../api/seatApi'
import type { SeatMapResponse } from '../types/seat'
import { getVersions, saveVersion, restoreVersion } from '../api/seatVersionApi'
import type { SeatMapVersionResponse } from '../api/seatVersionApi'
import { getLegends } from '../api/legendApi'
import type { LegendResponse } from '../types/index'
import * as hub from '../api/seatDesignHub'
import { getCharts } from '../api/chartApi'
import type { ChartResponse } from '../types/index'
import { fitToBoundingBox, bboxFromPoints } from '../utils/canvasFit'

/* ===== Local types ===== */
interface FlatSeat {
  id: string; seatMapId: string; label: string; seatNumber: number
  status: string; seatType: number; legendId?: string; x: number; y: number
}
interface OnlineUser { userId: string; email: string; displayName: string; avatarColor: string }
interface CursorInfo { userId: string; x: number; y: number; color: string }

type Tool = 'select' | 'seat' | 'pan'
type MouseState = 'idle' | 'panning' | 'rubber-band' | 'move-seats' | 'seat-draw'

const SEAT_RADIUS = 11
const SEAT_COLORS: Record<string, string> = { Available: '#4ade80', Holding: '#facc15', Sold: '#ef4444', Blocked: '#6b7280' }
// Fill tint per seat type (1-4) — blended with status color on canvas via border
const TYPE_BORDER_COLORS: Record<number, string> = { 1: '#94a3b8', 2: '#a78bfa', 3: '#fb923c', 4: '#f472b6' }

function bandLabel(i: number): string {
  let label = ''; let n = i
  do { label = String.fromCharCode(65 + (n % 26)) + label; n = Math.floor(n / 26) - 1 } while (n >= 0)
  return label
}

export function SeatDesignerPage({ user }: { user?: UserInfo | null }) {
  const { eventId, seatMapId: paramSeatMapId } = useParams<{ eventId: string; seatMapId?: string }>()
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const seatMapId = paramSeatMapId || ''

  const [readOnly, setReadOnly] = useState(() => searchParams.get('readOnly') === 'true')
  useEffect(() => {
    if (searchParams.get('readOnly') === 'true') { setReadOnly(true); return }
    const orgId = searchParams.get('orgId')
    if (!orgId || user?.currentRole !== 'Staff') return
    getMyMembership(orgId).then(m => setReadOnly(!m.isDesigner)).catch(() => setReadOnly(true))
  }, [searchParams, user?.currentRole])

  /* ===== Seat Map Picker ===== */
  const [seatMaps, setSeatMaps] = useState<SeatMapResponse[]>([])
  const [loadingMaps, setLoadingMaps] = useState(false)
  const [showCreateMap, setShowCreateMap] = useState(false)
  const [newMapName, setNewMapName] = useState('')
  const [newMapChartId, setNewMapChartId] = useState('')
  const [loadingCharts, setLoadingCharts] = useState(false)
  const [charts, setCharts] = useState<ChartResponse[]>([])

  useEffect(() => {
    if (!eventId || seatMapId) return
    setLoadingMaps(true)
    getSeatMapsByEvent(eventId).then(r => setSeatMaps(Array.isArray(r) ? r : [])).catch(() => {}).finally(() => setLoadingMaps(false))
  }, [eventId, seatMapId])

  const handleOpenCreateMap = async () => {
    setShowCreateMap(true)
    if (!eventId) return
    setLoadingCharts(true)
    try { const r = await getCharts(eventId); setCharts(r.data); if (r.data.length > 0) setNewMapChartId(r.data[0].id) }
    catch { }
    finally { setLoadingCharts(false) }
  }

  const handleCreateSeatMap = async () => {
    if (!eventId || !newMapName || !newMapChartId) return
    try { const c = await createSeatMap({ chartId: newMapChartId, eventId, name: newMapName }); navigate(`/events/${eventId}/seat-design/${c.id}`) } catch { }
  }

  if (!seatMapId) {
    return (
      <div className="fade-in space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1>Seat Map Designer</h1>
            <p className="text-sm text-slate-400">Select or create a seat map for this event.</p>
            <Link to="/events" className="text-xs text-slate-500 hover:text-slate-300 transition-colors">← Back to events</Link>
          </div>
          <button className="rounded-xl bg-indigo-500 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-400" onClick={handleOpenCreateMap}>+ Create Seat Map</button>
        </div>
        {showCreateMap && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={() => setShowCreateMap(false)}>
            <div className="glass w-full max-w-md p-6 fade-in" onClick={e => e.stopPropagation()}>
              <h2 className="mb-4">Create Seat Map</h2>
              <div className="space-y-4">
                <div><label>Name</label><input value={newMapName} onChange={e => setNewMapName(e.target.value)} placeholder="e.g. Main Hall" /></div>
                <div>
                  <label>Chart</label>
                  {loadingCharts ? (
                    <p className="text-xs text-slate-400">Loading charts…</p>
                  ) : charts.length === 0 ? (
                    <p className="text-xs text-red-400">No charts found. Create a chart for this event first.</p>
                  ) : (
                    <select value={newMapChartId} onChange={e => setNewMapChartId(e.target.value)}>
                      {charts.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                  )}
                </div>
                <div className="flex justify-end gap-2">
                  <button className="rounded-lg border border-slate-600 px-4 py-2 text-sm text-slate-300" onClick={() => setShowCreateMap(false)}>Cancel</button>
                  <button className="rounded-lg bg-indigo-500 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-400" onClick={handleCreateSeatMap}>Create</button>
                </div>
              </div>
            </div>
          </div>
        )}
        {loadingMaps ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">{Array.from({ length: 3 }).map((_, i) => <div key={i} className="glass p-5"><div className="skeleton h-4 w-3/4 mb-2" /><div className="skeleton h-3 w-1/2" /></div>)}</div>
        ) : seatMaps.length === 0 ? (
          <div className="glass p-8 text-center text-sm text-slate-400">No seat maps yet. Click "+ Create Seat Map" to begin.</div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {seatMaps.map(sm => (
              <div key={sm.id} className="glass p-5 cursor-pointer transition-all hover:border-indigo-500/30" onClick={() => navigate(`/events/${eventId}/seat-design/${sm.id}`)}>
                <div className="flex items-center justify-between mb-2">
                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase ${sm.status === 'Published' ? 'bg-emerald-500/15 text-emerald-400' : 'bg-slate-700/40 text-slate-400'}`}>{sm.status}</span>
                  <span className="text-xs text-slate-500">v{sm.version}</span>
                </div>
                <h3 className="text-sm font-semibold">{sm.name}</h3>
                <div className="mt-2 flex items-center justify-between text-xs text-slate-500">
                  <span>{new Date(sm.createdAt).toLocaleDateString('en-US')}</span>
                  <span className="text-indigo-400 font-medium">Design →</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    )
  }

  /* ===== Designer ===== */
  return <Designer seatMapId={seatMapId} eventId={eventId || ''} readOnly={readOnly} />
}

/* ===== LegendSection — reusable, handles loading/error/retry ===== */
function LegendSection({ legends, loading, error, onRetry, mode, selectedSeats, onSelect }: {
  legends: LegendResponse[]; loading: boolean; error: boolean; onRetry: () => void
  mode: 'list' | 'picker'; selectedSeats?: FlatSeat[]; onSelect?: (id: string | null) => void
}) {
  const label = mode === 'picker' ? 'Legend' : 'Legends'
  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">{label}</p>
        {error && (
          <button onClick={onRetry} className="text-[10px] text-indigo-400 hover:text-indigo-300 transition-colors">
            Retry ↺
          </button>
        )}
      </div>
      {loading ? (
        <div className="flex items-center gap-2 px-1">
          <div className="h-2 w-2 rounded-full bg-slate-600 animate-pulse" />
          <span className="text-[11px] text-slate-600">Loading…</span>
        </div>
      ) : error ? (
        <p className="text-[11px] text-red-400/70 px-1">Failed to load. <button className="underline" onClick={onRetry}>Retry</button></p>
      ) : legends.length === 0 ? (
        <p className="text-[11px] text-slate-600 px-1">{mode === 'picker' ? 'No legends. Create in event settings.' : 'No legends for this event.'}</p>
      ) : mode === 'picker' && selectedSeats && onSelect ? (
        <div className="space-y-1">
          <button onClick={() => onSelect(null)}
            className={`w-full flex items-center gap-2.5 rounded-lg px-3 py-1.5 text-xs transition-colors ${selectedSeats.every(s => !s.legendId) ? 'bg-slate-700/60 text-slate-200 border border-slate-600/60' : 'text-slate-500 hover:bg-slate-800/50 border border-transparent'}`}>
            <span className="h-3 w-3 rounded-full flex-shrink-0 border border-slate-600 bg-transparent" />
            <span>None</span>
          </button>
          {legends.map(l => (
            <button key={l.id} onClick={() => onSelect(l.id)}
              className={`w-full flex items-center gap-2.5 rounded-lg px-3 py-1.5 text-xs transition-colors ${selectedSeats.every(s => s.legendId === l.id) ? 'bg-slate-700/60 text-slate-200 border border-slate-600/60' : 'text-slate-400 hover:bg-slate-800/50 border border-transparent'}`}>
              <span className="h-3 w-3 rounded-full flex-shrink-0 border-2 bg-transparent" style={{ borderColor: l.color || '#64748b' }} />
              <span className="truncate flex-1 text-left">{l.name}</span>
              <span className="text-slate-600 tabular-nums">${l.price}</span>
            </button>
          ))}
        </div>
      ) : (
        <div className="space-y-1.5">
          {legends.map(l => (
            <div key={l.id} className="flex items-center gap-2.5 text-xs text-slate-400">
              <span className="h-3 w-3 rounded-full flex-shrink-0 border-2 bg-transparent" style={{ borderColor: l.color || '#64748b' }} />
              <span className="truncate">{l.name}</span>
              <span className="ml-auto text-slate-600 tabular-nums">${l.price}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

/* ===== Designer component (separated to avoid hook-ordering issues with picker early return) ===== */
function Designer({ seatMapId, eventId, readOnly }: { seatMapId: string; eventId: string; readOnly: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  /* Canvas view */
  const [zoom, setZoom] = useState(1)
  const [pan, setPan] = useState({ x: 0, y: 0 })
  const hasFittedRef = useRef(false)

  /* Data */
  const [seatMapName, setSeatMapName] = useState('')
  const [seats, setSeats] = useState<FlatSeat[]>([])
  const [legends, setLegends] = useState<LegendResponse[]>([])
  const [legendsLoading, setLegendsLoading] = useState(false)
  const [legendsError, setLegendsError] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [connected, setConnected] = useState(false)

  /* Selection */
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())

  /* Tools & mouse state */
  const [tool, setTool] = useState<Tool>('select')
  const mouseStateRef = useRef<MouseState>('idle')

  /* Rubber-band */
  const [rubberBand, setRubberBand] = useState<{ x1: number; y1: number; x2: number; y2: number } | null>(null)
  const rubberBandStart = useRef<{ x: number; y: number } | null>(null)

  /* Seat draw preview */
  const [seatDrawPreview, setSeatDrawPreview] = useState<{ x: number; y: number }[] | null>(null)
  const seatDrawStart = useRef<{ x: number; y: number } | null>(null)

  /* Move */
  const [liveMoveOffset, setLiveMoveOffset] = useState<{ dx: number; dy: number } | null>(null)
  const moveStartRef = useRef<{ mx: number; my: number; origPositions: Map<string, { x: number; y: number }> } | null>(null)

  /* Panning */
  const panStartRef = useRef({ x: 0, y: 0 })

  /* Presence */
  const [onlineUsers, setOnlineUsers] = useState<OnlineUser[]>([])
  const [cursors, setCursors] = useState<CursorInfo[]>([])

  /* Versions */
  const [versions, setVersions] = useState<SeatMapVersionResponse[]>([])
  const [showVersions, setShowVersions] = useState(false)

  /* Seat spacing for drag-draw */
  const [seatSpacing, setSeatSpacing] = useState(28)

  /* ===== Load & Hub ===== */
  const loadLegends = useCallback(async () => {
    if (!eventId) return
    setLegendsLoading(true)
    setLegendsError(false)
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        if (attempt > 0) await new Promise(r => setTimeout(r, 1500))
        const res = await getLegends(eventId, 1, 200)
        setLegends(res.data || [])
        setLegendsLoading(false)
        return
      } catch { /* retry once */ }
    }
    setLegendsError(true)
    setLegendsLoading(false)
  }, [eventId])

  const loadSeatMap = useCallback(async () => {
    if (!seatMapId) return
    setLoading(true)
    try {
      // Metadata (name) and the full seat list come from separate endpoints now.
      const [meta, seatList] = await Promise.all([getSeatMapById(seatMapId), getSeatMapSeats(seatMapId)])
      setSeatMapName(meta.name)
      const flat: FlatSeat[] = (seatList || []).map((seat: any) => {
        let x = 200, y = 200
        if (seat.position) { try { const p = JSON.parse(seat.position); x = p.x; y = p.y } catch { } }
        return { id: seat.id, seatMapId, label: seat.label, seatNumber: seat.seatNumber, status: seat.status, seatType: seat.seatType, legendId: seat.legendId, x, y }
      })
      setSeats(flat)
    } catch (e: any) {
      setError(e?.response?.data?.message || 'Failed to load seat map.')
    } finally {
      setLoading(false)
    }
  }, [seatMapId])

  const connectHub = useCallback(async () => {
    if (!seatMapId) return
    try {
      const conn = await hub.connectToHub(seatMapId)
      setConnected(true)

      conn.on('CurrentPresence', (d: { onlineUsers: OnlineUser[] }) => setOnlineUsers(d.onlineUsers || []))
      conn.on('UserJoined', (u: OnlineUser) => setOnlineUsers(prev => [...prev.filter(x => x.userId !== u.userId), u]))
      conn.on('UserLeft', (uid: string) => { setOnlineUsers(prev => prev.filter(x => x.userId !== uid)); setCursors(prev => prev.filter(c => c.userId !== uid)) })
      conn.on('CursorMoved', (d: { userId: string; x: number; y: number }) => setCursors(prev => [...prev.filter(c => c.userId !== d.userId), { userId: d.userId, x: d.x, y: d.y, color: '#818cf8' /* overridden at draw time */ }]))

      /* Seat events */
      conn.on('SeatAdded', (seat: any) => {
        let x = 200, y = 200
        if (seat.position) { try { const p = JSON.parse(seat.position); x = p.x; y = p.y } catch { } }
        setSeats(prev => [...prev, { id: seat.id, seatMapId: seat.seatMapId, label: seat.label, seatNumber: seat.seatNumber, status: seat.status, seatType: seat.seatType, legendId: seat.legendId, x, y }])
      })
      conn.on('SeatsUpdated', (updated: any[]) => {
        const byId = new Map((updated || []).map((u: any) => [u.id, u]))
        setSeats(prev => prev.map(s => {
          const u = byId.get(s.id)
          if (!u) return s
          let x = s.x, y = s.y
          if (u.position) { try { const p = JSON.parse(u.position); x = p.x; y = p.y } catch { } }
          return { ...s, x, y, label: u.label ?? s.label, seatType: u.seatType ?? s.seatType, legendId: 'legendId' in u ? (u.legendId ?? undefined) : s.legendId }
        }))
      })
      conn.on('SeatsDeleted', (ids: string[]) => {
        const idSet = new Set(ids)
        setSeats(prev => prev.filter(s => !idSet.has(s.id)))
        setSelectedIds(prev => { const n = new Set(prev); ids.forEach(id => n.delete(id)); return n })
      })

      conn.on('AutoSaved', (d: any) => console.log('Auto-saved v' + d.versionNumber))
    } catch {
      setConnected(false)
    }
  }, [seatMapId])

  useEffect(() => {
    loadSeatMap()
    connectHub()
    return () => { hub.disconnectFromHub(seatMapId) }
  }, [seatMapId])

  useEffect(() => { loadLegends() }, [loadLegends])

  /* ===== Legend color map — memoized, used by draw ===== */
  const legendColorMap = useMemo(() => new Map(legends.map(l => [l.id, l.color || null])), [legends])

  /* ===== Canvas rendering ===== */
  const draw = useCallback(() => {
    const canvas = canvasRef.current; if (!canvas) return
    const ctx = canvas.getContext('2d'); if (!ctx) return
    const w = canvas.width, h = canvas.height
    ctx.clearRect(0, 0, w, h)
    ctx.fillStyle = '#f1f5f9'; ctx.fillRect(0, 0, w, h)
    ctx.save(); ctx.translate(pan.x, pan.y); ctx.scale(zoom, zoom)

    /* Grid */
    ctx.strokeStyle = 'rgba(0,0,0,0.07)'; ctx.lineWidth = 1 / zoom
    const step = 40
    const startX = Math.floor(-pan.x / zoom / step) * step
    const startY = Math.floor(-pan.y / zoom / step) * step
    const endX = startX + (w / zoom) + step * 2
    const endY = startY + (h / zoom) + step * 2
    for (let x = startX; x < endX; x += step) { ctx.beginPath(); ctx.moveTo(x, startY); ctx.lineTo(x, endY); ctx.stroke() }
    for (let y = startY; y < endY; y += step) { ctx.beginPath(); ctx.moveTo(startX, y); ctx.lineTo(endX, y); ctx.stroke() }

    /* Seats */
    const R = SEAT_RADIUS
    seats.forEach(seat => {
      const isSelected = selectedIds.has(seat.id)
      let drawX = seat.x, drawY = seat.y
      if (isSelected && liveMoveOffset) { drawX += liveMoveOffset.dx; drawY += liveMoveOffset.dy }

      /* Selection glow */
      if (isSelected) {
        ctx.save()
        ctx.shadowColor = '#6366f1'; ctx.shadowBlur = 8 / zoom
        ctx.beginPath(); ctx.arc(drawX, drawY, R + 3 / zoom, 0, Math.PI * 2)
        ctx.strokeStyle = '#818cf8'; ctx.lineWidth = 2 / zoom; ctx.stroke()
        ctx.restore()
      }

      /* Fill = status color */
      const fillColor = SEAT_COLORS[seat.status] || SEAT_COLORS.Available
      ctx.beginPath(); ctx.arc(drawX, drawY, R, 0, Math.PI * 2)
      ctx.fillStyle = fillColor; ctx.fill()

      /* Outer border: legend color > type color */
      const legendColor = seat.legendId ? legendColorMap.get(seat.legendId) : null
      const borderColor = legendColor || TYPE_BORDER_COLORS[seat.seatType] || '#94a3b8'
      ctx.strokeStyle = borderColor; ctx.lineWidth = 3 / zoom; ctx.stroke()

      /* Seat label */
      ctx.fillStyle = '#0f172a'; ctx.font = `bold 7px Inter,sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
      ctx.fillText(seat.label || String(seat.seatNumber), drawX, drawY)
    })

    /* Rubber-band selection rect */
    if (rubberBand) {
      const { x1, y1, x2, y2 } = rubberBand
      const rx = Math.min(x1, x2), ry = Math.min(y1, y2)
      const rw = Math.abs(x2 - x1), rh = Math.abs(y2 - y1)
      ctx.fillStyle = 'rgba(99,102,241,0.08)'; ctx.strokeStyle = '#6366f1'
      ctx.lineWidth = 1.5 / zoom; ctx.setLineDash([6 / zoom, 3 / zoom])
      ctx.beginPath(); ctx.rect(rx, ry, rw, rh); ctx.fill(); ctx.stroke(); ctx.setLineDash([])
    }

    /* Seat draw preview */
    if (seatDrawPreview && seatDrawPreview.length > 0) {
      seatDrawPreview.forEach((p, i) => {
        ctx.save()
        ctx.globalAlpha = 0.6; ctx.fillStyle = '#818cf8'
        ctx.beginPath(); ctx.arc(p.x, p.y, R, 0, Math.PI * 2); ctx.fill()
        ctx.globalAlpha = 1; ctx.fillStyle = '#fff'; ctx.font = `bold ${7}px Inter,sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
        ctx.fillText(String(i + 1), p.x, p.y)
        ctx.restore()
      })
      if (seatDrawPreview.length > 1) {
        const first = seatDrawPreview[0], last = seatDrawPreview[seatDrawPreview.length - 1]
        ctx.save(); ctx.strokeStyle = '#818cf8'; ctx.lineWidth = 1 / zoom; ctx.setLineDash([4 / zoom, 2 / zoom])
        ctx.beginPath(); ctx.moveTo(first.x, first.y); ctx.lineTo(last.x, last.y); ctx.stroke(); ctx.setLineDash([])
        const label = `${seatDrawPreview.length} seats`
        ctx.font = `${10 / zoom}px Inter,sans-serif`; ctx.textAlign = 'center'
        const tw = ctx.measureText(label).width
        const mx = (first.x + last.x) / 2, my = Math.min(first.y, last.y) - 16 / zoom
        ctx.fillStyle = 'rgba(15,23,42,0.85)'; ctx.beginPath(); ctx.roundRect(mx - tw / 2 - 6 / zoom, my - 8 / zoom, tw + 12 / zoom, 16 / zoom, 4 / zoom); ctx.fill()
        ctx.fillStyle = '#e2e8f0'; ctx.textBaseline = 'middle'; ctx.fillText(label, mx, my)
        ctx.restore()
      }
    }

    /* Remote cursors */
    cursors.forEach(c => {
      const user = onlineUsers.find(u => u.userId === c.userId)
      const color = user?.avatarColor || '#818cf8'
      const name = user?.displayName || user?.email || ''
      const S = 1 / zoom
      ctx.save()
      ctx.fillStyle = color
      ctx.beginPath()
      ctx.moveTo(c.x, c.y)
      ctx.lineTo(c.x + 10 * S, c.y + 14 * S)
      ctx.lineTo(c.x + 4 * S, c.y + 14 * S)
      ctx.lineTo(c.x, c.y + 20 * S)
      ctx.closePath(); ctx.fill()
      ctx.strokeStyle = 'rgba(0,0,0,0.3)'; ctx.lineWidth = 0.8 * S; ctx.stroke()
      if (name) {
        const fontSize = 11 * S
        ctx.font = `bold ${fontSize}px Inter,sans-serif`
        const tw = ctx.measureText(name).width
        const px = c.x + 12 * S, py = c.y + 4 * S
        ctx.fillStyle = color
        ctx.beginPath(); ctx.roundRect(px - 3 * S, py - fontSize * 0.85, tw + 6 * S, fontSize * 1.4, 3 * S); ctx.fill()
        ctx.fillStyle = '#fff'; ctx.textAlign = 'left'; ctx.textBaseline = 'top'
        ctx.fillText(name, px, py - fontSize * 0.75)
      }
      ctx.restore()
    })

    ctx.restore()
  }, [seats, legendColorMap, pan, zoom, selectedIds, rubberBand, seatDrawPreview, liveMoveOffset, cursors, onlineUsers])

  const fitToContent = useCallback(() => {
    const c = canvasRef.current
    if (!c) return
    if (seats.length === 0) {
      setZoom(1)
      setPan({ x: c.width / 2 - 400, y: c.height / 2 - 300 })
      return
    }
    const bbox = bboxFromPoints(seats, SEAT_RADIUS + 4)
    if (!bbox) return
    const view = fitToBoundingBox(bbox, c.width, c.height, 80, 1.5)
    setZoom(view.zoom)
    setPan(view.pan)
  }, [seats])

  useEffect(() => { draw() }, [draw])
  useEffect(() => {
    const c = canvasRef.current; if (!c) return
    const ro = new ResizeObserver(() => {
      c.width = c.clientWidth; c.height = c.clientHeight
      if (!hasFittedRef.current && !loading) { fitToContent(); hasFittedRef.current = true }
      draw()
    })
    ro.observe(c); return () => ro.disconnect()
  }, [draw, loading, fitToContent])

  /* Auto-fit when seats first become available */
  useEffect(() => {
    if (loading || hasFittedRef.current) return
    const c = canvasRef.current
    if (!c || c.width === 0 || c.height === 0) return
    fitToContent()
    hasFittedRef.current = true
  }, [loading, seats, fitToContent])

  /* ===== Coordinate helpers ===== */
  const toCanvas = (e: React.MouseEvent) => {
    const c = canvasRef.current!; const r = c.getBoundingClientRect()
    return { mx: (e.clientX - r.left - pan.x) / zoom, my: (e.clientY - r.top - pan.y) / zoom }
  }

  const hitSeat = (mx: number, my: number): FlatSeat | null => {
    for (let i = seats.length - 1; i >= 0; i--) {
      const s = seats[i]
      const dx = mx - s.x, dy = my - s.y
      if (dx * dx + dy * dy <= (SEAT_RADIUS + 2) * (SEAT_RADIUS + 2)) return s
    }
    return null
  }

  const seatsInRect = (x1: number, y1: number, x2: number, y2: number): string[] => {
    const rx = Math.min(x1, x2), ry = Math.min(y1, y2), rx2 = Math.max(x1, x2), ry2 = Math.max(y1, y2)
    return seats.filter(s => s.x >= rx && s.x <= rx2 && s.y >= ry && s.y <= ry2).map(s => s.id)
  }

  /* ===== Mouse handlers ===== */
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault(); setZoom(z => Math.max(0.2, Math.min(4, z * (e.deltaY > 0 ? 0.9 : 1.1))))
  }

  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button === 1 || (e.button === 0 && e.altKey) || (e.button === 0 && tool === 'pan')) {
      mouseStateRef.current = 'panning'; panStartRef.current = { x: e.clientX - pan.x, y: e.clientY - pan.y }; return
    }
    if (e.button !== 0) return
    const { mx, my } = toCanvas(e)

    if (tool === 'seat') {
      mouseStateRef.current = 'seat-draw'; seatDrawStart.current = { x: mx, y: my }
      setSeatDrawPreview([{ x: mx, y: my }]); return
    }

    if (tool === 'select') {
      const hit = hitSeat(mx, my)
      if (hit) {
        if (e.shiftKey) {
          setSelectedIds(prev => { const n = new Set(prev); n.has(hit.id) ? n.delete(hit.id) : n.add(hit.id); return n })
        } else {
          if (!selectedIds.has(hit.id)) setSelectedIds(new Set([hit.id]))
        }
        const origPositions = new Map<string, { x: number; y: number }>()
        const idsToMove = e.shiftKey ? new Set([...selectedIds, hit.id]) : (selectedIds.has(hit.id) ? selectedIds : new Set([hit.id]))
        seats.forEach(s => { if (idsToMove.has(s.id)) origPositions.set(s.id, { x: s.x, y: s.y }) })
        moveStartRef.current = { mx, my, origPositions }
        mouseStateRef.current = 'move-seats'
      } else {
        if (!e.shiftKey) setSelectedIds(new Set())
        mouseStateRef.current = 'rubber-band'; rubberBandStart.current = { x: mx, y: my }
        setRubberBand({ x1: mx, y1: my, x2: mx, y2: my })
      }
    }
  }

  const handleMouseMove = (e: React.MouseEvent) => {
    const state = mouseStateRef.current

    if (state === 'panning') {
      setPan({ x: e.clientX - panStartRef.current.x, y: e.clientY - panStartRef.current.y }); return
    }

    const { mx, my } = toCanvas(e)
    if (connected && seatMapId) hub.sendCursorPosition(seatMapId, mx, my)

    if (state === 'rubber-band' && rubberBandStart.current) {
      setRubberBand({ x1: rubberBandStart.current.x, y1: rubberBandStart.current.y, x2: mx, y2: my }); return
    }

    if (state === 'move-seats' && moveStartRef.current) {
      const { mx: startMx, my: startMy } = moveStartRef.current
      setLiveMoveOffset({ dx: mx - startMx, dy: my - startMy }); return
    }

    if (state === 'seat-draw' && seatDrawStart.current) {
      const { x: sx, y: sy } = seatDrawStart.current
      const dx = mx - sx, dy = my - sy
      const dist = Math.sqrt(dx * dx + dy * dy)
      if (dist < 5) { setSeatDrawPreview([{ x: sx, y: sy }]); return }
      const count = Math.max(2, Math.floor(dist / seatSpacing) + 1)
      const pts = Array.from({ length: count }, (_, i) => {
        const t = i / (count - 1)
        return { x: sx + dx * t, y: sy + dy * t }
      })
      setSeatDrawPreview(pts); return
    }

    /* Update cursor */
    if (state === 'idle' && tool === 'select' && canvasRef.current) {
      const hit = hitSeat(mx, my)
      canvasRef.current.style.cursor = hit ? (selectedIds.has(hit.id) ? 'move' : 'pointer') : 'default'
    }
  }

  const handleMouseUp = async (e: React.MouseEvent) => {
    const state = mouseStateRef.current
    mouseStateRef.current = 'idle'

    if (state === 'panning') return

    const { mx, my } = toCanvas(e)

    if (state === 'rubber-band') {
      setRubberBand(null)
      if (rubberBandStart.current) {
        const { x: x1, y: y1 } = rubberBandStart.current
        const w = Math.abs(mx - x1), h = Math.abs(my - y1)
        if (w > 4 || h > 4) {
          const ids = seatsInRect(x1, y1, mx, my)
          setSelectedIds(prev => e.shiftKey ? new Set([...prev, ...ids]) : new Set(ids))
        }
        rubberBandStart.current = null
      }
      return
    }

    if (state === 'move-seats' && moveStartRef.current) {
      const { origPositions } = moveStartRef.current
      const dx = liveMoveOffset?.dx ?? 0, dy = liveMoveOffset?.dy ?? 0
      setLiveMoveOffset(null); moveStartRef.current = null
      if (Math.abs(dx) < 1 && Math.abs(dy) < 1) return
      if (!readOnly) {
        const updates = Array.from(origPositions.entries()).map(([id, pos]) => ({
          seatId: id, position: JSON.stringify({ x: Math.round(pos.x + dx), y: Math.round(pos.y + dy) })
        }))
        setSeats(prev => prev.map(s => {
          const orig = origPositions.get(s.id)
          if (!orig) return s
          return { ...s, x: Math.round(orig.x + dx), y: Math.round(orig.y + dy) }
        }))
        hub.updateSeats(seatMapId, { seats: updates })?.catch(loadSeatMap)
      }
      return
    }

    if (state === 'seat-draw' && seatDrawPreview && seatDrawPreview.length > 0) {
      setSeatDrawPreview(null); seatDrawStart.current = null
      if (!readOnly) {
        try {
          const baseNum = seats.length
          await Promise.all(seatDrawPreview.map((p, i) =>
            hub.addSeat(seatMapId, {
              seatMapId, label: `S${baseNum + i + 1}`, seatNumber: baseNum + i + 1,
              seatType: 1, position: JSON.stringify({ x: Math.round(p.x), y: Math.round(p.y) })
            })
          ))
        } catch (ex: any) { alert('Place seat failed: ' + (ex?.message || ex)) }
      }
    }
  }

  const handleMouseLeave = () => {
    if (mouseStateRef.current === 'panning') mouseStateRef.current = 'idle'
    setSeatDrawPreview(null)
  }

  /* ===== Keyboard ===== */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedIds.size > 0) {
        if (!(e.target instanceof HTMLInputElement) && !(e.target instanceof HTMLTextAreaElement)) {
          e.preventDefault()
          if (!connected || readOnly) return
          const ids = [...selectedIds]
          setSelectedIds(new Set())
          setSeats(prev => prev.filter(s => !ids.includes(s.id)))
          hub.deleteSeats(seatMapId, ids)?.catch(loadSeatMap)
        }
      }
      if (e.key === 'Escape') { setSelectedIds(new Set()); setSeatDrawPreview(null); setTool('select') }
      if (e.key === 'a' && (e.ctrlKey || e.metaKey)) { e.preventDefault(); setSelectedIds(new Set(seats.map(s => s.id))) }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [selectedIds, seats, seatMapId, connected])

  /* ===== Actions ===== */
  const handleDeleteSelected = () => {
    if (!selectedIds.size || !connected || readOnly) return
    const ids = [...selectedIds]; setSelectedIds(new Set())
    setSeats(prev => prev.filter(s => !ids.includes(s.id)))
    hub.deleteSeats(seatMapId, ids)?.catch(loadSeatMap)
  }

  const handleSetLegend = (legendId: string | null) => {
    if (readOnly) return
    const ids = [...selectedIds]
    setSeats(prev => prev.map(s => selectedIds.has(s.id) ? { ...s, legendId: legendId ?? undefined } : s))
    hub.setSeatLegend(seatMapId, ids, legendId)?.catch(loadSeatMap)
  }

  const handleUpdateSeatType = (seatType: number) => {
    if (readOnly) return
    const updates = [...selectedIds].map(id => ({ seatId: id, seatType }))
    setSeats(prev => prev.map(s => selectedIds.has(s.id) ? { ...s, seatType } : s))
    hub.updateSeats(seatMapId, { seats: updates })?.catch(loadSeatMap)
  }

  const handleAutoLabel = () => {
    if (seats.length === 0 || readOnly) return
    const sorted = [...seats].sort((a, b) => a.y - b.y)
    const threshold = seatSpacing * 0.7
    const bands: FlatSeat[][] = []
    for (const seat of sorted) {
      const last = bands[bands.length - 1]
      if (!last || seat.y - last[last.length - 1].y > threshold) bands.push([seat])
      else last.push(seat)
    }
    const assignments: { id: string; label: string }[] = []
    bands.forEach((band, bi) => {
      const row = [...band].sort((a, b) => a.x - b.x)
      row.forEach((seat, ci) => assignments.push({ id: seat.id, label: `${bandLabel(bi)}${ci + 1}` }))
    })
    const labelMap = new Map(assignments.map(a => [a.id, a.label]))
    setSeats(prev => prev.map(s => ({ ...s, label: labelMap.get(s.id) ?? s.label })))
    const updates = assignments.map(a => ({ seatId: a.id, label: a.label }))
    hub.updateSeats(seatMapId, { seats: updates })?.catch(loadSeatMap)
  }

  const handleSaveVersion = async () => {
    try { await saveVersion(seatMapId, 'Manual save'); alert('Version saved!') } catch { alert('Save failed.') }
  }

  const handleLoadVersions = async () => {
    setVersions(await getVersions(seatMapId)); setShowVersions(true)
  }

  const handleRestoreVersion = async (vid: string) => {
    if (!confirm('Restore this version?')) return
    try {
      const v = await restoreVersion(seatMapId, vid)
      const snap = JSON.parse(v.snapshot)
      if (snap.seats) {
        const flat: FlatSeat[] = (snap.seats || []).map((seat: any) => {
          let x = 200, y = 200
          if (seat.position) { try { const p = JSON.parse(seat.position); x = p.x; y = p.y } catch { } }
          return { id: seat.id, seatMapId: seat.seatMapId, label: seat.label, seatNumber: seat.seatNumber, status: seat.status, seatType: seat.seatType, x, y }
        })
        setSeats(flat)
      }
      setShowVersions(false)
    } catch { alert('Restore failed.') }
  }

  /* ===== Derived ===== */
  const selectedSeats = seats.filter(s => selectedIds.has(s.id))
  const selSeatType = selectedSeats.length > 0 ? selectedSeats[0].seatType : null
  const uniformType = selectedSeats.every(s => s.seatType === selSeatType) ? selSeatType : null

  const legendStats = legends.map(l => ({ legend: l, count: seats.filter(s => s.legendId === l.id).length }))
  const noLegendCount = seats.filter(s => !s.legendId).length

  return (
    <div className="flex flex-col" style={{ height: '100vh' }}>
      {/* Toolbar */}
      <div className="flex items-center justify-between gap-3 border-b border-slate-800/60 bg-slate-950/90 px-4 py-2 backdrop-blur-xl">
        <div className="flex items-center gap-3">
          <h2 className="text-sm font-bold">{seatMapName || 'Designer'}</h2>
          <div className="flex items-center gap-1.5">
            <span className={`h-1.5 w-1.5 rounded-full ${connected ? 'bg-emerald-400 shadow-[0_0_4px_rgba(74,222,128,0.5)]' : 'bg-red-500'}`} />
            <span className="text-[10px] text-slate-500">{connected ? 'Live' : 'Offline'}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="flex -space-x-1.5">
              {onlineUsers.slice(0, 5).map(u => (
                <div key={u.userId} className="flex h-6 w-6 items-center justify-center rounded-full border-2 border-slate-950 text-[9px] font-bold shadow-sm" style={{ background: u.avatarColor }} title={u.displayName || u.email}>
                  {(u.displayName || u.email)[0]?.toUpperCase()}
                </div>
              ))}
              {onlineUsers.length > 5 && (
                <div className="flex h-6 w-6 items-center justify-center rounded-full border-2 border-slate-950 bg-slate-700 text-[9px] text-slate-300">+{onlineUsers.length - 5}</div>
              )}
            </div>
            {onlineUsers.length > 0 && (
              <span className="text-[10px] text-slate-500">{onlineUsers.length} online</span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-slate-500">{Math.round(zoom * 100)}%</span>
          <button className="rounded border border-slate-700 px-2 py-0.5 text-xs text-slate-400 hover:text-white" onClick={() => setZoom(z => Math.min(4, z * 1.2))}>+</button>
          <button className="rounded border border-slate-700 px-2 py-0.5 text-xs text-slate-400 hover:text-white" onClick={() => setZoom(z => Math.max(0.2, z * 0.8))}>−</button>
          <button className="rounded border border-slate-700 px-2 py-0.5 text-xs text-slate-400 hover:text-white" onClick={fitToContent}>Fit</button>
          {readOnly
            ? <span className="rounded-full bg-amber-500/15 px-2.5 py-0.5 text-[10px] font-semibold text-amber-400">View Only</span>
            : (<>
                <div className="h-4 w-px bg-slate-700" />
                <button className="rounded border border-slate-700 px-2.5 py-0.5 text-xs text-slate-400 hover:text-white" onClick={handleAutoLabel} title="Auto-assign row/seat labels based on position">Auto-label</button>
                <button className="rounded border border-slate-700 px-2.5 py-0.5 text-xs text-slate-400 hover:text-white" onClick={handleSaveVersion}>Save</button>
                <button className="rounded border border-slate-700 px-2.5 py-0.5 text-xs text-slate-400 hover:text-white" onClick={handleLoadVersions}>Versions</button>
              </>)
          }
        </div>
      </div>

      <div className="grid flex-1 overflow-hidden" style={{ gridTemplateColumns: '1fr 250px' }}>
        {/* Canvas */}
        <div className="relative overflow-hidden bg-slate-100">
          {loading
            ? <div className="flex h-full items-center justify-center"><div className="spinner" /><span className="ml-3 text-sm text-slate-400">Loading…</span></div>
            : error
            ? <div className="flex h-full items-center justify-center text-sm text-slate-400">{error}</div>
            : <canvas
                ref={canvasRef}
                className="block h-full w-full"
                style={{ cursor: tool === 'seat' ? 'crosshair' : tool === 'pan' ? (mouseStateRef.current === 'panning' ? 'grabbing' : 'grab') : 'default' }}
                onWheel={handleWheel}
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseLeave}
              />
          }

          {/* Floating toolbar — Figma-style */}
          <div className="pointer-events-auto absolute top-4 left-1/2 -translate-x-1/2 flex items-center gap-0.5 rounded-xl border border-slate-700/60 bg-slate-900/90 px-1.5 py-1.5 shadow-xl backdrop-blur-md">
            {(([
              ['select', '↖', 'Select  V'],
              ['pan',    '✋', 'Pan  H'],
              ['seat',   '●', 'Seat  S'],
            ] as const).filter(([key]) => !readOnly || key !== 'seat')).map(([key, icon, hint]) => (
              <button key={key}
                title={hint}
                onClick={() => setTool(key)}
                className={`flex h-8 w-8 items-center justify-center rounded-lg text-base transition-colors ${tool === key ? 'bg-indigo-500 text-white shadow-sm' : 'text-slate-400 hover:bg-slate-700/60 hover:text-slate-200'}`}>
                {icon}
              </button>
            ))}

            {tool === 'seat' && (
              <>
                <div className="mx-1.5 h-5 w-px bg-slate-700" />
                <span className="text-[10px] text-slate-500 select-none">Spacing</span>
                <input
                  type="range" min={16} max={60} value={seatSpacing}
                  onChange={e => setSeatSpacing(+e.target.value)}
                  className="mx-1 w-20 accent-indigo-500"
                />
                <span className="w-6 text-center text-[10px] text-slate-400">{seatSpacing}</span>
              </>
            )}
          </div>

          {/* Hint bar */}
          <div className="pointer-events-none absolute bottom-4 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-slate-900/80 px-4 py-1.5 text-[11px] text-slate-300 backdrop-blur-sm">
            {tool === 'seat'
              ? seatDrawPreview && seatDrawPreview.length > 1
                ? `${seatDrawPreview.length} seats — release to place`
                : 'Click to place  •  Drag to draw a row'
              : tool === 'select'
              ? selectedIds.size > 0
                ? `${selectedIds.size} seat${selectedIds.size > 1 ? 's' : ''} selected — drag to move  •  Del  •  Esc`
                : 'Click to select  •  Drag to multi-select  •  Ctrl+A'
              : 'Drag to pan  •  Scroll to zoom  •  Esc = Select'}
          </div>
        </div>

        {/* Right panel — properties */}
        <div className="overflow-y-auto border-l border-slate-800/60 bg-slate-950/80 p-4 space-y-5">
          {selectedIds.size > 0 ? (
            <>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-3">
                  {selectedIds.size === 1 ? '1 Seat Selected' : `${selectedIds.size} Seats`}
                </p>

                {selectedIds.size === 1 && (() => {
                  const s = selectedSeats[0]
                  return (
                    <div className="space-y-2 text-xs">
                      <div className="flex justify-between rounded-lg bg-slate-900/40 px-3 py-2">
                        <span className="text-slate-500">Label</span>
                        <span className="font-medium text-slate-200">{s.label}</span>
                      </div>
                      <div className="flex justify-between rounded-lg bg-slate-900/40 px-3 py-2">
                        <span className="text-slate-500">Status</span>
                        <span className="font-semibold" style={{ color: SEAT_COLORS[s.status] || '#94a3b8' }}>{s.status}</span>
                      </div>
                      <div className="flex justify-between rounded-lg bg-slate-900/40 px-3 py-2">
                        <span className="text-slate-500">Position</span>
                        <span className="text-slate-300">{Math.round(s.x)}, {Math.round(s.y)}</span>
                      </div>
                    </div>
                  )
                })()}
              </div>

              {!readOnly && (
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-2">Seat Type</p>
                  <div className="grid grid-cols-4 gap-1.5">
                    {([1, 2, 3, 4] as const).map(t => (
                      <button key={t}
                        className={`rounded-lg py-2 text-[11px] font-semibold transition-colors ${uniformType === t ? 'text-white border-2' : 'border border-slate-700/40 text-slate-400 hover:bg-slate-800/50'}`}
                        style={uniformType === t ? { borderColor: TYPE_BORDER_COLORS[t], background: TYPE_BORDER_COLORS[t] + '22' } : {}}
                        onClick={() => handleUpdateSeatType(t)}>
                        {t}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <LegendSection
                legends={legends} loading={legendsLoading} error={legendsError}
                onRetry={loadLegends} mode={readOnly ? 'list' : 'picker'}
                selectedSeats={selectedSeats} onSelect={handleSetLegend}
              />

              {!readOnly && (
                <button
                  className="w-full rounded-lg border border-red-500/30 py-2 text-xs text-red-400 hover:bg-red-500/10 transition-colors"
                  onClick={handleDeleteSelected}>
                  Delete {selectedIds.size === 1 ? 'Seat' : `${selectedIds.size} Seats`}
                </button>
              )}
            </>
          ) : (
            <>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-2">Stats</p>
                <div className="space-y-1.5 text-xs">
                  <div className="flex justify-between rounded-lg bg-slate-900/40 px-3 py-1.5">
                    <span className="text-slate-500">Total seats</span>
                    <span className="font-semibold text-slate-200">{seats.length}</span>
                  </div>
                  {legendsLoading ? (
                    <div className="px-3 py-1 text-[11px] text-slate-600 animate-pulse">Loading legends…</div>
                  ) : (
                    <>
                      {legendStats.map(({ legend, count }) => (
                        <div key={legend.id} className="flex justify-between px-3 py-0.5">
                          <span className="flex items-center gap-1.5 text-slate-400 truncate mr-2">
                            <span className="h-2.5 w-2.5 rounded-full flex-shrink-0 border-2" style={{ borderColor: legend.color || '#64748b' }} />
                            <span className="truncate">{legend.name}</span>
                          </span>
                          <span className="text-slate-300 font-medium tabular-nums">{count}</span>
                        </div>
                      ))}
                      <div className="flex justify-between px-3 py-0.5">
                        <span className="flex items-center gap-1.5 text-slate-500">
                          <span className="h-2.5 w-2.5 rounded-full flex-shrink-0 border border-slate-600" />
                          None
                        </span>
                        <span className="text-slate-400 tabular-nums">{noLegendCount}</span>
                      </div>
                    </>
                  )}
                </div>
              </div>

              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-2">Status</p>
                <div className="space-y-1.5">
                  {Object.entries(SEAT_COLORS).map(([s, c]) => (
                    <div key={s} className="flex items-center gap-2.5 text-xs text-slate-400">
                      <span className="h-3 w-3 rounded-full flex-shrink-0" style={{ background: c }} />
                      {s}
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Versions modal */}
      {showVersions && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={() => setShowVersions(false)}>
          <div className="glass w-full max-w-md p-5 fade-in" onClick={e => e.stopPropagation()}>
            <h2 className="mb-3 text-lg">Versions</h2>
            {versions.length === 0
              ? <p className="text-sm text-slate-400">No versions saved yet.</p>
              : (
                <div className="space-y-2 max-h-80 overflow-y-auto">
                  {versions.map(v => (
                    <div key={v.id} className="flex items-center justify-between rounded-lg border border-slate-700/30 bg-slate-900/40 p-3 text-sm">
                      <div>
                        <strong>v{v.versionNumber}</strong>
                        <span className="ml-2 text-[11px] text-slate-500">{new Date(v.createdAt).toLocaleString('en-US')}</span>
                        {v.changeDescription && <p className="text-[11px] text-slate-500 m-0">{v.changeDescription}</p>}
                      </div>
                      <button className="text-xs text-indigo-400 hover:text-indigo-300" onClick={() => handleRestoreVersion(v.id)}>Restore</button>
                    </div>
                  ))}
                </div>
              )
            }
          </div>
        </div>
      )}
    </div>
  )
}
