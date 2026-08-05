// lib/order-status.ts
//
// Medusa v2's `order.status` is only ever one of:
//   pending | completed | archived | canceled | requires_action
// It has NO concept of confirmed/processing/shipped/delivered/refunded —
// those are derived from `fulfillment_status` and `payment_status` instead.
//
// The dashboard's Orders list/tabs (OrdersTable, app/dashboard/orders/page.tsx)
// use a Shopify-style lifecycle: pending → confirmed → processing → shipped →
// delivered, with cancelled/refunded as terminal branches. Previously the code
// passed Medusa's raw `status` straight through, so an order sitting at
// Medusa status "completed" (payment captured, awaiting fulfillment) never
// matched any tab except nothing — "Confirmed" always showed 0 even though
// the order list badge itself displayed "Completed".
//
// This function bridges the two models so every order lands in exactly one
// of the tabs the UI actually offers.
export type DisplayOrderStatus =
  | 'pending'
  | 'confirmed'
  | 'processing'
  | 'shipped'
  | 'delivered'
  | 'cancelled'
  | 'refunded'

export function getDisplayOrderStatus(o: {
  status?: string | null
  fulfillment_status?: string | null
  payment_status?: string | null
  metadata?: { fulfillment_type?: string | null; source?: string | null } | null
}): DisplayOrderStatus {
  const status = o.status ?? ''
  const fulfillment = o.fulfillment_status ?? ''
  const payment = o.payment_status ?? ''
  // POS "pickup" sales are handed to the customer in person the instant
  // they're rung up — there's no separate shipping/delivery step for them
  // to progress through. Once Medusa marks the fulfillment as created,
  // the sale is already complete, so this should read "Delivered", not
  // "Processing" (which implies a shipment is still on the way). Only
  // POS "ship" sales (deliver to an address, courier confirms later) and
  // website orders keep the full processing → shipped → delivered path.
  const isPickup = o.metadata?.fulfillment_type === 'pickup'

  if (status === 'canceled' || fulfillment === 'canceled') return 'cancelled'
  if (payment === 'refunded' || payment === 'partially_refunded') return 'refunded'
  if (fulfillment === 'delivered' || fulfillment === 'partially_delivered') return 'delivered'
  if (isPickup && (fulfillment === 'fulfilled' || fulfillment === 'partially_fulfilled')) return 'delivered'
  if (fulfillment === 'shipped' || fulfillment === 'partially_shipped') return 'shipped'
  if (fulfillment === 'fulfilled' || fulfillment === 'partially_fulfilled') return 'processing'
  if (status === 'completed') return 'confirmed'
  // pending, requires_action, archived, or anything unrecognised — treat as
  // still needing attention rather than silently dropping it from every tab.
  return 'pending'
}
