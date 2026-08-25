import 'server-only';
type Fetcher = (path: string, init?: RequestInit) => Promise<Response>;
async function readJson(res: Response) {
  return res.json().catch(() => ({}));
}
export async function markOrderDelivered(orderId: string, fetcher: Fetcher) {
  const orderRes = await fetcher(`/admin/orders/${orderId}?fields=id,fulfillment_status,*fulfillments`);
  const orderData = await readJson(orderRes);
  if (!orderRes.ok) {
    throw new Error(orderData?.message ?? `Failed to load order (${orderRes.status})`);
  }
  const order = orderData.order;
  if (!order) throw new Error('Order not found');
  if (order.fulfillment_status === 'delivered' || order.fulfillment_status === 'partially_delivered') {
    return {
      alreadyDelivered: true,
      order
    };
  }
  if (!order.fulfillment_status || order.fulfillment_status === 'not_fulfilled' || order.fulfillment_status === 'canceled') {
    throw new Error('Order must be fulfilled before it can be marked as delivered.');
  }
  const fulfillments = (order.fulfillments ?? []).filter((f: any) => !f.canceled_at && !f.delivered_at);
  if (fulfillments.length === 0) {
    throw new Error('No active fulfillment found on this order to mark as delivered.');
  }
  const results = [];
  for (const f of fulfillments) {
    const deliverRes = await fetcher(`/admin/orders/${orderId}/fulfillments/${f.id}/mark-as-delivered`, {
      method: 'POST'
    });
    const deliverData = await readJson(deliverRes);
    if (!deliverRes.ok) {
      throw new Error(deliverData?.message ?? `Failed to mark fulfillment ${f.id} as delivered (${deliverRes.status})`);
    }
    results.push(deliverData);
  }
  return {
    alreadyDelivered: false,
    results
  };
}
export async function shipOrder(orderId: string, fetcher: Fetcher) {
  const orderRes = await fetcher(`/admin/orders/${orderId}?fields=id,fulfillment_status,*fulfillments`);
  const orderData = await readJson(orderRes);
  if (!orderRes.ok) {
    throw new Error(orderData?.message ?? `Failed to load order (${orderRes.status})`);
  }
  const order = orderData.order;
  if (!order) throw new Error('Order not found');
  if (order.fulfillment_status === 'shipped' || order.fulfillment_status === 'partially_shipped') {
    return {
      alreadyShipped: true,
      order
    };
  }
  if (order.fulfillment_status === 'delivered' || order.fulfillment_status === 'partially_delivered') {
    throw new Error('Order has already been delivered.');
  }
  if (!order.fulfillment_status || order.fulfillment_status === 'not_fulfilled' || order.fulfillment_status === 'canceled') {
    throw new Error('Order must be marked as fulfilled/ready before it can be dispatched.');
  }
  const fulfillments = (order.fulfillments ?? []).filter((f: any) => !f.canceled_at && !f.shipped_at && !f.delivered_at);
  if (fulfillments.length === 0) {
    throw new Error('No active fulfillment found on this order to dispatch.');
  }
  const results = [];
  for (const f of fulfillments) {
    const shipRes = await fetcher(`/admin/orders/${orderId}/fulfillments/${f.id}/shipment`, {
      method: 'POST',
      body: JSON.stringify({})
    });
    const shipData = await readJson(shipRes);
    if (!shipRes.ok) {
      throw new Error(shipData?.message ?? `Failed to dispatch fulfillment ${f.id} (${shipRes.status})`);
    }
    results.push(shipData);
  }
  return {
    alreadyShipped: false,
    results
  };
}
export async function fulfillOrder(orderId: string, fetcher: Fetcher, markDelivered = false) {
  const orderRes = await fetcher(`/admin/orders/${orderId}?fields=id,fulfillment_status,*items`);
  const orderData = await readJson(orderRes);
  if (!orderRes.ok) {
    throw new Error(orderData?.message ?? `Failed to load order (${orderRes.status})`);
  }
  const order = orderData.order;
  if (!order) throw new Error('Order not found');
  if (order.fulfillment_status && order.fulfillment_status !== 'not_fulfilled' && order.fulfillment_status !== 'partially_fulfilled') {
    return {
      alreadyFulfilled: true,
      order
    };
  }
  const items = (order.items ?? []).map((item: any) => ({
    id: item.id,
    quantity: item.quantity
  }));
  if (items.length === 0) {
    throw new Error('Order has no items to fulfill');
  }
  const locRes = await fetcher('/admin/stock-locations?limit=1');
  const locData = await readJson(locRes);
  const locationId = locData?.stock_locations?.[0]?.id;
  if (!locationId) {
    throw new Error('No stock location found. Add one in Medusa → Settings → Locations before fulfilling orders.');
  }
  const fulfillRes = await fetcher(`/admin/orders/${orderId}/fulfillments`, {
    method: 'POST',
    body: JSON.stringify({
      location_id: locationId,
      items
    })
  });
  const fulfillData = await readJson(fulfillRes);
  if (!fulfillRes.ok) {
    throw new Error(fulfillData?.message ?? `Fulfillment failed (${fulfillRes.status})`);
  }
  let deliverError: string | undefined;
  if (markDelivered) {
    const freshRes = await fetcher(`/admin/orders/${orderId}?fields=id,fulfillment_status,*fulfillments`);
    const freshData = await readJson(freshRes);
    const activeFulfillments = (freshData?.order?.fulfillments ?? []).filter((f: any) => !f.canceled_at && !f.delivered_at);
    activeFulfillments.sort((a: any, b: any) => new Date(b.created_at ?? 0).getTime() - new Date(a.created_at ?? 0).getTime());
    const fulfillmentId = activeFulfillments[0]?.id;
    if (fulfillmentId) {
      const deliverRes = await fetcher(`/admin/orders/${orderId}/fulfillments/${fulfillmentId}/mark-as-delivered`, {
        method: 'POST'
      });
      if (!deliverRes.ok) {
        const deliverData = await readJson(deliverRes);
        deliverError = deliverData?.message ?? `Failed to mark fulfillment as delivered (${deliverRes.status})`;
        console.warn(`[fulfillOrder] mark-as-delivered failed for fulfillment ${fulfillmentId}:`, deliverError);
      }
    } else {
      deliverError = 'Order was fulfilled, but no active fulfillment was found to mark as delivered.';
      console.warn(`[fulfillOrder] markDelivered=true but no active fulfillment found for order ${orderId}`);
    }
  }
  return {
    alreadyFulfilled: false,
    fulfillment: fulfillData,
    deliverError
  };
}
