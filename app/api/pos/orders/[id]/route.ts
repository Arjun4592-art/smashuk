import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { randomUUID } from 'crypto';
import { SURFACE_COOKIES, getSurfaceIdentity } from '@/lib/api/auth-cookie';
import { medusaServiceFetch } from '@/lib/api/medusa-service-token';
import { getOrderForReturn, buildReturnLines, refundOrderAmount, appendReturnRecord } from '@/lib/api/medusa-returns';
async function requirePosSession(): Promise<boolean> {
  const cookieStore = await cookies();
  const posToken = cookieStore.get(SURFACE_COOKIES.pos.tokenCookie)?.value;
  const dashboardToken = cookieStore.get(SURFACE_COOKIES.dashboard.tokenCookie)?.value;
  return Boolean(posToken || dashboardToken);
}
export async function PATCH(req: NextRequest, {
  params
}: {
  params: Promise<{
    id: string;
  }>;
}) {
  if (!(await requirePosSession())) {
    return NextResponse.json({
      error: 'Unauthorized'
    }, {
      status: 401
    });
  }
  const {
    id
  } = await params;
  const cookieStore = await cookies();
  const posIdentity = getSurfaceIdentity({
    cookies: cookieStore
  }, 'pos');
  const dashboardIdentity = getSurfaceIdentity({
    cookies: cookieStore
  }, 'dashboard');
  const actor = posIdentity?.userId ? {
    staffId: posIdentity.userId,
    surface: 'pos' as const
  } : dashboardIdentity?.userId ? {
    staffId: dashboardIdentity.userId,
    surface: 'dashboard' as const
  } : undefined;
  try {
    const body = await req.json().catch(() => ({}));
    const {
      reason,
      items
    } = body as {
      reason?: string;
      items?: {
        item_id: string;
        quantity: number;
      }[];
    };
    const order = await getOrderForReturn(id, medusaServiceFetch);
    const {
      items: builtItems,
      refund_amount
    } = buildReturnLines(order, items ?? []);
    await refundOrderAmount(order, refund_amount, medusaServiceFetch);
    const res = await appendReturnRecord(id, order, {
      id: randomUUID(),
      items: builtItems,
      reason: reason || 'Other',
      refund_amount,
      status: 'refunded',
      source: 'pos',
      requested_at: new Date().toISOString(),
      processed_at: new Date().toISOString()
    }, medusaServiceFetch, {
      returned: true
    }, actor);
    return NextResponse.json({
      ...res,
      refund_amount
    });
  } catch (err: any) {
    console.error('[API] POS order PATCH error:', err);
    return NextResponse.json({
      error: err.message ?? 'Failed to process return'
    }, {
      status: 400
    });
  }
}
export async function PUT(req: NextRequest, {
  params
}: {
  params: Promise<{
    id: string;
  }>;
}) {
  if (!(await requirePosSession())) {
    return NextResponse.json({
      error: 'Unauthorized'
    }, {
      status: 401
    });
  }
  const {
    id
  } = await params;
  try {
    const body = await req.json().catch(() => ({}));
    const action = (body.action ?? 'pickup') as 'pickup' | 'dispatch';
    const markDelivered = action === 'pickup';
    const {
      fulfillOrder,
      markOrderDelivered
    } = await import('@/lib/api/medusa-fulfillment');
    const result = await fulfillOrder(id, medusaServiceFetch, markDelivered);
    let delivered = false;
    let deliverError = result.deliverError;
    if (markDelivered && result.alreadyFulfilled) {
      try {
        const deliverResult = await markOrderDelivered(id, medusaServiceFetch);
        delivered = !deliverResult.alreadyDelivered;
      } catch (deliverErr: any) {
        deliverError = deliverErr?.message ?? 'Failed to mark as delivered';
        console.warn('[API] POS order PUT — markOrderDelivered fallback failed:', deliverErr?.message);
      }
    }
    return NextResponse.json({
      ok: true,
      action,
      alreadyFulfilled: !!result.alreadyFulfilled && !delivered,
      deliverError
    });
  } catch (err: any) {
    console.error('[API] POS order PUT (fulfill) error:', err);
    return NextResponse.json({
      error: err.message ?? 'Failed to fulfill order'
    }, {
      status: 400
    });
  }
}
