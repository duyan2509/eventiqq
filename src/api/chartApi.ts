import type { ChartResponse, CreateChartDto, UpdateChartDto } from '../types/index'
import type { PaginatedResult } from '../types/organization'
import { http } from './httpClient'

export async function getCharts(eventId: string, page = 1, size = 10): Promise<PaginatedResult<ChartResponse>> {
  const res = await http.get<PaginatedResult<ChartResponse>>(`/events/${eventId}/charts`, { params: { page, size } })
  return res.data
}

export async function createChart(eventId: string, orgId: string, dto: CreateChartDto): Promise<ChartResponse> {
  const res = await http.post<ChartResponse>(`/events/${eventId}/charts/${orgId}`, dto)
  return res.data
}

export async function updateChart(eventId: string, chartId: string, orgId: string, dto: UpdateChartDto): Promise<ChartResponse> {
  const res = await http.patch<ChartResponse>(`/events/${eventId}/charts/${chartId}/${orgId}`, dto)
  return res.data
}

export async function deleteChart(eventId: string, chartId: string, orgId: string): Promise<void> {
  await http.delete(`/events/${eventId}/charts/${chartId}/${orgId}`)
}
