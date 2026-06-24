import type { OrganizationDetail, OrganizationDto, OrganizationResponse, UpdateOrganizationDto, PaginatedResult, UserOrganizationItem } from '../types/organization'
import { http } from './httpClient'

export async function getOrgsByUser(userId: string): Promise<UserOrganizationItem[]> {
  const res = await http.get<UserOrganizationItem[]>(`/organizations/by-user/${userId}`)
  return res.data
}

export async function getMyOrganizations(page = 1, size = 10): Promise<PaginatedResult<OrganizationDetail>> {
  const res = await http.get<PaginatedResult<OrganizationDetail>>('/organizations/me', {
    params: { page, size },
  })
  return res.data
}

export async function getOrganizationById(id: string): Promise<OrganizationDetail> {
  const res = await http.get<OrganizationDetail>(`/organizations/${id}`)
  return res.data
}

export async function createOrganization(dto: OrganizationDto): Promise<OrganizationResponse> {
  const res = await http.post<OrganizationResponse>('/organizations/create', dto)
  return res.data
}

export async function updateOrganization(id: string, dto: UpdateOrganizationDto): Promise<OrganizationResponse> {
  const res = await http.patch<OrganizationResponse>(`/organizations/${id}`, dto)
  return res.data
}
