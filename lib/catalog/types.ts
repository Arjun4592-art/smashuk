import type { Product } from '@/types'

/**
 * The shape of a browse/search request, as parsed from the URL on the client
 * and re-parsed from the query string on the server. Both sides import this so
 * a filter can never exist on one side and be silently ignored on the other —
 * which is exactly what would go wrong the first time someone added a filter to
 * the sidebar without adding it to the API.
 */
export interface CatalogQuery {
  /** Page-level scoping, from the route (collection config) or ?params. */
  sport?: string
  category?: string
  brand?: string
  badge?: string
  gender?: string
  level?: string
  style?: string
  q?: string
  /** Sidebar state. */
  sports: string[]
  brands: string[]
  categories: string[]
  badges: string[]
  priceRange: [number, number]
  inStockOnly: boolean
  minRating: number | null
  specs: Record<string, string[]>
  /** Sort + paging. */
  sort: string
  page: number
  perPage: number
}

export interface CatalogFacets {
  /** Brands that exist at all within the active sports. null = unconstrained. */
  availableBrands: string[] | null
  categoryOptions: { handle: string; label: string; count: number }[]
  specGroups: { label: string; values: string[] }[]
  /** Plain objects rather than Maps so these survive JSON.stringify. */
  sportCounts: Record<string, number>
  brandCounts: Record<string, number>
  badgeCounts: Record<string, number>
  ratingCounts: Record<string, number>
  specValueCounts: Record<string, number>
  availability: { inStock: number; outOfStock: number }
  /** Real min/max across the scoped set, so the price slider isn't guesswork. */
  priceBounds: [number, number]
}

export interface CatalogResponse {
  /** Only the current page — never the whole catalogue. */
  products: Product[]
  /** Total matching the filters, for pagination and the "N products found" line. */
  count: number
  facets: CatalogFacets
}

// Must stay equal to DEFAULT_FILTERS.priceRange in ShopFilterSidebar — it's how
// both sides recognise "the slider is untouched" and omit it from the cache key.
export const DEFAULT_PRICE_RANGE: [number, number] = [0, 500]

export function emptyFacets(): CatalogFacets {
  return {
    availableBrands: null,
    categoryOptions: [],
    specGroups: [],
    sportCounts: {},
    brandCounts: {},
    badgeCounts: {},
    ratingCounts: {},
    specValueCounts: {},
    availability: { inStock: 0, outOfStock: 0 },
    priceBounds: DEFAULT_PRICE_RANGE,
  }
}

/**
 * Serialise a CatalogQuery into a stable query string. Used as both the fetch
 * URL and the react-query cache key, so identical filter state always produces
 * an identical key regardless of the order the user clicked things in.
 */
export function catalogQueryToParams(q: CatalogQuery): URLSearchParams {
  const sp = new URLSearchParams()
  const setIf = (k: string, v?: string) => {
    if (v) sp.set(k, v)
  }
  setIf('sport', q.sport)
  setIf('category', q.category)
  setIf('brand', q.brand)
  setIf('badge', q.badge)
  setIf('gender', q.gender)
  setIf('level', q.level)
  setIf('style', q.style)
  setIf('q', q.q)
  if (q.sports.length) sp.set('sports', [...q.sports].sort().join('|'))
  if (q.brands.length) sp.set('brands', [...q.brands].sort().join('|'))
  if (q.categories.length)
    sp.set('categories', [...q.categories].sort().join('|'))
  if (q.badges.length) sp.set('badges', [...q.badges].sort().join('|'))
  if (
    q.priceRange[0] !== DEFAULT_PRICE_RANGE[0] ||
    q.priceRange[1] !== DEFAULT_PRICE_RANGE[1]
  )
    sp.set('price', `${q.priceRange[0]}-${q.priceRange[1]}`)
  if (q.inStockOnly) sp.set('inStock', '1')
  if (q.minRating) sp.set('minRating', String(q.minRating))
  const specKeys = Object.keys(q.specs).sort()
  if (specKeys.length)
    sp.set(
      'specs',
      specKeys
        .map((k) => `${k}:${[...q.specs[k]].sort().join(',')}`)
        .join('|'),
    )
  sp.set('sort', q.sort)
  sp.set('page', String(q.page))
  sp.set('perPage', String(q.perPage))
  return sp
}

export function catalogQueryFromParams(sp: URLSearchParams): CatalogQuery {
  const list = (key: string) =>
    (sp.get(key) ?? '').split('|').filter(Boolean)
  const priceRaw = sp.get('price')
  let priceRange = DEFAULT_PRICE_RANGE
  if (priceRaw) {
    const [lo, hi] = priceRaw.split('-').map(Number)
    if (Number.isFinite(lo) && Number.isFinite(hi)) priceRange = [lo, hi]
  }
  const specs: Record<string, string[]> = {}
  for (const group of list('specs')) {
    const idx = group.indexOf(':')
    if (idx <= 0) continue
    const label = group.slice(0, idx)
    const values = group.slice(idx + 1).split(',').filter(Boolean)
    if (values.length) specs[label] = values
  }
  const page = Number(sp.get('page') ?? '1')
  const perPage = Number(sp.get('perPage') ?? '12')
  return {
    sport: sp.get('sport') ?? undefined,
    category: sp.get('category') ?? undefined,
    brand: sp.get('brand') ?? undefined,
    badge: sp.get('badge') ?? undefined,
    gender: sp.get('gender') ?? undefined,
    level: sp.get('level') ?? undefined,
    style: sp.get('style') ?? undefined,
    q: sp.get('q') ?? undefined,
    sports: list('sports'),
    brands: list('brands'),
    categories: list('categories'),
    badges: list('badges'),
    priceRange,
    inStockOnly: sp.get('inStock') === '1',
    minRating: sp.get('minRating') ? Number(sp.get('minRating')) : null,
    specs,
    sort: sp.get('sort') ?? 'featured',
    page: Number.isFinite(page) && page > 0 ? page : 1,
    // Clamp: perPage comes straight off a query string, and an unbounded value
    // would let anyone ask for the entire catalogue in one response — the exact
    // thing this endpoint exists to stop.
    perPage: Number.isFinite(perPage) ? Math.min(Math.max(perPage, 1), 48) : 12,
  }
}

/**
 * Trim a fully-normalised Product down to what a grid card actually renders.
 * The server holds the rich object; the wire only carries this.
 */
export function toCardProduct(p: Product): Product {
  return {
    ...p,
    // `description` is not in the listing field set anyway, but be explicit —
    // a product that reached the catalogue from a PDP-shaped fetch shouldn't
    // smuggle a few kB of HTML into every browse response.
    description: '',
    specs: [],
    options: [],
    tierPricing: [],
    crossSells: [],
    // ProductCard only asks `variants.length > 1` (to decide "Add to cart" vs
    // "Choose options"), so ids are enough.
    variants: (p.variants ?? []).map((v: any) => ({ id: v?.id })) as any,
    images: p.images?.length ? [p.images[0]] : p.images,
  }
}
