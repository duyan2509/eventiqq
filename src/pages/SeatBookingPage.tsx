import { useEffect, useRef, useState, useCallback, useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { getSessionMeta, getSessionSeats, holdSeats } from '../api/seatApi'
import { getLegends } from '../api/legendApi'
import * as bookingHub from '../api/seatBookingHub'
import type { SeatMapMetaResponse, SeatLayoutResponse, SeatStatusUpdate, Bbox } from '../types/seat'
import type { LegendResponse } from '../types/index'
import {
  fitToBoundingBox, bboxFromRects, unionBbox, viewportWorldBbox, bboxContains,
  type BoundingBox,
} from '../utils/canvasFit'

/* ===== Types ===== */
interface Geometry { x: number; y: number; width: number; height: number; rotation?: number }
interface Style { fill: string; stroke: string }
interface SeatPos { x: number; y: number }
interface SeatHit { cx: number; cy: number; r: number; id: string }

const SEAT_COLORS: Record<string, string> = {
  Available: '#4ade80',
  Holding: '#facc15',
  Sold: '#ef4444',
}
const SELECTED_COLOR = '#818cf8'
const SEAT_RADIUS = 8

/* Convert an internal BoundingBox to the API bbox shape. */
const toApiBbox = (b: BoundingBox): Bbox => ({ x1: b.minX, y1: b.minY, x2: b.maxX, y2: b.maxY })
/* Convert the seat map's full bbox to an internal BoundingBox. */
const fullToBox = (b: Bbox): BoundingBox => ({ minX: b.x1, minY: b.y1, maxX: b.x2, maxY: b.y2 })

export function SeatBookingPage() {
  const { sessionId } = useParams<{ sessionId: string }>()

  const canvasRef = useRef<HTMLCanvasElement>(null)
  const seatHitsRef = useRef<SeatHit[]>([])

  const [meta, setMeta] = useState<SeatMapMetaResponse | null>(null)
  const [seatMapId, setSeatMapId] = useState('')
  /* Seats stream in by viewport; keyed by id so chunks merge without duplicates. */
  const [loadedSeats, setLoadedSeats] = useState<Map<string, SeatLayoutResponse>>(new Map())
  const [loadedBbox, setLoadedBbox] = useState<BoundingBox | null>(null)
  const loadedBboxRef = useRef<BoundingBox | null>(null)
  useEffect(() => { loadedBboxRef.current = loadedBbox }, [loadedBbox])

  const [statuses, setStatuses] = useState<Map<string, SeatStatusUpdate>>(new Map())
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [holding, setHolding] = useState(false)
  const [holdError, setHoldError] = useState<string | null>(null)
  const [legends, setLegends] = useState<LegendResponse[]>([])
  const legendMap = useMemo(() => {
    const m = new Map<string, LegendResponse>()
    legends.forEach(l => m.set(l.id, l))
    return m
  }, [legends])
  const [connected, setConnected] = useState(false)
  const [fetching, setFetching] = useState(false)
  const [zoom, setZoom] = useState(1)
  const [pan, setPan] = useState({ x: 0, y: 0 })
  const [tool, setTool] = useState<'select' | 'pan'>('select')
  const isPanning = useRef(false)
  const panStart = useRef({ x: 0, y: 0 })
  const [fitted, setFitted] = useState(false)
  const navigate = useNavigate()

  /* Fit the full seat map to the canvas viewport (uses meta bounds, not loaded seats). */
  const fitToContent = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas || !meta) return
    const objectsBbox = bboxFromRects(meta.objects ?? [], o => {
      try { return o.geometry ? JSON.parse(o.geometry) : null } catch { return null }
    })
    const seatsBbox = fullToBox(meta.fullBbox)
    const bbox = unionBbox(objectsBbox, seatsBbox)
    if (!bbox) return
    // Default to fully fitting the whole map in the viewport (matches the seat designer):
    // wide zoom bounds so small maps zoom in to fill and large venues zoom out to fit.
    // When the fitted viewport spans the entire map, ensureRegionLoaded fetches all
    // seats in one shot; panning/zooming afterwards still drives incremental loading.
    const view = fitToBoundingBox(bbox, canvas.width, canvas.height, 60, 4, 0.1)
    setZoom(view.zoom)
    setPan(view.pan)
  }, [meta])

  /* Load metadata (no seats) — retry up to 5×/2s for post-approval race */
  useEffect(() => {
    if (!sessionId) return
    let cancelled = false
    setLoading(true)
    setError(null)
    const attempt = async (triesLeft: number) => {
      try {
        const data = await getSessionMeta(sessionId)
        if (cancelled) return
        setMeta(data)
        setSeatMapId(data.id)
        getLegends(data.eventId, 1, 50).then(r => setLegends(r.data ?? [])).catch(() => {})
        setLoading(false)
      } catch (err: any) {
        if (cancelled) return
        const is404 = err?.response?.status === 404 || err?.response?.status === 400
        if (is404 && triesLeft > 0) {
          setTimeout(() => attempt(triesLeft - 1), 2000)
        } else {
          setError('Seat map not ready yet. Please try again in a moment.')
          setLoading(false)
        }
      }
    }
    attempt(4)
    return () => { cancelled = true }
  }, [sessionId])

  /* Fetch the seats needed for the current viewport, merging into loadedSeats. */
  const ensureRegionLoaded = useCallback(async () => {
    const canvas = canvasRef.current
    if (!canvas || !sessionId || !meta || canvas.width === 0) return

    const vbb = viewportWorldBbox(canvas.width, canvas.height, pan, zoom)
    const full = fullToBox(meta.fullBbox)
    // Already covered? Nothing to do.
    if (loadedBboxRef.current && bboxContains(loadedBboxRef.current, vbb)) return

    // If the viewport spans the whole map, fetch everything once (zoom-out / small maps).
    const wholeMap = bboxContains(vbb, full)
    const apiBbox = wholeMap ? undefined : toApiBbox(vbb)

    setFetching(true)
    try {
      const chunk = await getSessionSeats(sessionId, apiBbox)
      setLoadedSeats(prev => {
        const next = new Map(prev)
        chunk.seats.forEach(s => next.set(s.id, s))
        return next
      })
      const covered = wholeMap ? full : vbb
      setLoadedBbox(prev => unionBbox(prev, covered))
      // Pull live statuses for the region we just loaded.
      bookingHub.getRegionStatuses(seatMapId, apiBbox).catch(() => {})
    } catch {
      /* leave existing seats; a later pan retries */
    } finally {
      setFetching(false)
    }
  }, [sessionId, meta, pan, zoom, seatMapId])

  /* Debounced viewport-driven fetch — runs on pan/zoom once the map is fitted. */
  useEffect(() => {
    if (!fitted) return
    const t = setTimeout(() => { ensureRegionLoaded() }, 300)
    return () => clearTimeout(t)
  }, [fitted, ensureRegionLoaded])

  /* Connect booking hub once seatMapId is known */
  useEffect(() => {
    if (!seatMapId) return
    bookingHub.connectToBookingHub(seatMapId, {
      onInitialStatuses: (updates: SeatStatusUpdate[]) => {
        // Region statuses arrive incrementally — merge, never replace.
        setStatuses(prev => {
          const m = new Map(prev)
          updates.forEach(u => m.set(u.seatId, u))
          return m
        })
      },
      onStatusChanged: (updates: SeatStatusUpdate[]) => {
        setStatuses(prev => {
          const m = new Map(prev)
          updates.forEach(u => m.set(u.seatId, u))
          return m
        })
      },
      onClose: () => setConnected(false),
    })
      .then(() => {
        setConnected(true)
        // Statuses for whatever region is already loaded.
        const lb = loadedBboxRef.current
        bookingHub.getRegionStatuses(seatMapId, lb ? toApiBbox(lb) : undefined).catch(() => {})
      })
      .catch(() => setError('Real-time connection failed.'))

    return () => { bookingHub.disconnectFromBookingHub(seatMapId) }
  }, [seatMapId])

  /* Canvas draw */
  const draw = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas || !meta) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    ctx.clearRect(0, 0, canvas.width, canvas.height)
    ctx.save()
    ctx.translate(pan.x, pan.y)
    ctx.scale(zoom, zoom)

    // Grid
    ctx.strokeStyle = 'rgba(148,163,184,0.06)'; ctx.lineWidth = 1
    const w = canvas.width, h = canvas.height
    for (let x = 0; x < w * 2; x += 40) { ctx.beginPath(); ctx.moveTo(x, -h); ctx.lineTo(x, h * 2); ctx.stroke() }
    for (let y = 0; y < h * 2; y += 40) { ctx.beginPath(); ctx.moveTo(-w, y); ctx.lineTo(w * 2, y); ctx.stroke() }

    // Objects
    ;(meta.objects ?? []).forEach(obj => {
      const geo: Geometry = obj.geometry ? JSON.parse(obj.geometry) : { x: 50, y: 50, width: 200, height: 80 }
      ctx.save()
      ctx.translate(geo.x + geo.width / 2, geo.y + geo.height / 2)
      if (geo.rotation) ctx.rotate((geo.rotation * Math.PI) / 180)
      ctx.translate(-geo.width / 2, -geo.height / 2)
      if (obj.objectType === 'Stage') {
        ctx.fillStyle = 'rgba(99,102,241,0.25)'; ctx.strokeStyle = '#818cf8'; ctx.lineWidth = 2
        const r = 12; ctx.beginPath(); ctx.moveTo(r, 0); ctx.lineTo(geo.width - r, 0); ctx.quadraticCurveTo(geo.width, 0, geo.width, r); ctx.lineTo(geo.width, geo.height - r); ctx.quadraticCurveTo(geo.width, geo.height, geo.width - r, geo.height); ctx.lineTo(r, geo.height); ctx.quadraticCurveTo(0, geo.height, 0, geo.height - r); ctx.lineTo(0, r); ctx.quadraticCurveTo(0, 0, r, 0); ctx.closePath(); ctx.fill(); ctx.stroke()
        ctx.fillStyle = '#c7d2fe'; ctx.font = 'bold 16px Inter,sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(obj.label || 'STAGE', geo.width / 2, geo.height / 2)
      } else {
        const style: Style = obj.style ? JSON.parse(obj.style) : { fill: 'rgba(148,163,184,0.15)', stroke: '#64748b' }
        ctx.fillStyle = style.fill; ctx.strokeStyle = style.stroke; ctx.lineWidth = 1; ctx.fillRect(0, 0, geo.width, geo.height); ctx.strokeRect(0, 0, geo.width, geo.height)
        if (obj.label) { ctx.fillStyle = '#94a3b8'; ctx.font = '12px Inter,sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(obj.label, geo.width / 2, geo.height / 2) }
      }
      ctx.restore()
    })

    // Seats (only the ones streamed in so far)
    const hits: SeatHit[] = []
    loadedSeats.forEach((seat: SeatLayoutResponse) => {
      if (!seat.position) return
      let pos: SeatPos
      try { pos = JSON.parse(seat.position) } catch { return }
      const cx = pos.x + SEAT_RADIUS
      const cy = pos.y + SEAT_RADIUS

      const status = statuses.get(seat.id)?.status ?? 'Available'
      const isSelected = selected.has(seat.id)
      const statusColor = SEAT_COLORS[status] ?? SEAT_COLORS.Available
      const legendColor = seat.legendId ? (legendMap.get(seat.legendId)?.color ?? '#64748b') : '#64748b'

      // Fill: selected color or status color (semi-transparent for non-selected)
      ctx.beginPath()
      ctx.arc(cx, cy, SEAT_RADIUS - 1, 0, Math.PI * 2)
      ctx.fillStyle = isSelected ? SELECTED_COLOR : statusColor
      ctx.fill()

      // Border: legend color (thicker if selected)
      ctx.strokeStyle = isSelected ? '#a5b4fc' : legendColor
      ctx.lineWidth = isSelected ? 2 : 1.5
      ctx.stroke()

      // Seat number label
      ctx.fillStyle = '#0f172a'
      ctx.font = 'bold 7px Inter,sans-serif'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText(String(seat.seatNumber), cx, cy)

      hits.push({ id: seat.id, cx, cy, r: SEAT_RADIUS })
    })
    seatHitsRef.current = hits
    ctx.restore()
  }, [meta, loadedSeats, statuses, selected, pan, zoom, legendMap])

  useEffect(() => { draw() }, [draw])

  /* Keep canvas sized to its container; fit once when meta is ready */
  useEffect(() => {
    const c = canvasRef.current
    if (!c) return
    const sync = () => {
      c.width = c.clientWidth
      c.height = c.clientHeight
      if (meta && !fitted && c.width > 0 && c.height > 0) {
        fitToContent()
        setFitted(true)
      }
      draw()
    }
    sync()
    const ro = new ResizeObserver(sync)
    ro.observe(c)
    return () => ro.disconnect()
  }, [draw, meta, fitted, fitToContent])

  /* Canvas interactions */
  const handleMouseDown = (e: React.MouseEvent) => {
    if (tool !== 'pan' || e.button !== 0) return
    isPanning.current = true
    panStart.current = { x: e.clientX - pan.x, y: e.clientY - pan.y }
  }

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isPanning.current) return
    setPan({ x: e.clientX - panStart.current.x, y: e.clientY - panStart.current.y })
  }

  const handleMouseUp = () => { isPanning.current = false }

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault()
    setZoom(z => Math.max(0.3, Math.min(4, z * (e.deltaY > 0 ? 0.9 : 1.1))))
  }

  const handleClick = (e: React.MouseEvent) => {
    if (tool !== 'select') return
    const canvas = canvasRef.current; if (!canvas) return
    const rect = canvas.getBoundingClientRect()
    const mx = (e.clientX - rect.left - pan.x) / zoom
    const my = (e.clientY - rect.top - pan.y) / zoom

    for (const hit of seatHitsRef.current) {
      const dx = mx - hit.cx, dy = my - hit.cy
      if (dx * dx + dy * dy <= hit.r * hit.r) {
        const status = statuses.get(hit.id)?.status ?? 'Available'
        if (status !== 'Available' && !selected.has(hit.id)) return
        setSelected(prev => {
          const next = new Set(prev)
          next.has(hit.id) ? next.delete(hit.id) : next.add(hit.id)
          return next
        })
        return
      }
    }
  }

  const handleGoToCheckout = async () => {
    if (!meta || !seatMapId || selected.size === 0) return
    setHolding(true)
    setHoldError(null)
    try {
      const seatIds = [...selected]
      await holdSeats(seatMapId, seatIds)
      const params = new URLSearchParams({
        sessionId: sessionId!,
        seatMapId,
        seatIds: seatIds.join(','),
      })
      navigate(`/checkout?${params}`)
    } catch (err: any) {
      const msg = err?.response?.data?.error ?? 'Failed to reserve seats. They may already be taken.'
      setHoldError(msg)
      setSelected(new Set())
    } finally {
      setHolding(false)
    }
  }

  if (loading) return <div className="flex h-screen items-center justify-center text-slate-400">Loading seat map… (this may take a few seconds after event approval)</div>
  if (error) return (
    <div className="flex h-screen flex-col items-center justify-center gap-4 text-red-400">
      <p>{error}</p>
      <button
        onClick={() => window.location.reload()}
        className="rounded-lg bg-slate-800 px-4 py-2 text-sm text-slate-300 hover:bg-slate-700 transition-colors"
      >
        Retry
      </button>
    </div>
  )
  if (!meta) return null

  const availableCount = [...statuses.values()].filter(s => s.status === 'Available').length

  return (
    <div className="flex flex-col" style={{ height: '100vh' }}>

      {/* Toolbar */}
      <div className="flex items-center justify-between gap-3 border-b border-slate-800/60 bg-slate-950/90 px-4 py-2 backdrop-blur-xl">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/events')} className="text-xs text-slate-500 hover:text-slate-300 transition-colors">← Events</button>
          <div className="h-4 w-px bg-slate-700" />
          <h2 className="text-sm font-bold truncate max-w-xs">{meta.name}</h2>
          <div className="flex items-center gap-1.5">
            <span className={`h-1.5 w-1.5 rounded-full ${connected ? 'bg-emerald-400 shadow-[0_0_4px_rgba(74,222,128,0.5)]' : 'bg-slate-600'}`} />
            <span className="text-[10px] text-slate-500">{connected ? 'Live' : 'Connecting…'}</span>
          </div>
          {fetching && <span className="text-[10px] text-slate-500 animate-pulse">Loading seats…</span>}
        </div>
      </div>

      {/* Body */}
      <div className="grid flex-1 overflow-hidden" style={{ gridTemplateColumns: '1fr 250px' }}>

        {/* Canvas */}
        <div className="relative overflow-hidden bg-slate-100">
          <canvas
            ref={canvasRef}
            className="block h-full w-full"
            style={{ cursor: tool === 'pan' ? (isPanning.current ? 'grabbing' : 'grab') : 'default' }}
            onWheel={handleWheel}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            onClick={handleClick}
          />

          {/* Floating toolbar — Figma-style */}
          <div className="pointer-events-auto absolute top-4 left-1/2 -translate-x-1/2 flex items-center gap-0.5 rounded-xl border border-slate-700/60 bg-slate-900/90 px-1.5 py-1.5 shadow-xl backdrop-blur-md">
            {([
              ['select', '↖', 'Select seats'],
              ['pan', '✋', 'Pan map'],
            ] as const).map(([key, icon, hint]) => (
              <button
                key={key}
                title={hint}
                onClick={() => setTool(key)}
                className={`flex h-8 w-8 items-center justify-center rounded-lg text-base transition-colors ${tool === key ? 'bg-indigo-500 text-white shadow-sm' : 'text-slate-400 hover:bg-slate-700/60 hover:text-slate-200'}`}
              >
                {icon}
              </button>
            ))}

            <div className="mx-1.5 h-5 w-px bg-slate-700" />
            <button title="Fit to content" onClick={fitToContent} className="flex h-8 items-center justify-center rounded-lg px-2 text-[11px] font-medium text-slate-400 hover:bg-slate-700/60 hover:text-slate-200 transition-colors">Fit</button>
          </div>

          {/* Hint */}
          <div className="pointer-events-none absolute bottom-4 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-slate-900/80 px-4 py-1.5 text-[11px] text-slate-300 backdrop-blur-sm">
            {tool === 'pan'
              ? 'Drag to pan the map'
              : selected.size > 0
              ? `${selected.size} seat${selected.size > 1 ? 's' : ''} selected — click "Go to Checkout"`
              : 'Click an available seat to select it'}
          </div>
        </div>

        {/* Right panel */}
        <div className="overflow-y-auto border-l border-slate-800/60 bg-slate-950/80 p-4 space-y-5">

          {/* Stats */}
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-2">Seat Map</p>
            <div className="space-y-1 text-xs">
              <div className="flex justify-between rounded-lg bg-slate-900/40 px-3 py-1.5">
                <span className="text-slate-500">Total seats</span>
                <span className="font-semibold text-slate-200">{meta.totalSeats}</span>
              </div>
              <div className="flex justify-between rounded-lg bg-slate-900/40 px-3 py-1.5">
                <span className="text-slate-500">Available</span>
                <span className="font-semibold text-emerald-400">
                  {availableCount || meta.totalSeats}
                </span>
              </div>
            </div>
          </div>

          {/* Legends (price tiers) */}
          {legends.length > 0 && (
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-2">Price Tiers</p>
              <div className="space-y-1.5">
                {legends.map(l => (
                  <div key={l.id} className="flex items-center justify-between px-3 py-1.5 rounded-lg bg-slate-900/40 text-xs">
                    <span className="flex items-center gap-2 text-slate-300 truncate mr-2">
                      <span className="h-2.5 w-2.5 rounded-full flex-shrink-0" style={{ background: l.color || '#64748b' }} />
                      {l.name}
                    </span>
                    <span className="text-slate-200 font-semibold tabular-nums">${l.price}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Status colors */}
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-2">Status</p>
            <div className="space-y-1.5">
              {Object.entries(SEAT_COLORS).map(([s, c]) => (
                <div key={s} className="flex items-center gap-2.5 text-xs text-slate-400">
                  <span className="h-3 w-3 rounded-full flex-shrink-0" style={{ background: c }} />
                  {s}
                </div>
              ))}
              <div className="flex items-center gap-2.5 text-xs text-slate-400">
                <span className="h-3 w-3 rounded-full flex-shrink-0" style={{ background: SELECTED_COLOR }} />
                Selected
              </div>
            </div>
          </div>

          {/* Hold error — persists after selection is cleared */}
          {holdError && (
            <div className="rounded-lg bg-red-500/10 border border-red-500/30 px-3 py-2 text-[11px] text-red-400 flex items-start justify-between gap-2">
              <span>{holdError}</span>
              <button
                onClick={() => setHoldError(null)}
                className="text-red-400/60 hover:text-red-300 flex-shrink-0"
                aria-label="Dismiss"
              >
                ✕
              </button>
            </div>
          )}

          {/* Actions */}
          {selected.size > 0 ? (
            <div className="space-y-2">
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                {selected.size} Seat{selected.size > 1 ? 's' : ''} Selected
              </p>
              <button
                className="w-full rounded-lg bg-indigo-500 py-2 text-xs font-semibold text-white hover:bg-indigo-400 disabled:opacity-50 transition-colors"
                onClick={handleGoToCheckout}
                disabled={holding}
              >
                {holding ? 'Reserving…' : 'Go to Checkout →'}
              </button>
              <button
                className="w-full rounded-lg border border-slate-700 py-1.5 text-xs text-slate-400 hover:text-slate-200 transition-colors disabled:opacity-50"
                onClick={() => { setSelected(new Set()); setHoldError(null) }}
                disabled={holding}
              >
                Clear Selection
              </button>
            </div>
          ) : (
            <p className="text-[11px] text-slate-600">Click an available seat to select it.</p>
          )}
        </div>
      </div>
    </div>
  )
}
