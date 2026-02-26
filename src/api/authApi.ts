import type { AuthResponse, LoginRequest, RegisterRequest } from '../types/auth'
import { clearTokens, setTokens } from '../store/authStore'
import { http } from './httpClient'

export async function signIn(data: LoginRequest): Promise<AuthResponse> {
  const res = await http.post<{
    user: { email: string; roles?: string[] }
    accessToken: string
    refreshToken: string
  }>('/auth/login', data)

  const body = res.data

  const response: AuthResponse = {
    user: {
      email: body.user.email,
      currentRole: (body.user.roles?.[0] as any) ?? 'User',
    },
    tokens: {
      accessToken: body.accessToken,
      refreshToken: body.refreshToken,
    },
  }

  setTokens(response.tokens)
  return response
}

export async function signUp(data: RegisterRequest): Promise<AuthResponse> {
  const res = await http.post<{
    user: { email: string; roles?: string[] }
    accessToken: string
    refreshToken: string
  }>('/auth/register', data)

  const body = res.data

  const response: AuthResponse = {
    user: {
      email: body.user.email,
      currentRole: (body.user.roles?.[0] as any) ?? 'User',
    },
    tokens: {
      accessToken: body.accessToken,
      refreshToken: body.refreshToken,
    },
  }

  setTokens(response.tokens)
  return response
}

export async function signOut(): Promise<void> {
  try {
    await http.post('/auth/logout')
  } finally {
    clearTokens()
  }
}


