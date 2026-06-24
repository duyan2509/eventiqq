export interface OrganizationDetail {
  id: string
  name: string
  description?: string
  size: number
  isOwner: boolean
}

export interface OrganizationDto {
  name: string
  description?: string
}

export interface UpdateOrganizationDto {
  name?: string
  description?: string
}

export interface OrganizationResponse {
  id: string
  name: string
  description?: string
}

export interface UserOrganizationItem {
  orgId: string
  orgName: string
  roleName: string
}

export interface PaginatedResult<T> {
  data: T[]
  total: number
  page: number
  size: number
}
