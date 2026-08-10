interface ResponseCookies {
  set(
    name: string,
    value: string,
    options?: {
      httpOnly?: boolean
      secure?: boolean
      sameSite?: 'strict' | 'lax' | 'none'
      path?: string
      maxAge?: number
    },
  ): void
}

export type Surface = 'dashboard' | 'pos' | 'website'

interface CookiePair {
  authCookie: string // small JSON blob: { isAuthenticated, role } — readable by middleware, NOT secret
  tokenCookie: string // the actual Medusa JWT — never sent to the client in a JSON body
}

export const SURFACE_COOKIES: Record<Surface, CookiePair> = {
  dashboard: { authCookie: 'dashboard-auth', tokenCookie: 'dashboard-token' },
  pos: { authCookie: 'pos-auth', tokenCookie: 'pos-token' },
  website: { authCookie: 'smashuk-auth', tokenCookie: 'smashuk-token' },
}

// Session lifetime — keep short for high-privilege surfaces.
export const SESSION_MAX_AGE: Record<Surface, number> = {
  dashboard: 60 * 60 * 4, // 4 hours — admin, re-auth more often
  pos: 60 * 60 * 12, // 12 hours — staff shift length
  website: 60 * 60 * 24 * 7, // 7 days — customers, convenience over strictness
}

function baseCookieOptions(
  maxAge: number,
  sameSite: 'strict' | 'lax' = 'strict',
) {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite,
    path: '/',
    maxAge,
  } as const
}

/**
 * Sets both the (non-secret, middleware-readable) auth-state cookie and the
 * (secret, never-exposed-to-client) token cookie for a given surface.
 */
export function setSurfaceCookies(
  cookies: ResponseCookies,
  surface: Surface,
  payload: {
    isAuthenticated: true
    role: string
    userId?: string
    sessionId?: string
  },
  token: string,
  // Google OAuth redirect flows need 'lax' on the website surface; everything else can be 'strict'.
  sameSite: 'strict' | 'lax' = 'strict',
) {
  const { authCookie, tokenCookie } = SURFACE_COOKIES[surface]
  const maxAge = SESSION_MAX_AGE[surface]

  cookies.set(
    authCookie,
    encodeURIComponent(JSON.stringify(payload)),
    baseCookieOptions(maxAge, sameSite),
  )
  cookies.set(tokenCookie, token, baseCookieOptions(maxAge, sameSite))
}

export function clearSurfaceCookies(
  cookies: ResponseCookies,
  surface: Surface,
) {
  const { authCookie, tokenCookie } = SURFACE_COOKIES[surface]
  const cleared = baseCookieOptions(0)
  cookies.set(authCookie, '', cleared)
  cookies.set(tokenCookie, '', cleared)
}

export function clearAllCookies(cookies: ResponseCookies) {
  ;(Object.keys(SURFACE_COOKIES) as Surface[]).forEach((s) =>
    clearSurfaceCookies(cookies, s),
  )
}

/**
 * Reads and parses a surface's auth cookie from an incoming request,
 * returning whatever identity fields were stored at login (userId, role,
 * sessionId for pos). Returns null if not logged in on that surface or
 * the cookie is malformed/stale.
 */
export function getSurfaceIdentity(
  req: { cookies: { get(name: string): { value: string } | undefined } },
  surface: Surface,
): { userId?: string; role?: string; sessionId?: string } | null {
  const raw = req.cookies.get(SURFACE_COOKIES[surface].authCookie)?.value
  if (!raw) return null
  try {
    return JSON.parse(decodeURIComponent(raw))
  } catch {
    return null
  }
}
