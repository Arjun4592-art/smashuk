import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { SURFACE_COOKIES } from '@/lib/api/auth-cookie'
import { issueGiftCard } from '@/lib/api/pos-gift-card-issue'

/**
 * Manually (re)issue a physical gift card from the POS — the recovery path
 * for when a paid sale's card could not be activated automatically (the
 * order route returns `giftCardsIssued` with ok:false in that case).
 *
 * Normal sales do NOT call this from the browser: the order route issues the
 * card server-side after payment succeeds.
 */
async function requirePosSession(): Promise<boolean> {
  const cookieStore = await cookies()
  const posToken = cookieStore.get(SURFACE_COOKIES.pos.tokenCookie)?.value
  const dashboardToken = cookieStore.get(
    SURFACE_COOKIES.dashboard.tokenCookie,
  )?.value
  return Boolean(posToken || dashboardToken)
}

export async function POST(req: NextRequest) {
  if (!(await requirePosSession())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const body = await req.json().catch(() => ({}))
  const { code, value, order_id, cashier } = body ?? {}
  if (!code || value == null || !order_id) {
    return NextResponse.json(
      { error: 'code, value and order_id are required' },
      { status: 400 },
    )
  }
  const result = await issueGiftCard({
    code: String(code),
    value: Number(value),
    orderId: String(order_id),
    cashier: typeof cashier === 'string' ? cashier : undefined,
  })
  if (!result.ok) {
    return NextResponse.json(
      { error: result.error, reason: result.reason },
      { status: result.status },
    )
  }
  return NextResponse.json(
    { ok: true, code: result.code, value: result.value },
    { status: result.alreadyIssued ? 200 : 201 },
  )
}
