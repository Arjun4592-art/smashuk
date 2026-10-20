import 'server-only'
import { refundOrderAmount } from '@/lib/api/medusa-returns'

type Fetcher = (path: string, init?: RequestInit) => Promise<Response>

async function readJson(res: Response) {
  return res.json().catch(() => ({}))
}

/** Everything the flow rules need to look at, in one fetch. */
const FLOW_FIELDS = [
  'id',
  'display_id',
  'email',
  'status',
  'currency_code',
  'payment_status',
  'fulfillment_status',
  'metadata',
  '*items',
  'items.metadata',
  'items.total',
  'items.subtotal',
  'items.discount_total',
  'items.refundable_total',
  'items.refundable_total_per_unit',
  '*payment_collections.payments',
  '*fulfillments',
  'customer.first_name',
  'customer.last_name',
  'shipping_address.first_name',
].join(',')

/** Loads an order with the fields the flow rules need (payments flattened). */
export async function getFlowOrder(orderId: string, fetcher: Fetcher) {
  const res = await fetcher(`/admin/orders/${orderId}?fields=${FLOW_FIELDS}`)
  const data = await readJson(res)
  if (!res.ok || !data.order) {
    throw new Error(data?.message ?? `Order not found (${res.status})`)
  }
  const order = data.order
  order.payments = (order.payment_collections ?? []).flatMap(
    (pc: any) => pc.payments ?? [],
  )
  return order
}

export function hasMailInLines(order: any): boolean {
  return (order?.items ?? []).some(
    (i: any) =>
      i?.metadata?.mail_in === true || i?.metadata?.mail_in === 'true',
  )
}

/** Merge keys into the order metadata (keeps everything already there). */
export async function saveOrderMetadata(
  orderId: string,
  order: any,
  patch: Record<string, unknown>,
  fetcher: Fetcher,
) {
  const res = await fetcher(`/admin/orders/${orderId}`, {
    method: 'POST',
    body: JSON.stringify({ metadata: { ...(order.metadata ?? {}), ...patch } }),
  })
  if (!res.ok) {
    const err = await readJson(res)
    throw new Error(err.message ?? 'Failed to save the order')
  }
  return readJson(res)
}

/**
 * Cash / "pay in store" payments (the system default provider) are not
 * captured when the order is placed. Capture them when the order is
 * fulfilled, as the dashboard has always done.
 */
export async function captureOfflinePayments(
  orderId: string,
  fetcher: Fetcher,
) {
  try {
    const res = await fetcher(
      `/admin/orders/${orderId}?fields=metadata,*payment_collections.payments`,
    )
    const data = await readJson(res)
    const order = data?.order
    if (!order || order.metadata?.source === 'pos') return
    const payments = (order.payment_collections ?? []).flatMap(
      (pc: any) => pc.payments ?? [],
    )
    const uncaptured = payments.filter(
      (p: any) =>
        !p.captured_at &&
        p.status !== 'canceled' &&
        p.provider_id === 'pp_system_default',
    )
    for (const payment of uncaptured) {
      const capRes = await fetcher(`/admin/payments/${payment.id}/capture`, {
        method: 'POST',
      })
      if (!capRes.ok) {
        console.error(
          `[order-flow] capture failed for payment ${payment.id}:`,
          await capRes.text().catch(() => ''),
        )
      }
    }
  } catch (err) {
    console.error(`[order-flow] capture step failed for ${orderId}:`, err)
  }
}

/**
 * Refund everything still refundable on an order. Cash orders have no
 * card to refund, so staff hand the money back and `manual` is true.
 */
export async function refundWholeOrder(
  order: any,
  fetcher: Fetcher,
): Promise<{ amount: number; manual: boolean }> {
  const payments: any[] = order.payments ?? []
  const isCashOrder =
    order.metadata?.payment_method === 'cash' ||
    (payments.length > 0 &&
      payments.every(
        (p: any) => !p.provider_id || p.provider_id === 'pp_system_default',
      ))
  const refundable = payments.filter(
    (p: any) => p.captured_at && !p.canceled_at,
  )
  const total = refundable.reduce(
    (sum: number, p: any) =>
      sum + (p.amount - (p.refunded_amount ?? p.amount_refunded ?? 0)),
    0,
  )
  const amount = Math.round(total * 100) / 100
  if (amount <= 0) return { amount: 0, manual: false }
  if (isCashOrder) return { amount, manual: true }
  await refundOrderAmount(order, amount, fetcher)
  return { amount, manual: false }
}

/**
 * Best effort: release the stock of an order that has been refunded
 * before leaving the shop. Never throws - the refund has already happened.
 */
export async function cancelRefundedOrder(orderId: string, fetcher: Fetcher) {
  try {
    const res = await fetcher(
      `/admin/orders/${orderId}?fields=id,*fulfillments`,
    )
    const data = await readJson(res)
    for (const f of data?.order?.fulfillments ?? []) {
      if (f.canceled_at || f.shipped_at || f.delivered_at) continue
      const r = await fetcher(
        `/admin/orders/${orderId}/fulfillments/${f.id}/cancel`,
        { method: 'POST', body: JSON.stringify({}) },
      )
      if (!r.ok) {
        console.warn(
          `[order-flow] could not cancel fulfillment ${f.id} on ${orderId}:`,
          await r.text().catch(() => ''),
        )
      }
    }
    const cancelRes = await fetcher(`/admin/orders/${orderId}/cancel`, {
      method: 'POST',
    })
    if (!cancelRes.ok) {
      console.warn(
        `[order-flow] order ${orderId} refunded but could not be cancelled:`,
        await cancelRes.text().catch(() => ''),
      )
    }
  } catch (err) {
    console.warn(`[order-flow] cancel after refund failed for ${orderId}:`, err)
  }
}
