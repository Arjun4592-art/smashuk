import { NextRequest, NextResponse } from 'next/server'
import { getAdminAuthHeader } from '@/lib/api/admin-auth'
import { safeJson } from '@/lib/api/safe-json'

const MEDUSA_URL =
  process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL ?? 'http://localhost:9000'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const limit = Number(searchParams.get('limit') ?? 20)
  const offset = Number(searchParams.get('offset') ?? 0)
  const q = searchParams.get('q') ?? undefined

  const authHeader = await getAdminAuthHeader(req)
  if (!authHeader) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const url = new URL('/admin/customers', MEDUSA_URL)
    url.searchParams.set('limit', String(limit))
    url.searchParams.set('offset', String(offset))
    if (q) url.searchParams.set('q', q)
    // Medusa doesn't return the `orders` relation by default — without this,
    // c.orders is always undefined and the POS Customers page always shows
    // "0 orders / £0.00" for every customer, even ones with real order
    // history (see lib/api/pos.ts fetchPOSCustomers, which reads
    // c.orders?.length and c.orders?.reduce(...)).
    // `+` adds this relation to Medusa's default customer fieldset instead
    // of replacing it — without the `+` the default fields (email,
    // first_name, etc. that fetchPOSCustomers relies on) would be dropped.
    // `+orders.*` alone gets order count working, but Medusa v2's `total` on
    // an order is a COMPUTED field (derived from the order's summary), not
    // a plain column — the `*` wildcard doesn't pull computed fields in, so
    // it must be requested explicitly or every customer keeps showing
    // £0.00 total spend even though totalOrders is now correct.
    url.searchParams.set('fields', '+orders.*,+orders.total,+orders.currency_code')

    const res = await fetch(url.toString(), {
      headers: {
        Authorization: authHeader,
        'Content-Type': 'application/json',
      },
    })

    if (!res.ok) {
      const err = await safeJson(res, 'app/api/admin/customers/route.ts')
      return NextResponse.json({ error: err.message }, { status: res.status })
    }

    const data = await safeJson(res, 'app/api/admin/customers/route.ts')

    // ── Patch in real order totals ─────────────────────────────────────────
    // `+orders.total` above gets the order *count* right, but Medusa v2
    // doesn't actually resolve the computed `total` through a relation
    // expansion like this — it always comes back as 0/undefined, so every
    // customer shows "£0.00" total spend no matter how many real orders
    // they have (see POS Customers page). The same computed-field total
    // DOES resolve correctly on the top-level /admin/orders list (that's
    // what powers the dashboard Orders table amounts), so fetch orders
    // there instead and sum them per customer_id.
    try {
      const ordersUrl = new URL('/admin/orders', MEDUSA_URL)
      ordersUrl.searchParams.set('limit', '1000')
      ordersUrl.searchParams.set('fields', 'customer_id,total')
      const ordersRes = await fetch(ordersUrl.toString(), {
        headers: { Authorization: authHeader },
      })
      if (ordersRes.ok) {
        const ordersData = await safeJson(ordersRes, 'app/api/admin/customers/route.ts')
        const spendByCustomer = new Map<string, number>()
        for (const o of ordersData.orders ?? []) {
          if (!o.customer_id) continue
          spendByCustomer.set(
            o.customer_id,
            (spendByCustomer.get(o.customer_id) ?? 0) + (o.total ?? 0),
          )
        }
        for (const c of data.customers ?? []) {
          if (spendByCustomer.has(c.id)) {
            c.orders_total_spent = spendByCustomer.get(c.id)
          }
        }
      }
    } catch (aggErr) {
      console.warn('[customers GET] spend aggregation failed:', aggErr)
    }

    return NextResponse.json(data)
  } catch (err: any) {
    console.error('[API] customers GET error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

// ── POST — create a new customer (from POS) ──────────────────────────────────
export async function POST(req: NextRequest) {
  const authHeader = await getAdminAuthHeader(req)
  if (!authHeader) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await req.json()

    const res = await fetch(`${MEDUSA_URL}/admin/customers`, {
      method: 'POST',
      headers: {
        Authorization: authHeader,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    })

    if (!res.ok) {
      const err = await safeJson(res, 'app/api/admin/customers/route.ts')
      return NextResponse.json({ error: err.message }, { status: res.status })
    }

    return NextResponse.json(await safeJson(res, 'app/api/admin/customers/route.ts'))
  } catch (err: any) {
    console.error('[API] customers POST error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
