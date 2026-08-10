// app/api/admin/orders/[id]/route.ts
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
} from '@/lib/api/medusa-returns'
import { randomUUID } from 'crypto'

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  // SECURITY: exposes full order details incl. customer PII, address, and
  // payment info — must require a logged-in admin session.
  const authHeaderRaw = await getAdminAuthHeader(req)
  if (!authHeaderRaw) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  // Narrowed to a definite `string` here so the nested fetchOrder() closure
  // below doesn't lose the null-check (TS can't carry narrowing of an outer
  // const across a nested function declaration boundary).
  const authHeader: string = authHeaderRaw

  const { id } = await params
  try {
    // BUG FIX: this used to call medusaAdmin.admin.order.retrieve(...) via
    // the SDK with a wide `fields` expansion (including `*sales_channel`,
    // which isn't a valid expandable relation on an order in this Medusa
    // version). That made Medusa fall back to its generic, unclassified
    // "An unknown error occurred" message — which the SDK then re-threw
    // with no further detail, so the dashboard just showed that opaque
    // string with nothing to debug from.
    //
    // Switching to a direct REST call with a trimmed, known-valid fields
    // list avoids the bad expansion, and on failure we now log + return
    // Medusa's actual response body instead of swallowing it.
    // BUG FIX: still getting "Medusa error (500): An unknown error occurred"
    // even after removing `*sales_channel`. Checked what the order detail
    // page (app/dashboard/orders/[id]/page.tsx) actually reads — it never
    // touches fulfillments, shipping_methods, or billing_address at all,
    // and only reads a few specific fields off customer/shipping_address
    // (first_name, last_name, phone / address_1, address_2, city,
    // province, postal_code, country_code). The old fields list star-
    // expanded ALL of those anyway (*fulfillments, *shipping_methods,
    // *billing_address, *customer, *shipping_address) for no UI benefit,
    // and one or more of those relation names isn't valid to star-expand
    // on an order in this Medusa version — same failure mode as
    // `*sales_channel` before. Dropped the ones the page doesn't use, and
    // replaced *customer / *shipping_address with the specific dotted
    // fields the page needs (the same safe "no star" pattern already
    // working in app/api/admin/analytics/route.ts's `shipping_address.city`).
    // BUG FIX: the actual Medusa server log (not just the opaque "unknown
    // error occurred" the SDK/proxy surfaced) finally showed the real
    // cause: "Entity 'Order' does not have property 'payments'". In this
    // Medusa v2 version, payments are NOT a direct relation on Order —
    // they live under `payment_collections[].payments[]`. `*payments`
    // was invalid the whole time (the `*items` / `*items.variant.product`
    // fix in the previous pass was real too, but this was the actual
    // remaining cause of the 500). Switched to the correct nested
    // expansion and flatten it to `order.payments` right before
    // responding, so the dashboard UI and every other route that reads
    // `order.payments` doesn't need to change at all.
    const FIELDS =
      '*items,*payment_collections.payments,fulfillment_status,' +
      'subtotal,total,discount_total,shipping_total,tax_total,' +
      'customer.first_name,customer.last_name,customer.phone,' +
      'shipping_address.address_1,shipping_address.address_2,shipping_address.city,' +
      'shipping_address.province,shipping_address.postal_code,shipping_address.country_code'
    // Even more minimal fallback — if Medusa still rejects the above for
    // any reason, retry with only the relation proven to work elsewhere
    // in this app (medusa-fulfillment.ts uses `*items` safely) so the
    // page can at least render items/total/status instead of a hard 500.
    const FALLBACK_FIELDS =
      '*items,*payment_collections.payments,fulfillment_status,' +
      'subtotal,total,discount_total,shipping_total,tax_total'

    async function fetchOrder(fields: string) {
      const url = new URL(`/admin/orders/${id}`, MEDUSA_URL)
      url.searchParams.set('fields', fields)
      const r = await fetch(url.toString(), {
        headers: { Authorization: authHeader },
      })
      const t = await r.text()
      return { ok: r.ok, status: r.status, text: t }
    }

    let { ok, status, text } = await fetchOrder(FIELDS)
    if (!ok) {
      console.error(
        `[order GET] Medusa ${status} for ${id} with full fields:`,
        text.slice(0, 500),
      )
      ;({ ok, status, text } = await fetchOrder(FALLBACK_FIELDS))
    }
    const res = { ok, status } as { ok: boolean; status: number }
    if (!res.ok) {
      console.error(
        `[order GET] Medusa ${res.status} for ${id}:`,
        text.slice(0, 500),
      )
      let detail = text
      try {
        const parsed = JSON.parse(text)
        detail = parsed.message ?? parsed.error ?? text
      } catch {
        /* not JSON — use raw text */
      }
      return NextResponse.json(
        {
          error: `Medusa error (${res.status}): ${detail.slice(0, 300) || 'empty response'}`,
        },
        { status: res.status },
      )
    }
    const parsed = JSON.parse(text)
    if (parsed?.order) {
      parsed.order.payments = (parsed.order.payment_collections ?? []).flatMap(
        (pc: any) => pc.payments ?? [],
      )
    }
    return NextResponse.json(parsed)
  } catch (err: any) {
    console.error(`[order GET] unexpected error for ${id}:`, err)
    return NextResponse.json(
      { error: err.message || 'Failed to load order — check server logs' },
      { status: 500 },
    )
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  // SECURITY: allows confirming/cancelling/archiving/fulfilling any order —
  // must require a logged-in admin session.
  const authHeader = await getAdminAuthHeader(req)
  if (!authHeader) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
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

  // For activity logging on return actions below — who's making the
  // change (see the 'return' bug: this action was never actually logged).
  const identity = getSurfaceIdentity(req, 'dashboard')
  const actor = identity?.userId
    ? { staffId: identity.userId, surface: 'dashboard' as const }
    : undefined

  try {
    const body = await req.json()
    const { action } = body

    // BUG FIX: confirm/cancel/archive previously went through the *static*
    // `medusaAdmin` SDK client, which authenticates with
    // MEDUSA_ADMIN_API_KEY — unset for normal dashboard logins, so every
    // one of these actions silently failed. Switched to the same
    // authenticated-fetch pattern every other admin route uses.
    let data: any
    switch (action) {
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
            { status: res.status },
          )
        }
        break
      }
      case 'cancel': {
        const res = await fetcher(`/admin/orders/${id}/cancel`, {
          method: 'POST',
        })
        data = await res.json().catch(() => ({}))
        if (!res.ok) {
          return NextResponse.json(
            {
              error: data?.message ?? `Failed to cancel order (${res.status})`,
            },
            { status: res.status },
          )
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
            { status: res.status },
          )
        }
        break
      }
      case 'fulfill': {
        // This is the action that was missing entirely — the one that
        // actually creates a Medusa fulfillment and flips "Not fulfilled"
        // to "Fulfilled" in the Medusa admin. See lib/api/medusa-fulfillment.ts
        // for the full explanation of why this never happened before.
        try {
          data = await fulfillOrder(id, fetcher)
        } catch (fulfillErr: any) {
          return NextResponse.json(
            { error: fulfillErr.message ?? 'Failed to fulfill order' },
            { status: 400 },
          )
        }

        // COD / Bank Transfer (pp_system_default) website orders: cash is
        // only actually collected once the item ships, so capture the
        // payment here — the moment the order is marked Fulfilled/Shipped
        // — instead of at order placement. POS sales are excluded on
        // purpose: cash there is taken at the counter at sale time, and
        // capture for POS is a deliberate manual step from this dashboard
        // (see the 'capture' action below) rather than automatic.
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
                { method: 'POST' },
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
          // Non-fatal — the order is fulfilled either way; a failed
          // capture just means it stays "Authorized" until captured
          // manually (via the 'capture' action or Medusa Admin directly).
          console.error(
            `[order fulfill] post-fulfill capture step failed for ${id}:`,
            captureErr,
          )
        }
        break
      }
      case 'ship': {
        // "Dispatch" — moves a ready/fulfilled home-delivery order to
        // Medusa's 'shipped' fulfillment state (the leg that was missing
        // entirely — see shipOrder's doc comment in medusa-fulfillment.ts).
        // Used by both the dashboard order page and the POS order page,
        // since both go through this same route.
        try {
          data = await shipOrder(id, fetcher)
        } catch (shipErr: any) {
          return NextResponse.json(
            { error: shipErr.message ?? 'Failed to dispatch order' },
            { status: 400 },
          )
        }
        break
      }
      case 'deliver': {
        // The action that was completely missing: nothing anywhere in
        // this app could ever move an order from "fulfilled" to
        // "delivered" except the two narrow POS pickup auto-flows (see
        // markOrderDelivered's doc comment in medusa-fulfillment.ts).
        // Website COD/ship orders and any order fulfilled from this
        // dashboard's "Mark as Fulfilled" button had no way forward at
        // all — this gives staff a manual "Mark as Delivered" step for
        // any order that's already fulfilled/shipped.
        try {
          data = await markOrderDelivered(id, fetcher)
        } catch (deliverErr: any) {
          return NextResponse.json(
            {
              error: deliverErr.message ?? 'Failed to mark order as delivered',
            },
            { status: 400 },
          )
        }
        break
      }
      case 'capture': {
        // Manual capture for cash/in-person sales (POS) — the cashier
        // already collected the money at the counter, so this is a
        // deliberate admin action from this dashboard rather than
        // something that happens automatically on order creation.
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
            { error: 'No uncaptured payment found on this order.' },
            { status: 400 },
          )
        }
        for (const payment of uncaptured) {
          const capRes = await fetcher(
            `/admin/payments/${payment.id}/capture`,
            { method: 'POST' },
          )
          const capData = await capRes.json().catch(() => ({}))
          if (!capRes.ok) {
            return NextResponse.json(
              {
                error:
                  capData?.message ??
                  `Failed to capture payment ${payment.id} (${capRes.status})`,
              },
              { status: capRes.status },
            )
          }
        }
        data = { captured: true }
        break
      }
      // Staff-initiated return: picks items + reason from the dashboard
      // and refunds immediately (no separate approval step needed since
      // a staff member is doing it directly).
      case 'return': {
        const { items, reason, note } = body as {
          items?: { item_id: string; quantity: number }[]
          reason?: string
          note?: string
        }
        try {
          const order = await getOrderForReturn(id, fetcher)
          const { items: builtItems, refund_amount } = buildReturnLines(
            order,
            items ?? [],
          )
          await refundOrderAmount(order, refund_amount, fetcher)
          data = await appendReturnRecord(
            id,
            order,
            {
              id: randomUUID(),
              items: builtItems,
              reason: reason || 'Other',
              note,
              refund_amount,
              status: 'refunded',
              source: 'dashboard',
              requested_at: new Date().toISOString(),
              processed_at: new Date().toISOString(),
            },
            fetcher,
            {},
            actor,
          )
        } catch (returnErr: any) {
          return NextResponse.json(
            { error: returnErr.message ?? 'Failed to process return' },
            { status: 400 },
          )
        }
        break
      }
      // Approves a return the customer requested from their account —
      // refunds it and marks the record 'refunded'.
      case 'approve-return': {
        const { returnId } = body as { returnId?: string }
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
              { error: 'Return request not found' },
              { status: 404 },
            )
          }
          if (record.status !== 'requested') {
            return NextResponse.json(
              { error: 'Return already processed' },
              { status: 400 },
            )
          }
          await refundOrderAmount(order, record.refund_amount, fetcher)
          const result = await updateReturnRecord(
            id,
            order,
            returnId,
            { status: 'refunded', processed_at: new Date().toISOString() },
            fetcher,
            actor,
          )
          data = result.data
        } catch (returnErr: any) {
          return NextResponse.json(
            { error: returnErr.message ?? 'Failed to approve return' },
            { status: 400 },
          )
        }
        break
      }
      // Declines a customer's return request — no refund is issued.
      case 'reject-return': {
        const { returnId, note } = body as { returnId?: string; note?: string }
        if (!returnId) {
          return NextResponse.json(
            { error: 'returnId is required' },
            { status: 400 },
          )
        }
        try {
          const order = await getOrderForReturn(id, fetcher)
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
        } catch (returnErr: any) {
          return NextResponse.json(
            { error: returnErr.message ?? 'Failed to reject return' },
            { status: 400 },
          )
        }
        break
      }
      default:
        return NextResponse.json(
          { error: `Unknown action: ${action}` },
          { status: 400 },
        )
    }

    return NextResponse.json(data)
  } catch (err: any) {
    console.error(`[order PATCH] unexpected error for ${id}:`, err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
