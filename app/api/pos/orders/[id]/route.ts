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
        const { subject, html, text } = refundConfirmationEmail(
          order,
          refund_amount,
          builtItems,
        )
        await sendMail({
          to: order.email,
          subject,
          html,
          text,
        })
        const adminEmail = adminRefundEmail(order, refund_amount)
        notifyOwner({
          subject: adminEmail.subject,
          html: adminEmail.html,
          text: adminEmail.text,
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
          const { subject, html, text } = shippingConfirmationEmail(fullOrder)
          await sendMail({
            to: fullOrder.email,
            subject,
            html,
            text,
          })
          const adminEmail = adminShippingEmail(fullOrder)
          notifyOwner({
            subject: adminEmail.subject,
            html: adminEmail.html,
            text: adminEmail.text,
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
