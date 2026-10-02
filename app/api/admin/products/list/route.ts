import { NextRequest, NextResponse } from 'next/server'
import { getAdminAuthHeader } from '@/lib/api/admin-auth'
import {
  AdminAuthError,
  getAdminProductList,
} from '@/lib/api/admin-products-server'

// Lean, server-cached list used by the dashboard Products page (paging,
// search, status tabs + tab counts in ONE request). The older
// GET /api/admin/products stays as-is for the pickers / cross-sell search.
export async function GET(req: NextRequest) {
  const authorization = (await getAdminAuthHeader(req)) ?? ''
  if (!authorization) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const sp = new URL(req.url).searchParams
  const status = sp.get('status')
  try {
    const result = await getAdminProductList(authorization, {
      limit: Number(sp.get('limit') ?? 20),
      offset: Number(sp.get('offset') ?? 0),
      q: sp.get('q') ?? undefined,
      status: status ? status.split(',').filter(Boolean) : undefined,
      categoryIds: (sp.get('category') ?? '').split(',').filter(Boolean),
      brand: sp.get('brand') || undefined,
      sport: sp.get('sport') || undefined,
      stock: ['in', 'low', 'out'].includes(sp.get('stock') ?? '')
        ? (sp.get('stock') as 'in' | 'low' | 'out')
        : undefined,
      priceMin: sp.get('priceMin') ? Number(sp.get('priceMin')) : undefined,
      priceMax: sp.get('priceMax') ? Number(sp.get('priceMax')) : undefined,
    })
    return NextResponse.json(result)
  } catch (err: any) {
    if (err instanceof AdminAuthError) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    console.error('[API] admin products list error:', err)
    return NextResponse.json(
      { error: err?.message || 'Failed to load products' },
      { status: 500 },
    )
  }
}
