import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { SURFACE_COOKIES } from '@/lib/api/auth-cookie'
import { medusaServiceFetch } from '@/lib/api/medusa-service-token'
import { inferSellingChannel } from '@/lib/api/selling-channels-client'
async function requirePosSession(): Promise<boolean> {
  const cookieStore = await cookies()
  const posToken = cookieStore.get(SURFACE_COOKIES.pos.tokenCookie)?.value
  const dashboardToken = cookieStore.get(
    SURFACE_COOKIES.dashboard.tokenCookie,
  )?.value
  return Boolean(posToken || dashboardToken)
}
// PERF — verified against actual POS component usage (grep across
// components/pos/ and store/posStore.ts) before cutting anything:
//   - `description` is fetched but never rendered anywhere in the POS UI. Cut.
//   - `*images` (the full product-level gallery) is only ever used as
//     `p.thumbnail ?? p.images?.[0]?.url` in lib/api/pos.ts — a fallback for
//     the rare product missing a thumbnail. `thumbnail` is part of Medusa's
//     default projection already (no `+` needed), so dropping `*images`
//     only loses that rare fallback — same tradeoff already made for the
//     storefront.
//
// Deliberately NOT touched:
//   - `*variants.prices` and the
//     `*variants.inventory_items.inventory.location_levels` join. Both are
//     genuinely load-bearing (POS needs real price + real available stock
//     to ring up a sale correctly), and the deep inventory join is exactly
//     the shape of query Medusa's own community has reported as slow. I'd
//     normally trim this too, but after breaking storefront stock today by
//     restructuring a fields string without a live Medusa instance to test
//     against, I'm not touching pricing/inventory composition again blind.
//     If you want this optimized, it needs testing against your actual
//     backend — happy to do it with you watching the result, not solo.
// PERF — split into two phases.
//
// The single combined field set below carried
// `*variants.inventory_items.inventory.location_levels` — the deep,
// multi-hop join across the Inventory module that both Medusa's own
// community and its docs call out as expensive. Across the whole catalogue
// (~1700 products, several variants each) this was measured at 55+ seconds
// and 16+MB in production (see the DevTools capture that prompted this).
// That's not a field-trimming problem like the earlier fixes — it's a real,
// unavoidable cost of computing live stock for every variant in one shot.
//
// Rather than touch how that number is COMPUTED (which is exactly the kind
// of change that broke storefront stock earlier today), this splits WHEN it
// arrives:
//   - FAST_FIELDS: everything the register needs to be usable — name,
//     price, category, options, sales channel — with NO inventory join.
//     This is what makes the grid appear.
//   - STOCK_FIELDS: just enough to compute per-variant stock, fetched
//     right after and merged in once it lands.
// Same two Medusa queries as before, same total data, same computation —
// just not both blocking the register from showing anything until both are
// done. See store/posStore.ts for how the two responses get merged, and why
// showing a brief optimistic stock number during that gap is safe: POS
// already lets staff sell out-of-stock items on purpose (see
// ensureBackorderAllowed in app/api/pos/orders/route.ts) — stock here has
// always been advisory, never a hard checkout gate.
const FAST_FIELDS =
  'id,title,thumbnail,status,*categories,*variants,*variants.prices,variants.sku,variants.id,variants.title,*variants.options,variants.options.value,*variants.options.option,variants.options.option.title,*sales_channels'
const STOCK_FIELDS =
  'id,*variants.id,*variants.inventory_items,*variants.inventory_items.inventory,*variants.inventory_items.inventory.location_levels'
const PAGE_SIZE = 200
const CONCURRENCY = 5
async function fetchPage(
  offset: number,
  fields: string,
  cacheInit: RequestInit,
) {
  const response = await medusaServiceFetch(
    `/admin/products?limit=${PAGE_SIZE}&offset=${offset}&status[]=published&fields=${fields}`,
    cacheInit,
  )
  if (!response.ok) {
    const errText = await response.text()
    throw new Error(`Medusa error ${response.status}: ${errText}`)
  }
  const data = await response.json()
  return {
    products: (data.products ?? []) as any[],
    count: typeof data.count === 'number' ? data.count : 0,
  }
}
async function fetchAllPages(fields: string, cacheInit: RequestInit) {
  const first = await fetchPage(0, fields, cacheInit)
  const allProducts: any[] = [...first.products]
  const offsets: number[] = []
  for (let o = PAGE_SIZE; o < first.count; o += PAGE_SIZE) offsets.push(o)
  for (let i = 0; i < offsets.length; i += CONCURRENCY) {
    const batch = offsets.slice(i, i + CONCURRENCY)
    const results = await Promise.all(
      batch.map((offset) => fetchPage(offset, fields, cacheInit)),
    )
    for (const r of results) allProducts.push(...r.products)
  }
  return allProducts
}
export async function GET(req: NextRequest) {
  if (!(await requirePosSession())) {
    return NextResponse.json(
      {
        error: 'Unauthorized',
      },
      {
        status: 401,
      },
    )
  }
  // The "Sync" button in the POS UI needs an actually-fresh read — a stale
  // cache there would silently defeat the one button whose whole job is to
  // guarantee freshness. Everything else (the normal one-time load per
  // session) is fine reading a short-lived cache: staff open a new terminal
  // far more often than stock changes minute-to-minute, and this is what
  // turns N terminals opening at once into ONE upstream Medusa query instead
  // of N full-catalogue deep-join queries.
  const force = req.nextUrl.searchParams.get('force') === '1'
  const cacheInit: RequestInit = force
    ? { cache: 'no-store' }
    : { next: { revalidate: 30 } }
  // `phase=fast` (product+price, no inventory join) renders the register.
  // `phase=stock` (inventory only) follows a moment later and gets merged
  // in client-side. No `phase` param = old combined behaviour, kept for any
  // caller that genuinely wants one complete response.
  const phase = req.nextUrl.searchParams.get('phase')
  try {
    if (phase === 'stock') {
      const allProducts = await fetchAllPages(STOCK_FIELDS, cacheInit)
      return NextResponse.json({
        products: allProducts,
      })
    }
    const fields =
      phase === 'fast' ? FAST_FIELDS : FAST_FIELDS + ',' + STOCK_FIELDS
    const allProducts = await fetchAllPages(fields, cacheInit)
    const products = allProducts.filter(
      (p: any) => inferSellingChannel(p.sales_channels) !== 'website',
    )
    return NextResponse.json({
      products,
    })
  } catch (err: any) {
    console.error('[POS] Products route error:', err.message)
    return NextResponse.json(
      {
        error: err.message || 'Internal server error',
      },
      {
        status: 500,
      },
    )
  }
}
