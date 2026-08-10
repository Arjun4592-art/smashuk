// app/api/store/payment/route.ts
// Stripe payment intent creation proxy

import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { SURFACE_COOKIES } from '@/lib/api/auth-cookie'

const MEDUSA_URL =
  process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL ?? 'http://localhost:9000'
const PUB_KEY = process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY ?? ''

async function getCustomerToken() {
  const cs = await cookies()
  const t = cs.get(SURFACE_COOKIES.website.tokenCookie)?.value
  return t?.startsWith('nextauth:') ? undefined : t
}

function storeHeaders(token?: string) {
  const h: Record<string, string> = {
    'Content-Type': 'application/json',
    'x-publishable-api-key': PUB_KEY,
  }
  if (token) h['Authorization'] = `Bearer ${token}`
  return h
}

// BUG FIX: `res.json()` on a non-JSON response (e.g. Medusa returning an
// HTML 502/504 error page because it's unreachable, or a plain-text 500)
// throws, which — since it wasn't wrapped — turned into an opaque 500 with
// no useful message. This also logs the real Medusa error server-side so
// "500"/"400" in the browser network tab has an actual cause attached to
// it in the terminal instead of nothing to go on.
async function safeJson(res: Response, label: string) {
  try {
    return await res.json()
  } catch {
    const text = await res.text().catch(() => '')
    console.error(
      `[/api/store/payment] ${label} returned non-JSON (${res.status}):`,
      text.slice(0, 300),
    )
    return {
      error: `${label} failed (${res.status}) — Medusa backend may be unreachable or misconfigured.`,
    }
  }
}

// POST /api/store/payment
// body: { action: 'create-collection' | 'create-session' | 'confirm', cartId, ... }
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { action, cartId } = body
    const token = await getCustomerToken()
    const h = storeHeaders(token)

    if (action === 'get-method') {
      // Looks up the *actual* payment method type Stripe used for a given
      // PaymentIntent — needed on /checkout/complete, which only ever runs
      // after an off-site redirect (Amazon Pay, Revolut Pay). That page
      // has no component state left after the full-page round trip, so
      // without this it can't tell the two apart and previously just
      // hardcoded 'card' into the order's metadata regardless of which
      // off-site method the customer actually used.
      const { paymentIntentId } = body
      if (!paymentIntentId) {
        return NextResponse.json(
          { error: 'paymentIntentId required' },
          { status: 400 },
        )
      }
      try {
        const { requireStripe } = await import('@/lib/stripe-server')
        const pi = await requireStripe().paymentIntents.retrieve(
          paymentIntentId,
          { expand: ['payment_method'] },
        )
        const pm = pi.payment_method
        const type = typeof pm === 'object' && pm ? pm.type : undefined
        return NextResponse.json({ payment_method: type ?? 'card' })
      } catch (err: any) {
        console.error('[/api/store/payment] get-method failed:', err)
        // Non-fatal from the caller's perspective — it falls back to 'card'
        return NextResponse.json({ payment_method: 'card' })
      }
    }

    if (action === 'create-collection') {
      // Step 1: Create payment collection for cart
      const res = await fetch(`${MEDUSA_URL}/store/payment-collections`, {
        method: 'POST',
        headers: h,
        body: JSON.stringify({ cart_id: cartId }),
      })
      const data = await safeJson(res, 'create-collection')
      if (!res.ok)
        console.error('[/api/store/payment] create-collection failed:', data)
      return NextResponse.json(data, { status: res.status })
    }

    if (action === 'create-session') {
      // Step 2: Create Stripe payment session
      const { collectionId, providerId } = body
      const res = await fetch(
        `${MEDUSA_URL}/store/payment-collections/${collectionId}/payment-sessions`,
        {
          method: 'POST',
          headers: h,
          body: JSON.stringify({
            provider_id: providerId ?? 'pp_stripe_stripe',
          }),
        },
      )
      const data = await safeJson(res, 'create-session')
      if (!res.ok) {
        // A 400/500 here almost always means either (a) Stripe isn't
        // configured on the MEDUSA backend itself (STRIPE_API_KEY missing
        // in Medusa's own .env, separate from this app's .env.local), or
        // (b) the provider_id isn't enabled on this region in Medusa Admin
        // → Settings → Regions → Payment Providers.
        console.error(
          `[/api/store/payment] create-session failed for provider "${providerId}":`,
          data,
        )
      }
      return NextResponse.json(data, { status: res.status })
    }

    if (action === 'complete') {
      const { metadata } = body

      // If a payment_method was passed (used for COD/Bank Transfer which
      // skip the Stripe session), record it on the cart before completing.
      if (metadata) {
        await fetch(`${MEDUSA_URL}/store/carts/${cartId}`, {
          method: 'POST',
          headers: h,
          body: JSON.stringify({ metadata }),
        }).catch((err) =>
          console.error('[payment] metadata update failed:', err),
        )
      }

      // Step 3: Complete cart (place order)
      const res = await fetch(`${MEDUSA_URL}/store/carts/${cartId}/complete`, {
        method: 'POST',
        headers: h,
      })
      const data = await safeJson(res, 'complete')
      if (!res.ok) {
        // A 400 here is very often the same "product not published / not
        // linked to sales channel" issue already diagnosed for POS — check
        // data.message below in the server terminal for the real cause.
        console.error('[/api/store/payment] cart complete failed:', data)
        return NextResponse.json(data, { status: res.status })
      }

      // BUG FIX: card orders were staying stuck at status "pending" /
      // payment "authorized" forever, even for a fully successful Stripe
      // payment — both the dashboard's Orders list and Overview page
      // showed inconsistent revenue because of this (Orders page
      // correctly excludes non-captured payments from revenue;
      // Overview's stats route didn't, which is *why* the two numbers
      // disagreed).
      //
      // The actual cause: capturing a Stripe payment in Medusa normally
      // happens via a Stripe webhook hitting MEDUSA'S backend directly
      // (external infra — outside this Next.js app, configured in Stripe's
      // dashboard + Medusa's own env). If that webhook isn't set up yet,
      // nothing ever tells Medusa the payment succeeded, so it just sits
      // "authorized". Rather than depend on that external webhook, capture
      // the payment directly here, right after a successful cart-complete,
      // using our own admin/service credentials.
      //
      // COD / Bank Transfer ('pp_system_default') are deliberately
      // excluded from this immediate capture — no money has actually
      // changed hands yet at order placement for those, only once the
      // order ships. Those get captured later, from the dashboard, when
      // the order is marked Fulfilled/Shipped (see the 'fulfill' action
      // in app/api/admin/orders/[id]/route.ts).
      try {
        const order = data.order ?? data.cart
        const orderId = order?.id
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
              const capRes = await medusaServiceFetch(
                `/admin/payments/${payment.id}/capture`,
                { method: 'POST' },
              )
              if (!capRes.ok) {
                console.error(
                  `[/api/store/payment] capture failed for payment ${payment.id}:`,
                  await capRes.text().catch(() => ''),
                )
              }
            }
          }
        }
      } catch (captureErr) {
        // Non-fatal — the order was placed successfully either way; a
        // failed capture just means it'll still show "Authorized" until
        // captured manually from Admin → Orders → that order → Capture.
        console.error(
          '[/api/store/payment] post-complete capture step failed:',
          captureErr,
        )
      }

      // VAT invoice — generated right here rather than off the Stripe
      // webhook, because this app already captures payment synchronously
      // above (see the long comment on why) instead of waiting on a
      // webhook. Non-fatal: a failed invoice never blocks order placement;
      // it can always be regenerated later via the dashboard's Resend
      // Invoice button (app/api/admin/orders/[id]/resend-invoice).
      try {
        const order = data.order ?? data.cart
        if (order?.id) {
          const { medusaServiceFetch } =
            await import('@/lib/api/medusa-service-token')
          const orderRes = await medusaServiceFetch(
            `/admin/orders/${order.id}?fields=id,currency_code,*items,*shipping_methods,customer.first_name,customer.last_name,shipping_address.address_1,shipping_address.address_2,shipping_address.city,shipping_address.postal_code,shipping_address.country_code`,
          )
          if (orderRes.ok) {
            const { order: fullOrder } = await orderRes.json()
            const { generateInvoiceForOrder } =
              await import('@/lib/invoice-service')
            await generateInvoiceForOrder({ ...fullOrder, channel: 'website' })
          }
        }
      } catch (invoiceErr) {
        console.error(
          '[/api/store/payment] invoice generation failed:',
          invoiceErr,
        )
      }

      return NextResponse.json(data, { status: res.status })
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
  } catch (err: any) {
    console.error('[/api/store/payment]', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
