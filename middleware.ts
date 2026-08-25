import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import type { AuthCookiePayload, UserRole } from '@/types';
import { SURFACE_COOKIES } from '@/lib/api/auth-cookie';
const DASHBOARD_ROLES: UserRole[] = ['admin'];
const POS_ROLES: UserRole[] = ['admin', 'staff'];
const PROTECTED_WEBSITE_ROUTES = ['/checkout', '/orders', '/profile'];
function getCookiePayload(request: NextRequest, cookieName: string): AuthCookiePayload | null {
  try {
    const raw = request.cookies.get(cookieName)?.value;
    if (!raw) return null;
    return JSON.parse(decodeURIComponent(raw)) as AuthCookiePayload;
  } catch {
    return null;
  }
}
function getValidatedBearerToken(request: NextRequest): string | null {
  const authHeader = request.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) return null;
  const token = authHeader.slice(7).trim();
  if (!token || token.split('.').length !== 3) return null;
  return token;
}
export function middleware(request: NextRequest) {
  const {
    pathname
  } = request.nextUrl;
  const websiteAuth = getCookiePayload(request, SURFACE_COOKIES.website.authCookie);
  const posAuth = getCookiePayload(request, SURFACE_COOKIES.pos.authCookie);
  const dashboardAuth = getCookiePayload(request, SURFACE_COOKIES.dashboard.authCookie);
  if (pathname.startsWith('/api/auth')) {
    return NextResponse.next();
  }
  if (pathname.startsWith('/api/dashboard')) {
    const isDashboardAuth = dashboardAuth?.isAuthenticated && DASHBOARD_ROLES.includes(dashboardAuth.role as any);
    if (!isDashboardAuth) {
      return NextResponse.json({
        error: 'Unauthorized'
      }, {
        status: 401
      });
    }
    return NextResponse.next();
  }
  const POS_STAFF_ALLOWED_PATHS = ['/api/admin/customers', '/api/admin/store-settings'];
  const POS_MANAGER_ALLOWED_PATHS = ['/api/admin/customers', '/api/admin/staff', '/api/admin/store-settings'];
  if (pathname.startsWith('/api/admin')) {
    const isDashboardAuth = dashboardAuth?.isAuthenticated && DASHBOARD_ROLES.includes(dashboardAuth.role as any);
    if (isDashboardAuth) {
      return NextResponse.next();
    }
    const isPOSAuth = posAuth?.isAuthenticated && POS_ROLES.includes(posAuth.role as any);
    if (isPOSAuth) {
      const allowedPaths = posAuth!.role === 'admin' ? POS_MANAGER_ALLOWED_PATHS : POS_STAFF_ALLOWED_PATHS;
      const isAllowedForPOS = allowedPaths.some(p => pathname.startsWith(p));
      if (isAllowedForPOS) {
        return NextResponse.next();
      }
      return NextResponse.json({
        error: 'Unauthorized'
      }, {
        status: 403
      });
    }
    const bearerToken = getValidatedBearerToken(request);
    if (bearerToken) {
      return NextResponse.next();
    }
    return NextResponse.json({
      error: 'Unauthorized'
    }, {
      status: 401
    });
  }
  if (pathname === '/dashboard/login') {
    if (dashboardAuth?.isAuthenticated && DASHBOARD_ROLES.includes(dashboardAuth.role)) {
      return NextResponse.redirect(new URL('/dashboard', request.url));
    }
    return NextResponse.next();
  }
  if (pathname.startsWith('/dashboard')) {
    if (!dashboardAuth?.isAuthenticated || !DASHBOARD_ROLES.includes(dashboardAuth.role)) {
      return NextResponse.redirect(new URL('/dashboard/login', request.url));
    }
    return NextResponse.next();
  }
  if (pathname === '/pos') {
    return NextResponse.next();
  }
  if (pathname.startsWith('/pos')) {
    if (!posAuth?.isAuthenticated || !POS_ROLES.includes(posAuth.role as any)) {
      return NextResponse.redirect(new URL('/pos', request.url));
    }
    return NextResponse.next();
  }
  const isProtectedWebsiteRoute = PROTECTED_WEBSITE_ROUTES.some(route => pathname.startsWith(route));
  if (isProtectedWebsiteRoute) {
    const isWebsiteAuth = websiteAuth?.isAuthenticated === true && websiteAuth?.role === 'customer';
    if (!isWebsiteAuth) {
      const url = new URL('/login', request.url);
      url.searchParams.set('redirect', pathname);
      return NextResponse.redirect(url);
    }
  }
  if (pathname.startsWith('/api/pos')) {
    if (pathname === '/api/pos/staff') {
      return NextResponse.next();
    }
    if (!posAuth?.isAuthenticated || !POS_ROLES.includes(posAuth.role)) {
      return NextResponse.json({
        error: 'Unauthorized'
      }, {
        status: 401
      });
    }
    return NextResponse.next();
  }
  if (pathname === '/login' || pathname === '/register') {
    if (websiteAuth?.isAuthenticated && websiteAuth?.role === 'customer') {
      return NextResponse.redirect(new URL('/profile', request.url));
    }
  }
  return NextResponse.next();
}
export const config = {
  matcher: ['/api/auth/:path*', '/api/dashboard/:path*', '/api/admin/:path*', '/api/pos/:path*', '/dashboard/:path*', '/pos/:path*', '/cart', '/cart/:path*', '/checkout', '/checkout/:path*', '/orders', '/orders/:path*', '/profile', '/profile/:path*', '/login', '/register']
};
