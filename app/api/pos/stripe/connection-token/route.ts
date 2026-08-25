import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { SURFACE_COOKIES } from '@/lib/api/auth-cookie';
import { requireStripe } from '@/lib/stripe-server';
async function requirePosSession(): Promise<boolean> {
  const cookieStore = await cookies();
  const posToken = cookieStore.get(SURFACE_COOKIES.pos.tokenCookie)?.value;
  const dashboardToken = cookieStore.get(SURFACE_COOKIES.dashboard.tokenCookie)?.value;
  return Boolean(posToken || dashboardToken);
}
export async function POST() {
  if (!(await requirePosSession())) {
    return NextResponse.json({
      error: 'Unauthorized'
    }, {
      status: 401
    });
  }
  try {
    const stripe = requireStripe();
    const token = await stripe.terminal.connectionTokens.create();
    return NextResponse.json({
      secret: token.secret
    });
  } catch (err: any) {
    console.error('[Stripe Terminal] connection token error:', err.message);
    return NextResponse.json({
      error: err.message
    }, {
      status: 500
    });
  }
}
