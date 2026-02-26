import type { AuthTokens } from '../types/auth'

const REFRESH_TOKEN_KEY = 'eventiqq_refresh_token'

let accessTokenInMemory: string | null = null

export function setTokens(tokens: AuthTokens) {
  accessTokenInMemory = tokens.accessToken
  try {
    window.localStorage.setItem(REFRESH_TOKEN_KEY, tokens.refreshToken)
  } catch {
    // ignore storage errors
  }
}

export function clearTokens() {
  accessTokenInMemory = null
  try {
    window.localStorage.removeItem(REFRESH_TOKEN_KEY)
  } catch {
    // ignore storage errors
  }
}

export function getAccessToken() {
  return accessTokenInMemory
}

export function getRefreshToken() {
  try {
    return window.localStorage.getItem(REFRESH_TOKEN_KEY)
  } catch {
    return null
  }
}

export function setAccessToken(token: string) {
  accessTokenInMemory = token
}

