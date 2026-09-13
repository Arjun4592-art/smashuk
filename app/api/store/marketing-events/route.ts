import { NextRequest, NextResponse } from 'next/server'
import { getMedusaServiceToken } from '@/lib/api/medusa-service-token'

const MEDUSA_URL =
  process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL ?? 'http://localhost:9000'

// Marketing pixel/CAPI firing happens client-side (Google Ads) or
// server-to-Meta (CAPI) with no durable record of its own. The order is
// the only thing that persists, so we piggyback the log onto the order's
// metadata — same pattern as return records, see lib/api/medusa-returns.ts.
//
// This only logs events tied to a real order (currently just Purchase).
// Pre-purchase events (ViewContent/AddToCart/InitiateCheckout) have no
// durable record to attach to yet, so they aren't persisted here — check
// Meta Events Manager / browser DevTools Network tab for those live.
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null)
    if (!body?.orderId || !body?.eventName) {
      return NextResponse.json({
        logged: false,
        reason: 'orderId and eventName are required',
      })
    }

    const token = await getMedusaServiceToken()
    const orderRes = await fetch(
      `${MEDUSA_URL}/admin/orders/${body.orderId}?fields=id,metadata`,
      { headers: { Authorization: `Bearer ${token}` } },
    )
    if (!orderRes.ok) {
      return NextResponse.json({ logged: false, reason: 'order not found' })
    }
    const orderData = await orderRes.json()
    const existingMetadata = orderData.order?.metadata ?? {}
    const existingEvents = Array.isArray(existingMetadata.marketing_events)
      ? existingMetadata.marketing_events
      : []

    const record = {
      eventName: body.eventName,
      firedAt: new Date().toISOString(),
      value: body.value ?? null,
      currency: body.currency ?? null,
      metaCapiSent: !!body.metaCapiSent,
      metaCapiReason: body.metaCapiReason ?? null,
      googleAdsAttempted: !!body.googleAdsAttempted,
    }

    const updateRes = await fetch(
      `${MEDUSA_URL}/admin/orders/${body.orderId}`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          metadata: {
            ...existingMetadata,
            marketing_events: [...existingEvents, record],
          },
        }),
      },
    )

    // Never a hard error — logging must never break checkout.
    return NextResponse.json({ logged: updateRes.ok })
  } catch (err: any) {
    console.error('[api/store/marketing-events]', err)
    return NextResponse.json({ logged: false })
  }
}
