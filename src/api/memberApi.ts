import type { MemberResponse, ChangePermission } from '../types/member'
import type { PaginatedResult } from '../types/organization'
import { http } from './httpClient'

export async function getMembers(orgId: string, page = 1, size = 10): Promise<PaginatedResult<MemberResponse>> {
  const res = await http.get<PaginatedResult<MemberResponse>>(`/organizations/${orgId}/members`, {
    params: { page, size },
  })
  return res.data
}

export async function changeMemberPermission(orgId: string, memberId: string, dto: ChangePermission): Promise<MemberResponse> {
  const res = await http.patch<MemberResponse>(`/organizations/${orgId}/members/${memberId}/permission`, dto)
  return res.data
}

export async function deleteMember(orgId: string, memberId: string): Promise<void> {
  await http.delete(`/organizations/${orgId}/members/${memberId}`)
}

export async function getMyMembership(orgId: string): Promise<MemberResponse> {
  const res = await http.get<MemberResponse>(`/organizations/${orgId}/members/me`)
  return res.data
}
