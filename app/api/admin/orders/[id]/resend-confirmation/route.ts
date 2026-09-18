import { NextRequest, NextResponse } from 'next/server'
import { getAdminAuthHeader } from '@/lib/api/admin-auth'
import { MEDUSA_URL } from '@/lib/api/medusa-service-token'
import { sendOrderConfirmationEmail } from '@/lib/api/order-notifications'

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const authHeader = await getAdminAuthHeader(req)
  if (!authHeader) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const { id } = await params
  try {
    const url = new URL(`/admin/orders/${id}`, MEDUSA_URL)
    url.searchParams.set(
      'fields',
      'id,display_id,email,created_at,currency_code,metadata,*items,' +
        '*shipping_methods,customer.first_name,customer.last_name,customer.phone,' +
        'shipping_address.address_1,shipping_address.address_2,shipping_address.city,' +
        'shipping_address.province,shipping_address.postal_code,shipping_address.country_code',
    )
    const orderRes = await fetch(url.toString(), {
      headers: { Authorization: authHeader },
    })
    const orderData = await orderRes.json().catch(() => ({}))
    if (!orderRes.ok || !orderData?.order) {
      return NextResponse.json(
        {
          error:
            orderData?.message ?? `Failed to load order (${orderRes.status})`,
        },
        { status: orderRes.status },
      )
    }
    if (!orderData.order.email) {
      return NextResponse.json(
        { error: 'This order has no customer email on file' },
        { status: 400 },
      )
    }
    await sendOrderConfirmationEmail(orderData.order)
    return NextResponse.json({
      sent: true,
      to: orderData.order.email,
      sentAt: new Date().toISOString(),
    })
  } catch (err: any) {
    console.error(`[resend-confirmation] failed for order ${id}:`, err)
    return NextResponse.json(
      { error: err.message ?? 'Failed to resend confirmation email' },
      { status: 500 },
    )
  }
}
