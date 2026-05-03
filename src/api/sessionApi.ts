import type { SessionResponse, CreateSessionDto, UpdateSessionDto } from '../types/index'
import type { PaginatedResult } from '../types/organization'
import { http } from './httpClient'

export async function getSessions(eventId: string, page = 1, size = 10): Promise<PaginatedResult<SessionResponse>> {
  const res = await http.get<PaginatedResult<SessionResponse>>(`/events/${eventId}/sessions`, { params: { page, size } })
  return res.data
}

export async function createSession(eventId: string, orgId: string, dto: CreateSessionDto): Promise<SessionResponse> {
  const res = await http.post<SessionResponse>(`/events/${eventId}/sessions/${orgId}`, dto)
  return res.data
}

export async function updateSession(eventId: string, sessionId: string, orgId: string, dto: UpdateSessionDto): Promise<SessionResponse> {
  const res = await http.patch<SessionResponse>(`/events/${eventId}/sessions/${sessionId}/${orgId}`, dto)
  return res.data
}

export async function deleteSession(eventId: string, sessionId: string, orgId: string): Promise<void> {
  await http.delete(`/events/${eventId}/sessions/${sessionId}/${orgId}`)
}
