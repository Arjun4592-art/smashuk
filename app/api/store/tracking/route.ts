// app/api/store/tracking/route.ts
// Order tracking — fetches real order status from Medusa

import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { SURFACE_COOKIES } from '@/lib/api/auth-cookie'
import { medusaServiceFetch } from '@/lib/api/medusa-service-token'
import { CONTACT_PHONE, CONTACT_EMAIL, SITE_NAME } from '@/lib/constants'
import { safeJson } from '@/lib/api/safe-json'

const MEDUSA_URL =
  process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL ?? 'http://localhost:9000'
const PUB_KEY = process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY ?? ''

function storeHeaders(token?: string) {
  const h: Record<string, string> = {
    'Content-Type': 'application/json',
    'x-publishable-api-key': PUB_KEY,
  }
  if (token) h['Authorization'] = `Bearer ${token}`
  return h
}

async function getCustomerToken() {
  const cs = await cookies()
  const t = cs.get(SURFACE_COOKIES.website.tokenCookie)?.value
  return t?.startsWith('nextauth:') ? undefined : t
}

// Map Medusa order status to tracking steps — courier/ship orders only.
// Pickup orders use getPickupSteps() below instead: there's no
// dispatch/courier leg for an order the customer collects in person, so
// showing "Dispatched"/"your order is on its way" for those was actively
// misleading (and, per the store address, physically meaningless).
function getTrackingSteps(order: any) {
  const status = order.fulfillment_status ?? order.status ?? 'pending'
  const paymentStatus = order.payment_status ?? 'pending'

  const steps = [
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
      // BUG FIX: this used to also mark "Dispatched" done the moment the
      // order was merely 'fulfilled' (packed/ready) — before it had
      // actually been handed to a courier. Now that dispatching is a real,
      // separate step (see shipOrder() in lib/api/medusa-fulfillment.ts),
      // this only lights up once the order is genuinely 'shipped' (or
      // past it, i.e. delivered) — fixing the non-monotonic timeline where
      // "Dispatched" and "Processing" used to complete at the same time.
      done: [
        'shipped',
        'partially_shipped',
        'delivered',
        'partially_delivered',
      ].includes(status),
      date: order.fulfillments?.[0]?.shipped_at ?? null,
    },
    {
      id: 'delivered',
      label: 'Delivered',
      description: 'Order delivered successfully',
      icon: '🎉',
      done: ['delivered', 'partially_delivered'].includes(status),
      date: null,
    },
  ]

  return steps
}

// Store-pickup steps — no dispatch/courier leg, just: placed → paid →
// ready for collection → picked up. "delivered" on a pickup order (see
// lib/order-status.ts) means the customer has collected it in person.
function getPickupSteps(order: any) {
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

// Server-only, no admin session required — same public-metadata pattern
// as /api/admin/store-settings (uses the service token, not the caller's
// own auth), just for the store's physical address instead of currency/
// tax. Falls back to contact-only info if the store has no address saved.
async function getStoreLocation() {
  try {
    const res = await medusaServiceFetch(
      '/admin/stores?limit=1&fields=id,name,metadata',
    )
    if (!res.ok) throw new Error(`Medusa stores error: ${res.status}`)
    const { stores } = await safeJson(res, 'app/api/store/tracking/route.ts')
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
      '[tracking] store location lookup failed, using fallback:',
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

export async function GET(req: NextRequest) {
  try {
    const orderId = req.nextUrl.searchParams.get('id')
    if (!orderId) {
      return NextResponse.json({ error: 'Order ID required' }, { status: 400 })
    }

    const token = await getCustomerToken()
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Fetch order from Medusa
    const res = await fetch(`${MEDUSA_URL}/store/orders/${orderId}`, {
      headers: storeHeaders(token),
    })

    if (!res.ok) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 })
    }

    const { order } = await safeJson(res, 'app/api/store/tracking/route.ts')

    // Store pickup orders (POS or website "Store Pickup" checkout) — see
    // lib/order-status.ts, same flag used everywhere else in the app.
    const isPickup = order.metadata?.fulfillment_type === 'pickup'

    const steps = isPickup ? getPickupSteps(order) : getTrackingSteps(order)
    const currentStep = steps.filter((s) => s.done).length
    const trackingNumber = isPickup
      ? null
      : (order.fulfillments?.[0]?.tracking_numbers?.[0] ?? null)
    const carrier = order.fulfillments?.[0]?.provider_id ?? 'Royal Mail'

    const tracking = {
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
      items: (order.items ?? []).map((i: any) => ({
        id: i.id,
        title: i.title,
        quantity: i.quantity,
        thumbnail: i.thumbnail ?? null,
        unitPrice: i.unit_price,
      })),
      shippingAddress: isPickup ? null : order.shipping_address,
      total: order.total,
      subtotal: order.subtotal,
      shippingTotal: order.shipping_total,
    }

    return NextResponse.json({ tracking })
  } catch (err: any) {
    console.error('[tracking]', err)
    return NextResponse.json(
      { error: 'Failed to fetch tracking info' },
      { status: 500 },
    )
  }
}

function getEstimatedDelivery(order: any): string {
  const created = new Date(order.created_at)
  // Standard: 3-5 business days
  const estimated = new Date(created)
  estimated.setDate(estimated.getDate() + 5)
  return estimated.toLocaleDateString('en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  })
}
