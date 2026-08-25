import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { randomUUID } from 'crypto';
import { SURFACE_COOKIES } from '@/lib/api/auth-cookie';
import { medusaServiceFetch } from '@/lib/api/medusa-service-token';
import { getOrderForReturn, buildReturnLines, appendReturnRecord } from '@/lib/api/medusa-returns';
const MEDUSA_URL = process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL ?? 'http://localhost:9000';
const PUB_KEY = process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY ?? '';
async function getCustomerToken() {
  const cs = await cookies();
  const t = cs.get(SURFACE_COOKIES.website.tokenCookie)?.value;
  return t?.startsWith('nextauth:') ? undefined : t;
}
export async function POST(req: NextRequest, {
  params
}: {
  params: Promise<{
    id: string;
  }>;
}) {
  const {
    id
  } = await params;
  const token = await getCustomerToken();
  if (!token) {
    return NextResponse.json({
      error: 'Please sign in to request a return'
    }, {
      status: 401
    });
  }
  const ownedRes = await fetch(`${MEDUSA_URL}/store/orders/${id}`, {
    headers: {
      Authorization: `Bearer ${token}`,
      'x-publishable-api-key': PUB_KEY
    }
  });
  if (!ownedRes.ok) {
    return NextResponse.json({
      error: 'Order not found'
    }, {
      status: 404
    });
  }
  try {
    const {
      items,
      reason,
      note
    } = await req.json();
    if (!Array.isArray(items) || items.length === 0) {
      return NextResponse.json({
        error: 'Select at least one item to return'
      }, {
        status: 400
      });
    }
    if (!reason) {
      return NextResponse.json({
        error: 'A reason is required'
      }, {
        status: 400
      });
    }
    const order = await getOrderForReturn(id, medusaServiceFetch);
    const {
      items: builtItems,
      refund_amount
    } = buildReturnLines(order, items);
    const data = await appendReturnRecord(id, order, {
      id: randomUUID(),
      items: builtItems,
      reason,
      note,
      refund_amount,
      status: 'requested',
      source: 'customer',
      requested_at: new Date().toISOString()
    }, medusaServiceFetch);
    return NextResponse.json(data);
  } catch (err: any) {
    console.error(`[return-request] failed for order ${id}:`, err);
    return NextResponse.json({
      error: err.message ?? 'Failed to submit return request'
    }, {
      status: 400
    });
  }
}
