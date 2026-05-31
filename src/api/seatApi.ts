import type { SeatMapResponse, SeatMapDetailResponse, SeatMapLayoutResponse, HoldSeatsResponse, CreateSeatMapDto, SeatMapStatsResponse } from '../types/seat'
import { http } from './httpClient'

export async function getSeatMapsByEvent(eventId: string): Promise<SeatMapResponse[]> {
  const res = await http.get<SeatMapResponse[]>('/seat-maps', { params: { eventId } })
  return res.data
}

export async function getSeatMapById(id: string): Promise<SeatMapDetailResponse> {
  const res = await http.get<SeatMapDetailResponse>(`/seat-maps/${id}`)
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

export async function getSeatMapBySession(sessionId: string): Promise<SeatMapLayoutResponse> {
  const res = await http.get<SeatMapLayoutResponse>(`/seat-maps/sessions/${sessionId}`)
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
