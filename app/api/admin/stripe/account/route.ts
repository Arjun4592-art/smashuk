// app/api/admin/stripe/account/route.ts
//
// Real Stripe account status + balance — replaces the fake "SaaS
// subscription plan" mock that used to live on the Billing settings page
// (this store doesn't have a subscription relationship with itself; that
// was leftover template scaffolding).

import { NextRequest, NextResponse } from 'next/server'
import { getAdminAuthHeader } from '@/lib/api/admin-auth'
import { stripe } from '@/lib/stripe-server'

export async function GET(req: NextRequest) {
  const authHeader = await getAdminAuthHeader(req)
  if (!authHeader) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (!stripe) {
    return NextResponse.json({ connected: false, error: 'STRIPE_SECRET_KEY not set' })
  }

  try {
    const isLiveMode = process.env.STRIPE_SECRET_KEY?.startsWith('sk_live_')
    const balance = await stripe.balance.retrieve()

    let accountName = 'Stripe account'
    try {
      // BUG FIX: newer stripe-node typings require an account id argument
      // for `accounts.retrieve()`, which broke `next build` (TS2554: Expected
      // 1-3 arguments, but got 0). Calling it with no id is still valid at
      // runtime for the account tied to the API key itself — this just casts
      // past the stricter typings instead of changing behavior.
      const account = await (stripe.accounts.retrieve as () => Promise<any>)()
      accountName =
        (account as any).business_profile?.name ||
        (account as any).settings?.dashboard?.display_name ||
        account.email ||
        accountName
    } catch {
      // Restricted API keys can't retrieve full account details — that's fine,
      // balance/payouts still work, we just show a generic name.
    }

    return NextResponse.json({
      connected: true,
      mode: isLiveMode ? 'live' : 'test',
      accountName,
      balance: {
        available: balance.available.map((b) => ({ amount: b.amount, currency: b.currency })),
        pending: balance.pending.map((b) => ({ amount: b.amount, currency: b.currency })),
      },
    })
  } catch (err: any) {
    console.error('[Stripe] account status error:', err.message)
    return NextResponse.json({ connected: false, error: err.message })
  }
}
