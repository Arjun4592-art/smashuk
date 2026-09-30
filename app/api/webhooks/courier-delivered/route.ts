import { NextRequest, NextResponse } from 'next/server'
import { medusaServiceFetch } from '@/lib/api/medusa-service-token'
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
    if (order.metadata?.delivery_notified_at) {
      return NextResponse.json({ alreadyNotified: true })
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
    return NextResponse.json({ notified: true })
  } catch (err: any) {
    console.error('[courier-delivered webhook] failed:', err)
    return NextResponse.json(
      { error: err?.message ?? 'Failed' },
      { status: 500 },
    )
  }
}
