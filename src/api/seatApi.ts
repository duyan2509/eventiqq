import type { SeatMapResponse, SeatMapDetailResponse, CreateSeatMapDto, SeatMapStatsResponse } from '../types/seat'
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
