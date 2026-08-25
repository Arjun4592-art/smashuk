import { NextRequest, NextResponse } from 'next/server';
import { getAdminAuthHeader } from '@/lib/api/admin-auth';
const MEDUSA_URL = process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL ?? 'http://localhost:9000';
const DEFAULTS = {
  zones: [],
  freeShippingThreshold: '80',
  defaultWeight: '500',
  packagingFee: '0'
};
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
export async function GET(req: NextRequest) {
  const authHeader = await getAdminAuthHeader(req);
  if (!authHeader) {
    return NextResponse.json({
      error: 'Unauthorized'
    }, {
      status: 401
    });
  }
  try {
    const res = await fetch(`${MEDUSA_URL}/admin/stores?limit=1&fields=id,metadata`, {
      headers: {
        Authorization: authHeader
      }
    });
    const data = await safeJson(res);
    if (!res.ok) {
      return NextResponse.json({
        error: data.message ?? 'Failed to load shipping settings'
      }, {
        status: res.status
      });
    }
    const meta = data.stores?.[0]?.metadata ?? {};
    return NextResponse.json(meta.shippingSettings ?? DEFAULTS);
  } catch (err: any) {
    console.error('[API] shipping-settings GET error:', err);
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
    const storeRes = await fetch(`${MEDUSA_URL}/admin/stores?limit=1&fields=id,metadata`, {
      headers: {
        Authorization: authHeader
      }
    });
    const storeData = await safeJson(storeRes);
    const storeId = storeData.stores?.[0]?.id;
    const currentMetadata = storeData.stores?.[0]?.metadata ?? {};
    if (!storeRes.ok || !storeId) {
      return NextResponse.json({
        error: storeData.message ?? 'No store found'
      }, {
        status: storeRes.status || 500
      });
    }
    const res = await fetch(`${MEDUSA_URL}/admin/stores/${storeId}`, {
      method: 'POST',
      headers: {
        Authorization: authHeader,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        metadata: {
          ...currentMetadata,
          shippingSettings: body
        }
      })
    });
    const data = await safeJson(res);
    if (!res.ok) {
      return NextResponse.json({
        error: data.message ?? 'Failed to save shipping settings'
      }, {
        status: res.status
      });
    }
    return NextResponse.json({
      success: true
    });
  } catch (err: any) {
    console.error('[API] shipping-settings POST error:', err);
    return NextResponse.json({
      error: err.message
    }, {
      status: 500
    });
  }
}
