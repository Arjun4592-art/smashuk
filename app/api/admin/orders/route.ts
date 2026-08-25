import { NextRequest, NextResponse } from 'next/server';
import { getAdminAuthHeader } from '@/lib/api/admin-auth';
const MEDUSA_URL = process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL ?? 'http://localhost:9000';
export async function GET(req: NextRequest) {
  const {
    searchParams
  } = new URL(req.url);
  const limit = Number(searchParams.get('limit') ?? 20);
  const offset = Number(searchParams.get('offset') ?? 0);
  const status = searchParams.get('status')?.split(',').filter(Boolean);
  const authHeader = await getAdminAuthHeader(req);
  if (!authHeader) {
    return NextResponse.json({
      error: 'Unauthorized'
    }, {
      status: 401
    });
  }
  try {
    const url = new URL('/admin/orders', MEDUSA_URL);
    url.searchParams.set('limit', String(limit));
    url.searchParams.set('offset', String(offset));
    url.searchParams.set('order', '-created_at');
    url.searchParams.set('fields', '*items,*customer,*payment_collections.payments,+fulfillment_status,+metadata');
    if (status?.length) {
      status.forEach(s => url.searchParams.append('status[]', s));
    }
    const res = await fetch(url.toString(), {
      headers: {
        Authorization: authHeader,
        'Content-Type': 'application/json'
      }
    });
    if (!res.ok) {
      const err = await res.json();
      return NextResponse.json({
        error: err.message
      }, {
        status: res.status
      });
    }
    return NextResponse.json(await res.json());
  } catch (err: any) {
    console.error('[API] orders GET error:', err);
    return NextResponse.json({
      error: err.message
    }, {
      status: 500
    });
  }
}
export async function POST(req: NextRequest) {
  const authHeader = await getAdminAuthHeader(req);
  if (!authHeader) {
    return NextResponse.json({
      error: 'Unauthorized'
    }, {
      status: 401
    });
  }
  try {
    const body = await req.json();
    const res = await fetch(`${MEDUSA_URL}/admin/orders`, {
      method: 'POST',
      headers: {
        Authorization: authHeader,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(body)
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({
        message: 'Unknown error'
      }));
      return NextResponse.json({
        error: err.message
      }, {
        status: res.status
      });
    }
    return NextResponse.json(await res.json());
  } catch (err: any) {
    console.error('[API] orders POST error:', err);
    return NextResponse.json({
      error: err.message
    }, {
      status: 500
    });
  }
}
