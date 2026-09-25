import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { randomUUID } from 'crypto'
import { SURFACE_COOKIES, getSurfaceIdentity } from '@/lib/api/auth-cookie'
import { medusaServiceFetch } from '@/lib/api/medusa-service-token'
import {
  getOrderForReturn,
  buildReturnLines,
  refundOrderAmount,
  appendReturnRecord,
} from '@/lib/api/medusa-returns'
import { sendMail, notifyOwner } from '@/lib/email'
import {
  refundConfirmationEmail,
  shippingConfirmationEmail,
  adminRefundEmail,
  adminShippingEmail,
} from '@/lib/email-templates'
import { signOrderTrackToken } from '@/lib/api/order-track-token'
const isSyntheticEmail = (email?: string) =>
  !email || /^(walkin@|pos-)/i.test(email)
async function requirePosSession(): Promise<boolean> {
  const cookieStore = await cookies()
  const posToken = cookieStore.get(SURFACE_COOKIES.pos.tokenCookie)?.value
  const dashboardToken = cookieStore.get(
    SURFACE_COOKIES.dashboard.tokenCookie,
  )?.value
  return Boolean(posToken || dashboardToken)
}
// Read-only order detail for the POS terminal (view screen + receipt/label
// printing for old orders). Mirrors /api/admin/orders/[id] GET, but gated
// with the same requirePosSession() as the rest of this file (POS OR
// dashboard token) instead of the dashboard-only admin auth — same pattern
// as the POS shipping-label route (see [id]/label/route.ts). Read-only, so
// this doesn't reopen the write-action gap that admin-auth.ts documents:
// order status changes / fulfillment / returns in this file still require
// their own PATCH/PUT below, unaffected by this.
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!(await requirePosSession())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const { id } = await params
  const FIELDS =
    'id,display_id,email,created_at,updated_at,canceled_at,status,currency_code,metadata,payment_status,' +
    '*items,*payment_collections.payments,*shipping_methods,*fulfillments,fulfillment_status,' +
    'subtotal,total,discount_total,shipping_total,gift_card_total,tax_total,' +
    'customer.id,customer.first_name,customer.last_name,customer.phone,' +
    'shipping_address.first_name,shipping_address.last_name,shipping_address.phone,' +
    'shipping_address.address_1,shipping_address.address_2,shipping_address.city,' +
    'shipping_address.province,shipping_address.postal_code,shipping_address.country_code'
  try {
    const r = await medusaServiceFetch(
      `/admin/orders/${id}?fields=${encodeURIComponent(FIELDS)}`,
    )
    const text = await r.text()
    if (!r.ok) {
      let detail = text
      try {
        detail = JSON.parse(text)?.message ?? text
      } catch {}
      return NextResponse.json(
        { error: detail || `Medusa returned ${r.status}` },
        { status: r.status },
      )
    }
    const parsed = JSON.parse(text)
    if (parsed?.order) {
      parsed.order.payments = (parsed.order.payment_collections ?? []).flatMap(
        (pc: any) => pc.payments ?? [],
      )
      parsed.order.trackingToken = signOrderTrackToken(parsed.order.id)
      const rawSplit = parsed.order.metadata?.split_payments
      if (typeof rawSplit === 'string') {
        try {
          const p = JSON.parse(rawSplit)
          parsed.order.splitPayments =
            Array.isArray(p) && p.length > 0 ? p : null
        } catch {
          parsed.order.splitPayments = null
        }
      }
    }
    return NextResponse.json(parsed)
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message ?? 'Failed to load order' },
      { status: 500 },
    )
  }
}
export async function PATCH(
  req: NextRequest,
  {
    params,
  }: {
    params: Promise<{
      id: string
    }>
  },
) {
  if (!(await requirePosSession())) {
    return NextResponse.json(
      {
        error: 'Unauthorized',
      },
      {
        status: 401,
      },
    )
  }
  const { id } = await params
  const cookieStore = await cookies()
  const posIdentity = getSurfaceIdentity(
    {
      cookies: cookieStore,
    },
    'pos',
  )
  const dashboardIdentity = getSurfaceIdentity(
    {
      cookies: cookieStore,
    },
    'dashboard',
  )
  const actor = posIdentity?.userId
    ? {
        staffId: posIdentity.userId,
        surface: 'pos' as const,
      }
    : dashboardIdentity?.userId
      ? {
          staffId: dashboardIdentity.userId,
          surface: 'dashboard' as const,
        }
      : undefined
  try {
    const body = await req.json().catch(() => ({}))
    const {
      reason,
      items,
      refundAmount: refundAmountOverride,
    } = body as {
      reason?: string
      items?: {
        item_id: string
        quantity: number
      }[]
      refundAmount?: number
    }
    const order = await getOrderForReturn(id, medusaServiceFetch)
    const { items: builtItems, refund_amount: computedRefundAmount } =
      buildReturnLines(order, items ?? [])
    let refund_amount = computedRefundAmount
    if (refundAmountOverride !== undefined && refundAmountOverride !== null) {
      if (
        typeof refundAmountOverride !== 'number' ||
        !Number.isFinite(refundAmountOverride) ||
        refundAmountOverride <= 0
      ) {
        return NextResponse.json(
          {
            error: 'Custom refund amount must be a positive number',
          },
          {
            status: 400,
          },
        )
      }
      refund_amount = refundAmountOverride
    }
    await refundOrderAmount(order, refund_amount, medusaServiceFetch)
    const res = await appendReturnRecord(
      id,
      order,
      {
        id: randomUUID(),
        items: builtItems,
        reason: reason || 'Other',
        refund_amount,
        status: 'refunded',
        source: 'pos',
        requested_at: new Date().toISOString(),
        processed_at: new Date().toISOString(),
      },
      medusaServiceFetch,
      {
        returned: true,
      },
      actor,
    )
    if (order.email) {
      try {
        const { subject, html, text, resendTemplate } = refundConfirmationEmail(
          order,
          refund_amount,
          builtItems,
        )
        await sendMail({
          to: order.email,
          subject,
          html,
          text,
          resendTemplate,
        })
        const adminEmail = adminRefundEmail(order, refund_amount)
        notifyOwner({
          subject: adminEmail.subject,
          html: adminEmail.html,
          text: adminEmail.text,
          resendTemplate: adminEmail.resendTemplate,
          customerEmail: order.email,
        }).catch(() => {})
      } catch (refundEmailErr) {
        console.error(
          `[POS order return] refund confirmation email failed for ${id}:`,
          refundEmailErr,
        )
      }
    }
    return NextResponse.json({
      ...res,
      refund_amount,
    })
  } catch (err: any) {
    console.error('[API] POS order PATCH error:', err)
    return NextResponse.json(
      {
        error: err.message ?? 'Failed to process return',
      },
      {
        status: 400,
      },
    )
  }
}
export async function PUT(
  req: NextRequest,
  {
    params,
  }: {
    params: Promise<{
      id: string
    }>
  },
) {
  if (!(await requirePosSession())) {
    return NextResponse.json(
      {
        error: 'Unauthorized',
      },
      {
        status: 401,
      },
    )
  }
  const { id } = await params
  try {
    const body = await req.json().catch(() => ({}))
    const action = (body.action ?? 'pickup') as 'pickup' | 'dispatch'
    const markDelivered = action === 'pickup'
    const { fulfillOrder, markOrderDelivered } =
      await import('@/lib/api/medusa-fulfillment')
    const result = await fulfillOrder(id, medusaServiceFetch, markDelivered)
    if (action === 'dispatch' && !result.alreadyFulfilled) {
      try {
        const orderRes = await medusaServiceFetch(
          `/admin/orders/${id}?fields=id,display_id,email,*items,shipping_address.address_1,shipping_address.address_2,shipping_address.city,shipping_address.postal_code,shipping_address.country_code`,
        )
        const orderData = await orderRes.json().catch(() => ({}))
        const fullOrder = orderData?.order
        if (fullOrder?.email && !isSyntheticEmail(fullOrder.email)) {
          const { subject, html, text, resendTemplate } =
            shippingConfirmationEmail(fullOrder)
          await sendMail({
            to: fullOrder.email,
            subject,
            html,
            text,
            resendTemplate,
          })
          const adminEmail = adminShippingEmail(fullOrder)
          notifyOwner({
            subject: adminEmail.subject,
            html: adminEmail.html,
            text: adminEmail.text,
            resendTemplate: adminEmail.resendTemplate,
            customerEmail: fullOrder.email,
          }).catch(() => {})
        }
      } catch (shipEmailErr) {
        console.error(
          `[POS order dispatch] shipping confirmation email failed for ${id}:`,
          shipEmailErr,
        )
      }
    }
    let delivered = false
    let deliverError = result.deliverError
    if (markDelivered && result.alreadyFulfilled) {
      try {
        const deliverResult = await markOrderDelivered(id, medusaServiceFetch)
        delivered = !deliverResult.alreadyDelivered
      } catch (deliverErr: any) {
        deliverError = deliverErr?.message ?? 'Failed to mark as delivered'
        console.warn(
          '[API] POS order PUT — markOrderDelivered fallback failed:',
          deliverErr?.message,
        )
      }
    }
    return NextResponse.json({
      ok: true,
      action,
      alreadyFulfilled: !!result.alreadyFulfilled && !delivered,
      deliverError,
    })
  } catch (err: any) {
    console.error('[API] POS order PUT (fulfill) error:', err)
    return NextResponse.json(
      {
        error: err.message ?? 'Failed to fulfill order',
      },
      {
        status: 400,
      },
    )
  }
}
