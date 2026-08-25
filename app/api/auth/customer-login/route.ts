import { NextRequest, NextResponse } from 'next/server';
import { setSurfaceCookies } from '@/lib/api/auth-cookie';
const MEDUSA_URL = process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL ?? 'http://localhost:9000';
const PUBLISHABLE_KEY = process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY ?? '';
const attempts = new Map<string, {
  count: number;
  resetAt: number;
}>();
const MAX_ATTEMPTS = 10;
const WINDOW_MS = 15 * 60 * 1000;
function isRateLimited(key: string): boolean {
  const now = Date.now();
  const entry = attempts.get(key);
  if (!entry || now > entry.resetAt) {
    attempts.set(key, {
      count: 1,
      resetAt: now + WINDOW_MS
    });
    return false;
  }
  entry.count += 1;
  return entry.count > MAX_ATTEMPTS;
}
export async function POST(req: NextRequest) {
  try {
    const ip = req.headers.get('x-forwarded-for') ?? 'unknown';
    const {
      email,
      password
    } = await req.json();
    if (!email || !password) {
      return NextResponse.json({
        error: 'Email and password are required.'
      }, {
        status: 400
      });
    }
    if (isRateLimited(`customer:${ip}:${email}`)) {
      return NextResponse.json({
        error: 'Too many login attempts. Try again later.'
      }, {
        status: 429
      });
    }
    const loginRes = await fetch(`${MEDUSA_URL}/auth/customer/emailpass`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        email,
        password
      })
    });
    const loginData = await loginRes.json();
    if (!loginRes.ok || !loginData.token) {
      return NextResponse.json({
        error: 'Invalid email or password.'
      }, {
        status: 401
      });
    }
    const token = loginData.token as string;
    const meRes = await fetch(`${MEDUSA_URL}/store/customers/me`, {
      headers: {
        Authorization: `Bearer ${token}`,
        'x-publishable-api-key': PUBLISHABLE_KEY
      }
    });
    if (!meRes.ok) {
      return NextResponse.json({
        error: 'Failed to fetch customer profile.'
      }, {
        status: 401
      });
    }
    const {
      customer
    } = await meRes.json();
    const user = {
      id: customer.id,
      name: `${customer.first_name ?? ''} ${customer.last_name ?? ''}`.trim() || customer.email,
      email: customer.email ?? '',
      role: 'customer' as const,
      createdAt: customer.created_at
    };
    const response = NextResponse.json({
      user
    });
    setSurfaceCookies(response.cookies, 'website', {
      isAuthenticated: true,
      role: 'customer'
    }, token, 'lax');
    return response;
  } catch (err: any) {
    console.error('[API] customer login error:', err);
    return NextResponse.json({
      error: 'Login failed. Please try again.'
    }, {
      status: 500
    });
  }
}
