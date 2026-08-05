// app/api/store/stripe/setup-intent/route.ts
//
// Creates (or reuses) a Stripe Customer linked to the logged-in Medusa
// customer, then creates a SetupIntent so the browser can save a card via
// Stripe Elements WITHOUT charging it (usage: 'off_session' — reusable
// for a future in-person or online purchase).

import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { SURFACE_COOKIES } from '@/lib/api/auth-cookie'
import { requireStripe } from '@/lib/stripe-server'
import { safeJson } from '@/lib/api/safe-json'

const MEDUSA_URL = process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL ?? 'http://localhost:9000'
const PUBLISHABLE_KEY = process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY ?? ''

async function getCustomer(token: string) {
  const res = await fetch(`${MEDUSA_URL}/store/customers/me`, {
    headers: {
      Authorization: `Bearer ${token}`,
      'x-publishable-api-key': PUBLISHABLE_KEY,
    },
  })
  if (!res.ok) return null
  const data = await safeJson(res, 'app/api/store/stripe/setup-intent/route.ts')
  return data.customer
}

async function saveStripeCustomerId(
  token: string,
  existingMetadata: Record<string, any>,
  stripeCustomerId: string,
) {
  await fetch(`${MEDUSA_URL}/store/customers/me`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      'x-publishable-api-key': PUBLISHABLE_KEY,
    },
    body: JSON.stringify({
      metadata: { ...existingMetadata, stripe_customer_id: stripeCustomerId },
    }),
  })
}

export async function POST(req: NextRequest) {
  try {
    const cookieStore = await cookies()
    const token = cookieStore.get(SURFACE_COOKIES.website.tokenCookie)?.value
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const customer = await getCustomer(token)
    if (!customer) {
      return NextResponse.json({ error: 'Customer not found' }, { status: 404 })
    }

    const stripe = requireStripe()
    let stripeCustomerId: string | undefined = customer.metadata?.stripe_customer_id

    if (!stripeCustomerId) {
      const stripeCustomer = await stripe.customers.create({
        email: customer.email,
        name: `${customer.first_name ?? ''} ${customer.last_name ?? ''}`.trim() || undefined,
        metadata: { medusa_customer_id: customer.id },
      })
      stripeCustomerId = stripeCustomer.id
      await saveStripeCustomerId(token, customer.metadata ?? {}, stripeCustomerId)
    }

    const setupIntent = await stripe.setupIntents.create({
      customer: stripeCustomerId,
      payment_method_types: ['card'],
      usage: 'off_session',
    })

    return NextResponse.json({ client_secret: setupIntent.client_secret })
  } catch (err: any) {
    console.error('[Stripe] setup-intent error:', err.message)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
