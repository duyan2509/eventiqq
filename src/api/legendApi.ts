import type { LegendResponse, CreateLegendDto, UpdateLegendDto } from '../types/index'
import type { PaginatedResult } from '../types/organization'
import { http } from './httpClient'

export async function getLegends(eventId: string, page = 1, size = 10): Promise<PaginatedResult<LegendResponse>> {
  const res = await http.get<PaginatedResult<LegendResponse>>(`/events/${eventId}/legends`, { params: { page, size } })
  return res.data
}

export async function createLegend(eventId: string, orgId: string, dto: CreateLegendDto): Promise<LegendResponse> {
  const res = await http.post<LegendResponse>(`/events/${eventId}/legends/${orgId}`, dto)
  return res.data
}

export async function updateLegend(eventId: string, legendId: string, orgId: string, dto: UpdateLegendDto): Promise<LegendResponse> {
  const res = await http.patch<LegendResponse>(`/events/${eventId}/legends/${legendId}/${orgId}`, dto)
  return res.data
}

export async function deleteLegend(eventId: string, legendId: string, orgId: string): Promise<void> {
  await http.delete(`/events/${eventId}/legends/${legendId}/${orgId}`)
}
