import { DEFAULT_PRICE_RANGE, type CatalogQuery } from './types'

/**
 * The query ShopClient issues on its very first render, built from the page's
 * scoping params only. The server uses it to pre-load page 1 of the catalogue
 * into the HTML, and the browser uses it to recognise that pre-loaded result,
 * so a normal visit makes ZERO catalogue requests after hydration.
 *
 * Keep the defaults here identical to ShopClient's initial state
 * (DEFAULT_FILTERS in ShopFilterSidebar: in-stock only, full price range) -
 * if they drift, the keys differ and the browser just fetches again (still
 * correct, just not instant).
 *
 * No 'use client' and no 'server-only': both sides import this file.
 */
export interface InitialCatalogScope {
  sport?: string
  category?: string
  brand?: string
  badge?: string
  gender?: string
  level?: string
  style?: string
  q?: string
}

export function buildInitialCatalogQuery(
  scope: InitialCatalogScope,
): CatalogQuery {
  const clean = (v?: string) => (v ? v : undefined)
  return {
    sport: clean(scope.sport),
    category: clean(scope.category),
    brand: clean(scope.brand),
    badge: clean(scope.badge),
    gender: clean(scope.gender),
    level: clean(scope.level),
    style: clean(scope.style),
    q: clean(scope.q),
    sports: scope.sport ? [scope.sport] : [],
    brands: [],
    categories: scope.category ? [scope.category] : [],
    badges: [],
    priceRange: DEFAULT_PRICE_RANGE,
    inStockOnly: true,
    minRating: null,
    specs: {},
    sort: 'featured',
    page: 1,
    perPage: 12,
  }
}
