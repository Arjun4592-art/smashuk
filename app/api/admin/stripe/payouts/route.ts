// app/api/admin/stripe/payouts/route.ts
//
// Recent payouts from Stripe to the connected bank account.

import { NextRequest, NextResponse } from 'next/server'
import { getAdminAuthHeader } from '@/lib/api/admin-auth'
import { stripe } from '@/lib/stripe-server'

export async function GET(req: NextRequest) {
  const authHeader = await getAdminAuthHeader(req)
  if (!authHeader) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (!stripe) {
    return NextResponse.json({ payouts: [] })
  }

  try {
    const payouts = await stripe.payouts.list({ limit: 10 })
    return NextResponse.json({
      payouts: payouts.data.map((p) => ({
        id: p.id,
        amount: p.amount,
        currency: p.currency,
        status: p.status,
        arrivalDate: p.arrival_date * 1000,
        created: p.created * 1000,
        method: p.method,
      })),
    })
  } catch (err: any) {
    console.error('[Stripe] payouts error:', err.message)
    return NextResponse.json({ payouts: [], error: err.message })
  }
}
