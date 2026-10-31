import 'server-only'
import { unstable_cache } from 'next/cache'
import { getCatalog } from './source'
import { applyCatalogFilters, sortCatalog } from './filter'
import { buildFacets } from './facets'
import {
  emptyFacets,
  toCardProduct,
  type CatalogQuery,
  type CatalogResponse,
} from './types'

/**
 * One page of catalogue results, computed on the server from the in-memory
 * snapshot. Same pipeline as GET /api/store/catalog, but callable directly from
 * a Server Component so the first page of products is in the HTML itself.
 */
export async function loadCatalogPage(
  query: CatalogQuery,
  opts: { facets?: boolean } = {},
): Promise<CatalogResponse> {
  const catalog = await getCatalog()
  const filtered = applyCatalogFilters(catalog, query)
  const sorted = sortCatalog(filtered, query.sort)
  const start = (query.page - 1) * query.perPage
  return {
    products: sorted.slice(start, start + query.perPage).map(toCardProduct),
    count: filtered.length,
    // Facets scan the whole catalogue; skip them where no filter UI is shown
    // (homepage sections).
    facets: opts.facets === false ? emptyFacets() : buildFacets(catalog, query),
  }
}

/** Never throws: on any failure the page falls back to client-side loading. */
export async function loadCatalogPageSafe(
  query: CatalogQuery,
): Promise<CatalogResponse | undefined> {
  try {
    return await loadCatalogPage(query)
  } catch (err) {
    console.error(
      '[catalog] server pre-load failed:',
      err instanceof Error ? err.message : err,
    )
    return undefined
  }
}

/**
 * For statically generated / ISR pages (homepage sections, collections).
 *
 * The catalogue snapshot is fetched with `revalidate: 0` on purpose (it keeps
 * its own in-memory TTL and is invalidated explicitly after product edits).
 * Calling that directly while a page is being statically rendered makes Next
 * flag the whole route as "dynamic usage" and silently turns the page into a
 * render-on-every-request route. Wrapping the load in unstable_cache keeps the
 * page static/ISR: the result is cached for 5 minutes and the page is rebuilt
 * from it.
 *
 * Use loadCatalogPageSafe (uncached) for /shop, which is dynamic anyway
 * because it reads searchParams.
 */
const cachedLoad = unstable_cache(
  async (query: CatalogQuery, facets: boolean) =>
    loadCatalogPage(query, { facets }),
  ['catalog-page-v1'],
  { revalidate: 300 },
)

export async function loadCatalogPageCached(
  query: CatalogQuery,
  opts: { facets?: boolean } = {},
): Promise<CatalogResponse> {
  return cachedLoad(query, opts.facets !== false)
}

export async function loadCatalogPageCachedSafe(
  query: CatalogQuery,
): Promise<CatalogResponse | undefined> {
  try {
    return await loadCatalogPageCached(query)
  } catch (err) {
    console.error(
      '[catalog] cached pre-load failed:',
      err instanceof Error ? err.message : err,
    )
    return undefined
  }
}
