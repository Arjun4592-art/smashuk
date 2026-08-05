import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import type { AuthCookiePayload, UserRole } from '@/types'
import { SURFACE_COOKIES } from '@/lib/api/auth-cookie'

const DASHBOARD_ROLES: UserRole[] = ['admin'] // admin only → dashboard
const POS_ROLES: UserRole[] = ['admin', 'staff'] // admin + staff → POS
// NOTE: '/cart' is intentionally NOT here — anyone (logged in or not) can
// view/edit their cart. Only checkout (placing the actual order) and
// account-specific pages require a website login.
const PROTECTED_WEBSITE_ROUTES = ['/checkout', '/orders', '/profile']

// IMPORTANT: middleware (edge runtime) can only do *cheap* checks — cookie
// presence, shape, and role from the non-secret auth-state cookie. It cannot
// safely verify a JWT signature without duplicating the backend's signing
// secret into the edge runtime. Treat middleware as a routing/UX gate only.
//
// The actual security boundary is server-side: every API route / server
// action that talks to Medusa must use getServerAdminClient() (lib/medusa.ts),
// which sends the real bearer token to Medusa, and Medusa rejects invalid/
// expired/tampered tokens with a real 401. Never trust middleware alone to
// authorize a privileged action.

function getCookiePayload(
  request: NextRequest,
  cookieName: string,
): AuthCookiePayload | null {
  try {
    const raw = request.cookies.get(cookieName)?.value
    if (!raw) return null
    return JSON.parse(decodeURIComponent(raw)) as AuthCookiePayload
  } catch {
    return null
  }
}

function getValidatedBearerToken(request: NextRequest): string | null {
  const authHeader = request.headers.get('authorization')
  if (!authHeader?.startsWith('Bearer ')) return null
  const token = authHeader.slice(7).trim()
  if (!token || token.split('.').length !== 3) return null
  return token
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  const websiteAuth = getCookiePayload(
    request,
    SURFACE_COOKIES.website.authCookie,
  )
  const posAuth = getCookiePayload(request, SURFACE_COOKIES.pos.authCookie)
  const dashboardAuth = getCookiePayload(
    request,
    SURFACE_COOKIES.dashboard.authCookie,
  )

  if (pathname.startsWith('/api/auth')) {
    return NextResponse.next()
  }
  // ── Dashboard API routes ───────────────────────────────────────────────────
  if (pathname.startsWith('/api/dashboard')) {
    const isDashboardAuth =
      dashboardAuth?.isAuthenticated &&
      DASHBOARD_ROLES.includes(dashboardAuth.role as any)
    if (!isDashboardAuth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    return NextResponse.next()
  }

  // ── Admin API routes ───────────────────────────────────────────────────────
  // SECURITY: POS staff (cashiers logging in with just a PIN) must NOT get
  // a blank check against every /api/admin/* route — that would let a
  // cashier delete discounts, manage other staff, or edit products just by
  // knowing the URL. POS is only ever allowed to touch the small allowlist
  // below, and it's role-aware: a plain 'staff' (cashier) session only gets
  // customer lookup; a POS 'admin' (manager) session also gets staff
  // management, since that's used from the in-terminal "More → Staff" screen.
  // Full /api/admin/* access is reserved for the dashboard (owner) login.
  // NOTE: /api/admin/store-settings is GET-only and returns nothing
  // sensitive (just tax rate % and currency code/symbol) — added here
  // because store/posStore.ts's fetchStoreSettings() calls it directly
  // from the POS UI (to keep cart totals in sync with Medusa's real tax
  // region instead of a hardcoded 20%), but it was missing from both
  // allowlists below, so every POS session — staff AND manager — got a
  // 403 the moment the till tried to load live tax/currency settings and
  // silently fell back to the hardcoded defaults instead.
  const POS_STAFF_ALLOWED_PATHS = [
    '/api/admin/customers',
    '/api/admin/store-settings',
  ]
  const POS_MANAGER_ALLOWED_PATHS = [
    '/api/admin/customers',
    '/api/admin/staff',
    '/api/admin/store-settings',
  ]

  if (pathname.startsWith('/api/admin')) {
    const isDashboardAuth =
      dashboardAuth?.isAuthenticated &&
      DASHBOARD_ROLES.includes(dashboardAuth.role as any)

    if (isDashboardAuth) {
      return NextResponse.next()
    }

    const isPOSAuth =
      posAuth?.isAuthenticated && POS_ROLES.includes(posAuth.role as any)
    if (isPOSAuth) {
      const allowedPaths =
        posAuth!.role === 'admin'
          ? POS_MANAGER_ALLOWED_PATHS
          : POS_STAFF_ALLOWED_PATHS
      const isAllowedForPOS = allowedPaths.some((p) => pathname.startsWith(p))
      if (isAllowedForPOS) {
        return NextResponse.next()
      }
      // SECURITY: a recognized POS session hitting a path outside its
      // allowlist must be rejected here, not fall through to the generic
      // bearer-token check below. A cashier's own session token is a real,
      // unscoped Medusa admin JWT (see lib/api/admin-auth.ts) that is
      // trivially readable from the browser's DevTools despite the cookie
      // being HttpOnly. If it fell through and got waved past this
      // middleware just for looking JWT-shaped, a cashier could copy that
      // token and call e.g. /api/admin/products or /api/admin/discounts
      // directly with `Authorization: Bearer <token>`, completely
      // bypassing POS_STAFF_ALLOWED_PATHS / POS_MANAGER_ALLOWED_PATHS.
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    // No recognized dashboard or POS session cookie at all. This is only
    // reached by genuine external/server-to-server callers (e.g. our own
    // scripts/ using a freshly-obtained Medusa admin token directly) that
    // never had a session cookie to begin with — NOT by browser sessions,
    // which always carry one of the cookies above. Format-only check here;
    // the route handler forwards this header to Medusa, which re-verifies
    // the signature and rejects anything invalid/expired/tampered.
    const bearerToken = getValidatedBearerToken(request)
    if (bearerToken) {
      return NextResponse.next()
    }
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (pathname === '/dashboard/login') {
    if (
      dashboardAuth?.isAuthenticated &&
      DASHBOARD_ROLES.includes(dashboardAuth.role)
    ) {
      return NextResponse.redirect(new URL('/dashboard', request.url))
    }
    return NextResponse.next()
  }

  if (pathname.startsWith('/dashboard')) {
    if (
      !dashboardAuth?.isAuthenticated ||
      !DASHBOARD_ROLES.includes(dashboardAuth.role)
    ) {
      return NextResponse.redirect(new URL('/dashboard/login', request.url))
    }
    return NextResponse.next()
  }

  // /pos → always accessible (PIN-only login lives here)
  // /pos/terminal etc → requires the pos-auth cookie
  if (pathname === '/pos') {
    return NextResponse.next()
  }

  if (pathname.startsWith('/pos')) {
    if (!posAuth?.isAuthenticated || !POS_ROLES.includes(posAuth.role as any)) {
      return NextResponse.redirect(new URL('/pos', request.url))
    }
    return NextResponse.next()
  }

  const isProtectedWebsiteRoute = PROTECTED_WEBSITE_ROUTES.some((route) =>
    pathname.startsWith(route),
  )
  if (isProtectedWebsiteRoute) {
    const isWebsiteAuth =
      websiteAuth?.isAuthenticated === true && websiteAuth?.role === 'customer'
    if (!isWebsiteAuth) {
      const url = new URL('/login', request.url)
      url.searchParams.set('redirect', pathname)
      return NextResponse.redirect(url)
    }
  }

  if (pathname.startsWith('/api/pos')) {
    // /api/pos/staff powers the pre-login PIN-select screen, so it must be
    // reachable before a session cookie exists. It only ever returns
    // non-secret display fields (name/initials/role/shift) — never PINs.
    if (pathname === '/api/pos/staff') {
      return NextResponse.next()
    }
    if (!posAuth?.isAuthenticated || !POS_ROLES.includes(posAuth.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    return NextResponse.next()
  }

  if (pathname === '/login' || pathname === '/register') {
    if (websiteAuth?.isAuthenticated && websiteAuth?.role === 'customer') {
      return NextResponse.redirect(new URL('/profile', request.url))
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    '/api/auth/:path*',
    '/api/dashboard/:path*',
    '/api/admin/:path*',
    '/api/pos/:path*',
    '/dashboard/:path*',
    '/pos/:path*',
    '/cart',
    '/cart/:path*',
    '/checkout',
    '/checkout/:path*',
    '/orders',
    '/orders/:path*',
    '/profile',
    '/profile/:path*',
    '/login',
    '/register',
  ],
}
