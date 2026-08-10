import { NextRequest, NextResponse } from 'next/server'
import { getAdminAuthHeader } from '@/lib/api/admin-auth'

const MEDUSA_URL =
  process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL ?? 'http://localhost:9000'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const limit = Number(searchParams.get('limit') ?? 20)
  const offset = Number(searchParams.get('offset') ?? 0)
  const status = searchParams.get('status')?.split(',').filter(Boolean)

  const authHeader = await getAdminAuthHeader(req)
  if (!authHeader) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const url = new URL('/admin/orders', MEDUSA_URL)
    url.searchParams.set('limit', String(limit))
    url.searchParams.set('offset', String(offset))
    // BUG FIX: no sort order was ever specified here, so Medusa fell back
    // to its own default ordering — which is NOT newest-first. That's why
    // the dashboard Overview's "Recent Orders" widget (limit 5) showed the
    // 5 OLDEST orders instead of the 5 most recent, and the full Orders
    // list defaulted to oldest-first too. `-created_at` = descending by
    // creation time, i.e. newest order first — the `-` prefix is Medusa
    // v2's syntax for descending sort.
    url.searchParams.set('order', '-created_at')
    // Default order list fields don't include metadata — request it
    // explicitly, since we need metadata.source (website/pos) and
    // metadata.cashier for the dashboard's Source column and staff sales.
    // NOTE: `payments` is NOT a direct relation on Order in Medusa v2 —
    // same issue fixed in [id]/route.ts. Payments live under
    // `payment_collections[].payments[]`, so we request that path instead.
    // BUG FIX: `fulfillment_status` was added here WITHOUT a `+` prefix.
    // In Medusa v2, a bare (non-`+`) field in `fields` switches the whole
    // request from "defaults + whatever I additionally expand" to "return
    // EXACTLY this list" — so it silently dropped every other implicit
    // default scalar (total, created_at, display_id, status,
    // payment_status) that the dashboard depends on. That's what caused
    // orders to suddenly show £0.00, "Invalid Date", and a raw internal
    // ID instead of "SR-12". Prefixing with `+` makes it additive again,
    // same as `+metadata` already was.
    url.searchParams.set(
      'fields',
      '*items,*customer,*payment_collections.payments,+fulfillment_status,+metadata',
    )
    if (status?.length) {
      status.forEach((s) => url.searchParams.append('status[]', s))
    }

    const res = await fetch(url.toString(), {
      headers: {
        Authorization: authHeader,
        'Content-Type': 'application/json',
      },
    })

    if (!res.ok) {
      const err = await res.json()
      return NextResponse.json({ error: err.message }, { status: res.status })
    }

    return NextResponse.json(await res.json())
  } catch (err: any) {
    console.error('[API] orders GET error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

// ── POST — create a new order (from POS) ──────────────────────────────────
export async function POST(req: NextRequest) {
  const authHeader = await getAdminAuthHeader(req)
  if (!authHeader) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await req.json()

    const res = await fetch(`${MEDUSA_URL}/admin/orders`, {
      method: 'POST',
      headers: {
        Authorization: authHeader,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    })

    if (!res.ok) {
      const err = await res.json().catch(() => ({ message: 'Unknown error' }))
      return NextResponse.json({ error: err.message }, { status: res.status })
    }

    return NextResponse.json(await res.json())
  } catch (err: any) {
    console.error('[API] orders POST error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
