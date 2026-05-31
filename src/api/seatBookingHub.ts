import { HubConnectionBuilder, HubConnection, LogLevel } from '@microsoft/signalr'
import { getAccessToken } from '../store/authStore'
import type { SeatStatusUpdate } from '../types/seat'

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
 * Register handlers BEFORE invoking JoinSeatMap, otherwise the server's
 * InitialSeatStatuses message (sent inline from JoinSeatMap) is dropped.
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

export async function disconnectFromBookingHub(seatMapId: string): Promise<void> {
  if (!connection) return
  try {
    await connection.invoke('LeaveSeatMap', seatMapId)
    await connection.stop()
  } catch { }
  connection = null
}
