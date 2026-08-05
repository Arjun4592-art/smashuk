// app/api/store/orders/[id]/return-request/route.ts
//
// Lets a logged-in customer request a return on their own order from
// /orders (see the "Request Return" button there). This does NOT refund
// anything by itself — it appends a `status: 'requested'` record onto
// the order's metadata (same shape used by the dashboard's staff-
// initiated return, see lib/api/medusa-returns.ts), which then shows up
// on app/dashboard/orders/[id] for a staff member to approve (refunds)
// or reject.
//
// SECURITY: ownership is verified by fetching the order through the
// customer's OWN store token (same as GET /api/store/orders) — if that
// fetch fails/404s, the order isn't theirs and we never touch it with
// the elevated service token below.

import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { randomUUID } from 'crypto'
import { SURFACE_COOKIES } from '@/lib/api/auth-cookie'
import { medusaServiceFetch } from '@/lib/api/medusa-service-token'
import { getOrderForReturn, buildReturnLines, appendReturnRecord } from '@/lib/api/medusa-returns'

const MEDUSA_URL = process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL ?? 'http://localhost:9000'
const PUB_KEY = process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY ?? ''

async function getCustomerToken() {
  const cs = await cookies()
  const t = cs.get(SURFACE_COOKIES.website.tokenCookie)?.value
  return t?.startsWith('nextauth:') ? undefined : t
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params
  const token = await getCustomerToken()
  if (!token) {
    return NextResponse.json({ error: 'Please sign in to request a return' }, { status: 401 })
  }

  // Ownership check — this call uses the customer's own token, so it can
  // only ever succeed for orders that actually belong to them.
  const ownedRes = await fetch(`${MEDUSA_URL}/store/orders/${id}`, {
    headers: { Authorization: `Bearer ${token}`, 'x-publishable-api-key': PUB_KEY },
  })
  if (!ownedRes.ok) {
    return NextResponse.json({ error: 'Order not found' }, { status: 404 })
  }

  try {
    const { items, reason, note } = await req.json()
    if (!Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: 'Select at least one item to return' }, { status: 400 })
    }
    if (!reason) {
      return NextResponse.json({ error: 'A reason is required' }, { status: 400 })
    }

    // From here on, use the service token — customers can't write order
    // metadata directly via the store API, and don't need to; we already
    // proved above that this order is theirs.
    const order = await getOrderForReturn(id, medusaServiceFetch)
    const { items: builtItems, refund_amount } = buildReturnLines(order, items)

    const data = await appendReturnRecord(
      id,
      order,
      {
        id: randomUUID(),
        items: builtItems,
        reason,
        note,
        refund_amount,
        status: 'requested',
        source: 'customer',
        requested_at: new Date().toISOString(),
      },
      medusaServiceFetch,
    )

    return NextResponse.json(data)
  } catch (err: any) {
    console.error(`[return-request] failed for order ${id}:`, err)
    return NextResponse.json(
      { error: err.message ?? 'Failed to submit return request' },
      { status: 400 },
    )
  }
}
