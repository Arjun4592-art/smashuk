import { NextRequest, NextResponse } from 'next/server'
import { medusaServiceFetch } from '@/lib/api/medusa-service-token'
import { markOrderDelivered, shipOrder } from '@/lib/api/medusa-fulfillment'
import { sendMail, notifyOwner } from '@/lib/email'
import {
  deliveryConfirmationEmail,
  adminDeliveryEmail,
} from '@/lib/email-templates'

export async function POST(req: NextRequest) {
  const secret = process.env.COURIER_WEBHOOK_SECRET
  if (!secret || req.headers.get('x-courier-secret') !== secret) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const { orderId } = await req.json().catch(() => ({}))
  if (!orderId) {
    return NextResponse.json({ error: 'orderId required' }, { status: 400 })
  }
  try {
    const orderRes = await medusaServiceFetch(
      `/admin/orders/${orderId}?fields=id,display_id,email,metadata,*items`,
    )
    const { order } = await orderRes.json().catch(() => ({}))
    if (!orderRes.ok || !order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 })
    }
    // Pick-ups are never delivered by a courier; staff mark those as picked up.
    if (order.metadata?.fulfillment_type === 'pickup') {
      return NextResponse.json({ ignored: 'pickup order' })
    }
    // Parcel2Go says it is delivered, so move the order to DELIVERED.
    // Idempotent: safe if the webhook fires more than once.
    let markedDelivered = false
    let deliverError: string | undefined
    try {
      // The label may have been bought without "handed to courier" being
      // confirmed. The courier delivering it proves it was shipped.
      await shipOrder(orderId, medusaServiceFetch).catch(() => null)
      const delivered = await markOrderDelivered(orderId, medusaServiceFetch)
      markedDelivered = !(delivered as any)?.alreadyDelivered
    } catch (deliverErr: any) {
      deliverError = deliverErr?.message ?? 'Could not mark as delivered'
      console.error(
        `[courier-delivered webhook] could not mark ${orderId} delivered:`,
        deliverErr,
      )
    }
    if (order.metadata?.delivery_notified_at) {
      return NextResponse.json({
        alreadyNotified: true,
        markedDelivered,
        ...(deliverError ? { deliverError } : {}),
      })
    }
    if (order.email) {
      const { subject, html, text, resendTemplate } =
        deliveryConfirmationEmail(order)
      await sendMail({ to: order.email, subject, html, text, resendTemplate })
      const adminEmail = adminDeliveryEmail(order)
      notifyOwner({
        subject: adminEmail.subject,
        html: adminEmail.html,
        text: adminEmail.text,
        resendTemplate: adminEmail.resendTemplate,
        customerEmail: order.email,
      }).catch(() => {})
    }
    await medusaServiceFetch(`/admin/orders/${orderId}`, {
      method: 'POST',
      body: JSON.stringify({
        metadata: {
          ...(order.metadata ?? {}),
          delivery_notified_at: new Date().toISOString(),
        },
      }),
    }).catch(() => {})
    return NextResponse.json({
      notified: true,
      markedDelivered,
      ...(deliverError ? { deliverError } : {}),
    })
  } catch (err: any) {
    console.error('[courier-delivered webhook] failed:', err)
    return NextResponse.json(
      { error: err?.message ?? 'Failed' },
      { status: 500 },
    )
  }
}
