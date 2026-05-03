import { HubConnectionBuilder, HubConnection, LogLevel } from '@microsoft/signalr'
import { getAccessToken } from '../store/authStore'

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5010'
const HUB_URL = `${API_BASE}/hubs/seat-design`

let connection: HubConnection | null = null

export function getConnection(): HubConnection | null {
  return connection
}

export async function connectToHub(seatMapId: string): Promise<HubConnection> {
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

export async function disconnectFromHub(seatMapId: string): Promise<void> {
  if (!connection) return
  try {
    await connection.invoke('LeaveSeatMap', seatMapId)
    await connection.stop()
  } catch { }
  connection = null
}

// Section operations
export function addSection(seatMapId: string, dto: any) {
  return connection?.invoke('AddSection', seatMapId, dto)
}

export function updateSection(seatMapId: string, dto: any) {
  return connection?.invoke('UpdateSection', seatMapId, dto)
}

export function deleteSection(seatMapId: string, sectionId: string) {
  return connection?.invoke('DeleteSection', seatMapId, sectionId)
}

// Row operations
export function addRow(seatMapId: string, dto: any) {
  return connection?.invoke('AddRow', seatMapId, dto)
}

export function updateRow(seatMapId: string, dto: any) {
  return connection?.invoke('UpdateRow', seatMapId, dto)
}

export function deleteRow(seatMapId: string, rowId: string) {
  return connection?.invoke('DeleteRow', seatMapId, rowId)
}

// Seat operations
export function addSeat(seatMapId: string, dto: any) {
  return connection?.invoke('AddSeat', seatMapId, dto)
}

export function updateSeats(seatMapId: string, dto: any) {
  return connection?.invoke('UpdateSeats', seatMapId, dto)
}

export function deleteSeats(seatMapId: string, seatIds: string[]) {
  return connection?.invoke('DeleteSeats', seatMapId, seatIds)
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

// Cursor & selection
export function sendCursorPosition(seatMapId: string, x: number, y: number) {
  return connection?.invoke('SendCursorPosition', seatMapId, { x, y })
}

export function sendSelection(seatMapId: string, elementIds: string[]) {
  return connection?.invoke('SendSelection', seatMapId, { elementIds })
}
