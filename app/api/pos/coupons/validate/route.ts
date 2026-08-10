// app/api/pos/coupons/validate/route.ts
// ─────────────────────────────────────────────────────────────────────────────
// Validates a POS-entered coupon code against real Medusa promotions
// (admin/promotions) instead of a hardcoded list. Uses the same JWT-cache
// pattern as the other /api/pos/* routes.
// ─────────────────────────────────────────────────────────────────────────────

import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { SURFACE_COOKIES } from '@/lib/api/auth-cookie'

const MEDUSA_URL =
  process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL || 'http://localhost:9000'

async function requirePosSession(): Promise<boolean> {
  const cookieStore = await cookies()
  const posToken = cookieStore.get(SURFACE_COOKIES.pos.tokenCookie)?.value
  const dashboardToken = cookieStore.get(
    SURFACE_COOKIES.dashboard.tokenCookie,
  )?.value
  return Boolean(posToken || dashboardToken)
}

let cachedToken: string | null = null
let tokenExpiry: number = 0

async function getAdminJWT(): Promise<string> {
  if (cachedToken && Date.now() < tokenExpiry) {
    return cachedToken
  }

  const email = process.env.MEDUSA_ADMIN_EMAIL
  const password = process.env.MEDUSA_ADMIN_PASSWORD

  if (!email || !password) {
    throw new Error('Set MEDUSA_ADMIN_EMAIL and MEDUSA_ADMIN_PASSWORD')
  }

  const res = await fetch(`${MEDUSA_URL}/auth/user/emailpass`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  })

  if (!res.ok) throw new Error('Medusa admin login failed')

  const data = await res.json()
  if (!data.token) throw new Error('No token received')

  cachedToken = data.token
  tokenExpiry = Date.now() + 55 * 60 * 1000
  return cachedToken!
}

export async function GET(req: NextRequest) {
  if (!(await requirePosSession())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const code = req.nextUrl.searchParams.get('code')?.trim().toUpperCase()
  if (!code) {
    return NextResponse.json({ error: 'Missing coupon code' }, { status: 400 })
  }

  try {
    const token = await getAdminJWT()

    const res = await fetch(
      `${MEDUSA_URL}/admin/promotions?code=${encodeURIComponent(code)}&limit=1`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      },
    )

    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      return NextResponse.json(
        { error: err.message ?? 'Coupon lookup failed' },
        { status: res.status },
      )
    }

    const data = await res.json()
    const promo = data.promotions?.[0]

    if (
      !promo ||
      promo.code?.toUpperCase() !== code ||
      promo.status !== 'active'
    ) {
      return NextResponse.json({ valid: false }, { status: 200 })
    }

    const method = promo.application_method
    if (!method || !['percentage', 'fixed'].includes(method.type)) {
      return NextResponse.json({ valid: false }, { status: 200 })
    }

    return NextResponse.json({
      valid: true,
      code,
      type: method.type as 'percentage' | 'fixed',
      // Fixed amounts are stored as plain decimal pounds; percentage values
      // are plain numbers (e.g. 15 for 15%) — no conversion needed for
      // either type, the frontend (DiscountModal.tsx) branches on `type`
      // to apply the right math.
      value: method.value,
    })
  } catch (err: any) {
    console.error('[POS] Coupon validate error:', err.message)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
