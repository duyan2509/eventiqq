import { HubConnectionBuilder, HubConnection, LogLevel } from '@microsoft/signalr'
import { getAccessToken } from '../store/authStore'
import type { SeatStatusUpdate, Bbox } from '../types/seat'

const SEAT_BASE = import.meta.env.VITE_SEAT_HUB_BASE_URL || 'http://localhost:5234'
const HUB_URL = `${SEAT_BASE}/hubs/seat-booking`

let connection: HubConnection | null = null

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
  if (connection) {
    await connection.stop()
  }

  connection = new HubConnectionBuilder()
    .withUrl(HUB_URL, {
      accessTokenFactory: () => getAccessToken() || '',
    })
    .withAutomaticReconnect([0, 2000, 5000, 10000])
    .configureLogging(LogLevel.Warning)
    .build()

  if (handlers.onInitialStatuses) connection.on('InitialSeatStatuses', handlers.onInitialStatuses)
  if (handlers.onStatusChanged) connection.on('SeatsStatusChanged', handlers.onStatusChanged)
  if (handlers.onClose) connection.onclose(handlers.onClose)

  await connection.start()
  await connection.invoke('JoinSeatMap', seatMapId)

  return connection
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
  if (!connection) return
  try {
    await connection.invoke('LeaveSeatMap', seatMapId)
    await connection.stop()
  } catch { }
  connection = null
}
