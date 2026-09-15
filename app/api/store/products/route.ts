import { NextRequest, NextResponse } from 'next/server'
import {
  STORE_PRODUCT_FIELDS,
  STORE_PRODUCT_LISTING_FIELDS,
} from '@/lib/api/store'
import { safeJson } from '@/lib/api/safe-json'
const MEDUSA_URL =
  process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL ?? 'http://localhost:9000'
const PUBLISHABLE_KEY = process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY ?? ''
const STORE_HEADERS = {
  'Content-Type': 'application/json',
  'x-publishable-api-key': PUBLISHABLE_KEY,
}
async function getFirstRegionId(): Promise<string | null> {
  try {
    const res = await fetch(`${MEDUSA_URL}/store/regions?limit=1`, {
      headers: STORE_HEADERS,
      next: {
        revalidate: 300,
      },
    })
    if (!res.ok) return null
    const data = await safeJson(res, 'app/api/store/products/route.ts')
    return data.regions?.[0]?.id ?? null
  } catch {
    return null
  }
}
async function getCategoryIdByHandle(handle: string): Promise<string | null> {
  try {
    const res = await fetch(
      `${MEDUSA_URL}/store/product-categories?handle[]=${encodeURIComponent(handle)}&limit=1`,
      {
        headers: STORE_HEADERS,
        next: {
          revalidate: 300,
        },
      },
    )
    if (!res.ok) return null
    const data = await safeJson(res, 'app/api/store/products/route.ts')
    return data.product_categories?.[0]?.id ?? null
  } catch {
    return null
  }
}
export async function GET(req: NextRequest) {
  const routeStart = Date.now()
  try {
    const { searchParams } = req.nextUrl
    const limit = searchParams.get('limit') ?? '20'
    const offset = searchParams.get('offset') ?? '0'
    const q = searchParams.get('q') ?? ''
    const handle = searchParams.get('handle') ?? ''
    const category_id = searchParams.get('category_id') ?? ''
    const category_handle = searchParams.get('category_handle') ?? ''
    const ids = searchParams.get('id') ?? ''
    const light = searchParams.get('light') === '1'
    const fields = light ? STORE_PRODUCT_LISTING_FIELDS : STORE_PRODUCT_FIELDS
    const regionStart = Date.now()
    // Two changes here:
    //  1. The region is now resolved for `light` listings too. The slim
    //     listing field set reads prices via *variants.calculated_price, and
    //     Medusa only populates that when region_id is on the query.
    //  2. Region and category lookups run CONCURRENTLY. They were two
    //     independent, sequential awaits in front of the products call, so on
    //     a cold Data Cache every listing paid both latencies back to back
    //     before the real query even started. Both are revalidate:300 so this
    //     is nearly always a cache hit, but the cold path was serial for no
    //     reason.
    const [regionId, lookedUpCategoryId] = await Promise.all([
      getFirstRegionId(),
      !category_id && category_handle
        ? getCategoryIdByHandle(category_handle)
        : Promise.resolve(null),
    ])
    const regionMs = Date.now() - regionStart
    const resolvedCategoryId = category_id || (lookedUpCategoryId ?? '')
    const params = new URLSearchParams({
      limit,
      offset,
      fields,
    })
    if (q) params.set('q', q)
    if (handle) params.set('handle', handle)
    if (resolvedCategoryId) params.set('category_id[]', resolvedCategoryId)
    if (regionId) params.set('region_id', regionId)
    if (ids) {
      ids
        .split(',')
        .filter(Boolean)
        .forEach((id) => params.append('id[]', id))
    }
    if (category_handle && !resolvedCategoryId) {
      return NextResponse.json({
        products: [],
        count: 0,
      })
    }
    const url = `${MEDUSA_URL}/store/products?${params.toString()}`
    const medusaStart = Date.now()
    // A single-product lookup (handle set) drives the PDP's "In Stock" /
    // "Only N left" copy — that must reflect the current inventory, not a
    // snapshot from up to 60s (or longer, if the page wasn't hit again to
    // trigger ISR revalidation) ago. Listing/search calls (no handle) keep
    // the 60s cache since browse-page staleness doesn't risk overselling.
    const res = await fetch(url, {
      headers: STORE_HEADERS,
      ...(handle
        ? {
            cache: 'no-store' as const,
          }
        : {
            next: {
              revalidate: 60,
            },
          }),
    })
    const medusaMs = Date.now() - medusaStart
    if (!res.ok) {
      const errText = await res.text()
      console.error('[/api/store/products] Medusa error:', res.status, errText)
      return NextResponse.json(
        {
          error: 'Failed to fetch products',
          products: [],
          count: 0,
        },
        {
          status: res.status,
        },
      )
    }
    const data = await safeJson(res, 'app/api/store/products/route.ts')
    const totalMs = Date.now() - routeStart
    if (totalMs > 1000) {
      console.warn(
        `[/api/store/products] SLOW — region=${regionMs}ms medusa=${medusaMs}ms total=${totalMs}ms limit=${limit} offset=${offset} light=${light} q="${q}" handle="${handle}"`,
      )
    }
    // The route's own HTTP response carried no Cache-Control at all, so every
    // browser/CDN hit went all the way back to Medusa even when the Next Data
    // Cache upstream was warm. Browse/search responses are identical for every
    // visitor, so they can be shared: `s-maxage` lets the CDN serve them, and
    // `stale-while-revalidate` means the refresh happens off the critical path
    // instead of making one unlucky shopper wait for Medusa.
    //
    // Single-product lookups (`handle` set) stay uncacheable — same reasoning
    // as the `cache: 'no-store'` above: that response drives the "Only N left"
    // copy and the max quantity a customer can check out with.
    return NextResponse.json(data, {
      headers: handle
        ? { 'Cache-Control': 'no-store' }
        : {
            'Cache-Control':
              'public, s-maxage=60, stale-while-revalidate=600',
          },
    })
  } catch (err: any) {
    console.error('[/api/store/products] Error:', err.message)
    return NextResponse.json(
      {
        error:
          'Medusa backend unreachable. Check NEXT_PUBLIC_MEDUSA_BACKEND_URL.',
        products: [],
        count: 0,
      },
      {
        status: 503,
      },
    )
  }
}
