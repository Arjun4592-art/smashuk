import { NextRequest, NextResponse } from 'next/server';
import { getAdminAuthHeader } from '@/lib/api/admin-auth';
const MEDUSA_URL = process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL ?? 'http://localhost:9000';
async function safeJson(res: Response) {
  const text = await res.text();
  if (!text) return {};
  try {
    return JSON.parse(text);
  } catch {
    return {
      message: text.slice(0, 300)
    };
  }
}
export async function PATCH(req: NextRequest, {
  params
}: {
  params: Promise<{
    id: string;
  }>;
}) {
  const authorization = (await getAdminAuthHeader(req)) ?? '';
  if (!authorization) {
    return NextResponse.json({
      error: 'Unauthorized'
    }, {
      status: 401
    });
  }
  try {
    const {
      id
    } = await params;
    const body = await req.json();
    const patch: Record<string, any> = {};
    if (typeof body.name === 'string' && body.name.trim()) {
      patch.name = body.name.trim();
    }
    if (body.amount !== undefined) {
      const priceAmount = Number(body.amount);
      if (Number.isNaN(priceAmount) || priceAmount < 0) {
        return NextResponse.json({
          error: 'Price must be a number ≥ 0'
        }, {
          status: 400
        });
      }
      patch.prices = [{
        currency_code: 'gbp',
        amount: priceAmount,
        rules: []
      }];
    }
    if (typeof body.provider_id === 'string' && body.provider_id.trim()) {
      patch.provider_id = body.provider_id.trim();
    }
    if (Object.keys(patch).length === 0) {
      return NextResponse.json({
        error: 'Nothing to update'
      }, {
        status: 400
      });
    }
    const res = await fetch(`${MEDUSA_URL}/admin/shipping-options/${id}`, {
      method: 'POST',
      headers: {
        Authorization: authorization,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(patch)
    });
    const data = await safeJson(res);
    if (!res.ok) {
      return NextResponse.json({
        error: data.message ?? 'Failed to update shipping option'
      }, {
        status: res.status
      });
    }
    return NextResponse.json({
      shipping_option: data.shipping_option
    });
  } catch (err: any) {
    return NextResponse.json({
      error: err.message
    }, {
      status: 500
    });
  }
}
export async function DELETE(req: NextRequest, {
  params
}: {
  params: Promise<{
    id: string;
  }>;
}) {
  const authorization = (await getAdminAuthHeader(req)) ?? '';
  if (!authorization) {
    return NextResponse.json({
      error: 'Unauthorized'
    }, {
      status: 401
    });
  }
  try {
    const {
      id
    } = await params;
    const res = await fetch(`${MEDUSA_URL}/admin/shipping-options/${id}`, {
      method: 'DELETE',
      headers: {
        Authorization: authorization
      }
    });
    if (!res.ok) {
      const data = await safeJson(res);
      return NextResponse.json({
        error: data.message ?? 'Failed to delete shipping option'
      }, {
        status: res.status
      });
    }
    return NextResponse.json({
      success: true
    });
  } catch (err: any) {
    return NextResponse.json({
      error: err.message
    }, {
      status: 500
    });
  }
}
