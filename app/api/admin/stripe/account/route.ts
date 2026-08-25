import { NextRequest, NextResponse } from 'next/server';
import { getAdminAuthHeader } from '@/lib/api/admin-auth';
import { stripe } from '@/lib/stripe-server';
export async function GET(req: NextRequest) {
  const authHeader = await getAdminAuthHeader(req);
  if (!authHeader) {
    return NextResponse.json({
      error: 'Unauthorized'
    }, {
      status: 401
    });
  }
  if (!stripe) {
    return NextResponse.json({
      connected: false,
      error: 'STRIPE_SECRET_KEY not set'
    });
  }
  try {
    const isLiveMode = process.env.STRIPE_SECRET_KEY?.startsWith('sk_live_');
    const balance = await stripe.balance.retrieve();
    let accountName = 'Stripe account';
    try {
      const account = await (stripe.accounts.retrieve as () => Promise<any>)();
      accountName = (account as any).business_profile?.name || (account as any).settings?.dashboard?.display_name || account.email || accountName;
    } catch {}
    return NextResponse.json({
      connected: true,
      mode: isLiveMode ? 'live' : 'test',
      accountName,
      balance: {
        available: balance.available.map(b => ({
          amount: b.amount,
          currency: b.currency
        })),
        pending: balance.pending.map(b => ({
          amount: b.amount,
          currency: b.currency
        }))
      }
    });
  } catch (err: any) {
    console.error('[Stripe] account status error:', err.message);
    return NextResponse.json({
      connected: false,
      error: err.message
    });
  }
}
