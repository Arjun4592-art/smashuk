import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { SURFACE_COOKIES } from '@/lib/api/auth-cookie'
import { medusaServiceFetch } from '@/lib/api/medusa-service-token'

async function requirePosSession(): Promise<boolean> {
  const cookieStore = await cookies()
  const posToken = cookieStore.get(SURFACE_COOKIES.pos.tokenCookie)?.value
  const dashboardToken = cookieStore.get(
    SURFACE_COOKIES.dashboard.tokenCookie,
  )?.value
  return Boolean(posToken || dashboardToken)
}

// The other half of the /api/pos/index split (see that route's comment for
// the full reasoning). That endpoint answers "which items match" from a
// tiny, priceless/stockless index; this one answers "what's the real price
// and stock for THESE SPECIFIC items" — called only for whatever the
// billing screen's current search/category/size filter actually narrowed
// down to, never the whole catalogue. Combining price and stock in one call
// here (unlike the fast/stock split in /api/pos/products) is fine BECAUSE
// the id list is small — the deep inventory join that was slow across 1700
// products is cheap across a scoped handful.
//
// Deliberately duplicates extractPrice/extractStock/extractSize rather than
// importing them from lib/api/pos.ts: those are paired with client-side
// `fetch()` wrappers not meant to run server-side, and copying a few small,
// pure functions is lower-risk here than restructuring that module's
// client/server boundary. Kept byte-for-byte identical to lib/api/pos.ts —
// if you change the pricing/stock logic there, mirror it here too.
const DETAIL_FIELDS =
  'id,title,thumbnail,status,metadata,*variants.prices,variants.sku,variants.id,*variants.inventory_items,*variants.inventory_items.inventory,*variants.inventory_items.inventory.location_levels'
const MAX_IDS = 100

function extractPrice(variant: any, productMetadata: any): number {
  const gbpPrice = variant?.prices?.find(
    (pr: any) => pr.currency_code === 'gbp',
  )?.amount
  if (gbpPrice != null && gbpPrice > 0) {
    return Math.round(gbpPrice * 100) / 100
  }
  const anyPrice = variant?.prices?.[0]?.amount
  if (anyPrice != null && anyPrice > 0) {
    return Math.round(anyPrice * 100) / 100
  }
  const metaSale = parseFloat(productMetadata?.sale_price ?? '0')
  if (metaSale > 0) return metaSale
  const metaRegular = parseFloat(productMetadata?.regular_price ?? '0')
  if (metaRegular > 0) return metaRegular
  return 0
}
function extractStock(variant: any): number {
  const invItem = variant?.inventory_items?.[0]
  if (invItem) {
    const levels = invItem?.inventory?.location_levels
    if (Array.isArray(levels) && levels.length > 0) {
      return levels.reduce(
        (sum: number, l: any) =>
          sum + (l.available_quantity ?? l.stocked_quantity ?? 0),
        0,
      )
    }
    const stocked = invItem?.inventory?.stocked_quantity
    if (stocked != null) return stocked
  }
  return variant?.inventory_quantity ?? 0
}

export interface POSDetailEntry {
  productId: string
  variantId: string
  price: number
  stock: number
  image?: string
  channel: 'both' | 'online_only' | 'pos_only'
}

export async function GET(req: NextRequest) {
  if (!(await requirePosSession())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const idsParam = req.nextUrl.searchParams.get('ids')
  if (!idsParam) {
    return NextResponse.json({ error: 'ids is required' }, { status: 400 })
  }
  const ids = idsParam.split(',').filter(Boolean).slice(0, MAX_IDS)
  if (ids.length === 0) {
    return NextResponse.json({ entries: [] })
  }
  try {
    const params = new URLSearchParams()
    for (const id of ids) params.append('id[]', id)
    params.set('fields', DETAIL_FIELDS)
    params.set('limit', String(ids.length))
    // No caching — this is exactly the data a cashier is about to sell
    // against. It must be live every time.
    const response = await medusaServiceFetch(`/admin/products?${params}`, {
      cache: 'no-store',
    })
    if (!response.ok) {
      const errText = await response.text()
      throw new Error(`Medusa error ${response.status}: ${errText}`)
    }
    const data = await response.json()
    const entries: POSDetailEntry[] = []
    for (const p of (data.products ?? []) as any[]) {
      for (const variant of p.variants ?? []) {
        if (!variant?.id) continue
        entries.push({
          productId: p.id,
          variantId: variant.id,
          price: extractPrice(variant, p.metadata),
          stock: extractStock(variant),
          image: p.thumbnail ?? undefined,
          channel: (p.metadata?.channel as any) ?? 'both',
        })
      }
    }
    return NextResponse.json(
      { entries },
      { headers: { 'Cache-Control': 'no-store' } },
    )
  } catch (err: any) {
    console.error('[POS] Details route error:', err.message)
    return NextResponse.json(
      { error: err.message || 'Internal server error' },
      { status: 500 },
    )
  }
}
