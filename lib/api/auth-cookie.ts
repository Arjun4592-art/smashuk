interface ResponseCookies {
  set(name: string, value: string, options?: {
    httpOnly?: boolean;
    secure?: boolean;
    sameSite?: 'strict' | 'lax' | 'none';
    path?: string;
    maxAge?: number;
  }): void;
}
export type Surface = 'dashboard' | 'pos' | 'website';
interface CookiePair {
  authCookie: string;
  tokenCookie: string;
}
export const SURFACE_COOKIES: Record<Surface, CookiePair> = {
  dashboard: {
    authCookie: 'dashboard-auth',
    tokenCookie: 'dashboard-token'
  },
  pos: {
    authCookie: 'pos-auth',
    tokenCookie: 'pos-token'
  },
  website: {
    authCookie: 'smashuk-auth',
    tokenCookie: 'smashuk-token'
  }
};
export const SESSION_MAX_AGE: Record<Surface, number> = {
  dashboard: 60 * 60 * 4,
  pos: 60 * 60 * 12,
  website: 60 * 60 * 24 * 7
};
function baseCookieOptions(maxAge: number, sameSite: 'strict' | 'lax' = 'strict') {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite,
    path: '/',
    maxAge
  } as const;
}
export function setSurfaceCookies(cookies: ResponseCookies, surface: Surface, payload: {
  isAuthenticated: true;
  role: string;
  userId?: string;
  sessionId?: string;
}, token: string, sameSite: 'strict' | 'lax' = 'strict') {
  const {
    authCookie,
    tokenCookie
  } = SURFACE_COOKIES[surface];
  const maxAge = SESSION_MAX_AGE[surface];
  cookies.set(authCookie, encodeURIComponent(JSON.stringify(payload)), baseCookieOptions(maxAge, sameSite));
  cookies.set(tokenCookie, token, baseCookieOptions(maxAge, sameSite));
}
export function clearSurfaceCookies(cookies: ResponseCookies, surface: Surface) {
  const {
    authCookie,
    tokenCookie
  } = SURFACE_COOKIES[surface];
  const cleared = baseCookieOptions(0);
  cookies.set(authCookie, '', cleared);
  cookies.set(tokenCookie, '', cleared);
}
export function clearAllCookies(cookies: ResponseCookies) {
  ;
  (Object.keys(SURFACE_COOKIES) as Surface[]).forEach(s => clearSurfaceCookies(cookies, s));
}
export function getSurfaceIdentity(req: {
  cookies: {
    get(name: string): {
      value: string;
    } | undefined;
  };
}, surface: Surface): {
  userId?: string;
  role?: string;
  sessionId?: string;
} | null {
  const raw = req.cookies.get(SURFACE_COOKIES[surface].authCookie)?.value;
  if (!raw) return null;
  try {
    return JSON.parse(decodeURIComponent(raw));
  } catch {
    return null;
  }
}
