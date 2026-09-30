import { medusaServiceFetch } from '@/lib/api/medusa-service-token'
import { CONTACT_PHONE, CONTACT_EMAIL, SITE_NAME } from '@/lib/constants'
import { safeJson } from '@/lib/api/safe-json'

function activeFulfillment(order: any) {
  const list: any[] = order.fulfillments ?? []
  return list.find((f) => !f.canceled_at) ?? list[0]
}

export function getTrackingSteps(order: any) {
  const fulfillment = activeFulfillment(order)
  const fd = fulfillment?.data ?? {}
  const status = order.fulfillment_status ?? order.status ?? 'pending'
  const paymentStatus = order.payment_status ?? 'pending'
  return [
    {
      id: 'placed',
      label: 'Order Placed',
      description: 'Your order has been received',
      icon: '📦',
      done: true,
      date: order.created_at,
    },
    {
      id: 'confirmed',
      label: 'Payment Confirmed',
      description: 'Payment successfully processed',
      icon: '✅',
      done: ['captured', 'partially_refunded'].includes(paymentStatus),
      date: paymentStatus === 'captured' ? order.updated_at : null,
    },
    {
      id: 'processing',
      label: 'Processing',
      description: 'Your order is being prepared',
      icon: '⚙️',
      done: [
        'fulfilled',
        'partially_fulfilled',
        'shipped',
        'partially_shipped',
        'delivered',
        'partially_delivered',
      ].includes(status),
      date: null,
    },
    {
      id: 'shipped',
      label: 'Dispatched',
      description: 'Your order is on its way',
      icon: '🚚',
      done: [
        'shipped',
        'partially_shipped',
        'delivered',
        'partially_delivered',
      ].includes(status),
      date: fd.courier_collected_at ?? fulfillment?.shipped_at ?? null,
    },
    {
      id: 'delivered',
      label: 'Delivered',
      description: 'Order delivered successfully',
      icon: '🎉',
      done: ['delivered', 'partially_delivered'].includes(status),
      date: fd.courier_delivered_at ?? fulfillment?.delivered_at ?? null,
    },
  ]
}

export function getPickupSteps(order: any) {
  const status = order.fulfillment_status ?? order.status ?? 'pending'
  const paymentStatus = order.payment_status ?? 'pending'
  return [
    {
      id: 'placed',
      label: 'Order Placed',
      description: 'Your order has been received',
      icon: '📦',
      done: true,
      date: order.created_at,
    },
    {
      id: 'confirmed',
      label: 'Payment Confirmed',
      description: 'Payment successfully processed',
      icon: '✅',
      done: ['captured', 'partially_refunded'].includes(paymentStatus),
      date: paymentStatus === 'captured' ? order.updated_at : null,
    },
    {
      id: 'ready',
      label: 'Ready for Pickup',
      description: 'Your order is ready to collect in-store',
      icon: '🏬',
      done: [
        'fulfilled',
        'partially_fulfilled',
        'delivered',
        'partially_delivered',
      ].includes(status),
      date: null,
    },
    {
      id: 'collected',
      label: 'Picked Up',
      description: 'Order collected in-store',
      icon: '🎉',
      done: ['delivered', 'partially_delivered'].includes(status),
      date: null,
    },
  ]
}

export async function getStoreLocation() {
  try {
    const res = await medusaServiceFetch(
      '/admin/stores?limit=1&fields=id,name,metadata',
    )
    if (!res.ok) throw new Error(`Medusa stores error: ${res.status}`)
    const { stores } = await safeJson(res, 'order-tracking-data')
    const store = stores?.[0]
    const meta = store?.metadata ?? {}
    return {
      name: store?.name || SITE_NAME,
      address: {
        line1: meta.address_line1 ?? '',
        line2: meta.address_line2 ?? '',
        city: meta.address_city ?? '',
        state: meta.address_state ?? '',
        pincode: meta.address_pincode ?? '',
        country: meta.address_country ?? '',
      },
      phone: CONTACT_PHONE,
      email: CONTACT_EMAIL,
    }
  } catch (err) {
    console.error(
      '[order-tracking-data] store location lookup failed, using fallback:',
      err,
    )
    return {
      name: SITE_NAME,
      address: null,
      phone: CONTACT_PHONE,
      email: CONTACT_EMAIL,
    }
  }
}

export function getEstimatedDelivery(order: any): string {
  const fd = activeFulfillment(order)?.data ?? {}
  const fromCourier = fd.estimated_delivery
    ? new Date(fd.estimated_delivery)
    : null
  const created = new Date(order.created_at)
  const estimated =
    fromCourier && !isNaN(fromCourier.getTime())
      ? fromCourier
      : new Date(created)
  if (!fromCourier || isNaN(fromCourier.getTime())) {
    estimated.setDate(estimated.getDate() + 5)
  }
  return estimated.toLocaleDateString('en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  })
}

export async function buildTrackingPayload(
  order: any,
  opts: { full: boolean },
) {
  const isPickup = order.metadata?.fulfillment_type === 'pickup'
  const steps = isPickup ? getPickupSteps(order) : getTrackingSteps(order)
  const currentStep = steps.filter((s) => s.done).length
  const trackingNumber = isPickup
    ? null
    : (order.fulfillments?.[0]?.tracking_numbers?.[0] ?? null)
  const carrier = order.fulfillments?.[0]?.provider_id ?? 'Parcel2Go'
  const cd = activeFulfillment(order)?.data ?? {}
  const courier = isPickup
    ? null
    : {
        status: cd.courier_status ?? null,
        statusAt: cd.courier_status_at ?? null,
        collectedAt: cd.courier_collected_at ?? null,
        outForDeliveryAt: cd.courier_out_for_delivery_at ?? null,
        deliveredAt: cd.courier_delivered_at ?? null,
        estimatedDeliveryIso: cd.estimated_delivery ?? null,
        estimatedIsApproximate: cd.estimated_delivery_source === 'fallback',
        events: Array.isArray(cd.courier_events)
          ? cd.courier_events.slice(-8).map((e: any) => ({
              at: e.at,
              text: e.text,
            }))
          : [],
      }
  const shippingAddress = isPickup
    ? null
    : opts.full
      ? order.shipping_address
      : order.shipping_address
        ? {
            city: order.shipping_address.city ?? '',
            postal_code: order.shipping_address.postal_code ?? '',
            country_code: order.shipping_address.country_code ?? '',
          }
        : null
  return {
    orderId: order.id,
    displayId: order.display_id
      ? `#${order.display_id}`
      : order.id.slice(0, 8).toUpperCase(),
    status: order.status,
    fulfillmentStatus: order.fulfillment_status ?? 'not_fulfilled',
    paymentStatus: order.payment_status,
    isPickup,
    storeLocation: isPickup ? await getStoreLocation() : null,
    steps,
    currentStep,
    trackingNumber,
    carrier,
    estimatedDelivery: isPickup ? null : getEstimatedDelivery(order),
    courier,
    items: (order.items ?? []).map((i: any) => ({
      id: i.id,
      title: i.title,
      quantity: i.quantity,
      thumbnail: i.thumbnail ?? null,
      unitPrice: i.unit_price,
    })),
    shippingAddress,
    total: order.total,
    subtotal: order.subtotal,
    shippingTotal: order.shipping_total,
  }
}
