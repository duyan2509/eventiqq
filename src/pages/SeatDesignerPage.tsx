import { useEffect, useRef, useState, useCallback } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { getSeatMapById, getSeatMapsByEvent, createSeatMap } from '../api/seatApi'
import type { SeatMapResponse } from '../types/seat'
import { getVersions, saveVersion, restoreVersion } from '../api/seatVersionApi'
import type { SeatMapVersionResponse } from '../api/seatVersionApi'
import * as hub from '../api/seatDesignHub'

/* ===== Types ===== */
interface Geometry { x: number; y: number; width: number; height: number; rotation?: number }
interface Style { fill: string; stroke: string; opacity?: number }
interface SeatPos { x: number; y: number }
interface SeatData { id: string; rowId: string; label: string; seatNumber: number; status: string; seatType: string; position?: string; legendId?: string }
interface RowData { id: string; sectionId: string; label: string; rowNumber: number; curve?: string; seatSpacing: number; seats: SeatData[] }
interface SectionData { id: string; seatMapId: string; label: string; sectionType: string; geometry?: string; style?: string; legendId?: string; sortOrder: number; rows: RowData[] }
interface ObjectData { id: string; seatMapId: string; objectType: string; label?: string; geometry?: string; style?: string; zIndex: number }
interface OnlineUser { userId: string; email: string; displayName: string; avatarColor: string }
interface CursorInfo { userId: string; x: number; y: number; color: string }

const SECTION_TYPES = ['Rectangle', 'Polygon', 'Arc'] as const
const OBJECT_TYPES = ['Stage', 'Label', 'Image', 'Shape', 'Aisle'] as const
const SEAT_COLORS: Record<string, string> = { Available: '#4ade80', Holding: '#facc15', Sold: '#ef4444', Blocked: '#6b7280' }

export function SeatDesignerPage() {
  const { eventId, seatMapId: paramSeatMapId } = useParams<{ eventId: string; seatMapId?: string }>()
  const navigate = useNavigate()

  /* Picker state */
  const [seatMaps, setSeatMaps] = useState<SeatMapResponse[]>([])
  const [loadingMaps, setLoadingMaps] = useState(false)
  const [showCreateMap, setShowCreateMap] = useState(false)
  const [newMapName, setNewMapName] = useState('')
  const [newMapChartId, setNewMapChartId] = useState('')
  const seatMapId = paramSeatMapId || ''

  useEffect(() => {
    if (!eventId || seatMapId) return
    setLoadingMaps(true)
    getSeatMapsByEvent(eventId).then(r => setSeatMaps(Array.isArray(r) ? r : [])).catch(() => {}).finally(() => setLoadingMaps(false))
  }, [eventId, seatMapId])

  const handleCreateSeatMap = async () => {
    if (!eventId || !newMapName || !newMapChartId) return
    try { const c = await createSeatMap({ chartId: newMapChartId, eventId, name: newMapName }); navigate(`/events/${eventId}/seat-design/${c.id}`) } catch { }
  }

  /* ===== Seat Map Picker ===== */
  if (!seatMapId) {
    return (
      <div className="fade-in space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1>Seat Map Designer</h1>
            <p className="text-sm text-slate-400">Select or create a seat map for this event.</p>
            <Link to="/events" className="text-xs text-slate-500 hover:text-slate-300 transition-colors">← Back to events</Link>
          </div>
          <button className="rounded-xl bg-indigo-500 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-400" onClick={() => setShowCreateMap(true)}>+ Create Seat Map</button>
        </div>

        {showCreateMap && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={() => setShowCreateMap(false)}>
            <div className="glass w-full max-w-md p-6 fade-in" onClick={e => e.stopPropagation()}>
              <h2 className="mb-4">Create Seat Map</h2>
              <div className="space-y-4">
                <div><label>Name</label><input value={newMapName} onChange={e => setNewMapName(e.target.value)} placeholder="e.g. Main Hall" /></div>
                <div><label>Chart ID</label><input value={newMapChartId} onChange={e => setNewMapChartId(e.target.value)} placeholder="GUID" /></div>
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
                  <span>📅 {new Date(sm.createdAt).toLocaleDateString('en-US')}</span>
                  <span className="text-indigo-400 font-medium">🎨 Design</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    )
  }

  /* ===== DESIGNER CANVAS ===== */
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [zoom, setZoom] = useState(1)
  const [pan, setPan] = useState({ x: 0, y: 0 })
  const [isPanning, setIsPanning] = useState(false)
  const panStart = useRef({ x: 0, y: 0 })

  const [seatMapName, setSeatMapName] = useState('')
  const [sections, setSections] = useState<SectionData[]>([])
  const [objects, setObjects] = useState<ObjectData[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [connected, setConnected] = useState(false)

  const [selectedSection, setSelectedSection] = useState<string | null>(null)
  const [selectedTool, setSelectedTool] = useState<'select' | 'section' | 'object' | 'row'>('select')

  const [showAddSection, setShowAddSection] = useState(false)
  const [showAddObject, setShowAddObject] = useState(false)
  const [showAddRow, setShowAddRow] = useState(false)
  const [showVersions, setShowVersions] = useState(false)

  const [newSectionLabel, setNewSectionLabel] = useState('')
  const [newSectionType, setNewSectionType] = useState<string>('Rectangle')
  const [newSectionX, setNewSectionX] = useState(100)
  const [newSectionY, setNewSectionY] = useState(100)
  const [newSectionW, setNewSectionW] = useState(300)
  const [newSectionH, setNewSectionH] = useState(200)

  const [newObjType, setNewObjType] = useState<string>('Stage')
  const [newObjLabel, setNewObjLabel] = useState('')
  const [newRowLabel, setNewRowLabel] = useState('')
  const [newRowSeatCount, setNewRowSeatCount] = useState(10)
  const [newRowSpacing, setNewRowSpacing] = useState(30)

  const [onlineUsers, setOnlineUsers] = useState<OnlineUser[]>([])
  const [cursors, setCursors] = useState<CursorInfo[]>([])
  const [versions, setVersions] = useState<SeatMapVersionResponse[]>([])

  const loadSeatMap = useCallback(async () => {
    if (!seatMapId) return; setLoading(true)
    try { const d = await getSeatMapById(seatMapId); setSeatMapName(d.name); setSections(d.sections || []); setObjects(d.objects || []) }
    catch (e: any) { setError(e?.response?.data?.message || 'Failed to load seat map.') }
    finally { setLoading(false) }
  }, [seatMapId])

  const connectHub = useCallback(async () => {
    if (!seatMapId) return
    try {
      const conn = await hub.connectToHub(seatMapId); setConnected(true)
      conn.on('CurrentPresence', (d: { onlineUsers: OnlineUser[] }) => setOnlineUsers(d.onlineUsers || []))
      conn.on('UserJoined', (u: OnlineUser) => setOnlineUsers(prev => [...prev.filter(x => x.userId !== u.userId), u]))
      conn.on('UserLeft', (uid: string) => { setOnlineUsers(prev => prev.filter(x => x.userId !== uid)); setCursors(prev => prev.filter(c => c.userId !== uid)) })
      conn.on('CursorMoved', (d: { userId: string; x: number; y: number }) => setCursors(prev => [...prev.filter(c => c.userId !== d.userId), { userId: d.userId, x: d.x, y: d.y, color: '#818cf8' }]))
      conn.on('SectionAdded', (s: SectionData) => setSections(prev => [...prev, s]))
      conn.on('SectionUpdated', (s: SectionData) => setSections(prev => prev.map(x => x.id === s.id ? s : x)))
      conn.on('SectionDeleted', (id: string) => setSections(prev => prev.filter(x => x.id !== id)))
      conn.on('RowAdded', (r: RowData) => setSections(prev => prev.map(s => s.id === r.sectionId ? { ...s, rows: [...s.rows, r] } : s)))
      conn.on('RowDeleted', (id: string) => setSections(prev => prev.map(s => ({ ...s, rows: s.rows.filter(r => r.id !== id) }))))
      conn.on('SeatAdded', (seat: SeatData) => setSections(prev => prev.map(s => ({ ...s, rows: s.rows.map(r => r.id === seat.rowId ? { ...r, seats: [...r.seats, seat] } : r) }))))
      conn.on('SeatsDeleted', (ids: string[]) => setSections(prev => prev.map(s => ({ ...s, rows: s.rows.map(r => ({ ...r, seats: r.seats.filter(seat => !ids.includes(seat.id)) })) }))))
      conn.on('ObjectAdded', (o: ObjectData) => setObjects(prev => [...prev, o]))
      conn.on('ObjectDeleted', (id: string) => setObjects(prev => prev.filter(o => o.id !== id)))
      conn.on('AutoSaved', (d: any) => console.log('Auto-saved v' + d.versionNumber))
    } catch { setConnected(false) }
  }, [seatMapId])

  useEffect(() => { loadSeatMap(); connectHub(); return () => { hub.disconnectFromHub(seatMapId) } }, [seatMapId])

  /* Canvas draw */
  const draw = useCallback(() => {
    const canvas = canvasRef.current; if (!canvas) return
    const ctx = canvas.getContext('2d'); if (!ctx) return
    const w = canvas.width, h = canvas.height
    ctx.clearRect(0, 0, w, h); ctx.save(); ctx.translate(pan.x, pan.y); ctx.scale(zoom, zoom)

    // Grid
    ctx.strokeStyle = 'rgba(148,163,184,0.06)'; ctx.lineWidth = 1
    for (let x = 0; x < w * 2; x += 40) { ctx.beginPath(); ctx.moveTo(x, -h); ctx.lineTo(x, h * 2); ctx.stroke() }
    for (let y = 0; y < h * 2; y += 40) { ctx.beginPath(); ctx.moveTo(-w, y); ctx.lineTo(w * 2, y); ctx.stroke() }

    // Objects
    objects.forEach(obj => {
      const geo: Geometry = obj.geometry ? JSON.parse(obj.geometry) : { x: 50, y: 50, width: 200, height: 80 }
      const style: Style = obj.style ? JSON.parse(obj.style) : { fill: 'rgba(99,102,241,0.3)', stroke: '#6366f1' }
      ctx.save(); ctx.translate(geo.x + geo.width / 2, geo.y + geo.height / 2)
      if (geo.rotation) ctx.rotate((geo.rotation * Math.PI) / 180)
      ctx.translate(-geo.width / 2, -geo.height / 2)
      if (obj.objectType === 'Stage') {
        ctx.fillStyle = 'rgba(99,102,241,0.25)'; ctx.strokeStyle = '#818cf8'; ctx.lineWidth = 2
        const r = 12; ctx.beginPath(); ctx.moveTo(r, 0); ctx.lineTo(geo.width - r, 0); ctx.quadraticCurveTo(geo.width, 0, geo.width, r); ctx.lineTo(geo.width, geo.height - r); ctx.quadraticCurveTo(geo.width, geo.height, geo.width - r, geo.height); ctx.lineTo(r, geo.height); ctx.quadraticCurveTo(0, geo.height, 0, geo.height - r); ctx.lineTo(0, r); ctx.quadraticCurveTo(0, 0, r, 0); ctx.closePath(); ctx.fill(); ctx.stroke()
        ctx.fillStyle = '#c7d2fe'; ctx.font = 'bold 16px Inter,sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(obj.label || 'STAGE', geo.width / 2, geo.height / 2)
      } else {
        ctx.fillStyle = style.fill || 'rgba(148,163,184,0.15)'; ctx.strokeStyle = style.stroke || '#64748b'; ctx.lineWidth = 1; ctx.fillRect(0, 0, geo.width, geo.height); ctx.strokeRect(0, 0, geo.width, geo.height)
        if (obj.label) { ctx.fillStyle = '#94a3b8'; ctx.font = '12px Inter,sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(obj.label, geo.width / 2, geo.height / 2) }
      }
      ctx.restore()
    })

    // Sections
    sections.forEach(section => {
      const geo: Geometry = section.geometry ? JSON.parse(section.geometry) : { x: 100, y: 150, width: 300, height: 200 }
      const style: Style = section.style ? JSON.parse(section.style) : { fill: 'rgba(99,102,241,0.08)', stroke: 'rgba(99,102,241,0.3)' }
      const isSel = selectedSection === section.id
      ctx.save()
      ctx.fillStyle = isSel ? 'rgba(99,102,241,0.15)' : (style.fill || 'rgba(99,102,241,0.08)')
      ctx.strokeStyle = isSel ? '#818cf8' : (style.stroke || 'rgba(99,102,241,0.3)')
      ctx.lineWidth = isSel ? 2 : 1; ctx.setLineDash(isSel ? [] : [4, 4])
      const r = 8; ctx.beginPath(); ctx.moveTo(geo.x + r, geo.y); ctx.lineTo(geo.x + geo.width - r, geo.y); ctx.quadraticCurveTo(geo.x + geo.width, geo.y, geo.x + geo.width, geo.y + r); ctx.lineTo(geo.x + geo.width, geo.y + geo.height - r); ctx.quadraticCurveTo(geo.x + geo.width, geo.y + geo.height, geo.x + geo.width - r, geo.y + geo.height); ctx.lineTo(geo.x + r, geo.y + geo.height); ctx.quadraticCurveTo(geo.x, geo.y + geo.height, geo.x, geo.y + geo.height - r); ctx.lineTo(geo.x, geo.y + r); ctx.quadraticCurveTo(geo.x, geo.y, geo.x + r, geo.y); ctx.closePath(); ctx.fill(); ctx.stroke(); ctx.setLineDash([])
      ctx.fillStyle = '#e2e8f0'; ctx.font = 'bold 13px Inter,sans-serif'; ctx.textAlign = 'left'; ctx.textBaseline = 'top'; ctx.fillText(section.label, geo.x + 8, geo.y + 6)
      section.rows.forEach((row, ri) => {
        const rowY = geo.y + 30 + ri * 28
        ctx.fillStyle = '#94a3b8'; ctx.font = '10px Inter,sans-serif'; ctx.textAlign = 'right'; ctx.textBaseline = 'middle'; ctx.fillText(row.label, geo.x + 28, rowY + 8)
        row.seats.forEach((seat, si) => {
          let sx: number, sy: number
          if (seat.position) { const p: SeatPos = JSON.parse(seat.position); sx = geo.x + 35 + p.x; sy = geo.y + 30 + p.y } else { sx = geo.x + 35 + si * (row.seatSpacing || 24); sy = rowY }
          ctx.fillStyle = SEAT_COLORS[seat.status] || SEAT_COLORS.Available; ctx.beginPath(); ctx.arc(sx + 8, sy + 8, 7, 0, Math.PI * 2); ctx.fill()
          ctx.fillStyle = '#0f172a'; ctx.font = 'bold 7px Inter,sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(String(seat.seatNumber), sx + 8, sy + 8)
        })
      })
      ctx.restore()
    })

    // Cursors
    cursors.forEach(c => { ctx.save(); ctx.fillStyle = c.color; ctx.beginPath(); ctx.moveTo(c.x, c.y); ctx.lineTo(c.x + 10, c.y + 14); ctx.lineTo(c.x + 4, c.y + 14); ctx.lineTo(c.x, c.y + 20); ctx.closePath(); ctx.fill(); ctx.restore() })
    ctx.restore()
  }, [sections, objects, pan, zoom, selectedSection, cursors])

  useEffect(() => { draw() }, [draw])
  useEffect(() => { const c = canvasRef.current; if (!c) return; const ro = new ResizeObserver(() => { c.width = c.clientWidth; c.height = c.clientHeight; draw() }); ro.observe(c); return () => ro.disconnect() }, [draw])

  const handleWheel = (e: React.WheelEvent) => { e.preventDefault(); setZoom(z => Math.max(0.2, Math.min(3, z * (e.deltaY > 0 ? 0.9 : 1.1)))) }
  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button === 1 || (e.button === 0 && e.altKey)) { setIsPanning(true); panStart.current = { x: e.clientX - pan.x, y: e.clientY - pan.y }; return }
    if (selectedTool === 'select') {
      const canvas = canvasRef.current; if (!canvas) return; const rect = canvas.getBoundingClientRect()
      const mx = (e.clientX - rect.left - pan.x) / zoom, my = (e.clientY - rect.top - pan.y) / zoom
      let found = false
      for (const s of sections) { const g: Geometry = s.geometry ? JSON.parse(s.geometry) : { x: 100, y: 150, width: 300, height: 200 }; if (mx >= g.x && mx <= g.x + g.width && my >= g.y && my <= g.y + g.height) { setSelectedSection(s.id); found = true; break } }
      if (!found) setSelectedSection(null)
    }
  }
  const handleMouseMove = (e: React.MouseEvent) => {
    if (isPanning) { setPan({ x: e.clientX - panStart.current.x, y: e.clientY - panStart.current.y }); return }
    if (connected && seatMapId) { const c = canvasRef.current; if (!c) return; const r = c.getBoundingClientRect(); hub.sendCursorPosition(seatMapId, (e.clientX - r.left - pan.x) / zoom, (e.clientY - r.top - pan.y) / zoom) }
  }
  const handleMouseUp = () => setIsPanning(false)

  /* Actions */
  const handleAddSection = async () => { if (!seatMapId || !newSectionLabel) return; await hub.addSection(seatMapId, { label: newSectionLabel, sectionType: SECTION_TYPES.indexOf(newSectionType as any), geometry: JSON.stringify({ x: newSectionX, y: newSectionY, width: newSectionW, height: newSectionH }), style: JSON.stringify({ fill: 'rgba(99,102,241,0.08)', stroke: 'rgba(99,102,241,0.3)' }), sortOrder: sections.length }); setShowAddSection(false); setNewSectionLabel('') }
  const handleAddObject = async () => { if (!seatMapId) return; await hub.addObject(seatMapId, { objectType: OBJECT_TYPES.indexOf(newObjType as any), label: newObjLabel || newObjType, geometry: JSON.stringify({ x: 200, y: 50, width: 300, height: 80 }), style: JSON.stringify({ fill: 'rgba(99,102,241,0.25)', stroke: '#818cf8' }), zIndex: objects.length }); setShowAddObject(false); setNewObjLabel('') }
  const handleAddRow = async () => { if (!seatMapId || !selectedSection || !newRowLabel) return; await hub.addRow(seatMapId, { sectionId: selectedSection, label: newRowLabel, rowNumber: (sections.find(s => s.id === selectedSection)?.rows.length || 0) + 1, seatSpacing: newRowSpacing, seatCount: newRowSeatCount, labelPrefix: newRowLabel }); setShowAddRow(false); setNewRowLabel('') }
  const handleDeleteSection = async (id: string) => { if (!seatMapId || !confirm('Delete this section?')) return; await hub.deleteSection(seatMapId, id); if (selectedSection === id) setSelectedSection(null) }
  const handleDeleteObject = async (id: string) => { if (!seatMapId || !confirm('Delete this object?')) return; await hub.deleteObject(seatMapId, id) }
  const handleDeleteRow = async (id: string) => { if (!seatMapId || !confirm('Delete this row?')) return; await hub.deleteRow(seatMapId, id) }
  const handleSaveVersion = async () => { if (!seatMapId) return; try { await saveVersion(seatMapId, 'Manual save'); alert('Version saved!') } catch { alert('Save failed.') } }
  const handleLoadVersions = async () => { if (!seatMapId) return; setVersions(await getVersions(seatMapId)); setShowVersions(true) }
  const handleRestoreVersion = async (vid: string) => { if (!seatMapId || !confirm('Restore this version?')) return; try { const v = await restoreVersion(seatMapId, vid); const snap = JSON.parse(v.snapshot); if (snap.sections) setSections(snap.sections); if (snap.objects) setObjects(snap.objects); setShowVersions(false) } catch { alert('Restore failed.') } }

  const selSecData = sections.find(s => s.id === selectedSection)
  const totalSeats = sections.reduce((sum, s) => sum + s.rows.reduce((rs, r) => rs + r.seats.length, 0), 0)

  return (
    <div className="flex flex-col" style={{ height: 'calc(100vh - 74px)' }}>
      {/* Toolbar */}
      <div className="flex items-center justify-between gap-3 border-b border-slate-800/60 bg-slate-950/90 px-4 py-2 backdrop-blur-xl">
        <div className="flex items-center gap-3">
          <Link to={`/events/${eventId}/seat-design`} className="rounded-lg border border-slate-700 px-2.5 py-1 text-xs text-slate-400 hover:text-white transition-colors">← Maps</Link>
          <h2 className="text-sm font-bold">{seatMapName || 'Designer'}</h2>
          <div className="flex items-center gap-1.5">
            <span className={`h-1.5 w-1.5 rounded-full ${connected ? 'bg-emerald-400 shadow-[0_0_4px_rgba(74,222,128,0.5)]' : 'bg-red-500'}`} />
            <span className="text-[10px] text-slate-500">{connected ? 'Online' : 'Offline'}</span>
          </div>
          {onlineUsers.length > 0 && (
            <div className="flex -space-x-1">{onlineUsers.slice(0, 5).map(u => (
              <div key={u.userId} className="flex h-6 w-6 items-center justify-center rounded-full border-2 border-slate-950 text-[9px] font-bold" style={{ background: u.avatarColor }} title={u.displayName || u.email}>{(u.displayName || u.email)[0]?.toUpperCase()}</div>
            ))}{onlineUsers.length > 5 && <div className="flex h-6 w-6 items-center justify-center rounded-full border-2 border-slate-950 bg-slate-700 text-[9px] text-slate-300">+{onlineUsers.length - 5}</div>}</div>
          )}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-slate-500">{Math.round(zoom * 100)}%</span>
          <button className="rounded border border-slate-700 px-2 py-0.5 text-xs text-slate-400 hover:text-white" onClick={() => setZoom(z => Math.min(3, z * 1.2))}>+</button>
          <button className="rounded border border-slate-700 px-2 py-0.5 text-xs text-slate-400 hover:text-white" onClick={() => setZoom(z => Math.max(0.2, z * 0.8))}>−</button>
          <button className="rounded border border-slate-700 px-2 py-0.5 text-xs text-slate-400 hover:text-white" onClick={() => { setZoom(1); setPan({ x: 0, y: 0 }) }}>Fit</button>
          <div className="h-4 w-px bg-slate-700" />
          <button className="rounded border border-slate-700 px-2.5 py-0.5 text-xs text-slate-400 hover:text-white" onClick={handleSaveVersion}>💾 Save</button>
          <button className="rounded border border-slate-700 px-2.5 py-0.5 text-xs text-slate-400 hover:text-white" onClick={handleLoadVersions}>📋 Versions</button>
        </div>
      </div>

      <div className="grid flex-1 overflow-hidden" style={{ gridTemplateColumns: '180px 1fr 200px' }}>
        {/* Left Panel */}
        <div className="overflow-y-auto border-r border-slate-800/60 bg-slate-950/80 p-3 space-y-4">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-2">Tools</p>
            <div className="grid grid-cols-2 gap-1">
              {([['select', '🖱', 'Select'], ['section', '⬜', 'Section'], ['object', '🎭', 'Object'], ['row', '↔', 'Row']] as const).map(([key, icon, label]) => (
                <button key={key} disabled={key === 'row' && !selectedSection}
                  className={`flex flex-col items-center gap-0.5 rounded-lg p-2 text-[10px] transition-colors ${selectedTool === key ? 'bg-indigo-500/15 text-indigo-300 border border-indigo-500/30' : 'text-slate-400 hover:bg-slate-800/50 border border-transparent'} disabled:opacity-30`}
                  onClick={() => { setSelectedTool(key); if (key === 'section') setShowAddSection(true); if (key === 'object') setShowAddObject(true); if (key === 'row' && selectedSection) setShowAddRow(true) }}>
                  <span className="text-lg">{icon}</span><span>{label}</span>
                </button>
              ))}
            </div>
          </div>

          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-2">Stats</p>
            <div className="space-y-1 text-xs">{[['Sections', sections.length], ['Objects', objects.length], ['Seats', totalSeats]].map(([l, v]) => <div key={l as string} className="flex justify-between text-slate-400"><span>{l}</span><span className="font-semibold text-slate-200">{v}</span></div>)}</div>
          </div>

          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-2">Legend</p>
            <div className="space-y-1">{Object.entries(SEAT_COLORS).map(([s, c]) => <div key={s} className="flex items-center gap-2 text-[11px] text-slate-400"><span className="h-2.5 w-2.5 rounded-full" style={{ background: c }} />{s}</div>)}</div>
          </div>
        </div>

        {/* Canvas */}
        <div className="relative overflow-hidden bg-slate-950">
          {loading ? <div className="flex h-full items-center justify-center"><div className="spinner" /><span className="ml-3 text-sm text-slate-400">Loading...</span></div>
          : error ? <div className="flex h-full items-center justify-center text-sm text-slate-400">{error}</div>
          : <canvas ref={canvasRef} className="block h-full w-full cursor-crosshair" onWheel={handleWheel} onMouseDown={handleMouseDown} onMouseMove={handleMouseMove} onMouseUp={handleMouseUp} onMouseLeave={handleMouseUp} />}
        </div>

        {/* Right Panel */}
        <div className="overflow-y-auto border-l border-slate-800/60 bg-slate-950/80 p-3">
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-2">{selSecData ? `Section: ${selSecData.label}` : 'Elements'}</p>
          {selSecData ? (
            <div className="space-y-2">
              <div className="text-xs space-y-1">{[['Type', selSecData.sectionType], ['Rows', selSecData.rows.length], ['Seats', selSecData.rows.reduce((s, r) => s + r.seats.length, 0)]].map(([l, v]) => <div key={l as string} className="flex justify-between text-slate-400"><span>{l}</span><span className="text-slate-200">{String(v)}</span></div>)}</div>
              <button className="w-full rounded-lg bg-indigo-500 py-1.5 text-xs font-semibold text-white hover:bg-indigo-400" onClick={() => setShowAddRow(true)}>+ Add Row</button>
              <button className="w-full rounded-lg border border-red-500/30 py-1.5 text-xs text-red-400 hover:bg-red-500/10" onClick={() => handleDeleteSection(selSecData.id)}>Delete Section</button>
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mt-3 mb-1">Rows</p>
              {selSecData.rows.length === 0 ? <p className="text-xs text-slate-500">No rows.</p> : selSecData.rows.map(r => (
                <div key={r.id} className="flex items-center justify-between rounded-lg border border-slate-700/30 bg-slate-900/40 px-2.5 py-1.5 text-xs">
                  <span className="text-slate-300">{r.label} ({r.seats.length})</span>
                  <button className="text-red-400 hover:text-red-300 text-[10px]" onClick={() => handleDeleteRow(r.id)}>✕</button>
                </div>
              ))}
            </div>
          ) : (
            <div className="space-y-1">
              {sections.map(s => <div key={s.id} className="flex items-center justify-between rounded-lg px-2.5 py-1.5 text-xs cursor-pointer hover:bg-slate-800/40" onClick={() => setSelectedSection(s.id)}><span>⬜ {s.label}</span><span className="text-slate-500">{s.rows.length}R/{s.rows.reduce((sum, r) => sum + r.seats.length, 0)}S</span></div>)}
              {objects.map(o => <div key={o.id} className="flex items-center justify-between rounded-lg px-2.5 py-1.5 text-xs"><span>🎭 {o.label || o.objectType}</span><button className="text-red-400 text-[10px]" onClick={() => handleDeleteObject(o.id)}>✕</button></div>)}
            </div>
          )}
        </div>
      </div>

      {/* Modals */}
      {showAddSection && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={() => setShowAddSection(false)}>
          <div className="glass w-full max-w-sm p-5 fade-in" onClick={e => e.stopPropagation()}>
            <h2 className="mb-3 text-lg">Add Section</h2>
            <div className="space-y-3">
              <div><label>Label</label><input value={newSectionLabel} onChange={e => setNewSectionLabel(e.target.value)} placeholder="e.g. Zone A" /></div>
              <div><label>Type</label><select value={newSectionType} onChange={e => setNewSectionType(e.target.value)}>{SECTION_TYPES.map(t => <option key={t}>{t}</option>)}</select></div>
              <div className="grid grid-cols-2 gap-2"><div><label>X</label><input type="number" value={newSectionX} onChange={e => setNewSectionX(+e.target.value)} /></div><div><label>Y</label><input type="number" value={newSectionY} onChange={e => setNewSectionY(+e.target.value)} /></div><div><label>Width</label><input type="number" value={newSectionW} onChange={e => setNewSectionW(+e.target.value)} /></div><div><label>Height</label><input type="number" value={newSectionH} onChange={e => setNewSectionH(+e.target.value)} /></div></div>
              <div className="flex justify-end gap-2"><button className="text-sm text-slate-400" onClick={() => setShowAddSection(false)}>Cancel</button><button className="rounded-lg bg-indigo-500 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-400" onClick={handleAddSection}>Add</button></div>
            </div>
          </div>
        </div>
      )}

      {showAddObject && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={() => setShowAddObject(false)}>
          <div className="glass w-full max-w-sm p-5 fade-in" onClick={e => e.stopPropagation()}>
            <h2 className="mb-3 text-lg">Add Object</h2>
            <div className="space-y-3">
              <div><label>Type</label><select value={newObjType} onChange={e => setNewObjType(e.target.value)}>{OBJECT_TYPES.map(t => <option key={t}>{t}</option>)}</select></div>
              <div><label>Label</label><input value={newObjLabel} onChange={e => setNewObjLabel(e.target.value)} placeholder="e.g. Main Stage" /></div>
              <div className="flex justify-end gap-2"><button className="text-sm text-slate-400" onClick={() => setShowAddObject(false)}>Cancel</button><button className="rounded-lg bg-indigo-500 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-400" onClick={handleAddObject}>Add</button></div>
            </div>
          </div>
        </div>
      )}

      {showAddRow && selectedSection && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={() => setShowAddRow(false)}>
          <div className="glass w-full max-w-sm p-5 fade-in" onClick={e => e.stopPropagation()}>
            <h2 className="mb-3 text-lg">Add Row</h2>
            <div className="space-y-3">
              <div><label>Row Label</label><input value={newRowLabel} onChange={e => setNewRowLabel(e.target.value)} placeholder="e.g. A" /></div>
              <div className="grid grid-cols-2 gap-2"><div><label>Seats</label><input type="number" value={newRowSeatCount} onChange={e => setNewRowSeatCount(+e.target.value)} /></div><div><label>Spacing</label><input type="number" value={newRowSpacing} onChange={e => setNewRowSpacing(+e.target.value)} /></div></div>
              <div className="flex justify-end gap-2"><button className="text-sm text-slate-400" onClick={() => setShowAddRow(false)}>Cancel</button><button className="rounded-lg bg-indigo-500 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-400" onClick={handleAddRow}>Add</button></div>
            </div>
          </div>
        </div>
      )}

      {showVersions && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={() => setShowVersions(false)}>
          <div className="glass w-full max-w-md p-5 fade-in" onClick={e => e.stopPropagation()}>
            <h2 className="mb-3 text-lg">Versions</h2>
            {versions.length === 0 ? <p className="text-sm text-slate-400">No versions yet.</p> : (
              <div className="space-y-2">{versions.map(v => (
                <div key={v.id} className="flex items-center justify-between rounded-lg border border-slate-700/30 bg-slate-900/40 p-3 text-sm">
                  <div><strong>v{v.versionNumber}</strong><span className="ml-2 text-[11px] text-slate-500">{new Date(v.createdAt).toLocaleString('en-US')}</span>{v.changeDescription && <p className="text-[11px] text-slate-500 m-0">{v.changeDescription}</p>}</div>
                  <button className="text-xs text-indigo-400 hover:text-indigo-300" onClick={() => handleRestoreVersion(v.id)}>Restore</button>
                </div>
              ))}</div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
