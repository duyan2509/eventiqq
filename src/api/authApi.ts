import type { AuthResponse, LoginRequest, RegisterRequest, SwitchRoleRequest, AccessTokenResponse, UserInfo } from '../types/auth'
import { clearAccessToken, setAccessToken } from '../store/authStore'
import { http } from './httpClient'

export async function signIn(data: LoginRequest): Promise<AuthResponse> {
  const res = await http.post<AccessTokenResponse>('/auth/login', data)
  setAccessToken(res.data.accessToken)

  const me = await getMe()
  return { user: me }
}

export async function signUp(data: RegisterRequest): Promise<boolean> {
  const res = await http.post<boolean>('/auth/register', data)
  return res.data
}

export async function signOut(): Promise<void> {
  try {
    await http.post('/auth/logout')          // cookie cleared server-side
  } finally {
    clearAccessToken()
  }
}

export async function getMe(): Promise<UserInfo> {
  const res = await http.get<{
    id: string
    email: string
    currentRole?: string
    orgId?: string
    orgName?: string
    roles?: string[]
    isBanned?: boolean
  }>('/auth/me')

  return {
    id: res.data.id,
    email: res.data.email,
    currentRole: (res.data.currentRole as any) ?? 'User',
    orgId: res.data.orgId ?? undefined,
    orgName: res.data.orgName ?? undefined,
    roles: res.data.roles,
  }
}

export async function switchRole(data: SwitchRoleRequest): Promise<UserInfo> {
  const res = await http.post<AccessTokenResponse>('/auth/role', data)
  setAccessToken(res.data.accessToken)          // cookie set server-side
  return await getMe()
}

export async function switchToUser(): Promise<UserInfo> {
  const res = await http.post<AccessTokenResponse>('/auth/switch-to-user')
  setAccessToken(res.data.accessToken)
  return await getMe()
}

export async function forgotPassword(email: string): Promise<{ message: string }> {
  const res = await http.post<{ message: string }>('/auth/forgot-password', { email })
  return res.data
}

export async function verifyResetToken(token: string): Promise<boolean> {
  try {
    await http.get('/auth/verify-reset-token', { params: { token } })
    return true
  } catch {
    return false
  }
}

export async function resetPassword(token: string, newPassword: string): Promise<boolean> {
  const res = await http.post<boolean>('/auth/reset-password', { token, newPassword })
  return res.data
}

/**
 * Try to refresh session using HttpOnly cookie.
 * Returns the new user info or null if refresh failed.
 */
export async function tryRefreshSession(): Promise<UserInfo | null> {
  try {
    const res = await http.post<AccessTokenResponse>('/auth/refresh')
    setAccessToken(res.data.accessToken)
    return await getMe()
  } catch {
    clearAccessToken()
    return null
  }
}
