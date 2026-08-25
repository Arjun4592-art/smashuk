import { NextRequest, NextResponse } from 'next/server';
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
const FIELDS = 'id,status,code,value,currency_code,expires_at';
export async function GET(req: NextRequest) {
  if (!(await requirePosSession())) {
    return NextResponse.json({
      error: 'Unauthorized'
    }, {
      status: 401
    });
  }
  const code = req.nextUrl.searchParams.get('code')?.trim().toUpperCase();
  if (!code) {
    return NextResponse.json({
      error: 'Missing gift card code'
    }, {
      status: 400
    });
  }
  try {
    const token = await getAdminJWT();
    const res = await fetch(`${MEDUSA_URL}/admin/gift-cards?q=${encodeURIComponent(code)}&fields=${encodeURIComponent(FIELDS)}&limit=1`, {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      return NextResponse.json({
        error: err.message ?? 'Gift card lookup failed'
      }, {
        status: res.status
      });
    }
    const data = await res.json();
    const card = data.gift_cards?.[0];
    if (!card || card.code?.toUpperCase() !== code) {
      return NextResponse.json({
        valid: false
      }, {
        status: 200
      });
    }
    if (card.expires_at && new Date(card.expires_at) < new Date()) {
      return NextResponse.json({
        valid: false,
        reason: 'expired'
      }, {
        status: 200
      });
    }
    if (!(card.value > 0)) {
      return NextResponse.json({
        valid: false,
        reason: 'already_redeemed'
      }, {
        status: 200
      });
    }
    return NextResponse.json({
      valid: true,
      code: card.code,
      balance: card.value,
      currency_code: card.currency_code
    });
  } catch (err: any) {
    console.error('[POS] Gift card validate error:', err.message);
    return NextResponse.json({
      error: err.message
    }, {
      status: 500
    });
  }
}
