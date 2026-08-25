import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { SURFACE_COOKIES } from '@/lib/api/auth-cookie';
import { medusaServiceFetch } from '@/lib/api/medusa-service-token';
import { inferSellingChannel } from '@/lib/api/selling-channels-client';
async function requirePosSession(): Promise<boolean> {
  const cookieStore = await cookies();
  const posToken = cookieStore.get(SURFACE_COOKIES.pos.tokenCookie)?.value;
  const dashboardToken = cookieStore.get(SURFACE_COOKIES.dashboard.tokenCookie)?.value;
  return Boolean(posToken || dashboardToken);
}
export async function GET() {
  if (!(await requirePosSession())) {
    return NextResponse.json({
      error: 'Unauthorized'
    }, {
      status: 401
    });
  }
  try {
    const response = await medusaServiceFetch('/admin/products?limit=200&status[]=published&fields=id,title,description,thumbnail,status,*categories,*images,*variants,*variants.prices,variants.sku,variants.id,*variants.inventory_items,*variants.inventory_items.inventory,*variants.inventory_items.inventory.location_levels,*sales_channels');
    if (!response.ok) {
      const errText = await response.text();
      console.error('[POS] Medusa API error:', response.status, errText);
      return NextResponse.json({
        error: `Medusa error: ${response.status}`,
        details: errText
      }, {
        status: response.status
      });
    }
    const data = await response.json();
    const allProducts = data.products ?? [];
    const products = allProducts.filter((p: any) => inferSellingChannel(p.sales_channels) !== 'website');
    return NextResponse.json({
      products
    });
  } catch (err: any) {
    console.error('[POS] Products route error:', err.message);
    return NextResponse.json({
      error: err.message || 'Internal server error'
    }, {
      status: 500
    });
  }
}
