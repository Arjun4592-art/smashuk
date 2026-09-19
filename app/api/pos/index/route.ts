import { NextResponse } from 'next/server'
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

// ARCHITECTURE — why this route exists, and why it's built this way.
//
// This is the "search server-side" rework of the billing screen. It exists
// because of a real, confirmed limitation, not a guess:
//
//   Medusa's GET /admin/products?q= does NOT search variant SKU — only
//   title/subtitle/description (github.com/medusajs/medusa/issues/15239,
//   an open regression vs Medusa v1). Barcode scanning on this screen
//   matches almost entirely on SKU. Building server-side search directly on
//   Medusa's own q= param would have made every SKU-based scan silently
//   fail to find its product — at a till, mid-sale. That is not an
//   acceptable risk to take on an assumption, so this was verified against
//   Medusa's own issue tracker before writing a line of this route.
//
// The fix: this route returns a TINY per-variant index — sku, name,
// category, size — with NO price and NO stock. Search, scan-matching, and
// category/size filtering all run over this index, using the exact same
// matching logic the billing page already used (name substring, SKU exact
// then substring, category equality, size+sizeOptionTitle equality) — just
// moved here so the browser never has to hold or filter the FULL product
// objects (price rows, options, inventory) to answer "which items match".
//
// Price and live stock for whatever the index-search actually narrows down
// to are fetched separately, only for that narrowed set — see
// /api/pos/details. That split is what makes this fast: the expensive part
// was never search logic, it was the field weight (prices, options,
// inventory joins) carried by every one of ~1700 products on every load.
// An index entry carries none of that.
const INDEX_FIELDS =
  'id,title,+metadata,*categories,variants.id,variants.sku,variants.ean,variants.barcode,*variants.options,variants.options.value,*variants.options.option,variants.options.option.title,*sales_channels'
const PAGE_SIZE = 200
const CONCURRENCY = 12

async function fetchPage(offset: number, cacheInit: RequestInit) {
  const response = await medusaServiceFetch(
    `/admin/products?limit=${PAGE_SIZE}&offset=${offset}&status[]=published&fields=${INDEX_FIELDS}`,
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

// Ported verbatim from lib/api/store.ts's pickCategory (the storefront's
// proven fix for a known Medusa data issue): products can end up linked to
// BOTH a generic "Rackets" category AND their real, specific one (e.g.
// "Badminton Rackets") — a stale leftover from an earlier re-categorising
// pass. Medusa returns `categories` in no guaranteed order, so picking
// categories[0] blindly (what this route did before) put a large chunk of
// racket products under a generic "Rackets" bucket instead of their sport-
// specific one — exactly the bug that made "Badminton Rackets"/"Tennis"/
// "Squash" appear empty in POS while the website (which already had this
// fix) showed them fine.
const SPORT_CATEGORY_SLUGS = new Set([
  'badminton',
  'tennis',
  'padel',
  'squash',
  'clothing',
])
function pickCategoryName(categories: any[] | undefined): string {
  if (!categories || categories.length === 0) return 'Uncategorized'
  const specificOnes = categories.filter(
    (c) => c?.handle && !SPORT_CATEGORY_SLUGS.has(c.handle),
  )
  const preferred =
    specificOnes.find((c) => !/rackets?$/i.test(c.handle ?? '')) ??
    specificOnes[0]
  const chosen = preferred ?? categories[0]
  return chosen?.name ?? 'Uncategorized'
}
const SIZE_LIKE_OPTION_TITLE = /size|weight|grip/i
function normalizeSizeLabel(raw: string): string {
  return raw.trim().replace(/\s+/g, ' ').replace(/\s*\(/g, ' (')
}
export interface POSSizeDimension {
  title: string
  value: string
}
/**
 * A variant can carry MORE THAN ONE size-like dimension at once — e.g. a
 * racket variant distinguished by both Weight ("4U") AND Grip Size ("G4")
 * as two separate options on the same variant. The earlier version of
 * this used `.find()`, which returns only the FIRST matching option —
 * silently dropping whichever dimension didn't happen to come first in
 * Medusa's array, making that variant unfindable when filtering by the
 * dropped dimension. `.filter()` keeps all of them.
 */
function extractSizes(variant: any): POSSizeDimension[] {
  const options = variant?.options
  if (!Array.isArray(options)) return []
  return options
    .filter((o: any) => SIZE_LIKE_OPTION_TITLE.test(o?.option?.title ?? ''))
    .filter((o: any) => o?.value)
    .map((o: any) => ({
      title: String(o.option.title).trim(),
      value: normalizeSizeLabel(String(o.value)),
    }))
}

export interface POSIndexEntry {
  productId: string
  variantId: string
  sku: string
  /** EAN / barcode — scanned codes match against these before SKU. */
  ean?: string
  barcode?: string
  name: string
  brand: string
  category: string
  /** Every size-like dimension this variant has — usually one, sometimes more. */
  sizes: POSSizeDimension[]
}

export async function GET() {
  if (!(await requirePosSession())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  try {
    // This carries no price or stock, so a longer cache window is safe —
    // name/SKU/category/size change far less often than price or
    // inventory, and this is exactly the payload every terminal needs on
    // open. A 5-minute cache means only the first terminal to open in that
    // window pays a real Medusa round trip; everyone else gets it instantly
    // from the Data Cache.
    const cacheInit: RequestInit = { next: { revalidate: 300 } }
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
    const entries: POSIndexEntry[] = []
    for (const p of allProducts) {
      if (inferSellingChannel(p.sales_channels) === 'website') continue
      const category = pickCategoryName(p.categories)
      for (const variant of p.variants ?? []) {
        if (!variant?.id) continue
        entries.push({
          productId: p.id,
          variantId: variant.id,
          sku: variant.sku ?? `${p.id}-${variant.id}`,
          ean: variant.ean ?? undefined,
          barcode: variant.barcode ?? undefined,
          name: p.title ?? 'Unknown Product',
          brand: p.metadata?.brand ?? 'Unknown',
          category,
          sizes: extractSizes(variant),
        })
      }
    }
    return NextResponse.json(
      { entries },
      {
        headers: {
          // Client-side (browser) cache too, short — this is per-staff-
          // session data, not something to share across a CDN.
          'Cache-Control': 'private, max-age=60',
        },
      },
    )
  } catch (err: any) {
    console.error('[POS] Index route error:', err.message)
    return NextResponse.json(
      { error: err.message || 'Internal server error' },
      { status: 500 },
    )
  }
}
