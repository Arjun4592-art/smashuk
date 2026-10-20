import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { SURFACE_COOKIES } from '@/lib/api/auth-cookie'
import { medusaServiceFetch } from '@/lib/api/medusa-service-token'
import { getFlowOrder, saveOrderMetadata } from '@/lib/api/order-flow-server'
import { canRequestRefund } from '@/lib/order-flow'
import { notifyOwner } from '@/lib/email'
import { adminRefundRequestEmail } from '@/lib/email-templates'

const MEDUSA_URL =
  process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL ?? 'http://localhost:9000'
const PUB_KEY = process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY ?? ''

async function getCustomerToken() {
  const cs = await cookies()
  const t = cs.get(SURFACE_COOKIES.website.tokenCookie)?.value
  return t?.startsWith('nextauth:') ? undefined : t
}

// A customer asks for a refund BEFORE their order is despatched / picked up.
// The order then shows REFUND REQUEST RECEIVED until staff accept it.
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params
  const token = await getCustomerToken()
  if (!token) {
    return NextResponse.json(
      { error: 'Please sign in to request a refund' },
      { status: 401 },
    )
  }
  // Only the owner of the order may ask for its refund.
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
    const { reason, note } = await req.json()
    if (!reason) {
      return NextResponse.json(
        { error: 'A reason is required' },
        { status: 400 },
      )
    }
    const order = await getFlowOrder(id, medusaServiceFetch)
    if (!canRequestRefund(order)) {
      return NextResponse.json(
        {
          error:
            'A refund can only be requested before your order is despatched or picked up. If it already has been, please request a return instead.',
        },
        { status: 400 },
      )
    }
    const request = {
      status: 'requested' as const,
      requested_at: new Date().toISOString(),
      source: 'customer' as const,
      reason: String(reason).slice(0, 200),
      ...(note ? { note: String(note).slice(0, 1000) } : {}),
    }
    await saveOrderMetadata(
      id,
      order,
      { refund_request: request },
      medusaServiceFetch,
    )
    notifyOwner({
      ...adminRefundRequestEmail(order, request),
      customerEmail: order.email,
    }).catch(() => {})
    return NextResponse.json({ ok: true })
  } catch (err: any) {
    console.error(`[refund-request] failed for order ${id}:`, err)
    return NextResponse.json(
      { error: err.message ?? 'Failed to submit refund request' },
      { status: 400 },
    )
  }
}
