import { NextRequest, NextResponse } from 'next/server'
import { getAdminAuthHeader } from '@/lib/api/admin-auth'
import { safeJson } from '@/lib/api/safe-json'
import {
  CUSTOMER_SEGMENTS,
  type SegmentCustomer,
} from '@/lib/customer-segments'

const MEDUSA_URL =
  process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL ?? 'http://localhost:9000'

// Mirrors the mapping used by getCustomers() in lib/api/dashboard.ts so that
// segment membership here always matches what the Customers > Segments tab
// shows.
function mapCustomer(
  c: any,
  spendByCustomer: Map<string, number>,
): SegmentCustomer {
  return {
    id: c.id,
    name: `${c.first_name ?? ''} ${c.last_name ?? ''}`.trim() || c.email,
    email: c.email,
    totalOrders: c.orders?.length ?? 0,
    totalSpent: spendByCustomer.get(c.id) ?? 0,
    status: 'active',
    joinedAt: new Date(c.created_at).toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    }),
    lastOrder: c.orders?.[0]
      ? new Date(c.orders[0].created_at).toLocaleDateString('en-GB', {
          day: 'numeric',
          month: 'short',
          year: 'numeric',
        })
      : '—',
  }
}

export async function GET(req: NextRequest) {
  const authHeader = await getAdminAuthHeader(req)
  if (!authHeader) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  try {
    const url = new URL('/admin/customers', MEDUSA_URL)
    url.searchParams.set('limit', '1000')
    url.searchParams.set(
      'fields',
      '+orders.*,+orders.total,+orders.currency_code',
    )
    const res = await fetch(url.toString(), {
      headers: {
        Authorization: authHeader,
        'Content-Type': 'application/json',
      },
    })
    const data = await safeJson(
      res,
      'app/api/admin/customers/segments/route.ts',
    )
    if (!res.ok) {
      return NextResponse.json({ error: data.message }, { status: res.status })
    }

    const spendByCustomer = new Map<string, number>()
    try {
      const ordersUrl = new URL('/admin/orders', MEDUSA_URL)
      ordersUrl.searchParams.set('limit', '1000')
      ordersUrl.searchParams.set('fields', 'customer_id,total')
      const ordersRes = await fetch(ordersUrl.toString(), {
        headers: { Authorization: authHeader },
      })
      if (ordersRes.ok) {
        const ordersData = await safeJson(
          ordersRes,
          'app/api/admin/customers/segments/route.ts',
        )
        for (const o of ordersData.orders ?? []) {
          if (!o.customer_id) continue
          spendByCustomer.set(
            o.customer_id,
            (spendByCustomer.get(o.customer_id) ?? 0) + (o.total ?? 0),
          )
        }
      }
    } catch (aggErr) {
      console.warn('[customers/segments GET] spend aggregation failed:', aggErr)
    }

    const customers: SegmentCustomer[] = (data.customers ?? []).map((c: any) =>
      mapCustomer(c, spendByCustomer),
    )

    const segments = CUSTOMER_SEGMENTS.map((seg) => {
      const members = customers.filter(seg.filter)
      return {
        id: seg.id,
        label: seg.label,
        description: seg.description,
        color: seg.color,
        customerCount: members.length,
        customers: members.map((m) => ({
          id: m.id,
          name: m.name,
          email: m.email,
        })),
      }
    })

    return NextResponse.json({ segments })
  } catch (err: any) {
    console.error('[API] customers/segments GET error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
