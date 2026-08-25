import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { SURFACE_COOKIES } from '@/lib/api/auth-cookie';
const MEDUSA_URL = process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL || 'http://localhost:9000';
async function requirePosSession(): Promise<boolean> {
  const cookieStore = await cookies();
  const posToken = cookieStore.get(SURFACE_COOKIES.pos.tokenCookie)?.value;
  const dashboardToken = cookieStore.get(SURFACE_COOKIES.dashboard.tokenCookie)?.value;
  return Boolean(posToken || dashboardToken);
}
let cachedToken: string | null = null;
let tokenExpiry: number = 0;
async function getAdminJWT(): Promise<string> {
  if (cachedToken && Date.now() < tokenExpiry) {
    return cachedToken;
  }
  const email = process.env.MEDUSA_ADMIN_EMAIL;
  const password = process.env.MEDUSA_ADMIN_PASSWORD;
  if (!email || !password) {
    throw new Error('Set MEDUSA_ADMIN_EMAIL and MEDUSA_ADMIN_PASSWORD');
  }
  const res = await fetch(`${MEDUSA_URL}/auth/user/emailpass`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      email,
      password
    })
  });
  if (!res.ok) throw new Error('Medusa admin login failed');
  const data = await res.json();
  if (!data.token) throw new Error('No token received');
  cachedToken = data.token;
  tokenExpiry = Date.now() + 55 * 60 * 1000;
  return cachedToken!;
}
export async function GET() {
  if (!(await requirePosSession())) {
    return NextResponse.json({
      error: 'Unauthorized'
    }, {
      status: 401
    });
  }
  try {
    const token = await getAdminJWT();
    const res = await fetch(`${MEDUSA_URL}/admin/regions?limit=1`, {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      return NextResponse.json({
        error: err.message ?? 'Region fetch failed'
      }, {
        status: res.status
      });
    }
    const data = await res.json();
    const regionId = data.regions?.[0]?.id ?? null;
    return NextResponse.json({
      regionId
    });
  } catch (err: any) {
    console.error('[POS] Region route error:', err.message);
    return NextResponse.json({
      error: err.message
    }, {
      status: 500
    });
  }
}
