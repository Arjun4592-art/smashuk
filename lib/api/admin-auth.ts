import 'server-only'
import { NextRequest } from 'next/server'
import { cookies } from 'next/headers'
import { SURFACE_COOKIES, getSurfaceIdentity } from '@/lib/api/auth-cookie'

/**
 * Auth for /api/admin/** routes.
 *
 * SECURITY: this used to accept the POS token as a blanket fallback for
 * every admin route. Because the POS PIN flow puts the shared Medusa
 * *service* (owner) token behind every POS session regardless of the
 * staff member's posRole (see lib/api/medusa-service-token.ts +
 * app/api/auth/pos-pin/route.ts), that meant any logged-in Cashier could
 * call things like /api/admin/customers, /api/admin/discounts,
 * /api/admin/general-settings, /api/admin/staff, etc. directly (e.g. via
 * curl/devtools), completely bypassing the dashboard's
 * "Owner/Admin only" gate and the POS UI's "Manager only" gate — both of
 * which were purely client-side. Default is now dashboard-only. Pass
 * { allowPos: true } only for routes that are genuinely meant to be
 * reachable from the POS terminal (e.g. read-only lookups the POS UI
 * needs), and use getManagerAuthHeader instead for POS actions that
 * should be restricted to a POS "Manager".
 */
export async function getAdminAuthHeader(
  req: NextRequest,
  opts: {
    allowPos?: boolean
  } = {},
): Promise<string | null> {
  const forwarded = req.headers.get('authorization')
  if (forwarded) return forwarded
  const cookieStore = await cookies()
  const dashboardToken = cookieStore.get(
    SURFACE_COOKIES.dashboard.tokenCookie,
  )?.value
  if (dashboardToken) return `Bearer ${dashboardToken}`
  if (opts.allowPos) {
    const posToken = cookieStore.get(SURFACE_COOKIES.pos.tokenCookie)?.value
    if (posToken) return `Bearer ${posToken}`
  }
  return null
}

/**
 * For admin actions that a POS "Manager" (posRole === 'admin') should be
 * able to perform from the POS terminal, but a "Cashier" (posRole ===
 * 'staff') should not — e.g. adding/editing/removing staff, resetting
 * PINs, changing roles. Since every POS session carries the same
 * underlying token, the only real enforcement point is this
 * server-verified role check against the identity set at login time
 * (lib/api/auth-cookie.ts), not the client-side UI gate.
 */
export async function getManagerAuthHeader(
  _req: NextRequest,
): Promise<string | null> {
  const cookieStore = await cookies()
  const dashboardToken = cookieStore.get(
    SURFACE_COOKIES.dashboard.tokenCookie,
  )?.value
  if (dashboardToken) return `Bearer ${dashboardToken}` // dashboard login already requires role === 'admin'
  const posToken = cookieStore.get(SURFACE_COOKIES.pos.tokenCookie)?.value
  if (!posToken) return null
  const identity = getSurfaceIdentity(
    {
      cookies: cookieStore,
    },
    'pos',
  )
  if (identity?.role !== 'admin') return null // Cashier — reject
  return `Bearer ${posToken}`
}
