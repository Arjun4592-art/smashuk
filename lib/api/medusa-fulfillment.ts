// lib/api/medusa-fulfillment.ts
//
// SERVER-ONLY. Creates a real Medusa fulfillment for an order — the one
// step that actually flips "Not fulfilled" → "Fulfilled" in Medusa's own
// admin (localhost:9000) and in the dashboard's order list.
//
// ROOT CAUSE OF THE "fulfillment never updates" BUG: nowhere in this app
// did anything ever call Medusa's fulfillment-creation endpoint
// (POST /admin/orders/:id/fulfillments).
//   - The dashboard's order actions were only ever confirm / cancel /
//     archive — none of those touch fulfillment_status at all.
//   - POS pickup orders (customer takes the item at the counter, so
//     logically "fulfilled" the moment they walk out) only ever wrote
//     metadata.fulfillment_type = 'pickup' — a label the POS UI could
//     read back, but Medusa itself never saw a fulfillment record, so its
//     real fulfillment_status stayed "not_fulfilled" forever. That's why
//     it looked "updated" in POS but never changed in the Medusa admin.
//
// This helper is shared by:
//  - app/api/admin/orders/[id]/route.ts  (dashboard "Mark as Fulfilled")
//  - app/api/pos/orders/route.ts         (auto-fulfill on pickup)

import 'server-only'

type Fetcher = (path: string, init?: RequestInit) => Promise<Response>

async function readJson(res: Response) {
  return res.json().catch(() => ({}))
}

// ── markOrderDelivered ──────────────────────────────────────────────────
//
// Advances an order that's ALREADY fulfilled (fulfillment_status
// 'fulfilled'/'partially_fulfilled'/'shipped'/'partially_shipped') the
// rest of the way to 'delivered'.
//
// ROOT CAUSE this fixes: fulfillOrder() below could only ever reach
// "delivered" as a side-effect of creating a fulfillment for the FIRST
// time (its `markDelivered` flag), and only two call-sites ever passed
// that flag (POS cash-pickup auto-fulfill, and the POS order-lookup
// hand-over action). Every other path — the dashboard's "Mark as
// Fulfilled" button, and website COD/ship orders fulfilled from the
// dashboard — had NO way to ever move an order from "fulfilled" to
// "delivered" again, manually or automatically. Once an order landed on
// "fulfilled" it was stuck there forever unless someone edited it
// directly in the Medusa admin. This is the function that fills that
// gap: given an order that already has a fulfillment, find it and mark
// it delivered.
export async function markOrderDelivered(orderId: string, fetcher: Fetcher) {
  const orderRes = await fetcher(
    `/admin/orders/${orderId}?fields=id,fulfillment_status,*fulfillments`,
  )
  const orderData = await readJson(orderRes)
  if (!orderRes.ok) {
    throw new Error(orderData?.message ?? `Failed to load order (${orderRes.status})`)
  }
  const order = orderData.order
  if (!order) throw new Error('Order not found')

  if (order.fulfillment_status === 'delivered' || order.fulfillment_status === 'partially_delivered') {
    return { alreadyDelivered: true, order }
  }

  if (
    !order.fulfillment_status ||
    order.fulfillment_status === 'not_fulfilled' ||
    order.fulfillment_status === 'canceled'
  ) {
    throw new Error('Order must be fulfilled before it can be marked as delivered.')
  }

  const fulfillments = (order.fulfillments ?? []).filter((f: any) => !f.canceled_at && !f.delivered_at)
  if (fulfillments.length === 0) {
    throw new Error('No active fulfillment found on this order to mark as delivered.')
  }

  const results = []
  for (const f of fulfillments) {
    const deliverRes = await fetcher(
      `/admin/orders/${orderId}/fulfillments/${f.id}/mark-as-delivered`,
      { method: 'POST' },
    )
    const deliverData = await readJson(deliverRes)
    if (!deliverRes.ok) {
      throw new Error(
        deliverData?.message ?? `Failed to mark fulfillment ${f.id} as delivered (${deliverRes.status})`,
      )
    }
    results.push(deliverData)
  }

  return { alreadyDelivered: false, results }
}

// ── shipOrder (Dispatch) ─────────────────────────────────────────────────
//
// The step that was completely missing: nothing anywhere in this app ever
// called Medusa's "create shipment" endpoint, so an order could only ever
// be 'not_fulfilled' → 'fulfilled' (packed/ready) → 'delivered' — ready
// straight to delivered, with no "left the store / handed to courier" leg
// in between. Medusa's own fulfillment model already has a distinct
// 'shipped' state (see order.fulfillment_status and lib/order-status.ts,
// which already maps it to the 'shipped' tab) — this just actually fires
// the endpoint that puts an order into it.
//
// Only meaningful for home-delivery orders. Store-pickup orders skip this
// leg entirely (see getPickupSteps() in app/api/store/tracking/route.ts) —
// there's no courier for an order the customer collects in person, so the
// dashboard/POS UIs only show this button for non-pickup orders.
export async function shipOrder(orderId: string, fetcher: Fetcher) {
  const orderRes = await fetcher(
    `/admin/orders/${orderId}?fields=id,fulfillment_status,*fulfillments`,
  )
  const orderData = await readJson(orderRes)
  if (!orderRes.ok) {
    throw new Error(orderData?.message ?? `Failed to load order (${orderRes.status})`)
  }
  const order = orderData.order
  if (!order) throw new Error('Order not found')

  if (order.fulfillment_status === 'shipped' || order.fulfillment_status === 'partially_shipped') {
    return { alreadyShipped: true, order }
  }
  if (order.fulfillment_status === 'delivered' || order.fulfillment_status === 'partially_delivered') {
    throw new Error('Order has already been delivered.')
  }
  if (
    !order.fulfillment_status ||
    order.fulfillment_status === 'not_fulfilled' ||
    order.fulfillment_status === 'canceled'
  ) {
    throw new Error('Order must be marked as fulfilled/ready before it can be dispatched.')
  }

  const fulfillments = (order.fulfillments ?? []).filter(
    (f: any) => !f.canceled_at && !f.shipped_at && !f.delivered_at,
  )
  if (fulfillments.length === 0) {
    throw new Error('No active fulfillment found on this order to dispatch.')
  }

  const results = []
  for (const f of fulfillments) {
    const shipRes = await fetcher(
      `/admin/orders/${orderId}/fulfillments/${f.id}/shipment`,
      { method: 'POST', body: JSON.stringify({}) },
    )
    const shipData = await readJson(shipRes)
    if (!shipRes.ok) {
      throw new Error(
        shipData?.message ?? `Failed to dispatch fulfillment ${f.id} (${shipRes.status})`,
      )
    }
    results.push(shipData)
  }

  return { alreadyShipped: false, results }
}

export async function fulfillOrder(
  orderId: string,
  fetcher: Fetcher,
  markDelivered = false,
) {
  // 1) Load the order's items + current fulfillment status
  const orderRes = await fetcher(
    `/admin/orders/${orderId}?fields=id,fulfillment_status,*items`,
  )
  const orderData = await readJson(orderRes)
  if (!orderRes.ok) {
    throw new Error(
      orderData?.message ?? `Failed to load order (${orderRes.status})`,
    )
  }
  const order = orderData.order
  if (!order) throw new Error('Order not found')

  if (
    order.fulfillment_status &&
    order.fulfillment_status !== 'not_fulfilled' &&
    order.fulfillment_status !== 'partially_fulfilled'
  ) {
    // Already fulfilled/shipped/delivered — nothing to do.
    return { alreadyFulfilled: true, order }
  }

  const items = (order.items ?? []).map((item: any) => ({
    id: item.id,
    quantity: item.quantity,
  }))
  if (items.length === 0) {
    throw new Error('Order has no items to fulfill')
  }

  // 2) Fulfillments require a stock location — grab the first one, same
  // pattern used by app/api/admin/inventory/adjust/route.ts.
  const locRes = await fetcher('/admin/stock-locations?limit=1')
  const locData = await readJson(locRes)
  const locationId = locData?.stock_locations?.[0]?.id
  if (!locationId) {
    throw new Error(
      'No stock location found. Add one in Medusa → Settings → Locations before fulfilling orders.',
    )
  }

  // 3) Create the actual fulfillment
  const fulfillRes = await fetcher(`/admin/orders/${orderId}/fulfillments`, {
    method: 'POST',
    body: JSON.stringify({ location_id: locationId, items }),
  })
  const fulfillData = await readJson(fulfillRes)
  if (!fulfillRes.ok) {
    throw new Error(
      fulfillData?.message ?? `Fulfillment failed (${fulfillRes.status})`,
    )
  }

  let deliverError: string | undefined

  // For POS pickup orders — customer already has the item in hand at the
  // counter the moment the sale is rung up. So after creating the fulfillment
  // (fulfilled), immediately mark it as delivered too, so Medusa's own
  // fulfillment_status flips all the way to "delivered" rather than stopping
  // at "fulfilled". This is what makes the dashboard show "Delivered" instead
  // of "Processing" for POS pickup orders without relying on metadata alone.
  if (markDelivered) {
    // BUG FIX: `POST /admin/orders/:id/fulfillments` returns `{ order }`,
    // NOT `{ fulfillment }` — so `fulfillData.fulfillment?.id` was always
    // undefined, and the fallback `fulfillData.order?.fulfillments?.[0]?.id`
    // just grabbed whatever fulfillment happened to sit at array index 0.
    // For any order with more than one fulfillment record (a prior return/
    // exchange, a partial fulfillment, etc.) that's not reliably the one
    // that was just created — "mark-as-delivered" could silently succeed
    // against the WRONG fulfillment, leaving the real new one stuck at
    // "fulfilled"/"Awaiting pickup" in Medusa forever. Re-fetch the order's
    // fulfillments fresh and pick the most recently created ACTIVE one
    // (no canceled_at/delivered_at) instead of trusting array position.
    const freshRes = await fetcher(
      `/admin/orders/${orderId}?fields=id,fulfillment_status,*fulfillments`,
    )
    const freshData = await readJson(freshRes)
    const activeFulfillments = (freshData?.order?.fulfillments ?? []).filter(
      (f: any) => !f.canceled_at && !f.delivered_at,
    )
    activeFulfillments.sort(
      (a: any, b: any) =>
        new Date(b.created_at ?? 0).getTime() -
        new Date(a.created_at ?? 0).getTime(),
    )
    const fulfillmentId = activeFulfillments[0]?.id

    if (fulfillmentId) {
      const deliverRes = await fetcher(
        `/admin/orders/${orderId}/fulfillments/${fulfillmentId}/mark-as-delivered`,
        { method: 'POST' },
      )
      if (!deliverRes.ok) {
        // Non-fatal to the fulfillment itself (that part succeeded), but
        // no longer swallowed silently — surfaced back to the caller so
        // the POS UI can show staff a warning instead of a false "done".
        const deliverData = await readJson(deliverRes)
        deliverError =
          deliverData?.message ??
          `Failed to mark fulfillment as delivered (${deliverRes.status})`
        console.warn(
          `[fulfillOrder] mark-as-delivered failed for fulfillment ${fulfillmentId}:`,
          deliverError,
        )
      }
    } else {
      deliverError =
        'Order was fulfilled, but no active fulfillment was found to mark as delivered.'
      console.warn(
        `[fulfillOrder] markDelivered=true but no active fulfillment found for order ${orderId}`,
      )
    }
  }

  return { alreadyFulfilled: false, fulfillment: fulfillData, deliverError }
}