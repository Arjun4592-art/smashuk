// app/api/auth/logout/route.ts
//
// Clears auth + token cookies for ONLY the surface that's logging out
// (dashboard, pos, or website) — passed in the request body by
// authStore.logout(surface). Previously this cleared all three surfaces
// unconditionally on every call, which meant logging out of the POS
// silently logged the dashboard out too (they share this one route
// because authStore is shared across surfaces, but their sessions/cookies
// are independent and should stay that way).
//
// Also logs the logout event server-side (staff_activity_log) for
// dashboard/pos surfaces — not for 'website', that's customers, not staff.

import { NextRequest, NextResponse } from 'next/server'
import {
  clearSurfaceCookies,
  SURFACE_COOKIES,
  type Surface,
} from '@/lib/api/auth-cookie'
import { logStaffActivity } from '@/lib/api/staff-activity'

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}))
  const surface = body?.surface as Surface | undefined

  // Defensive fallback: if a caller ever hits this route without a surface
  // (e.g. stale client bundle mid-deploy), fall back to clearing whichever
  // single surface's cookie is actually present rather than guessing wrong
  // or clearing everything.
  const resolvedSurface: Surface | undefined =
    surface && SURFACE_COOKIES[surface]
      ? surface
      : (['dashboard', 'pos', 'website'] as Surface[]).find(
          (s) => req.cookies.get(SURFACE_COOKIES[s].authCookie)?.value,
        )

  if (
    resolvedSurface &&
    (resolvedSurface === 'dashboard' || resolvedSurface === 'pos')
  ) {
    const authCookie = req.cookies.get(
      SURFACE_COOKIES[resolvedSurface].authCookie,
    )?.value
    if (authCookie) {
      try {
        const parsed = JSON.parse(decodeURIComponent(authCookie))
        if (parsed?.userId) {
          // Fire-and-forget — logStaffActivity swallows its own errors.
          logStaffActivity({
            staffId: parsed.userId,
            action: 'logout',
            surface: resolvedSurface,
          })
        }
      } catch {
        // malformed/stale cookie — nothing to log, just proceed to clear it
      }
    }
  }

  const response = NextResponse.json({ success: true })
  if (resolvedSurface) {
    clearSurfaceCookies(response.cookies, resolvedSurface)
  }
  return response
}
