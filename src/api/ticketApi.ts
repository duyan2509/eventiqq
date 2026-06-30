import type { TicketResponse } from '../types/index'
import { http } from './httpClient'

export async function getTicketsByOrder(orderId: string): Promise<TicketResponse[]> {
  const res = await http.get<TicketResponse[]>(`/payments/orders/${orderId}/tickets`)
  return res.data
}

export async function checkInTicket(token: string): Promise<TicketResponse> {
  const res = await http.post<TicketResponse>('/tickets/checkin', { token })
  return res.data
}

export interface EventCheckInItem {
  ticketId: string
  seatLabel: string
  legendName: string
  price: number
  sessionName: string
  sessionStart: string
  checkedInAt: string
}

export async function getEventCheckIns(eventId: string): Promise<EventCheckInItem[]> {
  const res = await http.get<EventCheckInItem[]>(`/tickets/events/${eventId}/checkins`)
  return res.data
}

export interface OrgCheckInItem {
  ticketId: string
  seatLabel: string
  legendName: string
  price: number
  sessionName: string
  sessionStart: string
  eventName: string
  eventId: string
  checkedInAt: string
}

export async function getOrgCheckIns(): Promise<OrgCheckInItem[]> {
  const res = await http.get<OrgCheckInItem[]>('/tickets/org/checkins')
  return res.data
}
