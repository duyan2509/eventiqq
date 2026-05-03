import type { InvitationResponse, CreateInvitationDto } from '../types/index'
import type { PaginatedResult } from '../types/organization'
import { http } from './httpClient'

// Org-scoped: /organizations/{orgId}/invitations
export async function createInvitation(orgId: string, dto: CreateInvitationDto): Promise<InvitationResponse> {
  const res = await http.post<InvitationResponse>(`/organizations/${orgId}/invitations`, dto)
  return res.data
}

export async function getOrgInvitations(orgId: string, page = 1, size = 10): Promise<PaginatedResult<InvitationResponse>> {
  const res = await http.get<PaginatedResult<InvitationResponse>>(`/organizations/${orgId}/invitations`, { params: { page, size } })
  return res.data
}

export async function cancelInvitation(orgId: string, invitationId: string): Promise<InvitationResponse> {
  const res = await http.post<InvitationResponse>(`/organizations/${orgId}/invitations/${invitationId}/cancel`)
  return res.data
}

// User-scoped: /invitations
export async function getMyInvitations(page = 1, size = 10): Promise<PaginatedResult<InvitationResponse>> {
  const res = await http.get<PaginatedResult<InvitationResponse>>('/invitations/me', { params: { page, size } })
  return res.data
}

export async function acceptInvitation(orgId: string, invitationId: string): Promise<InvitationResponse> {
  const res = await http.post<InvitationResponse>(`/invitations/${orgId}/${invitationId}/accept`)
  return res.data
}

export async function rejectInvitation(orgId: string, invitationId: string): Promise<InvitationResponse> {
  const res = await http.post<InvitationResponse>(`/invitations/${orgId}/${invitationId}/reject`)
  return res.data
}
