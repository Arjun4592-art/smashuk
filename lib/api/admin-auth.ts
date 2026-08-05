// lib/api/admin-auth.ts
//
// SERVER-ONLY. Used by app/api/admin/* route handlers.
//
// The dashboard JWT lives in an HttpOnly 'dashboard-token' cookie — client-side
// JS can never read it (by design, see lib/api/auth-cookie.ts). So these route
// handlers must not require the browser to forward an Authorization header;
// they read the token straight out of the cookie on the server instead.

import 'server-only'
import { NextRequest } from 'next/server'
import { cookies } from 'next/headers'
import { SURFACE_COOKIES } from '@/lib/api/auth-cookie'

/**
 * Returns a Bearer Authorization header value for the currently logged-in
 * dashboard OR pos user, or null if there is no valid session. POS staff log
 * in via PIN (see app/api/auth/pos-pin), which mints a real Medusa admin JWT
 * under the hood, so either cookie works against /admin/* endpoints — though
 * middleware.ts restricts which /admin/* paths a POS-only session may reach.
 */
export async function getAdminAuthHeader(
  req: NextRequest,
): Promise<string | null> {
  // Back-compat: if a caller still forwards a header explicitly, honor it.
  const forwarded = req.headers.get('authorization')
  if (forwarded) return forwarded

  const cookieStore = await cookies()
  const token =
    cookieStore.get(SURFACE_COOKIES.dashboard.tokenCookie)?.value ??
    cookieStore.get(SURFACE_COOKIES.pos.tokenCookie)?.value
  return token ? `Bearer ${token}` : null
}
