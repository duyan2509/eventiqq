export type Role = 'User' | 'Org' | 'Staff' | 'Admin'

export interface UserInfo {
  email: string
  currentRole: Role
}

export interface LoginRequest {
  email: string
  password: string
}

export interface RegisterRequest {
  email: string
  password: string
  name: string
}

export interface AuthTokens {
  accessToken: string
  refreshToken: string
}

export interface AuthResponse {
  user: UserInfo
  tokens: AuthTokens
}

