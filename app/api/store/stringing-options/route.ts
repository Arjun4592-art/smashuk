import { NextRequest, NextResponse } from 'next/server'
import { safeJson } from '@/lib/api/safe-json'
import {
  isStringingCategoryHandle,
  isStringingSport,
  pickStringingServices,
  type StringingSport,
} from '@/lib/stringing'

/**
 * GET /api/store/stringing-options?sport=badminton|tennis|squash
 *
 * The stringing services offered in the "String Selection" dropdown on a
 * racket's page. Replaces the old approach where the browser fetched one
 * hard-coded category ("stringing-<sport>") and filtered it itself.
 *
 * Why it is different now:
 *   - It reads EVERY stringing/strings category and decides the sport from the
 *     product (name -> Sport field -> category -> model keyword), so a service
 *     filed under the wrong "Stringing" category still lands on the right
 *     sport's rackets.
 *   - It pages through everything server-side (no "first 50 only" limit).
 *   - Only services are returned; reels are never a racket add-on.
 */

const MEDUSA_URL =
  process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL ?? 'http://localhost:9000'
const PUBLISHABLE_KEY = process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY ?? ''
const STORE_HEADERS = {
  'Content-Type': 'application/json',
  'x-publishable-api-key': PUBLISHABLE_KEY,
}
const PAGE = 100
const CACHE_MS = 10_000

// Same fields the product page needs: metadata (brand / specs / type / sport),
// categories (for sport detection) and the variant's price + stock.
const FIELDS =
  '*variants.calculated_price,+metadata,*variants,+variants.inventory_quantity,+variants.manage_inventory,*categories'

type Cache = {
  at: number
  generation: number
  products: any[]
}
const g = globalThis as unknown as { __stringingCache?: Cache }

// lib/catalog/source.ts bumps this whenever the dashboard changes a product or
// its stock, so a save is visible here immediately instead of after CACHE_MS.
function currentGeneration(): number {
  const s = (globalThis as any).__smashCatalogState
  return typeof s?.generation === 'number' ? s.generation : 0
}

async function getRegionId(): Promise<string | null> {
  try {
    const res = await fetch(`${MEDUSA_URL}/store/regions?limit=1`, {
      headers: STORE_HEADERS,
      next: { revalidate: 300 },
    })
    if (!res.ok) return null
    const data = await safeJson(res, 'app/api/store/stringing-options/route.ts')
    return data.regions?.[0]?.id ?? null
  } catch {
    return null
  }
}

async function getStringingCategoryIds(): Promise<string[]> {
  const ids: string[] = []
  for (let offset = 0; offset < 1000; offset += PAGE) {
    const res = await fetch(
      `${MEDUSA_URL}/store/product-categories?limit=${PAGE}&offset=${offset}&fields=id,handle,name`,
      { headers: STORE_HEADERS, next: { revalidate: 300 } },
    )
    if (!res.ok) break
    const data = await safeJson(res, 'app/api/store/stringing-options/route.ts')
    const batch: any[] = data.product_categories ?? []
    for (const c of batch) {
      if (isStringingCategoryHandle(c.handle) || /string/i.test(c.name ?? ''))
        ids.push(c.id)
    }
    if (batch.length < PAGE) break
  }
  return ids
}

async function loadStringingProducts(): Promise<any[]> {
  const generation = currentGeneration()
  const cached = g.__stringingCache
  if (
    cached &&
    cached.generation === generation &&
    Date.now() - cached.at < CACHE_MS
  ) {
    return cached.products
  }

  const [regionId, categoryIds] = await Promise.all([
    getRegionId(),
    getStringingCategoryIds(),
  ])
  if (categoryIds.length === 0) return []

  const products: any[] = []
  for (let offset = 0; offset < 2000; offset += PAGE) {
    const params = new URLSearchParams({
      limit: String(PAGE),
      offset: String(offset),
      fields: FIELDS,
    })
    if (regionId) params.set('region_id', regionId)
    for (const id of categoryIds) params.append('category_id[]', id)
    const res = await fetch(`${MEDUSA_URL}/store/products?${params}`, {
      headers: STORE_HEADERS,
      cache: 'no-store',
    })
    if (!res.ok) {
      if (offset === 0) throw new Error(`Medusa returned ${res.status}`)
      break
    }
    const data = await safeJson(res, 'app/api/store/stringing-options/route.ts')
    const batch: any[] = data.products ?? []
    products.push(...batch)
    const total: number | undefined =
      typeof data.count === 'number' ? data.count : undefined
    if (
      batch.length < PAGE ||
      (total !== undefined && products.length >= total)
    )
      break
  }

  g.__stringingCache = { at: Date.now(), generation, products }
  return products
}

export async function GET(req: NextRequest) {
  try {
    const raw = (req.nextUrl.searchParams.get('sport') ?? '')
      .toLowerCase()
      .trim()
    // Sports with no stringing (padel, …) fall back to badminton, as before.
    const sport: StringingSport = isStringingSport(raw) ? raw : 'badminton'

    const all = await loadStringingProducts()
    const { matched, debug } = pickStringingServices(all, sport)

    const body: Record<string, unknown> = { sport, products: matched }
    // Development only: how every stringing product was classified, so a
    // missing service can be explained from the browser console.
    if (process.env.NODE_ENV !== 'production') body.debug = debug

    return NextResponse.json(body, {
      headers: {
        'Cache-Control':
          process.env.NODE_ENV !== 'production'
            ? 'no-store'
            : 'public, s-maxage=10, stale-while-revalidate=20',
      },
    })
  } catch (err: any) {
    console.error('[stringing-options]', err?.message ?? err)
    return NextResponse.json(
      { sport: null, products: [], error: 'Failed to load stringing options' },
      { status: 500 },
    )
  }
}
