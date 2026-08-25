import { NextRequest, NextResponse } from 'next/server';
import { setSurfaceCookies } from '@/lib/api/auth-cookie';
import { logStaffActivity } from '@/lib/api/staff-activity';
const MEDUSA_URL = process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL ?? 'http://localhost:9000';
const attempts = new Map<string, {
  count: number;
  resetAt: number;
}>();
const MAX_ATTEMPTS = 5;
const WINDOW_MS = 15 * 60 * 1000;
const MAX_MAP_SIZE = 5000;
function isRateLimited(key: string): boolean {
  const now = Date.now();
  if (attempts.size > MAX_MAP_SIZE) {
    for (const [k, v] of attempts.entries()) {
      if (now > v.resetAt) attempts.delete(k);
    }
  }
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
        error: 'Email and password required.'
      }, {
        status: 400
      });
    }
    if (isRateLimited(`admin:${ip}:${email}`)) {
      return NextResponse.json({
        error: 'Too many attempts. Try again later.'
      }, {
        status: 429
      });
    }
    const loginRes = await fetch(`${MEDUSA_URL}/auth/user/emailpass`, {
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
    const meRes = await fetch(`${MEDUSA_URL}/admin/users/me`, {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });
    if (!meRes.ok) {
      return NextResponse.json({
        error: 'Invalid email or password.'
      }, {
        status: 401
      });
    }
    const {
      user: mu
    } = await meRes.json();
    const meta = mu?.metadata ?? {};
    const isAdmin = meta.role === 'admin';
    if (!isAdmin) {
      return NextResponse.json({
        error: 'Dashboard access is for Owner/Admin only. Staff should use the POS.'
      }, {
        status: 403
      });
    }
    const user = {
      id: mu.id,
      name: `${mu.first_name ?? ''} ${mu.last_name ?? ''}`.trim() || mu.email,
      email: mu.email,
      role: 'admin' as const,
      createdAt: mu.created_at
    };
    const response = NextResponse.json({
      user
    });
    setSurfaceCookies(response.cookies, 'dashboard', {
      isAuthenticated: true,
      role: 'admin',
      userId: mu.id
    }, token);
    logStaffActivity({
      staffId: mu.id,
      staffName: user.name,
      action: 'login',
      surface: 'dashboard'
    });
    return response;
  } catch (err: any) {
    console.error('[admin-login]', err);
    return NextResponse.json({
      error: 'Login failed. Please try again.'
    }, {
      status: 500
    });
  }
}
