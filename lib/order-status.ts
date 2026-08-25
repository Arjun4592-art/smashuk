export type DisplayOrderStatus = 'pending' | 'confirmed' | 'processing' | 'shipped' | 'delivered' | 'cancelled' | 'refunded';
export function getDisplayOrderStatus(o: {
  status?: string | null;
  fulfillment_status?: string | null;
  payment_status?: string | null;
  metadata?: {
    fulfillment_type?: string | null;
    source?: string | null;
  } | null;
}): DisplayOrderStatus {
  const status = o.status ?? '';
  const fulfillment = o.fulfillment_status ?? '';
  const payment = o.payment_status ?? '';
  const isPickup = o.metadata?.fulfillment_type === 'pickup';
  if (status === 'canceled' || fulfillment === 'canceled') return 'cancelled';
  if (payment === 'refunded' || payment === 'partially_refunded') return 'refunded';
  if (fulfillment === 'delivered' || fulfillment === 'partially_delivered') return 'delivered';
  if (isPickup && (fulfillment === 'fulfilled' || fulfillment === 'partially_fulfilled')) return 'delivered';
  if (fulfillment === 'shipped' || fulfillment === 'partially_shipped') return 'shipped';
  if (fulfillment === 'fulfilled' || fulfillment === 'partially_fulfilled') return 'processing';
  if (status === 'completed') return 'confirmed';
  return 'pending';
}
