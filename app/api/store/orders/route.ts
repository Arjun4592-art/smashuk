import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { SURFACE_COOKIES } from '@/lib/api/auth-cookie';
const MEDUSA_URL = process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL ?? 'http://localhost:9000';
const PUB_KEY = process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY ?? '';
async function getToken() {
  const cs = await cookies();
  const t = cs.get(SURFACE_COOKIES.website.tokenCookie)?.value;
  return t?.startsWith('nextauth:') ? undefined : t;
}
export async function GET(req: NextRequest) {
  const token = await getToken();
  if (!token) return NextResponse.json({
    orders: []
  });
  const orderId = req.nextUrl.searchParams.get('id');
  const url = orderId ? `${MEDUSA_URL}/store/orders/${orderId}` : `${MEDUSA_URL}/store/orders`;
  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
      'x-publishable-api-key': PUB_KEY
    }
  });
  return NextResponse.json(await res.json().catch(() => ({})), {
    status: res.ok ? 200 : res.status
  });
}
