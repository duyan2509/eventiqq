import type { UserResponse, BanUserRequest } from '../types/index'
import type { PaginatedResult } from '../types/organization'
import { http } from './httpClient'

export async function getAllUsers(query?: string, page = 1, size = 10): Promise<PaginatedResult<UserResponse>> {
  const res = await http.get<PaginatedResult<UserResponse>>('/users', { params: { query, page, size } })
  return res.data
}

export async function banUser(userId: string, dto: BanUserRequest): Promise<unknown> {
  const res = await http.patch(`/users/${userId}/ban`, dto)
  return res.data
}

export async function unbanUser(userId: string, dto: BanUserRequest): Promise<unknown> {
  const res = await http.patch(`/users/${userId}/unban`, dto)
  return res.data
}
