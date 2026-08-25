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
async function medusaGet(authorization: string, path: string) {
  const res = await fetch(`${MEDUSA_URL}${path}`, {
    headers: {
      Authorization: authorization
    }
  });
  const data = await safeJson(res);
  if (!res.ok) throw new Error(data.message ?? `GET ${path} failed (${res.status})`);
  return data;
}
export async function GET(req: NextRequest) {
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
      stock_locations
    } = await medusaGet(authorization, '/admin/stock-locations?limit=10&fields=id,name,*fulfillment_sets,*fulfillment_sets.service_zones,*fulfillment_sets.service_zones.geo_zones');
    const {
      shipping_profiles
    } = await medusaGet(authorization, '/admin/shipping-profiles?limit=50').catch(() => ({
      shipping_profiles: []
    }));
    const {
      fulfillment_providers
    } = await medusaGet(authorization, '/admin/fulfillment-providers').catch(() => ({
      fulfillment_providers: []
    }));
    const locations = (stock_locations ?? []).map((loc: any) => ({
      id: loc.id,
      name: loc.name,
      fulfillment_sets: (loc.fulfillment_sets ?? []).filter((fs: any) => fs.type !== 'pickup' && !/pickup/i.test(fs.name ?? '')).map((fs: any) => ({
        id: fs.id,
        name: fs.name,
        type: fs.type,
        service_zones: (fs.service_zones ?? []).map((sz: any) => ({
          id: sz.id,
          name: sz.name,
          geo_zones: (sz.geo_zones ?? []).map((gz: any) => ({
            country_code: gz.country_code,
            type: gz.type
          }))
        }))
      }))
    }));
    return NextResponse.json({
      locations,
      shipping_profiles: (shipping_profiles ?? []).map((p: any) => ({
        id: p.id,
        name: p.name,
        type: p.type
      })),
      fulfillment_providers: (fulfillment_providers ?? []).map((p: any) => ({
        id: p.id
      }))
    });
  } catch (err: any) {
    return NextResponse.json({
      error: err.message
    }, {
      status: 500
    });
  }
}
export async function POST(req: NextRequest) {
  const authorization = (await getAdminAuthHeader(req)) ?? '';
  if (!authorization) {
    return NextResponse.json({
      error: 'Unauthorized'
    }, {
      status: 401
    });
  }
  try {
    const body = await req.json();
    const {
      name,
      fulfillment_set_id,
      country_codes
    } = body;
    if (!name || typeof name !== 'string' || !name.trim()) {
      return NextResponse.json({
        error: 'A zone name is required'
      }, {
        status: 400
      });
    }
    if (!fulfillment_set_id) {
      return NextResponse.json({
        error: 'A fulfillment set is required'
      }, {
        status: 400
      });
    }
    if (!Array.isArray(country_codes) || country_codes.length === 0) {
      return NextResponse.json({
        error: 'Select at least one country'
      }, {
        status: 400
      });
    }
    const res = await fetch(`${MEDUSA_URL}/admin/fulfillment-sets/${fulfillment_set_id}/service-zones`, {
      method: 'POST',
      headers: {
        Authorization: authorization,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        name: name.trim(),
        geo_zones: country_codes.map((code: string) => ({
          type: 'country',
          country_code: code.toLowerCase()
        }))
      })
    });
    const data = await safeJson(res);
    if (!res.ok) {
      return NextResponse.json({
        error: data.message ?? 'Failed to create shipping zone'
      }, {
        status: res.status
      });
    }
    return NextResponse.json({
      fulfillment_set: data.fulfillment_set
    });
  } catch (err: any) {
    return NextResponse.json({
      error: err.message
    }, {
      status: 500
    });
  }
}
