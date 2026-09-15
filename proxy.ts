import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import type { AuthCookiePayload, UserRole } from '@/types'
import { SURFACE_COOKIES } from '@/lib/api/auth-cookie'

const DASHBOARD_ROLES: UserRole[] = ['admin']
const POS_ROLES: UserRole[] = ['admin', 'staff']
const PROTECTED_WEBSITE_ROUTES = ['/checkout', '/orders', '/profile']

// ── Maintenance mode ──────────────────────────────────────────────
// Set MAINTENANCE_MODE=true in env to put the storefront under
// construction for customers. Dashboard, POS and API stay untouched.
const MAINTENANCE_MODE = process.env.MAINTENANCE_MODE === 'true'

// Set MAINTENANCE_BYPASS_SECRET in env, then visit once:
//   https://yoursite.com/?preview=<that secret>
// It sets a cookie so you keep seeing the real site while customers see
// the "under construction" page.
const BYPASS_SECRET = process.env.MAINTENANCE_BYPASS_SECRET
const BYPASS_COOKIE = 'srp_preview'

// Paths that skip maintenance mode entirely — admin surfaces + infra.
const MAINTENANCE_EXEMPT = [
  '/dashboard',
  '/pos',
  '/api',
  '/maintenance',
  '/_next',
  '/favicon.ico',
  '/robots.txt',
  '/sitemap.xml',
  '/manifest.webmanifest',
]

function isMaintenanceExempt(pathname: string) {
  return (
    MAINTENANCE_EXEMPT.some(
      (p) => pathname === p || pathname.startsWith(`${p}/`),
    ) ||
    /\.(svg|png|jpg|jpeg|webp|ico|css|js|txt|json|xml|woff2?)$/.test(pathname)
  )
}

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

export function proxy(request: NextRequest) {
  const { pathname, searchParams } = request.nextUrl

  // ── Maintenance mode gate — runs before everything else ──
  if (MAINTENANCE_MODE && !isMaintenanceExempt(pathname)) {
    // One-time preview link: ?preview=SECRET sets the bypass cookie.
    const previewParam = searchParams.get('preview')
    if (BYPASS_SECRET && previewParam === BYPASS_SECRET) {
      const cleanUrl = request.nextUrl.clone()
      cleanUrl.searchParams.delete('preview')
      const response = NextResponse.redirect(cleanUrl)
      response.cookies.set(BYPASS_COOKIE, BYPASS_SECRET, {
        httpOnly: true,
        secure: true,
        sameSite: 'lax',
        maxAge: 60 * 60 * 24 * 30, // 30 days
        path: '/',
      })
      return response
    }

    const bypassCookie = request.cookies.get(BYPASS_COOKIE)?.value
    const hasBypass = BYPASS_SECRET && bypassCookie === BYPASS_SECRET

    if (!hasBypass) {
      const url = request.nextUrl.clone()
      url.pathname = '/maintenance'
      return NextResponse.rewrite(url)
    }
  }

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
  if (pathname.startsWith('/api/dashboard')) {
    const isDashboardAuth =
      dashboardAuth?.isAuthenticated &&
      DASHBOARD_ROLES.includes(dashboardAuth.role as any)
    if (!isDashboardAuth) {
      return NextResponse.json(
        {
          error: 'Unauthorized',
        },
        {
          status: 401,
        },
      )
    }
    return NextResponse.next()
  }
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
    if (pathname === '/api/admin/store-settings' && request.method === 'GET') {
      return NextResponse.next()
    }
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
      return NextResponse.json(
        {
          error: 'Unauthorized',
        },
        {
          status: 403,
        },
      )
    }
    const bearerToken = getValidatedBearerToken(request)
    if (bearerToken) {
      return NextResponse.next()
    }
    return NextResponse.json(
      {
        error: 'Unauthorized',
      },
      {
        status: 401,
      },
    )
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
    if (pathname === '/api/pos/staff') {
      return NextResponse.next()
    }
    if (!posAuth?.isAuthenticated || !POS_ROLES.includes(posAuth.role)) {
      return NextResponse.json(
        {
          error: 'Unauthorized',
        },
        {
          status: 401,
        },
      )
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
  matcher: ['/((?!_next/static|_next/image).*)'],
}
