import { NextRequest, NextResponse } from 'next/server';
import { clearSurfaceCookies, SURFACE_COOKIES, type Surface } from '@/lib/api/auth-cookie';
import { logStaffActivity } from '@/lib/api/staff-activity';
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const surface = body?.surface as Surface | undefined;
  const resolvedSurface: Surface | undefined = surface && SURFACE_COOKIES[surface] ? surface : (['dashboard', 'pos', 'website'] as Surface[]).find(s => req.cookies.get(SURFACE_COOKIES[s].authCookie)?.value);
  if (resolvedSurface && (resolvedSurface === 'dashboard' || resolvedSurface === 'pos')) {
    const authCookie = req.cookies.get(SURFACE_COOKIES[resolvedSurface].authCookie)?.value;
    if (authCookie) {
      try {
        const parsed = JSON.parse(decodeURIComponent(authCookie));
        if (parsed?.userId) {
          logStaffActivity({
            staffId: parsed.userId,
            action: 'logout',
            surface: resolvedSurface
          });
        }
      } catch {}
    }
  }
  const response = NextResponse.json({
    success: true
  });
  if (resolvedSurface) {
    clearSurfaceCookies(response.cookies, resolvedSurface);
  }
  return response;
}
