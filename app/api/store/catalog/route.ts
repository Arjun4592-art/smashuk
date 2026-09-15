import { NextRequest, NextResponse } from 'next/server'
import { getCatalog } from '@/lib/catalog/source'
import {
  applyCatalogFilters,
  sortCatalog,
} from '@/lib/catalog/filter'
import { buildFacets } from '@/lib/catalog/facets'
import { catalogQueryFromParams, toCardProduct } from '@/lib/catalog/types'

/**
 * Browse / search endpoint.
 *
 * Replaces the pattern where the client downloaded the whole catalogue via
 * /api/store/products (96 then 100 at a time) and filtered it in the browser.
 * Filtering, sorting, paging and facet counting now all happen here, against a
 * catalogue snapshot the server already holds, and the response carries exactly
 * one page of cards plus the counts the sidebar needs.
 */
export async function GET(req: NextRequest) {
  const started = Date.now()
  try {
    const query = catalogQueryFromParams(req.nextUrl.searchParams)
    const catalog = await getCatalog()

    const filtered = applyCatalogFilters(catalog, query)
    const sorted = sortCatalog(filtered, query.sort)
    const start = (query.page - 1) * query.perPage
    const pageItems = sorted.slice(start, start + query.perPage)

    const facets = buildFacets(catalog, query)

    const elapsed = Date.now() - started
    if (elapsed > 500) {
      console.warn(
        `[/api/store/catalog] SLOW — ${elapsed}ms catalog=${catalog.length} matched=${filtered.length} page=${query.page}`,
      )
    }

    return NextResponse.json(
      {
        products: pageItems.map(toCardProduct),
        count: filtered.length,
        facets,
      },
      {
        headers: {
          // Identical for every visitor with the same filters, so the CDN can
          // serve it. stale-while-revalidate keeps the refresh off the path of
          // whoever happens to arrive as the window expires.
          'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=600',
        },
      },
    )
  } catch (err: any) {
    console.error('[/api/store/catalog] error:', err?.message ?? err)
    return NextResponse.json(
      {
        error: 'Could not load products',
        products: [],
        count: 0,
      },
      { status: 503 },
    )
  }
}
