import type { PermissionResponse, PermissionDto, UpdatePermissionDto } from '../types/index'
import type { PaginatedResult } from '../types/organization'
import { http } from './httpClient'

export async function getPermissions(orgId: string, page = 1, size = 10): Promise<PaginatedResult<PermissionResponse>> {
  const res = await http.get<PaginatedResult<PermissionResponse>>(`/organizations/${orgId}/permissions`, { params: { page, size } })
  return res.data
}

export async function createPermission(orgId: string, dto: PermissionDto): Promise<PermissionResponse> {
  const res = await http.post<PermissionResponse>(`/organizations/${orgId}/permissions`, dto)
  return res.data
}

export async function updatePermission(orgId: string, permissionId: string, dto: UpdatePermissionDto): Promise<PermissionResponse> {
  const res = await http.patch<PermissionResponse>(`/organizations/${orgId}/permissions/${permissionId}`, dto)
  return res.data
}

export async function deletePermission(orgId: string, permissionId: string): Promise<void> {
  await http.delete(`/organizations/${orgId}/permissions/${permissionId}`)
}
