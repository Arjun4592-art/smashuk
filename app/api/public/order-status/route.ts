import { NextRequest, NextResponse } from 'next/server'
import { medusaServiceFetch } from '@/lib/api/medusa-service-token'
import { safeJson } from '@/lib/api/safe-json'
import { buildTrackingPayload } from '@/lib/api/order-tracking-data'
import { verifyOrderTrackToken } from '@/lib/api/order-track-token'

// No login required — this is what the QR code on the printed/emailed
// receipt links to, so it has to work for a guest who never created an
// account. It's reachable with just the order id + its signed token (see
// lib/api/order-track-token.ts), never with a customer session, and it
// deliberately returns a trimmed-down payload (no full shipping address —
// city/postcode only) since anyone with the link can open it.
export async function GET(req: NextRequest) {
  try {
    const orderId = req.nextUrl.searchParams.get('id')
    const token = req.nextUrl.searchParams.get('t')
    if (!orderId) {
      return NextResponse.json({ error: 'Order ID required' }, { status: 400 })
    }
    if (!verifyOrderTrackToken(orderId, token)) {
      return NextResponse.json(
        { error: 'Invalid or expired link' },
        { status: 401 },
      )
    }
    const res = await medusaServiceFetch(
      `/admin/orders/${orderId}?fields=id,display_id,status,fulfillment_status,payment_status,created_at,updated_at,total,subtotal,shipping_total,*items,*fulfillments,shipping_address.city,shipping_address.postal_code,shipping_address.country_code`,
    )
    if (!res.ok) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 })
    }
    const { order } = await safeJson(
      res,
      'app/api/public/order-status/route.ts',
    )
    const tracking = await buildTrackingPayload(order, { full: false })
    return NextResponse.json({ tracking })
  } catch (err: any) {
    console.error('[public order-status]', err)
    return NextResponse.json(
      { error: 'Failed to fetch order status' },
      { status: 500 },
    )
  }
}
