import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { SURFACE_COOKIES } from '@/lib/api/auth-cookie'
import { medusaServiceFetch } from '@/lib/api/medusa-service-token'
import { generateInvoiceForOrder } from '@/lib/invoice-service'

const MEDUSA_URL =
  process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL ?? 'http://localhost:9000'
const PUB_KEY = process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY ?? ''

async function getCustomerToken() {
  const cs = await cookies()
  const t = cs.get(SURFACE_COOKIES.website.tokenCookie)?.value
  return t?.startsWith('nextauth:') ? undefined : t
}

// Amazon/Flipkart-style "Download Invoice" on the customer's own order
// page — available as soon as the order exists (no need to wait for
// shipping/delivery), same as those sites. Ownership is checked with the
// customer's own store token against /store/orders/:id (same pattern as
// return-request) before we touch anything admin-side, so a customer can
// never fetch someone else's invoice by guessing an order id.
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params
  const token = await getCustomerToken()
  if (!token) {
    return NextResponse.json(
      { error: 'Please sign in to download your invoice' },
      { status: 401 },
    )
  }

  const ownedRes = await fetch(`${MEDUSA_URL}/store/orders/${id}`, {
    headers: {
      Authorization: `Bearer ${token}`,
      'x-publishable-api-key': PUB_KEY,
    },
  })
  if (!ownedRes.ok) {
    return NextResponse.json({ error: 'Order not found' }, { status: 404 })
  }

  try {
    const orderRes = await medusaServiceFetch(
      `/admin/orders/${id}?fields=id,display_id,created_at,currency_code,metadata,*items,*shipping_methods,*payment_collections.payments,customer.first_name,customer.last_name,shipping_address.address_1,shipping_address.address_2,shipping_address.city,shipping_address.postal_code,shipping_address.country_code`,
    )
    const orderData = await orderRes.json().catch(() => ({}))
    if (!orderRes.ok || !orderData?.order) {
      return NextResponse.json(
        { error: orderData?.message ?? 'Could not load order' },
        { status: orderRes.status },
      )
    }
    const channel: 'website' | 'pos' =
      orderData.order.metadata?.source === 'pos' ? 'pos' : 'website'
    const { url } = await generateInvoiceForOrder(
      { ...orderData.order, channel },
      { regenerate: true },
    )
    return NextResponse.redirect(url)
  } catch (err: unknown) {
    console.error(`[store/orders/${id}/invoice] failed:`, err)
    return NextResponse.json(
      { error: 'Could not generate invoice' },
      { status: 500 },
    )
  }
}
