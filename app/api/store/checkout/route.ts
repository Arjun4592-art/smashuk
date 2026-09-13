import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { SURFACE_COOKIES } from '@/lib/api/auth-cookie'
import {
  notifyNewOrder,
  sendOrderConfirmationEmail,
} from '@/lib/api/order-notifications'
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
async function getToken() {
  const cs = await cookies()
  const t = cs.get(SURFACE_COOKIES.website.tokenCookie)?.value
  return t?.startsWith('nextauth:') ? undefined : t
}
export async function POST(req: NextRequest) {
  const body = await req.json()
  const { action, cartId, ...rest } = body
  const token = await getToken()
  const h = storeHeaders(token)
  try {
    let res: Response
    switch (action) {
      case 'shipping-options': {
        res = await fetch(
          `${MEDUSA_URL}/store/shipping-options?cart_id=${cartId}&fields=*calculated_price`,
          {
            headers: h,
          },
        )
        break
      }
      case 'add-shipping': {
        res = await fetch(
          `${MEDUSA_URL}/store/carts/${cartId}/shipping-methods`,
          {
            method: 'POST',
            headers: h,
            body: JSON.stringify({
              option_id: rest.option_id,
            }),
          },
        )
        break
      }
      case 'payment-session': {
        res = await fetch(`${MEDUSA_URL}/store/payment-collections`, {
          method: 'POST',
          headers: h,
          body: JSON.stringify({
            cart_id: cartId,
          }),
        })
        break
      }
      case 'complete': {
        res = await fetch(`${MEDUSA_URL}/store/carts/${cartId}/complete`, {
          method: 'POST',
          headers: h,
        })
        const completeData = await res.json().catch(() => ({}))
        try {
          const orderId = (completeData.order ?? completeData.cart)?.id
          if (orderId) {
            const { medusaServiceFetch } =
              await import('@/lib/api/medusa-service-token')
            const orderRes = await medusaServiceFetch(
              `/admin/orders/${orderId}?fields=*payment_collections.payments`,
            )
            if (orderRes.ok) {
              const { order: fullOrder } = await orderRes.json()
              const payments = (fullOrder?.payment_collections ?? []).flatMap(
                (pc: any) => pc.payments ?? [],
              )
              const uncaptured = payments.filter(
                (p: any) =>
                  !p.captured_at &&
                  p.status !== 'canceled' &&
                  p.provider_id !== 'pp_system_default',
              )
              for (const payment of uncaptured) {
                await medusaServiceFetch(
                  `/admin/payments/${payment.id}/capture`,
                  {
                    method: 'POST',
                  },
                )
              }
            }
          }
        } catch (captureErr) {
          console.error(
            '[/api/store/checkout] post-complete capture step failed:',
            captureErr,
          )
        }
        try {
          const newOrder = completeData.order ?? completeData.cart
          if (newOrder?.id) {
            await notifyNewOrder(newOrder, 'website')
          }
        } catch (notifyErr) {
          console.error(
            '[/api/store/checkout] new-order email failed:',
            notifyErr,
          )
        }
        try {
          const newOrder = completeData.order ?? completeData.cart
          if (newOrder?.id) {
            await sendOrderConfirmationEmail(newOrder)
          }
        } catch (confirmErr) {
          console.error(
            '[/api/store/checkout] order confirmation email failed:',
            confirmErr,
          )
        }
        return NextResponse.json(completeData, {
          status: res.status,
        })
      }
      default:
        return NextResponse.json(
          {
            error: 'Unknown action',
          },
          {
            status: 400,
          },
        )
    }
    const data = await res.json().catch(() => ({}))
    return NextResponse.json(data, {
      status: res.status,
    })
  } catch (err: any) {
    return NextResponse.json(
      {
        error: err.message,
      },
      {
        status: 503,
      },
    )
  }
}
