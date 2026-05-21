import { HubConnectionBuilder, HubConnection, LogLevel } from '@microsoft/signalr'
import { getAccessToken } from '../store/authStore'

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5010'
const HUB_URL = `${API_BASE}/hubs/seat-booking`

let connection: HubConnection | null = null

export function getConnection(): HubConnection | null {
  return connection
}

export async function connectToBookingHub(seatMapId: string): Promise<HubConnection> {
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
