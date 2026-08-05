// app/api/pos/gift-cards/validate/route.ts
// ─────────────────────────────────────────────────────────────────────────────
// Looks up a gift card by code for the POS terminal, using the loyalty
// plugin's /admin/gift-cards endpoint (same one app/api/admin/gift-cards
// proxies for the dashboard) so the cashier sees the REAL remaining
// balance before it's redeemed against a sale.
//
// Uses the same admin-JWT-cache pattern as
// app/api/pos/coupons/validate/route.ts rather than forwarding a dashboard
// Authorization header — a POS-only staff session (as opposed to a
// dashboard admin session) doesn't necessarily carry one, so this route
// logs in with the store's own admin service credentials, same as coupon
// lookups already do.
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

const FIELDS = 'id,status,code,value,currency_code,expires_at'

export async function GET(req: NextRequest) {
  if (!(await requirePosSession())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const code = req.nextUrl.searchParams.get('code')?.trim().toUpperCase()
  if (!code) {
    return NextResponse.json(
      { error: 'Missing gift card code' },
      { status: 400 },
    )
  }

  try {
    const token = await getAdminJWT()

    const res = await fetch(
      `${MEDUSA_URL}/admin/gift-cards?q=${encodeURIComponent(code)}&fields=${encodeURIComponent(FIELDS)}&limit=1`,
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
        { error: err.message ?? 'Gift card lookup failed' },
        { status: res.status },
      )
    }

    const data = await res.json()
    const card = data.gift_cards?.[0]

    if (!card || card.code?.toUpperCase() !== code) {
      return NextResponse.json({ valid: false }, { status: 200 })
    }

    if (card.expires_at && new Date(card.expires_at) < new Date()) {
      return NextResponse.json(
        { valid: false, reason: 'expired' },
        { status: 200 },
      )
    }

    // Go by the actual remaining balance rather than `status` — Medusa's
    // gift-card status here flips to "redeemed" as soon as the card has
    // ANY transaction against it (even a partial one), which is not the
    // same as "nothing left to spend". A card can show status "redeemed"
    // while `value` (its current balance) is still well above zero, as
    // confirmed against a real card in the Medusa admin — so `value <= 0`
    // is the only reliable "fully used" signal.
    if (!(card.value > 0)) {
      return NextResponse.json(
        { valid: false, reason: 'already_redeemed' },
        { status: 200 },
      )
    }

    return NextResponse.json({
      valid: true,
      code: card.code,
      // Plain decimal pounds, same convention as the coupon route.
      balance: card.value,
      currency_code: card.currency_code,
    })
  } catch (err: any) {
    console.error('[POS] Gift card validate error:', err.message)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
