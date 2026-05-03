import { http } from './httpClient'

export interface SeatMapVersionResponse {
  id: string
  seatMapId: string
  versionNumber: number
  createdBy: string
  createdAt: string
  changeDescription?: string
}

export interface SeatMapVersionDetailResponse extends SeatMapVersionResponse {
  snapshot: string
}

export async function getVersions(seatMapId: string): Promise<SeatMapVersionResponse[]> {
  const res = await http.get<SeatMapVersionResponse[]>(`/seat-maps/${seatMapId}/versions`)
  return res.data
}

export async function getVersion(seatMapId: string, versionId: string): Promise<SeatMapVersionDetailResponse> {
  const res = await http.get<SeatMapVersionDetailResponse>(`/seat-maps/${seatMapId}/versions/${versionId}`)
  return res.data
}

export async function saveVersion(seatMapId: string, changeDescription?: string): Promise<SeatMapVersionResponse> {
  const res = await http.post<SeatMapVersionResponse>(`/seat-maps/${seatMapId}/versions`, { changeDescription })
  return res.data
}

export async function restoreVersion(seatMapId: string, versionId: string): Promise<SeatMapVersionDetailResponse> {
  const res = await http.post<SeatMapVersionDetailResponse>(`/seat-maps/${seatMapId}/versions/${versionId}/restore`)
  return res.data
}
