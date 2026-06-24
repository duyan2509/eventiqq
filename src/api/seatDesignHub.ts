import { HubConnectionBuilder, HubConnection, HubConnectionState, LogLevel } from '@microsoft/signalr'
import { getAccessToken } from '../store/authStore'

const SEAT_BASE = import.meta.env.VITE_SEAT_HUB_BASE_URL || 'http://localhost:5234'
const HUB_URL = `${SEAT_BASE}/hubs/seat-design`

let connection: HubConnection | null = null
// In-flight start() promise. disconnect awaits this before stopping so a connection
// is never torn down mid-negotiation (StrictMode mounts/unmounts the page twice in dev).
let startPromise: Promise<void> | null = null

export function getConnection(): HubConnection | null {
  return connection
}

export async function connectToHub(seatMapId: string): Promise<HubConnection> {
  // Tear down any prior connection (and wait for its in-flight start) before reconnecting.
  await disconnectFromHub(seatMapId)

  const conn = new HubConnectionBuilder()
    .withUrl(HUB_URL, { accessTokenFactory: () => getAccessToken() || '' })
    .withAutomaticReconnect([0, 2000, 5000, 10000])
    .configureLogging(LogLevel.Warning)
    .build()

  conn.onreconnected(async () => {
    try { await conn.invoke('JoinSeatMap', seatMapId) } catch { }
  })

  // Use a local `conn` (never the shared global) across awaits so a concurrent
  // connect/disconnect can't make us operate on the wrong connection.
  connection = conn
  startPromise = conn.start()
  await startPromise
  await conn.invoke('JoinSeatMap', seatMapId)
  return conn
}

export async function disconnectFromHub(seatMapId: string): Promise<void> {
  const conn = connection
  if (!conn) return
  connection = null
  const pending = startPromise
  startPromise = null
  if (pending) { try { await pending } catch { } }
  try {
    if (conn.state === HubConnectionState.Connected) await conn.invoke('LeaveSeatMap', seatMapId)
  } catch { }
  try { await conn.stop() } catch { }
}

// Seat operations
export function addSeat(seatMapId: string, dto: {
  seatMapId: string; seatType: number; position?: string; legendId?: string
}) {
  return connection?.invoke('AddSeat', seatMapId, dto)
}

export function addSeats(seatMapId: string, dto: {
  seatMapId: string; seatType: number; positions: string[]; legendId?: string
}) {
  return connection?.invoke('AddSeats', seatMapId, dto)
}

export function updateSeats(seatMapId: string, dto: { seats: { seatId: string; position?: string; seatType?: number; label?: string; legendId?: string }[] }) {
  return connection?.invoke('UpdateSeats', seatMapId, dto)
}

export function deleteSeats(seatMapId: string, seatIds: string[]) {
  return connection?.invoke('DeleteSeats', seatMapId, seatIds)
}

export function setSeatLegend(seatMapId: string, seatIds: string[], legendId: string | null) {
  return connection?.invoke('SetSeatLegend', seatMapId, seatIds, legendId)
}

// Object operations
export function addObject(seatMapId: string, dto: any) {
  return connection?.invoke('AddObject', seatMapId, dto)
}

export function updateObject(seatMapId: string, dto: any) {
  return connection?.invoke('UpdateObject', seatMapId, dto)
}

export function deleteObject(seatMapId: string, objectId: string) {
  return connection?.invoke('DeleteObject', seatMapId, objectId)
}

// Cursor & selection — use send() not invoke() so cursor frames don't block the invocation queue
let _lastCursorSend = 0
export function sendCursorPosition(seatMapId: string, x: number, y: number) {
  const now = Date.now()
  if (now - _lastCursorSend < 50) return  // 20fps cap
  _lastCursorSend = now
  connection?.send('SendCursorPosition', seatMapId, { x, y })
}

// Notify peers our cursor has left the canvas so they can hide it.
export function sendCursorLeave(seatMapId: string) {
  _lastCursorSend = 0  // let the next move send immediately instead of being throttled
  connection?.send('SendCursorLeave', seatMapId)
}

export function sendSelection(seatMapId: string, elementIds: string[]) {
  return connection?.invoke('SendSelection', seatMapId, { elementIds })
}
