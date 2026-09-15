import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { SURFACE_COOKIES } from '@/lib/api/auth-cookie'
import { safeJson } from '@/lib/api/safe-json'
import { buildTrackingPayload } from '@/lib/api/order-tracking-data'
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
export async function GET(req: NextRequest) {
  try {
    const orderId = req.nextUrl.searchParams.get('id')
    if (!orderId) {
      return NextResponse.json(
        {
          error: 'Order ID required',
        },
        {
          status: 400,
        },
      )
    }
    const token = await getCustomerToken()
    if (!token) {
      return NextResponse.json(
        {
          error: 'Unauthorized',
        },
        {
          status: 401,
        },
      )
    }
    const res = await fetch(`${MEDUSA_URL}/store/orders/${orderId}`, {
      headers: storeHeaders(token),
    })
    if (!res.ok) {
      return NextResponse.json(
        {
          error: 'Order not found',
        },
        {
          status: 404,
        },
      )
    }
    const { order } = await safeJson(res, 'app/api/store/tracking/route.ts')
    // Logged-in view — the customer already owns this order, so show the
    // full shipping address (see app/api/public/order-status/route.ts for
    // the no-login QR/email link, which only shows city/postcode).
    const tracking = await buildTrackingPayload(order, { full: true })
    return NextResponse.json({
      tracking,
    })
  } catch (err: any) {
    console.error('[tracking]', err)
    return NextResponse.json(
      {
        error: 'Failed to fetch tracking info',
      },
      {
        status: 500,
      },
    )
  }
}
