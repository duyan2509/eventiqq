/** Minimal JWT payload decoder (no signature verification — for reading claims client-side). */
export interface JwtClaims {
  sub?: string
  email?: string
  orgId?: string
  orgName?: string
  exp?: number
  [key: string]: unknown
}

/** Decode the payload of a JWT. Returns null if the token is malformed. */
export function decodeJwt(token: string | null | undefined): JwtClaims | null {
  if (!token) return null
  const parts = token.split('.')
  if (parts.length < 2) return null
  try {
    let b64 = parts[1].replace(/-/g, '+').replace(/_/g, '/')
    b64 += '='.repeat((4 - (b64.length % 4)) % 4)
    const json = decodeURIComponent(
      atob(b64)
        .split('')
        .map(c => '%' + c.charCodeAt(0).toString(16).padStart(2, '0'))
        .join(''),
    )
    return JSON.parse(json) as JwtClaims
  } catch {
    return null
  }
}

/** Read the `orgId` claim from a JWT, or null if absent/malformed. */
export function getOrgIdFromToken(token: string | null | undefined): string | null {
  const claims = decodeJwt(token)
  return claims?.orgId ?? null
}
