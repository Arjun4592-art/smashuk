import { NextRequest, NextResponse } from 'next/server'
import { setSurfaceCookies } from '@/lib/api/auth-cookie'
import { logStaffActivity } from '@/lib/api/staff-activity'
import {
  getClientIp,
  rateLimitAll,
  tooManyRequests,
} from '@/lib/api/rate-limit'
import { fetchWithTimeout } from '@/lib/api/fetch-with-timeout'
const MEDUSA_URL =
  process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL ?? 'http://localhost:9000'
const WINDOW_MS = 15 * 60 * 1000
export async function POST(req: NextRequest) {
  try {
    const ip = getClientIp(req)
    const ipOnly = rateLimitAll([
      {
        key: `admin-login:ip:${ip}`,
        max: 20,
        windowMs: WINDOW_MS,
      },
    ])
    if (ipOnly.limited) {
      return tooManyRequests(
        ipOnly.retryAfterSec,
        'Too many attempts. Try again later.',
      )
    }
    const body = await req.json().catch(() => ({}))
    const rawEmail = body?.email
    const password = body?.password
    if (
      typeof rawEmail !== 'string' ||
      typeof password !== 'string' ||
      !rawEmail ||
      !password ||
      rawEmail.length > 254 ||
      password.length > 256
    ) {
      return NextResponse.json(
        {
          error: 'Email and password required.',
        },
        {
          status: 400,
        },
      )
    }
    const email = rawEmail.trim().toLowerCase()
    const limit = rateLimitAll([
      {
        key: `admin-login:ip-email:${ip}:${email}`,
        max: 5,
        windowMs: WINDOW_MS,
      },
      {
        key: `admin-login:email:${email}`,
        max: 15,
        windowMs: WINDOW_MS,
      },
    ])
    if (limit.limited) {
      return tooManyRequests(
        limit.retryAfterSec,
        'Too many attempts. Try again later.',
      )
    }
    const loginRes = await fetchWithTimeout(
      `${MEDUSA_URL}/auth/user/emailpass`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email,
          password,
        }),
        timeoutMs: 10_000,
      },
    )
    const loginData = await loginRes.json().catch(() => ({}))
    if (!loginRes.ok || !loginData.token) {
      return NextResponse.json(
        {
          error: 'Invalid email or password.',
        },
        {
          status: 401,
        },
      )
    }
    const token = loginData.token as string
    const meRes = await fetchWithTimeout(`${MEDUSA_URL}/admin/users/me`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })
    if (!meRes.ok) {
      return NextResponse.json(
        {
          error: 'Invalid email or password.',
        },
        {
          status: 401,
        },
      )
    }
    const { user: mu } = await meRes.json()
    const meta = mu?.metadata ?? {}
    const isAdmin = meta.role === 'admin'
    if (!isAdmin) {
      return NextResponse.json(
        {
          error:
            'Dashboard access is for Owner/Admin only. Staff should use the POS.',
        },
        {
          status: 403,
        },
      )
    }
    const user = {
      id: mu.id,
      name: `${mu.first_name ?? ''} ${mu.last_name ?? ''}`.trim() || mu.email,
      email: mu.email,
      role: 'admin' as const,
      createdAt: mu.created_at,
    }
    const response = NextResponse.json({
      user,
    })
    setSurfaceCookies(
      response.cookies,
      'dashboard',
      {
        isAuthenticated: true,
        role: 'admin',
        userId: mu.id,
      },
      token,
    )
    logStaffActivity({
      staffId: mu.id,
      staffName: user.name,
      action: 'login',
      surface: 'dashboard',
    })
    return response
  } catch (err: any) {
    console.error('[admin-login]', err)
    return NextResponse.json(
      {
        error: 'Login failed. Please try again.',
      },
      {
        status: 500,
      },
    )
  }
}
