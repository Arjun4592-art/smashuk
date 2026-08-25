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
    const res = await fetch(`${MEDUSA_URL}/admin/stores?limit=1&fields=id,name,default_currency_code,metadata`, {
      headers: {
        Authorization: authHeader
      }
    });
    const data = await safeJson(res);
    if (!res.ok) {
      return NextResponse.json({
        error: data.message ?? 'Failed to load store'
      }, {
        status: res.status
      });
    }
    const store = data.stores?.[0];
    if (!store) {
      return NextResponse.json({
        error: 'No store found'
      }, {
        status: 404
      });
    }
    const meta = store.metadata ?? {};
    return NextResponse.json({
      storeId: store.id,
      store: {
        name: store.name ?? '',
        email: meta.email ?? '',
        phone: meta.phone ?? '',
        website: meta.website ?? '',
        description: meta.description ?? '',
        currency: (store.default_currency_code ?? 'gbp').toUpperCase(),
        timezone: meta.timezone ?? 'Europe/London',
        weightUnit: meta.weightUnit ?? 'kg',
        language: meta.language ?? 'en'
      },
      address: {
        line1: meta.address_line1 ?? '',
        line2: meta.address_line2 ?? '',
        city: meta.address_city ?? '',
        state: meta.address_state ?? '',
        pincode: meta.address_pincode ?? '',
        country: meta.address_country ?? ''
      }
    });
  } catch (err: any) {
    console.error('[API] general-settings GET error:', err);
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
    const {
      storeId,
      store,
      address
    } = body;
    if (!storeId) {
      return NextResponse.json({
        error: 'storeId required'
      }, {
        status: 400
      });
    }
    const currentRes = await fetch(`${MEDUSA_URL}/admin/stores?limit=1&fields=id,metadata`, {
      headers: {
        Authorization: authHeader
      }
    });
    const currentData = await safeJson(currentRes);
    const currentMetadata = currentRes.ok ? currentData.stores?.[0]?.metadata ?? {} : {};
    const payload = {
      name: store?.name,
      metadata: {
        ...currentMetadata,
        email: store?.email ?? '',
        phone: store?.phone ?? '',
        website: store?.website ?? '',
        description: store?.description ?? '',
        timezone: store?.timezone ?? '',
        weightUnit: store?.weightUnit ?? '',
        language: store?.language ?? '',
        address_line1: address?.line1 ?? '',
        address_line2: address?.line2 ?? '',
        address_city: address?.city ?? '',
        address_state: address?.state ?? '',
        address_pincode: address?.pincode ?? '',
        address_country: address?.country ?? ''
      }
    };
    const res = await fetch(`${MEDUSA_URL}/admin/stores/${storeId}`, {
      method: 'POST',
      headers: {
        Authorization: authHeader,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });
    const data = await safeJson(res);
    if (!res.ok) {
      return NextResponse.json({
        error: data.message ?? 'Failed to save settings'
      }, {
        status: res.status
      });
    }
    return NextResponse.json({
      success: true
    });
  } catch (err: any) {
    console.error('[API] general-settings POST error:', err);
    return NextResponse.json({
      error: err.message
    }, {
      status: 500
    });
  }
}
