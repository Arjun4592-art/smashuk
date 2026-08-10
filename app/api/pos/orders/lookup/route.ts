// app/api/pos/orders/lookup/route.ts
//
// WHY THIS EXISTS:
// The POS "Orders" page (app/pos/terminal/orders/page.tsx) only ever shows
// completedOrders from the LOCAL zustand store — orders rung up on THIS
// browser/device, further filtered down to "only mine" for non-admin staff.
// It never talks to Medusa at all. That means a cashier has no way to find
// a customer's order if: it was placed on the website, rung up by another
// cashier, or rung up on a different POS terminal — exactly the situation
// that comes up constantly for in-store pickup verification ("I ordered
// online, I'm here to collect it").
//
// The full /dashboard/orders page DOES have this (it's real Medusa data),
// but it's admin-only — staff can't get to it.
//
// This route is a narrow, safe middle ground: ANY logged-in POS session
// (staff or admin — see requirePosSession) can look up ONE order by its
// order number, or search by customer email/phone/name, and get back only
// the fields needed to verify and hand over a pickup — not a browsable
// list of everyone's sales, revenue, or commission data. That distinction
// is what keeps this from just re-exposing the admin-only Orders page to
// staff.

import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { SURFACE_COOKIES } from '@/lib/api/auth-cookie'
import { medusaServiceFetch } from '@/lib/api/medusa-service-token'
import { fulfillOrder } from '@/lib/api/medusa-fulfillment'

async function requirePosSession(): Promise<boolean> {
  const cookieStore = await cookies()
  const posToken = cookieStore.get(SURFACE_COOKIES.pos.tokenCookie)?.value
  const dashboardToken = cookieStore.get(SURFACE_COOKIES.dashboard.tokenCookie)?.value
  return Boolean(posToken || dashboardToken)
}

// Only the fields a cashier actually needs to verify + hand over an order.
// Deliberately NOT returning cost/margin data, other cashiers' commission
// info, or anything beyond what's needed to confirm "yes, this is your
// order, here you go."
function toLookupResult(o: any) {
  return {
    id: o.id,
    orderNumber: o.display_id ? `SR-${o.display_id}` : 'SR-—',
    customerName: o.customer
      ? `${o.customer.first_name ?? ''} ${o.customer.last_name ?? ''}`.trim() || o.email
      : o.email,
    email: o.email ?? '',
    phone: o.shipping_address?.phone ?? o.metadata?.pickup_contact_phone ?? '',
    total: (o.total ?? 0),
    items: (o.items ?? []).map((i: any) => ({
      title: i.title ?? i.product_title ?? 'Item',
      quantity: i.quantity ?? 1,
    })),
    isPickup: o.metadata?.fulfillment_type === 'pickup',
    fulfillmentStatus: o.fulfillment_status ?? 'not_fulfilled',
    paymentStatus: o.payment_status ?? 'not_paid',
    source: o.metadata?.source === 'pos' ? 'pos' : 'website',
    createdAt: o.created_at,
  }
}

export async function GET(req: NextRequest) {
  if (!(await requirePosSession())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const q = req.nextUrl.searchParams.get('q')?.trim()
  if (!q || q.length < 3) {
    return NextResponse.json(
      { error: 'Enter at least 3 characters (order number, email, or phone) to search.' },
      { status: 400 },
    )
  }

  const fields =
    'id,display_id,email,total,fulfillment_status,payment_status,created_at,' +
    '*customer,*items,*shipping_address,*metadata'

  try {
    // A plain order number search (SR-1042 or 1042) hits Medusa's
    // display_id filter directly — the fast, precise path.
    const numeric = q.replace(/^SR-?/i, '').trim()
    if (/^\d+$/.test(numeric)) {
      const res = await medusaServiceFetch(
        `/admin/orders?display_id=${numeric}&fields=${encodeURIComponent(fields)}&limit=1`,
      )
      if (res.ok) {
        const data = await res.json()
        const order = data.orders?.[0]
        if (order) {
          return NextResponse.json({ orders: [toLookupResult(order)] })
        }
      }
    }

    // Otherwise search by name/email/phone. Medusa's admin orders list
    // endpoint supports a free-text `q` param across order/customer fields.
    const res = await medusaServiceFetch(
      `/admin/orders?q=${encodeURIComponent(q)}&fields=${encodeURIComponent(fields)}&limit=5`,
    )
    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      return NextResponse.json(
        { error: err.message ?? 'Order lookup failed' },
        { status: res.status },
      )
    }
    const data = await res.json()
    const orders = (data.orders ?? []).map(toLookupResult)
    if (orders.length === 0) {
      return NextResponse.json({ orders: [], message: 'No matching order found.' })
    }
    return NextResponse.json({ orders })
  } catch (err: any) {
    return NextResponse.json({ error: err.message ?? 'Order lookup failed' }, { status: 500 })
  }
}

// ── PATCH — complete an order found via lookup ─────────────────────────────
//
// The "Look up an order" flow above is used to verify + hand over an
// in-store pickup (customer ordered on the website or at another till,
// walks in to collect it). Until now there was no way to actually mark
// that as done from here — staff had to go find the order in the
// admin-only dashboard, which most POS staff can't even reach. This
// creates the real Medusa fulfillment (and marks it delivered, since the
// customer is walking out with the item right now) directly from the
// lookup modal.
//
// BUG FIX: this used to ONLY fulfil/deliver the order — a website order
// placed with COD ("Cash on Delivery") and Store Pickup would get handed
// over here with its payment still sitting "authorized"/"not_paid"
// forever, because nothing ever captured it. Money for a COD pickup is
// actually collected at the counter at the exact moment the staff member
// hands the item over (same moment as this PATCH runs) — so that's the
// right time to also capture the payment, not leave it for someone to
// remember to do later from the dashboard. Mirrors the same capture
// logic used by the dashboard's 'fulfill' action in
// app/api/admin/orders/[id]/route.ts.
export async function PATCH(req: NextRequest) {
  if (!(await requirePosSession())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { orderId } = await req.json()
    if (!orderId) {
      return NextResponse.json({ error: 'orderId is required' }, { status: 400 })
    }

    const result = await fulfillOrder(orderId, medusaServiceFetch, true)

    // Capture any outstanding payment for this order now that it's being
    // handed over at the counter. Applies to any provider — POS COD/cash
    // pickups and website COD pickups both collect money at hand-over
    // time, and card payments taken online are already captured by
    // Stripe/checkout so this is a no-op for those.
    let captured = false
    try {
      const orderRes = await medusaServiceFetch(
        `/admin/orders/${orderId}?fields=id,*payment_collections.payments`,
      )
      const orderData = await orderRes.json().catch(() => ({}))
      const payments = (orderData?.order?.payment_collections ?? []).flatMap(
        (pc: any) => pc.payments ?? [],
      )
      const uncaptured = payments.filter(
        (p: any) => !p.captured_at && p.status !== 'canceled',
      )
      for (const payment of uncaptured) {
        const capRes = await medusaServiceFetch(`/admin/payments/${payment.id}/capture`, {
          method: 'POST',
        })
        if (capRes.ok) {
          captured = true
        } else {
          console.warn(
            `[POS order lookup] capture failed for payment ${payment.id}:`,
            await capRes.text().catch(() => ''),
          )
        }
      }
    } catch (captureErr) {
      // Non-fatal — the hand-over itself already succeeded; payment can
      // still be captured manually from the dashboard if this fails.
      console.warn('[POS order lookup] capture step failed:', captureErr)
    }

    return NextResponse.json({
      ok: true,
      alreadyFulfilled: !!result.alreadyFulfilled,
      captured,
    })
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message ?? 'Failed to complete order' },
      { status: 500 },
    )
  }
}
