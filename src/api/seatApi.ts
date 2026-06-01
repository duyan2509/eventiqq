import type { SeatMapResponse, SeatMapMetaResponse, SeatResponse, SeatLayoutChunkResponse, HoldSeatsResponse, CreateSeatMapDto, SeatMapStatsResponse, Bbox } from '../types/seat'
import { http } from './httpClient'

export async function getSeatMapsByEvent(eventId: string): Promise<SeatMapResponse[]> {
  const res = await http.get<SeatMapResponse[]>('/seat-maps', { params: { eventId } })
  return res.data
}

// Design: seat map metadata (objects + bounds, no seats).
export async function getSeatMapById(id: string): Promise<SeatMapMetaResponse> {
  const res = await http.get<SeatMapMetaResponse>(`/seat-maps/${id}`)
  return res.data
}

// Design: all seats for a seat map (loaded in one call by the editor).
export async function getSeatMapSeats(id: string): Promise<SeatResponse[]> {
  const res = await http.get<SeatResponse[]>(`/seat-maps/${id}/seats`)
  return res.data
}

export async function createSeatMap(dto: CreateSeatMapDto): Promise<SeatMapResponse> {
  const res = await http.post<SeatMapResponse>('/seat-maps', dto)
  return res.data
}

export async function deleteSeatMap(id: string): Promise<void> {
  await http.delete(`/seat-maps/${id}`)
}

export async function getSeatMapStats(id: string): Promise<SeatMapStatsResponse> {
  const res = await http.get<SeatMapStatsResponse>(`/seat-maps/${id}/stats`)
  return res.data
}

export async function publishSeatMap(id: string): Promise<SeatMapResponse> {
  const res = await http.post<SeatMapResponse>(`/seat-maps/${id}/publish`)
  return res.data
}

// Booking: layout metadata (objects + full bounding box + total seats).
export async function getSessionMeta(sessionId: string): Promise<SeatMapMetaResponse> {
  const res = await http.get<SeatMapMetaResponse>(`/seat-maps/sessions/${sessionId}/meta`)
  return res.data
}

// Booking: a viewport chunk of seats. Omit bbox to fetch all seats (zoom-out / small maps).
export async function getSessionSeats(sessionId: string, bbox?: Bbox): Promise<SeatLayoutChunkResponse> {
  const params = bbox ? { x1: bbox.x1, y1: bbox.y1, x2: bbox.x2, y2: bbox.y2 } : undefined
  const res = await http.get<SeatLayoutChunkResponse>(`/seat-maps/sessions/${sessionId}/seats`, { params })
  return res.data
}

export async function holdSeats(seatMapId: string, seatIds: string[]): Promise<HoldSeatsResponse> {
  const res = await http.post<HoldSeatsResponse>(`/seat-maps/${seatMapId}/seats/hold`, { seatIds })
  return res.data
}

export async function releaseSeats(seatMapId: string, seatIds: string[]): Promise<void> {
  await http.delete(`/seat-maps/${seatMapId}/seats/hold`, { data: { seatIds } })
}

export interface HoldStatusResponse {
  heldUntil: string
  seats: Array<{
    id: string
    label: string
    seatNumber: number
    legendId?: string
  }>
}

export async function getHoldStatus(seatMapId: string, seatIds: string[]): Promise<HoldStatusResponse> {
  const res = await http.get<HoldStatusResponse>(`/seat-maps/${seatMapId}/seats/hold`, {
    params: { seatIds: seatIds.join(',') }
  })
  return res.data
}
