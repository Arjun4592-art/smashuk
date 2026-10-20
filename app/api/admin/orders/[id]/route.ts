import { NextRequest, NextResponse } from 'next/server'
import { getAdminAuthHeader } from '@/lib/api/admin-auth'
import { getSurfaceIdentity } from '@/lib/api/auth-cookie'
import { MEDUSA_URL } from '@/lib/api/medusa-service-token'
import {
  fulfillOrder,
  markOrderDelivered,
  shipOrder,
} from '@/lib/api/medusa-fulfillment'
import {
  getOrderForReturn,
  buildReturnLines,
  refundOrderAmount,
  appendReturnRecord,
  updateReturnRecord,
  type ReturnRecord,
} from '@/lib/api/medusa-returns'
import { randomUUID } from 'crypto'
import { isSyntheticEmail } from '@/lib/pos/walkin'
import { sendMail, notifyOwner } from '@/lib/email'
import {
  getOrderFlow,
  canRequestRefund,
  getRefundRequest,
  returnNetRefund,
  returnLabelFee,
} from '@/lib/order-flow'
import {
  getFlowOrder,
  hasMailInLines,
  saveOrderMetadata,
  captureOfflinePayments,
  refundWholeOrder,
  cancelRefundedOrder,
} from '@/lib/api/order-flow-server'
import {
  orderProcessingEmail,
  adminRefundRequestEmail,
  shippingConfirmationEmail,
  outForDeliveryEmail,
  deliveryConfirmationEmail,
  orderCancelledEmail,
  refundConfirmationEmail,
  adminShippingEmail,
  adminOutForDeliveryEmail,
  adminDeliveryEmail,
  adminCancelledEmail,
  adminRefundEmail,
  readyForPickupEmail,
  returnDeclinedEmail,
  returnLabelEmail,
} from '@/lib/email-templates'
import {
  bookCustomerLabel,
  shipMailInBox,
  resendMailInLabel,
  emailReturnLabel,
  hasEmailableAddress,
  type BookedLabel,
} from '@/lib/api/order-labels'
import { signOrderTrackToken } from '@/lib/api/order-track-token'

type RouteFetcher = (path: string, init?: RequestInit) => Promise<Response>

// Emails the customer their despatch / tracking details and tells the owner.
// Never throws: the order is already despatched when this runs.
async function sendDespatchEmails(
  id: string,
  fetcher: RouteFetcher,
  trackingNumber?: string,
) {
  try {
    const orderRes = await fetcher(
      `/admin/orders/${id}?fields=id,display_id,email,*items,shipping_address.address_1,shipping_address.address_2,shipping_address.city,shipping_address.postal_code,shipping_address.country_code`,
    )
    const orderData = await orderRes.json().catch(() => ({}))
    const fullOrder = orderData?.order
    if (fullOrder?.email && !isSyntheticEmail(fullOrder.email)) {
      const { subject, html, text, resendTemplate } = shippingConfirmationEmail(
        fullOrder,
        { trackingNumber },
      )
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
      `[order ship] shipping confirmation email failed for ${id}:`,
      shipEmailErr,
    )
  }
}
export async function GET(
  req: NextRequest,
  {
    params,
  }: {
    params: Promise<{
      id: string
    }>
  },
) {
  const authHeaderRaw = await getAdminAuthHeader(req)
  if (!authHeaderRaw) {
    return NextResponse.json(
      {
        error: 'Unauthorized',
      },
      {
        status: 401,
      },
    )
  }
  const authHeader: string = authHeaderRaw
  const { id } = await params
  try {
    const FIELDS =
      'id,display_id,email,created_at,updated_at,canceled_at,status,currency_code,metadata,payment_status,' +
      '*items,items.metadata,items.total,items.discount_total,items.refundable_total,items.refundable_total_per_unit,*payment_collections.payments,*shipping_methods,*fulfillments,fulfillment_status,' +
      'subtotal,total,discount_total,shipping_total,gift_card_total,tax_total,' +
      'customer.id,customer.first_name,customer.last_name,customer.phone,' +
      'shipping_address.first_name,shipping_address.last_name,shipping_address.phone,' +
      'shipping_address.address_1,shipping_address.address_2,shipping_address.city,' +
      'shipping_address.province,shipping_address.postal_code,shipping_address.country_code'
    const FALLBACK_FIELDS =
      'id,display_id,email,created_at,metadata,payment_status,' +
      '*items,items.metadata,*payment_collections.payments,fulfillment_status,' +
      'subtotal,total,discount_total,shipping_total,tax_total'
    async function fetchOrder(fields: string) {
      const url = new URL(`/admin/orders/${id}`, MEDUSA_URL)
      url.searchParams.set('fields', fields)
      const r = await fetch(url.toString(), {
        headers: {
          Authorization: authHeader,
        },
      })
      const t = await r.text()
      return {
        ok: r.ok,
        status: r.status,
        text: t,
      }
    }
    let { ok, status, text } = await fetchOrder(FIELDS)
    if (!ok) {
      console.error(
        `[order GET] Medusa ${status} for ${id} with full fields:`,
        text.slice(0, 500),
      )
      ;({ ok, status, text } = await fetchOrder(FALLBACK_FIELDS))
    }
    const res = {
      ok,
      status,
    } as {
      ok: boolean
      status: number
    }
    if (!res.ok) {
      console.error(
        `[order GET] Medusa ${res.status} for ${id}:`,
        text.slice(0, 500),
      )
      let detail = text
      try {
        const parsed = JSON.parse(text)
        detail = parsed.message ?? parsed.error ?? text
      } catch {}
      return NextResponse.json(
        {
          error: `Medusa error (${res.status}): ${detail.slice(0, 300) || 'empty response'}`,
        },
        {
          status: res.status,
        },
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
    console.error(`[order GET] unexpected error for ${id}:`, err)
    return NextResponse.json(
      {
        error: err.message || 'Failed to load order — check server logs',
      },
      {
        status: 500,
      },
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
  const authHeader = await getAdminAuthHeader(req)
  if (!authHeader) {
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
  const fetcher = (path: string, init: RequestInit = {}) =>
    fetch(`${MEDUSA_URL}${path}`, {
      ...init,
      headers: {
        ...(init.headers ?? {}),
        Authorization: authHeader,
        'Content-Type': 'application/json',
      },
    })
  const identity = getSurfaceIdentity(req, 'dashboard')
  const actor = identity?.userId
    ? {
        staffId: identity.userId,
        surface: 'dashboard' as const,
      }
    : undefined
  try {
    const body = await req.json()
    const { action } = body
    let data: any
    switch (action) {
      // ── Order flow: NEW -> PROCESSING ─────────────────────────────────
      case 'accept': {
        let order: any
        try {
          order = await getFlowOrder(id, fetcher)
        } catch (loadErr: any) {
          return NextResponse.json(
            { error: loadErr.message ?? 'Order not found' },
            { status: 404 },
          )
        }
        const flow = getOrderFlow(order)
        if (flow.stage !== 'new') {
          return NextResponse.json(
            { error: `This order is already ${flow.label}.` },
            { status: 400 },
          )
        }
        try {
          await saveOrderMetadata(
            id,
            order,
            {
              order_accepted_at: new Date().toISOString(),
              ...(actor?.staffId ? { order_accepted_by: actor.staffId } : {}),
            },
            fetcher,
          )
        } catch (saveErr: any) {
          return NextResponse.json(
            { error: saveErr.message ?? 'Could not accept the order' },
            { status: 400 },
          )
        }
        let emailed = false
        if (order.email && !isSyntheticEmail(order.email)) {
          try {
            const { subject, html, text } = orderProcessingEmail(order)
            const sent = await sendMail({
              to: order.email,
              subject,
              html,
              text,
            })
            emailed = sent.sent
          } catch (processingEmailErr) {
            console.error(
              `[order accept] processing email failed for ${id}:`,
              processingEmailErr,
            )
          }
        }
        data = { accepted: true, emailed }
        break
      }
      // ── Delivery orders: buy the label and despatch in one step ───────
      case 'despatch': {
        let order: any
        try {
          order = await getFlowOrder(id, fetcher)
        } catch (loadErr: any) {
          return NextResponse.json(
            { error: loadErr.message ?? 'Order not found' },
            { status: 404 },
          )
        }
        const flow = getOrderFlow(order)
        if (hasMailInLines(order)) {
          return NextResponse.json(
            {
              error:
                'Mail-in orders are despatched with the Ship box / label buttons.',
            },
            { status: 400 },
          )
        }
        if (flow.isPickup) {
          return NextResponse.json(
            {
              error:
                'Pick-up orders are marked ready for pickup, not despatched.',
            },
            { status: 400 },
          )
        }
        if (!flow.accepted) {
          return NextResponse.json(
            { error: 'Accept the order first.' },
            { status: 400 },
          )
        }
        if (flow.track !== 'order' || flow.stage !== 'processing') {
          return NextResponse.json(
            {
              error: `This order can't be despatched while it is ${flow.label}.`,
            },
            { status: 400 },
          )
        }
        try {
          // Creating the fulfilment is what buys the shipping label.
          await fulfillOrder(id, fetcher)
        } catch (fulfillErr: any) {
          return NextResponse.json(
            { error: fulfillErr.message ?? 'Could not buy the shipping label' },
            { status: 400 },
          )
        }
        await captureOfflinePayments(id, fetcher)
        let warning: string | undefined
        try {
          const shipped = await shipOrder(id, fetcher)
          if (!shipped.alreadyShipped) {
            await sendDespatchEmails(
              id,
              fetcher,
              shipped.parcel2goTrackingNumber,
            )
          }
        } catch (shipErr: any) {
          warning = `The shipping label was bought and the order now shows DESPATCHED, but confirming the shipment failed: ${shipErr?.message ?? 'unknown error'}. Use "Confirm handed to courier" to try again.`
        }
        data = { despatched: true, ...(warning ? { warning } : {}) }
        break
      }
      // ── Refund BEFORE the order is despatched / picked up ─────────────
      case 'request-refund': {
        const { reason, note, source } = body as {
          reason?: string
          note?: string
          source?: string
        }
        let order: any
        try {
          order = await getFlowOrder(id, fetcher)
        } catch (loadErr: any) {
          return NextResponse.json(
            { error: loadErr.message ?? 'Order not found' },
            { status: 404 },
          )
        }
        if (!canRequestRefund(order)) {
          return NextResponse.json(
            {
              error:
                'A refund request can only be logged once, for a paid order that has not been despatched or picked up yet. After that, use a return.',
            },
            { status: 400 },
          )
        }
        try {
          await saveOrderMetadata(
            id,
            order,
            {
              refund_request: {
                status: 'requested',
                requested_at: new Date().toISOString(),
                source: source === 'pos' ? 'pos' : 'dashboard',
                reason: reason || 'Other',
                ...(note ? { note } : {}),
              },
            },
            fetcher,
          )
        } catch (saveErr: any) {
          return NextResponse.json(
            { error: saveErr.message ?? 'Could not log the refund request' },
            { status: 400 },
          )
        }
        data = { requested: true }
        break
      }
      case 'accept-refund': {
        let order: any
        try {
          order = await getFlowOrder(id, fetcher)
        } catch (loadErr: any) {
          return NextResponse.json(
            { error: loadErr.message ?? 'Order not found' },
            { status: 404 },
          )
        }
        const request = getRefundRequest(order)
        if (request?.status !== 'requested') {
          return NextResponse.json(
            { error: 'There is no open refund request on this order.' },
            { status: 400 },
          )
        }
        let refund: { amount: number; manual: boolean }
        try {
          refund = await refundWholeOrder(order, fetcher)
        } catch (refundErr: any) {
          return NextResponse.json(
            {
              error: `Refund failed, nothing was changed: ${refundErr?.message ?? 'unknown error'}`,
            },
            { status: 502 },
          )
        }
        try {
          await saveOrderMetadata(
            id,
            order,
            {
              refund_request: {
                ...request,
                status: 'refunded',
                processed_at: new Date().toISOString(),
                amount: refund.amount,
                ...(refund.manual ? { refunded_manually: true } : {}),
              },
            },
            fetcher,
          )
        } catch (saveErr: any) {
          return NextResponse.json(
            {
              error: `The customer WAS refunded £${refund.amount.toFixed(2)}, but the order could not be updated: ${saveErr?.message ?? 'unknown error'}. Do not refund again.`,
            },
            { status: 500 },
          )
        }
        // Release the stock of an order that never left the shop.
        await cancelRefundedOrder(id, fetcher)
        if (
          order.email &&
          !isSyntheticEmail(order.email) &&
          refund.amount > 0
        ) {
          try {
            const { subject, html, text, resendTemplate } =
              refundConfirmationEmail(order, refund.amount, order.items ?? [])
            await sendMail({
              to: order.email,
              subject,
              html,
              text,
              resendTemplate,
            })
            const adminEmail = adminRefundEmail(order, refund.amount)
            notifyOwner({
              subject: adminEmail.subject,
              html: adminEmail.html,
              text: adminEmail.text,
              resendTemplate: adminEmail.resendTemplate,
              customerEmail: order.email,
            }).catch(() => {})
          } catch (refundEmailErr) {
            console.error(
              `[order accept-refund] refund email failed for ${id}:`,
              refundEmailErr,
            )
          }
        }
        data = {
          refunded: true,
          refundAmount: refund.amount,
          manual: refund.manual,
        }
        break
      }
      case 'decline-refund': {
        let order: any
        try {
          order = await getFlowOrder(id, fetcher)
        } catch (loadErr: any) {
          return NextResponse.json(
            { error: loadErr.message ?? 'Order not found' },
            { status: 404 },
          )
        }
        const request = getRefundRequest(order)
        if (request?.status !== 'requested') {
          return NextResponse.json(
            { error: 'There is no open refund request on this order.' },
            { status: 400 },
          )
        }
        try {
          await saveOrderMetadata(
            id,
            order,
            {
              refund_request: {
                ...request,
                status: 'declined',
                processed_at: new Date().toISOString(),
              },
            },
            fetcher,
          )
        } catch (saveErr: any) {
          return NextResponse.json(
            { error: saveErr.message ?? 'Could not update the order' },
            { status: 400 },
          )
        }
        data = { declined: true }
        break
      }
      case 'confirm': {
        const res = await fetcher(`/admin/orders/${id}/complete`, {
          method: 'POST',
          body: JSON.stringify({}),
        })
        data = await res.json().catch(() => ({}))
        if (!res.ok) {
          return NextResponse.json(
            {
              error: data?.message ?? `Failed to confirm order (${res.status})`,
            },
            {
              status: res.status,
            },
          )
        }
        break
      }
      case 'cancel': {
        let cancelRefundAmount = 0
        let preOrder: any = null
        try {
          const orderRes = await fetcher(
            `/admin/orders/${id}?fields=id,display_id,email,metadata,*items,*payment_collections.payments`,
          )
          const orderData = await orderRes.json().catch(() => ({}))
          preOrder = orderData?.order ?? null
        } catch (loadErr) {
          console.error(`[order cancel] could not load order ${id}:`, loadErr)
        }
        if (preOrder) {
          preOrder.payments = (preOrder.payment_collections ?? []).flatMap(
            (pc: any) => pc.payments ?? [],
          )
          const isCashOrder =
            preOrder.metadata?.payment_method === 'cash' ||
            (preOrder.payments.length > 0 &&
              preOrder.payments.every(
                (p: any) =>
                  !p.provider_id || p.provider_id === 'pp_system_default',
              ))
          if (!isCashOrder) {
            const refundablePayments = preOrder.payments.filter(
              (p: any) => p.captured_at && !p.canceled_at,
            )
            const totalRefundable = refundablePayments.reduce(
              (sum: number, p: any) =>
                sum +
                (p.amount - (p.refunded_amount ?? p.amount_refunded ?? 0)),
              0,
            )
            if (totalRefundable > 0) {
              try {
                await refundOrderAmount(preOrder, totalRefundable, fetcher)
                cancelRefundAmount = totalRefundable
              } catch (refundErr: any) {
                console.error(
                  `[order cancel] refund failed for ${id}:`,
                  refundErr,
                )
                return NextResponse.json(
                  {
                    error: `Refund failed, so the order was NOT cancelled: ${
                      refundErr?.message ?? 'unknown error'
                    }`,
                  },
                  { status: 502 },
                )
              }
            }
          }
        }
        const res = await fetcher(`/admin/orders/${id}/cancel`, {
          method: 'POST',
        })
        data = await res.json().catch(() => ({}))
        if (!res.ok) {
          return NextResponse.json(
            {
              error: data?.message ?? `Failed to cancel order (${res.status})`,
              ...(cancelRefundAmount > 0 && {
                warning: `£${cancelRefundAmount} was already refunded to the customer, but cancelling the order failed. Retry cancel — it will not refund twice.`,
              }),
            },
            {
              status: res.status,
            },
          )
        }
        try {
          const fullOrder = preOrder
          if (fullOrder?.email) {
            const { subject, html, text, resendTemplate } =
              orderCancelledEmail(fullOrder)
            await sendMail({
              to: fullOrder.email,
              subject,
              html,
              text,
              resendTemplate,
            })
            if (cancelRefundAmount > 0) {
              const refundEmail = refundConfirmationEmail(
                fullOrder,
                cancelRefundAmount,
                fullOrder.items ?? [],
              )
              await sendMail({
                to: fullOrder.email,
                subject: refundEmail.subject,
                html: refundEmail.html,
                text: refundEmail.text,
                resendTemplate: refundEmail.resendTemplate,
              })
            }
            const adminEmail = adminCancelledEmail(fullOrder)
            notifyOwner({
              subject: adminEmail.subject,
              html: adminEmail.html,
              text: adminEmail.text,
              resendTemplate: adminEmail.resendTemplate,
              customerEmail: fullOrder.email,
            }).catch(() => {})
          }
        } catch (cancelEmailErr) {
          console.error(
            `[order cancel] cancellation email failed for ${id}:`,
            cancelEmailErr,
          )
        }
        data = {
          ...data,
          refunded: cancelRefundAmount > 0,
          refundAmount: cancelRefundAmount,
        }
        break
      }
      case 'archive': {
        const res = await fetcher(`/admin/orders/${id}/archive`, {
          method: 'POST',
        })
        data = await res.json().catch(() => ({}))
        if (!res.ok) {
          return NextResponse.json(
            {
              error: data?.message ?? `Failed to archive order (${res.status})`,
            },
            {
              status: res.status,
            },
          )
        }
        break
      }
      case 'fulfill': {
        try {
          const pre = await getFlowOrder(id, fetcher)
          if (!hasMailInLines(pre) && !getOrderFlow(pre).accepted) {
            return NextResponse.json(
              { error: 'Accept the order first.' },
              { status: 400 },
            )
          }
        } catch (preErr) {
          console.error(`[order fulfill] pre-check failed for ${id}:`, preErr)
        }
        try {
          data = await fulfillOrder(id, fetcher)
        } catch (fulfillErr: any) {
          return NextResponse.json(
            {
              error: fulfillErr.message ?? 'Failed to fulfill order',
            },
            {
              status: 400,
            },
          )
        }
        try {
          const orderRes = await fetcher(
            `/admin/orders/${id}?fields=metadata,*payment_collections.payments`,
          )
          const orderData = await orderRes.json().catch(() => ({}))
          const fullOrder = orderData?.order
          const isPOS = fullOrder?.metadata?.source === 'pos'
          const payments = (fullOrder?.payment_collections ?? []).flatMap(
            (pc: any) => pc.payments ?? [],
          )
          if (fullOrder && !isPOS) {
            const uncaptured = payments.filter(
              (p: any) =>
                !p.captured_at &&
                p.status !== 'canceled' &&
                p.provider_id === 'pp_system_default',
            )
            for (const payment of uncaptured) {
              const capRes = await fetcher(
                `/admin/payments/${payment.id}/capture`,
                {
                  method: 'POST',
                },
              )
              if (!capRes.ok) {
                console.error(
                  `[order fulfill] capture failed for payment ${payment.id}:`,
                  await capRes.text().catch(() => ''),
                )
              }
            }
          }
        } catch (captureErr) {
          console.error(
            `[order fulfill] post-fulfill capture step failed for ${id}:`,
            captureErr,
          )
        }
        try {
          const orderRes = await fetcher(
            `/admin/orders/${id}?fields=id,display_id,email,metadata,*items,customer.first_name`,
          )
          const orderData = await orderRes.json().catch(() => ({}))
          const fullOrder = orderData?.order
          const isPickup = fullOrder?.metadata?.fulfillment_type === 'pickup'
          if (fullOrder?.email && isPickup) {
            const { subject, html, text, resendTemplate } =
              readyForPickupEmail(fullOrder)
            await sendMail({
              to: fullOrder.email,
              subject,
              html,
              text,
              resendTemplate,
            })
          }
        } catch (pickupEmailErr) {
          console.error(
            `[order fulfill] ready-for-pickup email failed for ${id}:`,
            pickupEmailErr,
          )
        }
        break
      }
      case 'resend-mail-in-label': {
        try {
          const labelResult = await resendMailInLabel(id, fetcher)
          if (!labelResult.ok) {
            return NextResponse.json(
              { error: labelResult.error ?? 'Could not send the label' },
              { status: 400 },
            )
          }
          const orderRes = await fetcher(`/admin/orders/${id}`)
          data = await orderRes.json().catch(() => ({}))
        } catch (labelErr: any) {
          return NextResponse.json(
            { error: labelErr.message ?? 'Could not send the label' },
            { status: 400 },
          )
        }
        break
      }
      case 'ship-box': {
        // Mail-in orders where the customer has no box: ship the box kit,
        // then email the customer -> store label automatically.
        try {
          const boxResult = await shipMailInBox(id, fetcher)
          const orderRes = await fetcher(`/admin/orders/${id}`)
          const orderData = await orderRes.json().catch(() => ({}))
          data = {
            ...orderData,
            mail_in_box: {
              already_shipped: boxResult.alreadyShipped,
              tracking_number: boxResult.trackingNumber,
            },
            mail_in_label: boxResult.label,
          }
        } catch (boxErr: any) {
          return NextResponse.json(
            { error: boxErr.message ?? 'Failed to ship the box' },
            { status: 400 },
          )
        }
        break
      }
      case 'ship': {
        try {
          data = await shipOrder(id, fetcher)
        } catch (shipErr: any) {
          return NextResponse.json(
            {
              error: shipErr.message ?? 'Failed to dispatch order',
            },
            {
              status: 400,
            },
          )
        }
        if (!data?.alreadyShipped) {
          await sendDespatchEmails(id, fetcher, data?.parcel2goTrackingNumber)
        }
        break
      }
      case 'out-for-delivery': {
        const orderRes = await fetcher(
          `/admin/orders/${id}?fields=id,display_id,email,metadata,*items,shipping_address.address_1,shipping_address.address_2,shipping_address.city,shipping_address.postal_code,shipping_address.country_code`,
        )
        const orderData = await orderRes.json().catch(() => ({}))
        const fullOrder = orderData?.order
        if (!orderRes.ok || !fullOrder) {
          return NextResponse.json(
            {
              error: 'Order not found',
            },
            {
              status: 404,
            },
          )
        }
        if (fullOrder.metadata?.out_for_delivery_notified_at) {
          data = { alreadyNotified: true }
          break
        }
        if (fullOrder.email) {
          try {
            const { subject, html, text, resendTemplate } =
              outForDeliveryEmail(fullOrder)
            await sendMail({
              to: fullOrder.email,
              subject,
              html,
              text,
              resendTemplate,
            })
            const adminEmail = adminOutForDeliveryEmail(fullOrder)
            notifyOwner({
              subject: adminEmail.subject,
              html: adminEmail.html,
              text: adminEmail.text,
              resendTemplate: adminEmail.resendTemplate,
              customerEmail: fullOrder.email,
            }).catch(() => {})
          } catch (outForDeliveryEmailErr) {
            console.error(
              `[order out-for-delivery] email failed for ${id}:`,
              outForDeliveryEmailErr,
            )
          }
        }
        try {
          await fetcher(`/admin/orders/${id}`, {
            method: 'POST',
            body: JSON.stringify({
              metadata: {
                ...(fullOrder.metadata ?? {}),
                out_for_delivery_notified_at: new Date().toISOString(),
              },
            }),
          })
        } catch (metaErr) {
          console.error(
            `[order out-for-delivery] metadata flag update failed for ${id}:`,
            metaErr,
          )
        }
        data = { notified: true }
        break
      }
      case 'deliver': {
        try {
          data = await markOrderDelivered(id, fetcher)
        } catch (deliverErr: any) {
          return NextResponse.json(
            {
              error: deliverErr.message ?? 'Failed to mark order as delivered',
            },
            {
              status: 400,
            },
          )
        }
        if (!data?.alreadyDelivered) {
          try {
            const orderRes = await fetcher(
              `/admin/orders/${id}?fields=id,display_id,email,metadata,*items`,
            )
            const orderData = await orderRes.json().catch(() => ({}))
            const fullOrder = orderData?.order
            // A pick-up that has been collected (COMPLETED) sends no email.
            if (
              fullOrder?.email &&
              fullOrder.metadata?.fulfillment_type !== 'pickup'
            ) {
              const { subject, html, text, resendTemplate } =
                deliveryConfirmationEmail(fullOrder)
              await sendMail({
                to: fullOrder.email,
                subject,
                html,
                text,
                resendTemplate,
              })
              const adminEmail = adminDeliveryEmail(fullOrder)
              notifyOwner({
                subject: adminEmail.subject,
                html: adminEmail.html,
                text: adminEmail.text,
                resendTemplate: adminEmail.resendTemplate,
                customerEmail: fullOrder.email,
              }).catch(() => {})
            }
          } catch (deliverEmailErr) {
            console.error(
              `[order deliver] delivery confirmation email failed for ${id}:`,
              deliverEmailErr,
            )
          }
        }
        break
      }
      case 'capture': {
        const orderRes = await fetcher(
          `/admin/orders/${id}?fields=*payment_collections.payments`,
        )
        const orderData = await orderRes.json().catch(() => ({}))
        const fullOrder = orderData?.order
        const payments = (fullOrder?.payment_collections ?? []).flatMap(
          (pc: any) => pc.payments ?? [],
        )
        const uncaptured = payments.filter(
          (p: any) => !p.captured_at && p.status !== 'canceled',
        )
        if (uncaptured.length === 0) {
          return NextResponse.json(
            {
              error: 'No uncaptured payment found on this order.',
            },
            {
              status: 400,
            },
          )
        }
        for (const payment of uncaptured) {
          const capRes = await fetcher(
            `/admin/payments/${payment.id}/capture`,
            {
              method: 'POST',
            },
          )
          const capData = await capRes.json().catch(() => ({}))
          if (!capRes.ok) {
            return NextResponse.json(
              {
                error:
                  capData?.message ??
                  `Failed to capture payment ${payment.id} (${capRes.status})`,
              },
              {
                status: capRes.status,
              },
            )
          }
        }
        data = {
          captured: true,
        }
        break
      }
      case 'return': {
        const {
          items,
          reason,
          note,
          refund_amount: refundAmountOverride,
          email_label: emailLabel,
          refund_only: refundOnly,
        } = body as {
          items?: {
            item_id: string
            quantity: number
          }[]
          reason?: string
          note?: string
          refund_amount?: number
          email_label?: boolean
          refund_only?: boolean
        }
        try {
          const order = await getOrderForReturn(id, fetcher)
          // Refund-only: money back, no goods returned — needs an explicit
          // amount and doesn't touch line items / return quantities.
          if (
            refundOnly &&
            !(
              typeof refundAmountOverride === 'number' &&
              refundAmountOverride > 0
            )
          ) {
            return NextResponse.json(
              { error: 'Enter the amount to refund' },
              { status: 400 },
            )
          }
          const { items: builtItems, refund_amount: computedRefundAmount } =
            refundOnly
              ? { items: [] as ReturnRecord['items'], refund_amount: 0 }
              : buildReturnLines(order, items ?? [])
          let refund_amount = computedRefundAmount
          if (
            refundAmountOverride !== undefined &&
            refundAmountOverride !== null
          ) {
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
          // "Email return label to customer": book the Parcel2Go label FIRST
          // so a booking problem (no address, low Prepay balance...) stops
          // the return before anything is refunded.
          let returnLabel: {
            trackingNumber?: string
            carrierName?: string
            parcel2goOrderId?: string
            base64?: string
          } | null = null
          if (emailLabel) {
            if (!order.email || isSyntheticEmail(order.email)) {
              return NextResponse.json(
                {
                  error:
                    "This order has no customer email, so the return label can't be emailed.",
                },
                { status: 400 },
              )
            }
            const labelRes = await fetcher(`/admin/orders/${id}/return-label`, {
              method: 'POST',
              body: JSON.stringify({
                items: builtItems.map((i) => ({
                  item_id: i.item_id,
                  quantity: i.quantity,
                })),
              }),
            })
            const labelData = await labelRes.json().catch(() => ({}))
            if (!labelRes.ok) {
              return NextResponse.json(
                {
                  error:
                    labelData?.error ??
                    labelData?.message ??
                    'Could not book the return label.',
                },
                { status: 400 },
              )
            }
            returnLabel = {
              trackingNumber: labelData.tracking_number ?? undefined,
              carrierName: labelData.carrier_name ?? labelData.service_name,
              parcel2goOrderId: labelData.parcel2go_order_id,
              base64: labelData.label_base64 ?? undefined,
            }
          }
          // Refund-only (nothing coming back) is refunded straight away.
          // A real return is NOT refunded here: the customer still has the
          // goods. It's saved as "awaiting_return" and refunded later from
          // the "receive-return" action once the item is back and inspected.
          const awaitingGoods = !refundOnly
          if (!awaitingGoods) {
            await refundOrderAmount(order, refund_amount, fetcher)
          }
          const nowIso = new Date().toISOString()
          data = await appendReturnRecord(
            id,
            order,
            {
              id: randomUUID(),
              items: builtItems,
              reason: reason || 'Other',
              note:
                [
                  note,
                  returnLabel
                    ? `Return label emailed to customer${returnLabel.trackingNumber ? ` · Tracking: ${returnLabel.trackingNumber}` : ''}`
                    : null,
                ]
                  .filter(Boolean)
                  .join(' · ') || undefined,
              ...(returnLabel
                ? {
                    label: {
                      tracking_number: returnLabel.trackingNumber,
                      carrier: returnLabel.carrierName,
                      parcel2go_order_id: returnLabel.parcel2goOrderId,
                    },
                  }
                : {}),
              refund_amount,
              status: awaitingGoods ? 'awaiting_return' : 'refunded',
              source: 'dashboard',
              requested_at: nowIso,
              ...(awaitingGoods ? {} : { processed_at: nowIso }),
            },
            fetcher,
            {},
            actor,
          )
          if (returnLabel) {
            let emailed = false
            let labelError: string | undefined
            if (returnLabel.base64) {
              const mail = returnLabelEmail(order, {
                carrierName: returnLabel.carrierName,
                trackingNumber: returnLabel.trackingNumber,
              })
              const sent = await sendMail({
                to: order.email,
                subject: mail.subject,
                html: mail.html,
                text: mail.text,
                attachments: [
                  {
                    filename: `return-label-${order.display_id ?? id}.pdf`,
                    content: returnLabel.base64,
                    contentType: 'application/pdf',
                  },
                ],
              })
              emailed = sent.sent
              if (!sent.sent) {
                labelError = sent.error ?? 'The email could not be sent'
              }
            } else {
              labelError =
                'The label PDF was not ready yet — download it from Parcel2Go'
            }
            data = {
              ...data,
              return_label: {
                emailed,
                tracking_number: returnLabel.trackingNumber,
                parcel2go_order_id: returnLabel.parcel2goOrderId,
                error: labelError,
              },
            }
          }
          // Refund emails only go out when money actually moved.
          if (!awaitingGoods && order.email) {
            try {
              const { subject, html, text, resendTemplate } =
                refundConfirmationEmail(order, refund_amount, builtItems)
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
                `[order return] refund confirmation email failed for ${id}:`,
                refundEmailErr,
              )
            }
          }
        } catch (returnErr: any) {
          return NextResponse.json(
            {
              error: returnErr.message ?? 'Failed to process return',
            },
            {
              status: 400,
            },
          )
        }
        break
      }
      case 'approve-return': {
        const { returnId } = body as {
          returnId?: string
        }
        if (!returnId) {
          return NextResponse.json(
            {
              error: 'returnId is required',
            },
            {
              status: 400,
            },
          )
        }
        try {
          const order = await getOrderForReturn(id, fetcher)
          const record = (order.metadata?.returns ?? []).find(
            (r: any) => r.id === returnId,
          )
          if (!record) {
            return NextResponse.json(
              {
                error: 'Return request not found',
              },
              {
                status: 404,
              },
            )
          }
          if (record.status !== 'requested') {
            return NextResponse.json(
              {
                error: 'Return already processed',
              },
              {
                status: 400,
              },
            )
          }
          // The return moves to PROCESSING. A prepaid label is only bought
          // (and emailed automatically) when the customer asked for one
          // while requesting the return. Book it FIRST so a booking problem
          // (no address, low Prepay balance...) stops the move before the
          // status changes. NOTHING is refunded here: the refund happens
          // in "receive-return" once the goods are back and inspected.
          let approvedLabel: BookedLabel | null = null
          const wantsLabel = record.label_requested === true
          if (wantsLabel && !hasEmailableAddress(order.email)) {
            return NextResponse.json(
              {
                error:
                  'The customer asked for a prepaid return label, but this order has no email address to send it to.',
              },
              { status: 400 },
            )
          }
          if (wantsLabel) {
            approvedLabel = await bookCustomerLabel(
              id,
              (record.items ?? []).map((i: any) => ({
                item_id: i.item_id,
                quantity: i.quantity,
              })),
              fetcher,
            )
          }
          // Approving only accepts the return and sends the label. The
          // refund is issued later, by "receive-return", once the goods
          // are back and inspected.
          const result = await updateReturnRecord(
            id,
            order,
            returnId,
            {
              status: 'awaiting_return',
              processed_at: new Date().toISOString(),
              ...(approvedLabel
                ? {
                    label: {
                      tracking_number: approvedLabel.trackingNumber,
                      carrier: approvedLabel.carrierName,
                      parcel2go_order_id: approvedLabel.parcel2goOrderId,
                    },
                  }
                : {}),
            },
            fetcher,
            actor,
          )
          data = result.data
          if (approvedLabel) {
            const labelResult = await emailReturnLabel(order, approvedLabel, id)
            data = {
              ...data,
              return_label: {
                emailed: labelResult.emailed,
                tracking_number: approvedLabel.trackingNumber,
                parcel2go_order_id: approvedLabel.parcel2goOrderId,
                error: labelResult.error,
              },
            }
          }
        } catch (returnErr: any) {
          return NextResponse.json(
            {
              error: returnErr.message ?? 'Failed to approve return',
            },
            {
              status: 400,
            },
          )
        }
        break
      }
      case 'receive-return': {
        // The returned goods have arrived and been inspected: NOW refund.
        const { returnId, refund_amount: receivedRefundOverride } = body as {
          returnId?: string
          refund_amount?: number
        }
        if (!returnId) {
          return NextResponse.json(
            { error: 'returnId is required' },
            { status: 400 },
          )
        }
        try {
          const order = await getOrderForReturn(id, fetcher)
          const record = (order.metadata?.returns ?? []).find(
            (r: any) => r.id === returnId,
          )
          if (!record) {
            return NextResponse.json(
              { error: 'Return not found' },
              { status: 404 },
            )
          }
          if (record.status === 'refunded') {
            return NextResponse.json(
              { error: 'This return has already been refunded' },
              { status: 400 },
            )
          }
          if (record.status !== 'awaiting_return') {
            return NextResponse.json(
              {
                error:
                  record.status === 'requested'
                    ? 'Approve the return first, then mark it received once the item arrives'
                    : 'This return cannot be received',
              },
              { status: 400 },
            )
          }
          // Staff can lower (or otherwise adjust) the refund after
          // inspecting the condition of the goods.
          // Default = the items' value minus the prepaid label fee (when the
          // customer asked for a label).
          const labelFeeTaken = returnLabelFee(record)
          let finalAmount: number = returnNetRefund(record)
          if (
            receivedRefundOverride !== undefined &&
            receivedRefundOverride !== null
          ) {
            if (
              typeof receivedRefundOverride !== 'number' ||
              !Number.isFinite(receivedRefundOverride) ||
              receivedRefundOverride <= 0
            ) {
              return NextResponse.json(
                { error: 'Refund amount must be a positive number' },
                { status: 400 },
              )
            }
            finalAmount = Math.round(receivedRefundOverride * 100) / 100
          }
          await refundOrderAmount(order, finalAmount, fetcher)
          const nowIso = new Date().toISOString()
          const result = await updateReturnRecord(
            id,
            order,
            returnId,
            {
              status: 'refunded',
              refund_amount: finalAmount,
              received_at: nowIso,
              processed_at: nowIso,
              ...(labelFeeTaken > 0
                ? { label_fee_deducted: labelFeeTaken }
                : {}),
            },
            fetcher,
            actor,
          )
          data = result.data
          if (order.email && finalAmount > 0) {
            try {
              const { subject, html, text, resendTemplate } =
                refundConfirmationEmail(order, finalAmount, record.items)
              await sendMail({
                to: order.email,
                subject,
                html,
                text,
                resendTemplate,
              })
              const adminEmail = adminRefundEmail(order, finalAmount)
              notifyOwner({
                subject: adminEmail.subject,
                html: adminEmail.html,
                text: adminEmail.text,
                resendTemplate: adminEmail.resendTemplate,
                customerEmail: order.email,
              }).catch(() => {})
            } catch (refundEmailErr) {
              console.error(
                `[order receive-return] refund confirmation email failed for ${id}:`,
                refundEmailErr,
              )
            }
          }
        } catch (returnErr: any) {
          return NextResponse.json(
            { error: returnErr.message ?? 'Failed to refund return' },
            { status: 400 },
          )
        }
        break
      }
      case 'reject-return': {
        const { returnId, note } = body as {
          returnId?: string
          note?: string
        }
        if (!returnId) {
          return NextResponse.json(
            {
              error: 'returnId is required',
            },
            {
              status: 400,
            },
          )
        }
        try {
          const order = await getOrderForReturn(id, fetcher)
          const existing = (order.metadata?.returns ?? []).find(
            (r: any) => r.id === returnId,
          )
          if (existing && existing.status === 'refunded') {
            return NextResponse.json(
              { error: 'This return was already refunded' },
              { status: 400 },
            )
          }
          if (existing && existing.status === 'rejected') {
            return NextResponse.json(
              { error: 'This return was already rejected' },
              { status: 400 },
            )
          }
          const result = await updateReturnRecord(
            id,
            order,
            returnId,
            {
              status: 'rejected',
              note,
              processed_at: new Date().toISOString(),
            },
            fetcher,
            actor,
          )
          data = result.data
          if (order.email) {
            try {
              const { subject, html, text, resendTemplate } =
                returnDeclinedEmail(order, { note })
              await sendMail({
                to: order.email,
                subject,
                html,
                text,
                resendTemplate,
              })
            } catch (declineEmailErr) {
              console.error(
                `[order reject-return] decline email failed for ${id}:`,
                declineEmailErr,
              )
            }
          }
        } catch (returnErr: any) {
          return NextResponse.json(
            {
              error: returnErr.message ?? 'Failed to reject return',
            },
            {
              status: 400,
            },
          )
        }
        break
      }
      default:
        return NextResponse.json(
          {
            error: `Unknown action: ${action}`,
          },
          {
            status: 400,
          },
        )
    }
    return NextResponse.json(data)
  } catch (err: any) {
    console.error(`[order PATCH] unexpected error for ${id}:`, err)
    return NextResponse.json(
      {
        error: err.message,
      },
      {
        status: 500,
      },
    )
  }
}
