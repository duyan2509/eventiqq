// In-memory access token store. No localStorage.
let accessTokenInMemory: string | null = null

export function setAccessToken(token: string) {
  accessTokenInMemory = token
}

export function getAccessToken(): string | null {
  return accessTokenInMemory
}

export function clearAccessToken() {
  accessTokenInMemory = null
}
