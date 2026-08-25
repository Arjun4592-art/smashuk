import { NextRequest, NextResponse } from 'next/server';
import { STORE_PRODUCT_FIELDS, STORE_PRODUCT_LISTING_FIELDS } from '@/lib/api/store';
import { safeJson } from '@/lib/api/safe-json';
const MEDUSA_URL = process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL ?? 'http://localhost:9000';
const PUBLISHABLE_KEY = process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY ?? '';
const STORE_HEADERS = {
  'Content-Type': 'application/json',
  'x-publishable-api-key': PUBLISHABLE_KEY
};
async function getFirstRegionId(): Promise<string | null> {
  try {
    const res = await fetch(`${MEDUSA_URL}/store/regions?limit=1`, {
      headers: STORE_HEADERS,
      next: {
        revalidate: 300
      }
    });
    if (!res.ok) return null;
    const data = await safeJson(res, 'app/api/store/products/route.ts');
    return data.regions?.[0]?.id ?? null;
  } catch {
    return null;
  }
}
export async function GET(req: NextRequest) {
  const routeStart = Date.now();
  try {
    const {
      searchParams
    } = req.nextUrl;
    const limit = searchParams.get('limit') ?? '20';
    const offset = searchParams.get('offset') ?? '0';
    const q = searchParams.get('q') ?? '';
    const handle = searchParams.get('handle') ?? '';
    const category_id = searchParams.get('category_id') ?? '';
    const ids = searchParams.get('id') ?? '';
    const light = searchParams.get('light') === '1';
    const fields = light ? STORE_PRODUCT_LISTING_FIELDS : STORE_PRODUCT_FIELDS;
    const regionStart = Date.now();
    const regionId = light ? null : await getFirstRegionId();
    const regionMs = Date.now() - regionStart;
    const params = new URLSearchParams({
      limit,
      offset,
      fields
    });
    if (q) params.set('q', q);
    if (handle) params.set('handle', handle);
    if (category_id) params.set('category_id[]', category_id);
    if (regionId) params.set('region_id', regionId);
    if (ids) {
      ids.split(',').filter(Boolean).forEach(id => params.append('id[]', id));
    }
    const url = `${MEDUSA_URL}/store/products?${params.toString()}`;
    const medusaStart = Date.now();
    const res = await fetch(url, {
      headers: STORE_HEADERS,
      next: {
        revalidate: 60
      }
    });
    const medusaMs = Date.now() - medusaStart;
    if (!res.ok) {
      const errText = await res.text();
      console.error('[/api/store/products] Medusa error:', res.status, errText);
      return NextResponse.json({
        error: 'Failed to fetch products',
        products: [],
        count: 0
      }, {
        status: res.status
      });
    }
    const data = await safeJson(res, 'app/api/store/products/route.ts');
    const totalMs = Date.now() - routeStart;
    if (totalMs > 1000) {
      console.warn(`[/api/store/products] SLOW — region=${regionMs}ms medusa=${medusaMs}ms total=${totalMs}ms limit=${limit} offset=${offset} light=${light} q="${q}" handle="${handle}"`);
    }
    return NextResponse.json(data);
  } catch (err: any) {
    console.error('[/api/store/products] Error:', err.message);
    return NextResponse.json({
      error: 'Medusa backend unreachable. Check NEXT_PUBLIC_MEDUSA_BACKEND_URL.',
      products: [],
      count: 0
    }, {
      status: 503
    });
  }
}
