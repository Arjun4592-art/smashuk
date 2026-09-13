import { NextRequest, NextResponse } from 'next/server'
import { getAdminAuthHeader } from '@/lib/api/admin-auth'

const MEDUSA_URL =
  process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL ?? 'http://localhost:9000'

export async function GET(req: NextRequest) {
  const authHeader = await getAdminAuthHeader(req)
  if (!authHeader) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  try {
    const { searchParams } = new URL(req.url)
    const limit = Number(searchParams.get('limit') ?? 50)

    // Pull recent orders and flatten any marketing_events off their metadata.
    // Scans the most recent 200 orders — fine at this volume, revisit if the
    // order count grows a lot.
    const url = new URL('/admin/orders', MEDUSA_URL)
    url.searchParams.set('limit', '200')
    url.searchParams.set('order', '-created_at')
    url.searchParams.set('fields', 'id,display_id,email,created_at,metadata')

    const res = await fetch(url.toString(), {
      headers: { Authorization: authHeader },
    })
    if (!res.ok) {
      return NextResponse.json(
        { error: 'Failed to fetch orders' },
        { status: res.status },
      )
    }
    const data = await res.json()
    const orders: any[] = data.orders ?? []

    const rows = orders
      .flatMap((order) =>
        (Array.isArray(order.metadata?.marketing_events)
          ? order.metadata.marketing_events
          : []
        ).map((evt: any) => ({
          orderId: order.id,
          orderRef: order.display_id ? `SR-${order.display_id}` : order.id,
          email: order.email,
          ...evt,
        })),
      )
      .sort((a, b) => (a.firedAt < b.firedAt ? 1 : -1))
      .slice(0, limit)

    return NextResponse.json({ events: rows })
  } catch (err: any) {
    console.error('[api/admin/marketing-events]', err)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
