import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { SURFACE_COOKIES } from '@/lib/api/auth-cookie'
import { medusaServiceFetch } from '@/lib/api/medusa-service-token'

async function requirePosSession(): Promise<boolean> {
  const cookieStore = await cookies()
  const posToken = cookieStore.get(SURFACE_COOKIES.pos.tokenCookie)?.value
  const dashboardToken = cookieStore.get(
    SURFACE_COOKIES.dashboard.tokenCookie,
  )?.value
  return Boolean(posToken || dashboardToken)
}

/**
 * GET /api/pos/gift-cards/validate?code=…
 *
 * Answers:
 *  - { valid: false }                              no card has this number
 *  - { valid: false, reason: 'expired' }           card exists but expired
 *  - { valid: false, reason: 'already_redeemed' }  card exists, nothing left
 *  - { valid: true, code, balance, currency_code } card can be spent
 *
 * `balance` is the card's REAL remaining balance. With the Medusa loyalty
 * plugin a card's `value` is its original face value and never decreases, so
 * the balance comes from the backend route /admin/pos/gift-cards/balance,
 * which reads the card's backing store-credit account.
 */
export async function GET(req: NextRequest) {
  if (!(await requirePosSession())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const code = req.nextUrl.searchParams
    .get('code')
    ?.replace(/\s+/g, '')
    .toUpperCase()
  if (!code) {
    return NextResponse.json(
      { error: 'Missing gift card code' },
      { status: 400 },
    )
  }

  try {
    const res = await medusaServiceFetch(
      `/admin/pos/gift-cards/balance?code=${encodeURIComponent(code)}`,
    )
    const data = await res.json().catch(() => ({}))
    if (!res.ok) {
      return NextResponse.json(
        { error: data.error ?? data.message ?? 'Gift card lookup failed' },
        { status: res.status },
      )
    }
    if (!data.found) {
      return NextResponse.json({ valid: false }, { status: 200 })
    }
    if (data.expires_at && new Date(data.expires_at) < new Date()) {
      return NextResponse.json(
        { valid: false, reason: 'expired' },
        { status: 200 },
      )
    }
    if (!(Number(data.balance) > 0)) {
      return NextResponse.json(
        { valid: false, reason: 'already_redeemed' },
        { status: 200 },
      )
    }
    return NextResponse.json({
      valid: true,
      code: data.code,
      balance: Number(data.balance),
      currency_code: data.currency_code,
    })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Lookup failed'
    console.error('[POS] Gift card validate error:', message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
