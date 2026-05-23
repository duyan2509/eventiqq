import type { SubmissionResponse, UpdateSubmissionDto } from '../types/index'
import type { PaginatedResult } from '../types/organization'
import { http } from './httpClient'

export async function getSubmissions(eventId: string): Promise<PaginatedResult<SubmissionResponse>> {
  const res = await http.get<PaginatedResult<SubmissionResponse>>(`/events/${eventId}/submissions`)
  return res.data
}

export async function submitEvent(eventId: string, orgId: string): Promise<SubmissionResponse> {
  const res = await http.post<SubmissionResponse>(`/events/${eventId}/submissions/${orgId}`)
  return res.data
}

export async function acceptSubmission(eventId: string, dto: UpdateSubmissionDto): Promise<SubmissionResponse> {
  const res = await http.post<SubmissionResponse>(`/events/${eventId}/submissions/accept`, dto)
  return res.data
}

export async function rejectSubmission(eventId: string, dto: UpdateSubmissionDto): Promise<SubmissionResponse> {
  const res = await http.post<SubmissionResponse>(`/events/${eventId}/submissions/reject`, dto)
  return res.data
}

export async function cancelSubmission(eventId: string, orgId: string, dto: UpdateSubmissionDto): Promise<SubmissionResponse> {
  const res = await http.post<SubmissionResponse>(`/events/${eventId}/submissions/${orgId}/cancel`, dto)
  return res.data
}
