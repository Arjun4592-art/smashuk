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

/**
 * Human-readable label for a variant covering EVERY option it has (colour,
 * size, etc.), e.g. "White / S". extractSizes() deliberately only keeps
 * size-like dimensions (it drives the size filter), which meant colour was
 * invisible in the POS: a sock sold in White/Black x S/M/L showed as
 * "S S M M L L" and staff had to guess which was which.
 */
function buildVariantLabel(variant: any): string | undefined {
  const options = variant?.options
  if (!Array.isArray(options)) return undefined
  const parts = options
    .map((o: any) => (o?.value ? normalizeSizeLabel(String(o.value)) : ''))
    .filter((v: string) => v && v.toLowerCase() !== 'default')
  return parts.length > 0 ? parts.join(' / ') : undefined
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
  /** All option values joined (colour + size etc.) so variants can be told apart. */
  variantLabel?: string
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
          variantLabel: buildVariantLabel(variant),
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
