// app/api/store/stripe/payment-methods/route.ts
//
// Lists and removes the logged-in customer's saved cards (Stripe
// PaymentMethods attached to their Stripe Customer).

import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { SURFACE_COOKIES } from '@/lib/api/auth-cookie'
import { requireStripe } from '@/lib/stripe-server'
import { safeJson } from '@/lib/api/safe-json'

const MEDUSA_URL = process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL ?? 'http://localhost:9000'
const PUBLISHABLE_KEY = process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY ?? ''

async function getStripeCustomerId(token: string): Promise<string | null> {
  const res = await fetch(`${MEDUSA_URL}/store/customers/me`, {
    headers: {
      Authorization: `Bearer ${token}`,
      'x-publishable-api-key': PUBLISHABLE_KEY,
    },
  })
  if (!res.ok) return null
  const data = await safeJson(res, 'app/api/store/stripe/payment-methods/route.ts')
  return data.customer?.metadata?.stripe_customer_id ?? null
}

export async function GET() {
  try {
    const cookieStore = await cookies()
    const token = cookieStore.get(SURFACE_COOKIES.website.tokenCookie)?.value
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const stripeCustomerId = await getStripeCustomerId(token)
    if (!stripeCustomerId) {
      return NextResponse.json({ paymentMethods: [] })
    }

    const stripe = requireStripe()
    const list = await stripe.paymentMethods.list({
      customer: stripeCustomerId,
      type: 'card',
    })

    const paymentMethods = list.data.map((pm) => ({
      id: pm.id,
      brand: pm.card?.brand ?? 'card',
      last4: pm.card?.last4 ?? '••••',
      expMonth: pm.card?.exp_month,
      expYear: pm.card?.exp_year,
    }))

    return NextResponse.json({ paymentMethods })
  } catch (err: any) {
    console.error('[Stripe] payment-methods list error:', err.message)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const cookieStore = await cookies()
    const token = cookieStore.get(SURFACE_COOKIES.website.tokenCookie)?.value
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { payment_method_id } = await req.json()
    if (!payment_method_id) {
      return NextResponse.json({ error: 'payment_method_id is required' }, { status: 400 })
    }

    const stripeCustomerId = await getStripeCustomerId(token)
    if (!stripeCustomerId) {
      return NextResponse.json({ error: 'No Stripe customer on file' }, { status: 404 })
    }

    const stripe = requireStripe()

    // SECURITY: make sure this payment method actually belongs to this
    // customer before detaching it — otherwise anyone logged in could
    // remove someone else's saved card just by guessing its ID.
    const pm = await stripe.paymentMethods.retrieve(payment_method_id)
    if (pm.customer !== stripeCustomerId) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    await stripe.paymentMethods.detach(payment_method_id)
    return NextResponse.json({ success: true })
  } catch (err: any) {
    console.error('[Stripe] payment-methods delete error:', err.message)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
