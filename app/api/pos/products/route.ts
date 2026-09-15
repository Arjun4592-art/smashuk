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
const PRODUCT_FIELDS =
  'id,title,thumbnail,status,*categories,*variants,*variants.prices,variants.sku,variants.id,variants.title,*variants.options,variants.options.value,*variants.options.option,variants.options.option.title,*variants.inventory_items,*variants.inventory_items.inventory,*variants.inventory_items.inventory.location_levels,*sales_channels'
const PAGE_SIZE = 200
const CONCURRENCY = 5
async function fetchPage(offset: number, cacheInit: RequestInit) {
  const response = await medusaServiceFetch(
    `/admin/products?limit=${PAGE_SIZE}&offset=${offset}&status[]=published&fields=${PRODUCT_FIELDS}`,
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
  try {
    // The store has grown past a single page of results — a flat
    // `limit=200` cut the catalog off there and silently dropped every
    // product after it from the POS (no error, they just never showed up
    // in search, filters, or scanning). Page through everything Medusa has.
    //
    // PERF: this used to be a `while(true)` loop — one page awaited, THEN
    // the next requested, serially, for as many ~200-product pages as the
    // catalogue needs (getting close to 10 round trips at ~1700 products),
    // each carrying the same heavy field set. Fetch the first page to learn
    // `count`, then fire the rest concurrently in small batches — same
    // total number of Medusa calls, but they overlap instead of queueing.
    const first = await fetchPage(0, cacheInit)
    const allProducts: any[] = [...first.products]
    const offsets: number[] = []
    for (let o = PAGE_SIZE; o < first.count; o += PAGE_SIZE) offsets.push(o)
    for (let i = 0; i < offsets.length; i += CONCURRENCY) {
      const batch = offsets.slice(i, i + CONCURRENCY)
      const results = await Promise.all(
        batch.map((offset) => fetchPage(offset, cacheInit)),
      )
      for (const r of results) allProducts.push(...r.products)
    }
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
