export type Role = 'User' | 'Organization' | 'Organizer' | 'Staff' | 'Admin'

export interface UserInfo {
  id?: string
  email: string
  currentRole: Role
  orgId?: string
  orgName?: string
  roles?: string[]
}

export interface LoginRequest {
  email: string
  password: string
}
export type LoginDto = LoginRequest

export interface RegisterRequest {
  email: string
  password: string
}
export type RegisterDto = RegisterRequest

export interface AuthResponse {
  user: UserInfo
}

export interface SwitchRoleRequest {
  organizationId: string
  organizationName?: string
}

export interface AccessTokenResponse {
  accessToken: string
}
