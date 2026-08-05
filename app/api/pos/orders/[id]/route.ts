// app/api/pos/orders/[id]/route.ts
//
// Companion to the GET list in app/api/pos/orders/route.ts.
//
// PATCH here is used specifically to mark a POS order as returned. This
// used to be a purely local flag (`completedOrders[].returned` in
// store/posStore.ts, via the `processReturn` action) — it never touched
// Medusa at all, so a return processed on one till wasn't visible from any
// other till or from the dashboard, and reverted the instant localStorage
// was cleared. This route writes the return onto the real Medusa order's
// metadata instead, so it's the same everywhere.
//
// Scoped to POS sessions (not the broader /api/admin/* surface — see
// middleware.ts) using the same service-token pattern as the sibling
// lookup and list routes.

import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { randomUUID } from 'crypto'
import { SURFACE_COOKIES, getSurfaceIdentity } from '@/lib/api/auth-cookie'
import { medusaServiceFetch } from '@/lib/api/medusa-service-token'
import {
  getOrderForReturn,
  buildReturnLines,
  refundOrderAmount,
  appendReturnRecord,
} from '@/lib/api/medusa-returns'

async function requirePosSession(): Promise<boolean> {
  const cookieStore = await cookies()
  const posToken = cookieStore.get(SURFACE_COOKIES.pos.tokenCookie)?.value
  const dashboardToken = cookieStore.get(
    SURFACE_COOKIES.dashboard.tokenCookie,
  )?.value
  return Boolean(posToken || dashboardToken)
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!(await requirePosSession())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params

  // Whoever's actually processing this return — POS staff or a dashboard
  // admin using the POS UI — for activity logging (see the 'return' bug:
  // this action was never actually logged anywhere before).
  const cookieStore = await cookies()
  const posIdentity = getSurfaceIdentity({ cookies: cookieStore }, 'pos')
  const dashboardIdentity = getSurfaceIdentity(
    { cookies: cookieStore },
    'dashboard',
  )
  const actor = posIdentity?.userId
    ? { staffId: posIdentity.userId, surface: 'pos' as const }
    : dashboardIdentity?.userId
      ? { staffId: dashboardIdentity.userId, surface: 'dashboard' as const }
      : undefined

  try {
    const body = await req.json().catch(() => ({}))
    const { reason, items } = body as {
      reason?: string
      items?: { item_id: string; quantity: number }[]
    }

    // Real refund: unlike the old version of this route, this now
    // actually money back to the customer via Medusa's payment refund
    // route — not just a `metadata.returned = true` label. Amounts are
    // computed server-side from the order's own unit_price, never
    // trusted from the client. See lib/api/medusa-returns.ts.
    const order = await getOrderForReturn(id, medusaServiceFetch)
    const { items: builtItems, refund_amount } = buildReturnLines(
      order,
      items ?? [],
    )
    await refundOrderAmount(order, refund_amount, medusaServiceFetch)

    const res = await appendReturnRecord(
      id,
      order,
      {
        id: randomUUID(),
        items: builtItems,
        reason: reason || 'Other',
        refund_amount,
        status: 'refunded',
        source: 'pos',
        requested_at: new Date().toISOString(),
        processed_at: new Date().toISOString(),
      },
      medusaServiceFetch,
      // Legacy flag some older UI reads — set in the same write so it
      // doesn't stomp the returns array above.
      { returned: true },
      actor,
    )

    return NextResponse.json({ ...res, refund_amount })
  } catch (err: any) {
    console.error('[API] POS order PATCH error:', err)
    return NextResponse.json(
      { error: err.message ?? 'Failed to process return' },
      { status: 400 },
    )
  }
}

// ── PUT — fulfill an order from the POS order detail modal ────────────────
//
// Used when a cashier opens an order and clicks:
//   - "Mark as Picked Up"  (pickup order — customer just collected it)
//   - "Mark as Dispatched" (delivery order — item has been shipped out)
//
// Both actions create a real Medusa fulfillment. Pickup orders are
// immediately marked as delivered too (customer already has the item).
// Delivery orders stop at "fulfilled" / "shipped" — delivery happens later.
//
// Mirrors the same fulfillOrder() logic already used by:
//   - app/api/pos/orders/lookup/route.ts  (PATCH — lookup hand-over)
//   - app/api/admin/orders/[id]/route.ts  (dashboard fulfill button)
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!(await requirePosSession())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params

  try {
    const body = await req.json().catch(() => ({}))
    // action: 'pickup' = confirm collection (mark delivered immediately)
    //         'dispatch' = mark as dispatched/shipped (stop at fulfilled)
    const action = (body.action ?? 'pickup') as 'pickup' | 'dispatch'
    const markDelivered = action === 'pickup'

    const { fulfillOrder } = await import('@/lib/api/medusa-fulfillment')
    const result = await fulfillOrder(id, medusaServiceFetch, markDelivered)

    return NextResponse.json({
      ok: true,
      action,
      alreadyFulfilled: !!result.alreadyFulfilled,
    })
  } catch (err: any) {
    console.error('[API] POS order PUT (fulfill) error:', err)
    return NextResponse.json(
      { error: err.message ?? 'Failed to fulfill order' },
      { status: 400 },
    )
  }
}
