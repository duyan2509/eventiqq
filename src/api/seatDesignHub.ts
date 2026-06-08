import { HubConnectionBuilder, HubConnection, LogLevel } from '@microsoft/signalr'
import { getAccessToken } from '../store/authStore'

const SEAT_BASE = import.meta.env.VITE_SEAT_HUB_BASE_URL || 'http://localhost:5234'
const HUB_URL = `${SEAT_BASE}/hubs/seat-design`

let connection: HubConnection | null = null

export function getConnection(): HubConnection | null {
  return connection
}

export async function connectToHub(seatMapId: string): Promise<HubConnection> {
  if (connection) await connection.stop()

  connection = new HubConnectionBuilder()
    .withUrl(HUB_URL, { accessTokenFactory: () => getAccessToken() || '' })
    .withAutomaticReconnect([0, 2000, 5000, 10000])
    .configureLogging(LogLevel.Warning)
    .build()

  connection.onreconnected(async () => {
    try { await connection!.invoke('JoinSeatMap', seatMapId) } catch { }
  })

  await connection.start()
  await connection.invoke('JoinSeatMap', seatMapId)
  return connection
}

export async function disconnectFromHub(seatMapId: string): Promise<void> {
  if (!connection) return
  try {
    await connection.invoke('LeaveSeatMap', seatMapId)
    await connection.stop()
  } catch { }
  connection = null
}

// Seat operations
export function addSeat(seatMapId: string, dto: {
  seatMapId: string; label: string; seatNumber: number; seatType: number; position?: string; legendId?: string
}) {
  return connection?.invoke('AddSeat', seatMapId, dto)
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
