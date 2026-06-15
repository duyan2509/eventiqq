import { HubConnectionBuilder, HubConnection, HubConnectionState, LogLevel } from '@microsoft/signalr'
import { getAccessToken } from '../store/authStore'
import type { SeatStatusUpdate, Bbox } from '../types/seat'

const SEAT_BASE = import.meta.env.VITE_SEAT_HUB_BASE_URL || 'http://localhost:5234'
const HUB_URL = `${SEAT_BASE}/hubs/seat-booking`

let connection: HubConnection | null = null
// In-flight start() promise. disconnect awaits this before stopping so a connection
// is never torn down mid-negotiation (StrictMode mounts/unmounts the page twice in dev).
let startPromise: Promise<void> | null = null

export function getConnection(): HubConnection | null {
  return connection
}

export interface BookingHubHandlers {
  onInitialStatuses?: (updates: SeatStatusUpdate[]) => void
  onStatusChanged?: (updates: SeatStatusUpdate[]) => void
  onClose?: () => void
}

/**
 * Connect and join the live-update group. Statuses are no longer pushed on join —
 * the caller requests them per viewport via getRegionStatuses; the server replies
 * with an InitialSeatStatuses message, so register handlers before requesting.
 */
export async function connectToBookingHub(
  seatMapId: string,
  handlers: BookingHubHandlers = {}
): Promise<HubConnection> {
  // Tear down any prior connection (and wait for its in-flight start) before reconnecting.
  await disconnectFromBookingHub(seatMapId)

  const conn = new HubConnectionBuilder()
    .withUrl(HUB_URL, {
      accessTokenFactory: () => getAccessToken() || '',
    })
    .withAutomaticReconnect([0, 2000, 5000, 10000])
    .configureLogging(LogLevel.Warning)
    .build()

  if (handlers.onInitialStatuses) conn.on('InitialSeatStatuses', handlers.onInitialStatuses)
  if (handlers.onStatusChanged) conn.on('SeatsStatusChanged', handlers.onStatusChanged)
  if (handlers.onClose) conn.onclose(handlers.onClose)

  // Use a local `conn` (never the shared global) across awaits so a concurrent
  // connect/disconnect can't make us operate on the wrong connection.
  connection = conn
  startPromise = conn.start()
  await startPromise
  await conn.invoke('JoinSeatMap', seatMapId)

  return conn
}

/**
 * Request current statuses for seats within a viewport region. The server replies
 * via the InitialSeatStatuses handler. Omit `bbox` to request statuses for all seats.
 */
export async function getRegionStatuses(seatMapId: string, bbox?: Bbox): Promise<void> {
  if (!connection) return
  await connection.invoke('GetRegionStatuses', seatMapId, bbox ?? null)
}

export async function disconnectFromBookingHub(seatMapId: string): Promise<void> {
  const conn = connection
  if (!conn) return
  connection = null
  // Wait for an in-flight start() to settle so stop() doesn't race negotiation.
  const pending = startPromise
  startPromise = null
  if (pending) { try { await pending } catch { } }
  try {
    if (conn.state === HubConnectionState.Connected) await conn.invoke('LeaveSeatMap', seatMapId)
  } catch { }
  try { await conn.stop() } catch { }
}
