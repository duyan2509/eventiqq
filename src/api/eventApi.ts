import type { EventQuickViewData, EventDetail, CreateEventDto, UpdateEventDto, PaginatedResult } from '../types/event'
import { http } from './httpClient'

export async function getAllEvents(params?: {
  query?: string
  status?: string
  province?: string
  organizationId?: string
  newest?: boolean
  increasePrice?: boolean
  page?: number
  size?: number
}): Promise<PaginatedResult<EventQuickViewData>> {
  const res = await http.get<PaginatedResult<EventQuickViewData>>('/events', { params })
  return res.data
}

export async function getEventDetail(eventId: string): Promise<EventDetail> {
  const res = await http.get<EventDetail>(`/events/${eventId}`)
  return res.data
}

export async function createEvent(orgId: string, dto: CreateEventDto, banner?: File): Promise<EventQuickViewData> {
  const form = new FormData()
  Object.entries(dto).forEach(([k, v]) => { if (v !== undefined && v !== null && v !== '') form.append(k, String(v)) })
  if (banner) form.append('banner', banner)
  const res = await http.post<EventQuickViewData>(`/events/${orgId}`, form, {
    headers: { 'Content-Type': 'multipart/form-data' }
  })
  return res.data
}

export async function updateEvent(eventId: string, dto: UpdateEventDto, banner?: File): Promise<EventQuickViewData> {
  const form = new FormData()
  Object.entries(dto).forEach(([k, v]) => { if (v !== undefined && v !== null && v !== '') form.append(k, String(v)) })
  if (banner) form.append('banner', banner)
  const res = await http.patch<EventQuickViewData>(`/events/${eventId}`, form, {
    headers: { 'Content-Type': 'multipart/form-data' }
  })
  return res.data
}
