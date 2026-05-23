import { useEffect, useRef, useState, useCallback } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { getSeatMapBySession, holdSeats, releaseSeats } from '../api/seatApi'
import * as bookingHub from '../api/seatBookingHub'
import type { SeatMapLayoutResponse, SeatSectionLayoutResponse, SeatLayoutItemResponse, SeatStatusUpdate } from '../types/seat'

/* ===== Types ===== */
interface Geometry { x: number; y: number; width: number; height: number; rotation?: number }
interface Style { fill: string; stroke: string }
interface SeatPos { x: number; y: number }
interface SeatHit { cx: number; cy: number; r: number; id: string }

const SEAT_COLORS: Record<string, string> = {
  Available: '#4ade80',
  Holding: '#facc15',
  Sold: '#ef4444',
  Blocked: '#6b7280',
}
const SELECTED_COLOR = '#818cf8'
const SEAT_RADIUS = 8

export function SeatBookingPage() {
  const { sessionId } = useParams<{ sessionId: string }>()
  const navigate = useNavigate()

  const canvasRef = useRef<HTMLCanvasElement>(null)
  const seatHitsRef = useRef<SeatHit[]>([])

  const [layout, setLayout] = useState<SeatMapLayoutResponse | null>(null)
  const [seatMapId, setSeatMapId] = useState('')
  const [statuses, setStatuses] = useState<Map<string, SeatStatusUpdate>>(new Map())
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [holding, setHolding] = useState(false)
  const [heldUntil, setHeldUntil] = useState<Date | null>(null)
  const [countdown, setCountdown] = useState('')
  const [zoom, setZoom] = useState(1)
  const [pan, setPan] = useState({ x: 0, y: 0 })
  const isPanning = useRef(false)
  const panStart = useRef({ x: 0, y: 0 })

  /* Load layout */
  useEffect(() => {
    if (!sessionId) return
    setLoading(true)
    getSeatMapBySession(sessionId)
      .then(data => { setLayout(data); setSeatMapId(data.id) })
      .catch(() => setError('Failed to load seat map.'))
      .finally(() => setLoading(false))
  }, [sessionId])

  /* Connect booking hub once seatMapId is known */
  useEffect(() => {
    if (!seatMapId) return
    bookingHub.connectToBookingHub(seatMapId).then(conn => {
      conn.on('InitialSeatStatuses', (updates: SeatStatusUpdate[]) => {
        setStatuses(() => {
          const m = new Map<string, SeatStatusUpdate>()
          updates.forEach(u => m.set(u.seatId, u))
          return m
        })
      })
      conn.on('SeatsStatusChanged', (updates: SeatStatusUpdate[]) => {
        setStatuses(prev => {
          const m = new Map(prev)
          updates.forEach(u => m.set(u.seatId, u))
          return m
        })
      })
    }).catch(() => setError('Real-time connection failed.'))

    return () => { bookingHub.disconnectFromBookingHub(seatMapId) }
  }, [seatMapId])

  /* Countdown timer */
  useEffect(() => {
    if (!heldUntil) return
    const tick = () => {
      const diff = heldUntil.getTime() - Date.now()
      if (diff <= 0) { setCountdown('Expired'); setHeldUntil(null); return }
      const m = Math.floor(diff / 60000)
      const s = Math.floor((diff % 60000) / 1000)
      setCountdown(`${m}:${s.toString().padStart(2, '0')}`)
    }
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [heldUntil])

  /* Canvas draw */
  const draw = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas || !layout) return
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
    layout.objects.forEach(obj => {
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

    // Sections + seats
    const hits: SeatHit[] = []
    layout.sections.forEach((section: SeatSectionLayoutResponse) => {
      const geo: Geometry = section.geometry ? JSON.parse(section.geometry) : { x: 100, y: 150, width: 300, height: 200 }
      const style: Style = section.style ? JSON.parse(section.style) : { fill: 'rgba(99,102,241,0.08)', stroke: 'rgba(99,102,241,0.3)' }
      ctx.save()
      ctx.fillStyle = style.fill; ctx.strokeStyle = style.stroke; ctx.lineWidth = 1; ctx.setLineDash([4, 4])
      const r = 8; ctx.beginPath(); ctx.moveTo(geo.x + r, geo.y); ctx.lineTo(geo.x + geo.width - r, geo.y); ctx.quadraticCurveTo(geo.x + geo.width, geo.y, geo.x + geo.width, geo.y + r); ctx.lineTo(geo.x + geo.width, geo.y + geo.height - r); ctx.quadraticCurveTo(geo.x + geo.width, geo.y + geo.height, geo.x + geo.width - r, geo.y + geo.height); ctx.lineTo(geo.x + r, geo.y + geo.height); ctx.quadraticCurveTo(geo.x, geo.y + geo.height, geo.x, geo.y + geo.height - r); ctx.lineTo(geo.x, geo.y + r); ctx.quadraticCurveTo(geo.x, geo.y, geo.x + r, geo.y); ctx.closePath(); ctx.fill(); ctx.stroke(); ctx.setLineDash([])
      ctx.fillStyle = '#e2e8f0'; ctx.font = 'bold 13px Inter,sans-serif'; ctx.textAlign = 'left'; ctx.textBaseline = 'top'; ctx.fillText(section.label, geo.x + 8, geo.y + 6)

      section.rows.forEach((row, ri) => {
        const rowY = geo.y + 30 + ri * 28
        ctx.fillStyle = '#94a3b8'; ctx.font = '10px Inter,sans-serif'; ctx.textAlign = 'right'; ctx.textBaseline = 'middle'; ctx.fillText(row.label, geo.x + 28, rowY + SEAT_RADIUS)

        row.seats.forEach((seat: SeatLayoutItemResponse, si) => {
          let cx: number, cy: number
          if (seat.position) { const p: SeatPos = JSON.parse(seat.position); cx = geo.x + 35 + p.x + SEAT_RADIUS; cy = geo.y + 30 + p.y + SEAT_RADIUS }
          else { cx = geo.x + 35 + si * (row.seatSpacing || 24) + SEAT_RADIUS; cy = rowY + SEAT_RADIUS }

          const status = statuses.get(seat.id)?.status ?? 'Available'
          const isSelected = selected.has(seat.id)
          const color = isSelected ? SELECTED_COLOR : (SEAT_COLORS[status] ?? SEAT_COLORS.Available)

          ctx.fillStyle = color
          ctx.beginPath(); ctx.arc(cx, cy, SEAT_RADIUS - 1, 0, Math.PI * 2); ctx.fill()

          if (isSelected) { ctx.strokeStyle = '#a5b4fc'; ctx.lineWidth = 1.5; ctx.stroke() }

          ctx.fillStyle = '#0f172a'; ctx.font = 'bold 7px Inter,sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(String(seat.seatNumber), cx, cy)

          hits.push({ id: seat.id, cx, cy, r: SEAT_RADIUS })
        })
      })
      ctx.restore()
    })
    seatHitsRef.current = hits
    ctx.restore()
  }, [layout, statuses, selected, pan, zoom])

  useEffect(() => { draw() }, [draw])
  useEffect(() => {
    const c = canvasRef.current; if (!c) return
    const ro = new ResizeObserver(() => { c.width = c.clientWidth; c.height = c.clientHeight; draw() })
    ro.observe(c); return () => ro.disconnect()
  }, [draw])

  /* Canvas interactions */
  const handleWheel = (e: React.WheelEvent) => { e.preventDefault(); setZoom(z => Math.max(0.3, Math.min(3, z * (e.deltaY > 0 ? 0.9 : 1.1)))) }

  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button === 1 || (e.button === 0 && e.altKey)) { isPanning.current = true; panStart.current = { x: e.clientX - pan.x, y: e.clientY - pan.y } }
  }

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isPanning.current) setPan({ x: e.clientX - panStart.current.x, y: e.clientY - panStart.current.y })
  }

  const handleMouseUp = () => { isPanning.current = false }

  const handleClick = (e: React.MouseEvent) => {
    if (isPanning.current) return
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

  /* Hold / release */
  const handleHold = async () => {
    if (!seatMapId || selected.size === 0) return
    setHolding(true)
    try {
      const res = await holdSeats(seatMapId, [...selected])
      setHeldUntil(new Date(res.heldUntil))
      setSelected(new Set())
    } catch (err: any) {
      alert(err?.response?.data?.error ?? 'Failed to hold seats.')
    } finally {
      setHolding(false)
    }
  }

  const handleRelease = async () => {
    if (!seatMapId) return
    const heldIds = [...statuses.entries()]
      .filter(([, v]) => v.status === 'Holding')
      .map(([id]) => id)
    if (heldIds.length === 0) return
    try {
      await releaseSeats(seatMapId, heldIds)
      setHeldUntil(null)
      setCountdown('')
    } catch { }
  }

  const heldSeats = [...statuses.entries()].filter(([, v]) => v.status === 'Holding')

  if (loading) return <div className="flex items-center justify-center h-64 text-slate-400">Loading seat map…</div>
  if (error) return <div className="flex items-center justify-center h-64 text-red-400">{error}</div>
  if (!layout) return null

  return (
    <div className="flex h-[calc(100vh-4rem)] gap-0 overflow-hidden">

      {/* Canvas */}
      <div className="relative flex-1">
        <canvas
          ref={canvasRef}
          className="w-full h-full cursor-crosshair"
          onWheel={handleWheel}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onClick={handleClick}
        />
        {/* Zoom controls */}
        <div className="absolute bottom-4 left-4 flex gap-1">
          <button className="glass px-2 py-1 text-xs text-slate-300 hover:text-white" onClick={() => setZoom(z => Math.min(3, z * 1.2))}>+</button>
          <button className="glass px-2 py-1 text-xs text-slate-300 hover:text-white" onClick={() => setZoom(z => Math.max(0.3, z * 0.8))}>−</button>
          <button className="glass px-2 py-1 text-xs text-slate-300 hover:text-white" onClick={() => { setZoom(1); setPan({ x: 0, y: 0 }) }}>Reset</button>
        </div>
      </div>

      {/* Sidebar */}
      <div className="w-72 glass border-l border-white/5 flex flex-col p-4 gap-4 overflow-y-auto">
        <div>
          <Link to="/events" className="text-xs text-slate-500 hover:text-slate-300">← Back to events</Link>
          <h2 className="mt-1 text-sm font-semibold">{layout.name}</h2>
          <p className="text-xs text-slate-400">{layout.totalSeats} total seats</p>
        </div>

        {/* Legend */}
        <div className="space-y-1">
          <p className="text-xs font-medium text-slate-400 uppercase tracking-wide">Legend</p>
          {Object.entries(SEAT_COLORS).map(([status, color]) => (
            <div key={status} className="flex items-center gap-2 text-xs text-slate-300">
              <span className="inline-block w-3 h-3 rounded-full" style={{ background: color }} />
              {status}
            </div>
          ))}
          <div className="flex items-center gap-2 text-xs text-slate-300">
            <span className="inline-block w-3 h-3 rounded-full" style={{ background: SELECTED_COLOR }} />
            Selected
          </div>
        </div>

        {/* Selection */}
        {selected.size > 0 && (
          <div className="glass p-3 space-y-2">
            <p className="text-xs font-medium text-slate-300">{selected.size} seat{selected.size > 1 ? 's' : ''} selected</p>
            <button
              className="w-full rounded-lg bg-indigo-500 py-2 text-sm font-semibold text-white hover:bg-indigo-400 disabled:opacity-50"
              onClick={handleHold}
              disabled={holding}
            >
              {holding ? 'Holding…' : 'Hold Seats (10 min)'}
            </button>
            <button
              className="w-full rounded-lg border border-slate-600 py-1.5 text-xs text-slate-400 hover:text-slate-200"
              onClick={() => setSelected(new Set())}
            >
              Clear selection
            </button>
          </div>
        )}

        {/* Held seats */}
        {heldSeats.length > 0 && (
          <div className="glass p-3 space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-xs font-medium text-slate-300">{heldSeats.length} seat{heldSeats.length > 1 ? 's' : ''} held</p>
              {countdown && (
                <span className={`text-xs font-mono font-semibold ${countdown === 'Expired' ? 'text-red-400' : 'text-yellow-400'}`}>
                  {countdown}
                </span>
              )}
            </div>
            <button
              className="w-full rounded-lg bg-emerald-500 py-2 text-sm font-semibold text-white hover:bg-emerald-400"
              onClick={() => navigate(`/sessions/${sessionId}/checkout`)}
            >
              Proceed to Checkout
            </button>
            <button
              className="w-full rounded-lg border border-slate-600 py-1.5 text-xs text-slate-400 hover:text-red-400"
              onClick={handleRelease}
            >
              Release seats
            </button>
          </div>
        )}

        {/* Tip */}
        {selected.size === 0 && heldSeats.length === 0 && (
          <p className="text-xs text-slate-500">Click available seats to select them, then hold to reserve for 10 minutes.</p>
        )}
      </div>
    </div>
  )
}
