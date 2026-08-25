import 'server-only';
import { NextRequest } from 'next/server';
import { cookies } from 'next/headers';
import { SURFACE_COOKIES } from '@/lib/api/auth-cookie';
export async function getAdminAuthHeader(req: NextRequest): Promise<string | null> {
  const forwarded = req.headers.get('authorization');
  if (forwarded) return forwarded;
  const cookieStore = await cookies();
  const token = cookieStore.get(SURFACE_COOKIES.dashboard.tokenCookie)?.value ?? cookieStore.get(SURFACE_COOKIES.pos.tokenCookie)?.value;
  return token ? `Bearer ${token}` : null;
}
