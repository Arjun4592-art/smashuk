// app/api/pos/stripe/payment-intent/route.ts
//
// Creates a PaymentIntent for an in-person (card_present) sale so the
// Terminal SDK can collect the card and Stripe can process/capture it.
// amount must be in the smallest currency unit (pence for GBP).

import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { SURFACE_COOKIES } from '@/lib/api/auth-cookie'
import { requireStripe } from '@/lib/stripe-server'

async function requirePosSession(): Promise<boolean> {
  const cookieStore = await cookies()
  const posToken = cookieStore.get(SURFACE_COOKIES.pos.tokenCookie)?.value
  const dashboardToken = cookieStore.get(
    SURFACE_COOKIES.dashboard.tokenCookie,
  )?.value
  return Boolean(posToken || dashboardToken)
}

export async function POST(request: NextRequest) {
  if (!(await requirePosSession())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { amount, currency = 'gbp' } = await request.json()

    if (!amount || amount <= 0) {
      return NextResponse.json({ error: 'A valid amount is required' }, { status: 400 })
    }

    const stripe = requireStripe()
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(amount),
      currency,
      payment_method_types: ['card_present'],
      capture_method: 'automatic',
    })

    return NextResponse.json({
      id: paymentIntent.id,
      client_secret: paymentIntent.client_secret,
    })
  } catch (err: any) {
    console.error('[Stripe Terminal] payment intent error:', err.message)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

// Capture status check — used after processPayment() to confirm the charge
// actually succeeded before we let the cashier proceed with the sale.
export async function GET(request: NextRequest) {
  if (!(await requirePosSession())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const id = request.nextUrl.searchParams.get('id')
  if (!id) {
    return NextResponse.json({ error: 'id is required' }, { status: 400 })
  }
  try {
    const stripe = requireStripe()
    const intent = await stripe.paymentIntents.retrieve(id)
    return NextResponse.json({ status: intent.status, id: intent.id })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
