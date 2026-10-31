import { NextRequest, NextResponse } from 'next/server'
import { setSurfaceCookies } from '@/lib/api/auth-cookie'
import {
  getClientIp,
  rateLimitAll,
  tooManyRequests,
} from '@/lib/api/rate-limit'
import { fetchWithTimeout } from '@/lib/api/fetch-with-timeout'
const MEDUSA_URL =
  process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL ?? 'http://localhost:9000'
const PUBLISHABLE_KEY = process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY ?? ''
const WINDOW_MS = 15 * 60 * 1000
export async function POST(req: NextRequest) {
  try {
    const ip = getClientIp(req)
    // Throttle by IP before parsing anything, so a flood of junk can't make
    // us do work.
    const ipOnly = rateLimitAll([
      { key: `customer-login:ip:${ip}`, max: 40, windowMs: WINDOW_MS },
    ])
    if (ipOnly.limited) {
      return tooManyRequests(
        ipOnly.retryAfterSec,
        'Too many login attempts. Try again later.',
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
          error: 'Email and password are required.',
        },
        {
          status: 400,
        },
      )
    }
    const email = rawEmail.trim().toLowerCase()
    // Per IP+account stops guessing one account's password; per account (any
    // IP) slows a distributed attack. The account-wide cap is higher so a
    // stranger can't lock a real customer out with a handful of requests.
    const limit = rateLimitAll([
      {
        key: `customer-login:ip-email:${ip}:${email}`,
        max: 8,
        windowMs: WINDOW_MS,
      },
      { key: `customer-login:email:${email}`, max: 30, windowMs: WINDOW_MS },
    ])
    if (limit.limited) {
      return tooManyRequests(
        limit.retryAfterSec,
        'Too many login attempts. Try again later.',
      )
    }
    const loginRes = await fetchWithTimeout(
      `${MEDUSA_URL}/auth/customer/emailpass`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(process.env.STOREFRONT_SHARED_SECRET
            ? { 'x-storefront-secret': process.env.STOREFRONT_SHARED_SECRET }
            : {}),
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
    const meRes = await fetchWithTimeout(`${MEDUSA_URL}/store/customers/me`, {
      headers: {
        Authorization: `Bearer ${token}`,
        'x-publishable-api-key': PUBLISHABLE_KEY,
      },
    })
    if (!meRes.ok) {
      return NextResponse.json(
        {
          error: 'Failed to fetch customer profile.',
        },
        {
          status: 401,
        },
      )
    }
    const { customer } = await meRes.json()
    const user = {
      id: customer.id,
      name:
        `${customer.first_name ?? ''} ${customer.last_name ?? ''}`.trim() ||
        customer.email,
      email: customer.email ?? '',
      role: 'customer' as const,
      createdAt: customer.created_at,
    }
    const response = NextResponse.json({
      user,
    })
    setSurfaceCookies(
      response.cookies,
      'website',
      {
        isAuthenticated: true,
        role: 'customer',
      },
      token,
      'lax',
    )
    return response
  } catch (err: any) {
    console.error('[API] customer login error:', err)
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
