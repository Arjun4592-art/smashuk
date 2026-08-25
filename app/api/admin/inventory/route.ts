import { NextRequest, NextResponse } from 'next/server';
import { getAdminAuthHeader } from '@/lib/api/admin-auth';
import { safeJson } from '@/lib/api/safe-json';
const MEDUSA_URL = process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL;
export async function GET(req: NextRequest) {
  const {
    searchParams
  } = new URL(req.url);
  const limit = searchParams.get('limit') ?? '50';
  const offset = searchParams.get('offset') ?? '0';
  const q = searchParams.get('q');
  const authorization = (await getAdminAuthHeader(req)) ?? '';
  if (!authorization) {
    return NextResponse.json({
      error: 'Missing Authorization header'
    }, {
      status: 401
    });
  }
  const params = new URLSearchParams({
    limit,
    offset
  });
  if (q) params.set('q', q);
  params.set('fields', 'id,title,status,thumbnail,*categories,variants.id,variants.title,variants.sku,*variants.prices,variants.updated_at,*variants.inventory_items,*variants.inventory_items.inventory.location_levels');
  try {
    const res = await fetch(`${MEDUSA_URL}/admin/products?${params}`, {
      headers: {
        Authorization: authorization
      }
    });
    const data = await safeJson(res, 'app/api/admin/inventory/route.ts');
    if (!res.ok) return NextResponse.json({
      error: data.message
    }, {
      status: res.status
    });
    return NextResponse.json(data);
  } catch (err: any) {
    console.error('[API] inventory error:', err);
    return NextResponse.json({
      error: err.message
    }, {
      status: 500
    });
  }
}
