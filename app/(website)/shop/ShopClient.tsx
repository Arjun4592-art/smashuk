'use client'

import { useSearchParams } from 'next/navigation'
import { useMemo, useState, useCallback, useEffect } from 'react'
import { useMedusaProducts as useStoreProducts } from '@/hooks/useProducts'
import { normalizeProduct, matchesBadgeFilter } from '@/lib/api/store'
import ProductGrid from '@/components/website/ProductGrid'
import { SPORTS } from '@/lib/constants'
import Link from 'next/link'
import ShopFilterSidebar, {
  DEFAULT_FILTERS,
  type FilterState,
} from '@/components/website/ShopFilterSidebar'
import { ProductGridSkeleton } from '@/components/ui/Skeleton'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function countActiveFilters(f: FilterState): number {
  let n = 0
  if (f.brands.length) n += f.brands.length
  if (f.badges.length) n += f.badges.length
  if (f.inStockOnly) n += 1
  if (f.minRating) n += 1
  if (
    f.priceRange[0] !== DEFAULT_FILTERS.priceRange[0] ||
    f.priceRange[1] !== DEFAULT_FILTERS.priceRange[1]
  )
    n += 1
  n += Object.values(f.specs).reduce((sum, values) => sum + values.length, 0)
  return n
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function ShopClient() {
  const searchParams = useSearchParams()

  const sport = searchParams.get('sport') ?? ''
  const badge = searchParams.get('badge') ?? ''
  const q = searchParams.get('q') ?? ''
  // These came from the navbar mega-menu (e.g. "Beginner Rackets", "Racket
  // Bags", "Men's Shoes") but were never actually read — clicking them
  // changed the URL and silently filtered nothing.
  const category = searchParams.get('category') ?? ''
  const brandParam = searchParams.get('brand') ?? ''
  const gender = searchParams.get('gender') ?? ''
  const level = searchParams.get('level') ?? ''
  const style = searchParams.get('style') ?? ''

  const [filters, setFilters] = useState<FilterState>(DEFAULT_FILTERS)
  const [mobileOpen, setMobileOpen] = useState(false)

  // BUG FIX: the sidebar's Sport pills live in client state (`filters.sports`)
  // and never got reset when the URL's `?sport=` param changed — so clicking
  // "Badminton" in the navbar (setting filters.sports=['badminton']) then
  // clicking "Sale 🔥" (which navigates to /shop?badge=SALE with NO sport
  // param) left the stale 'badminton' selection in place, since the page
  // component itself doesn't remount on a client-side search-param change.
  // Result: Sale kept showing only the last-selected sport instead of all.
  // Syncing filters.sports to the URL's sport param whenever it changes
  // fixes this: navbar sport links narrow to that sport, and Sale (which has
  // no sport param) clears the selection so all sports show.
  useEffect(() => {
    setFilters((f) => ({ ...f, sports: sport ? [sport] : [] }))
  }, [sport])

  // Same idea for Category: the navbar mega-menu's ?category= param (e.g.
  // "rackets") drives the sidebar's Category selection, and gets cleared
  // the same way when navigating somewhere that doesn't set it (e.g. Sale).
  useEffect(() => {
    setFilters((f) => ({ ...f, categories: category ? [category] : [] }))
  }, [category])

  // Fetch products from Medusa
  const { data, isLoading, isError } = useStoreProducts({ limit: 100 })

  const products = useMemo(
    () => (data?.products ?? []).map(normalizeProduct),
    [data],
  )

  // Filtering
  const filtered = useMemo(() => {
    // Out-of-stock products are never shown in the shop listing.
    let result = products.filter((p) => p.inStock)

    if (badge)
      // BUG FIX: this used to require an explicit metadata.badge tag,
      // which almost no product actually has set (the dashboard field is
      // optional and usually left blank) — so /shop?badge=SALE and
      // /shop?badge=NEW showed "0 products found" even though plenty of
      // products are genuinely discounted or were added recently.
      // matchesBadgeFilter() falls back to real data (discount, creation
      // date, rating) for SALE / NEW / BESTSELLER so the links work even
      // when no product has been manually tagged.
      result = result.filter((p) => matchesBadgeFilter(p, badge))
    if (brandParam)
      result = result.filter(
        (p) => p.brand?.toLowerCase() === brandParam.toLowerCase(),
      )
    // gender/level/style aren't dedicated product fields — they reuse the
    // existing Tags field (already editable in the dashboard product
    // form), e.g. tagging a product "womens", "beginner", "head-heavy".
    if (gender)
      result = result.filter((p) =>
        p.tags?.some((t) => t.toLowerCase() === gender.toLowerCase()),
      )
    if (level)
      result = result.filter((p) =>
        p.tags?.some((t) => t.toLowerCase() === level.toLowerCase()),
      )
    if (style)
      result = result.filter((p) =>
        p.tags?.some(
          (t) => t.toLowerCase().replace(/\s+/g, '-') === style.toLowerCase(),
        ),
      )
    if (q)
      result = result.filter(
        (p) =>
          p.name.toLowerCase().includes(q.toLowerCase()) ||
          p.brand.toLowerCase().includes(q.toLowerCase()) ||
          p.sport.toLowerCase().includes(q.toLowerCase()),
      )

    // Sport filtering — `filters.sports` is now the single source of truth
    // (kept in sync with the URL's ?sport= param by the effect above), so
    // there's no separate/conflicting filter on the raw `sport` param here.
    if (filters.sports.length)
      result = result.filter((p) => filters.sports.includes(p.sport))
    // Category filtering — `filters.categories` is the single source of
    // truth (synced with the URL's ?category= param above). Substring
    // match keeps it compatible with the navbar's short tokens ("rackets")
    // as well as full handles picked from the sidebar ("badminton-rackets").
    if (filters.categories.length)
      result = result.filter((p) =>
        filters.categories.some(
          (c) => p.category?.includes(c) || c.includes(p.category ?? ''),
        ),
      )
    if (filters.brands.length)
      result = result.filter((p) => filters.brands.includes(p.brand))
    if (filters.badges.length)
      // Same fallback as the `badge` query-param filter above — most
      // products don't have an explicit metadata.badge tag, so "On Sale" /
      // "New Arrivals" / "Bestseller" checkboxes fall back to real product
      // data. Without this, ticking these in the sidebar always returned
      // 0 products even though the corresponding nav link "worked".
      result = result.filter((p) =>
        filters.badges.some((b) => matchesBadgeFilter(p, b)),
      )
    if (filters.inStockOnly) result = result.filter((p) => p.inStock)
    if (filters.minRating)
      result = result.filter((p) => p.rating >= filters.minRating!)
    result = result.filter(
      (p) =>
        p.price >= filters.priceRange[0] && p.price <= filters.priceRange[1],
    )

    // Category-aware spec filters (Weight, Balance, Stiffness, Size, ...) —
    // AND across different spec labels, OR within the same label's values.
    // e.g. Weight:[4U] AND Balance:[Even, Head-Heavy] means "4U AND (Even OR
    // Head-Heavy)".
    const specEntries = Object.entries(filters.specs)
    if (specEntries.length > 0) {
      result = result.filter((p) =>
        specEntries.every(([label, values]) =>
          values.some((v) =>
            p.specs?.some((s) => s.label === label && s.value === v),
          ),
        ),
      )
    }

    return result
  }, [products, sport, badge, brandParam, gender, level, style, q, filters])

  // Same filtering as `filtered` above, but WITHOUT the specs filter AND
  // without the sidebar's own brand selection — this is what the sidebar
  // uses to compute per-option counts (Brand, Collection, Rating, spec
  // values). Leaving `filters.brands` out here is deliberate: checking one
  // brand shouldn't zero out every other brand's count in the same section
  // (standard "OR within a facet" behavior — you're choosing among brands,
  // not narrowing by all of them at once).
  const categoryScopedProducts = useMemo(() => {
    let result = products.filter((p) => p.inStock)
    if (badge) result = result.filter((p) => matchesBadgeFilter(p, badge))
    if (brandParam)
      result = result.filter(
        (p) => p.brand?.toLowerCase() === brandParam.toLowerCase(),
      )
    if (filters.sports.length)
      result = result.filter((p) => filters.sports.includes(p.sport))
    if (filters.categories.length)
      result = result.filter((p) =>
        filters.categories.some(
          (c) => p.category?.includes(c) || c.includes(p.category ?? ''),
        ),
      )
    return result
  }, [products, badge, brandParam, filters.sports, filters.categories])

  // Which sport(s) are currently narrowing the listing — the sidebar's own
  // Sport pills take priority, falling back to the URL's ?sport= (e.g. from
  // the navbar mega menu), so the Brand list reacts to either.
  const effectiveSports = filters.sports.length
    ? filters.sports
    : sport
      ? [sport]
      : []

  const activeSport = SPORTS.find((s) => s.slug === sport)
  const activeCount = useMemo(() => countActiveFilters(filters), [filters])

  const pageTitle = q
    ? `Search: "${q}"`
    : activeSport
      ? `${activeSport.icon} ${activeSport.label}`
      : badge
        ? badge.charAt(0) + badge.slice(1).toLowerCase()
        : 'All Products'

  const handleClear = useCallback(() => setFilters(DEFAULT_FILTERS), [])

  const chips: { label: string; onRemove: () => void }[] = [
    ...filters.brands.map((b) => ({
      label: b,
      onRemove: () =>
        setFilters((f) => ({ ...f, brands: f.brands.filter((x) => x !== b) })),
    })),
    ...filters.badges.map((b) => ({
      label: b,
      onRemove: () =>
        setFilters((f) => ({ ...f, badges: f.badges.filter((x) => x !== b) })),
    })),
    ...(filters.inStockOnly
      ? [
          {
            label: 'In Stock',
            onRemove: () => setFilters((f) => ({ ...f, inStockOnly: false })),
          },
        ]
      : []),
    ...(filters.minRating
      ? [
          {
            label: `${filters.minRating}+ ★`,
            onRemove: () => setFilters((f) => ({ ...f, minRating: null })),
          },
        ]
      : []),
    ...Object.entries(filters.specs).flatMap(([label, values]) =>
      values.map((v) => ({
        label: v,
        onRemove: () =>
          setFilters((f) => {
            const nextValues = (f.specs[label] ?? []).filter((x) => x !== v)
            const nextSpecs = { ...f.specs }
            if (nextValues.length === 0) delete nextSpecs[label]
            else nextSpecs[label] = nextValues
            return { ...f, specs: nextSpecs }
          }),
      })),
    ),
    ...(filters.priceRange[0] !== DEFAULT_FILTERS.priceRange[0] ||
    filters.priceRange[1] !== DEFAULT_FILTERS.priceRange[1]
      ? [
          {
            label: `£${filters.priceRange[0].toLocaleString()} – £${filters.priceRange[1].toLocaleString()}`,
            onRemove: () =>
              setFilters((f) => ({
                ...f,
                priceRange: DEFAULT_FILTERS.priceRange,
              })),
          },
        ]
      : []),
  ]

  return (
    <div className='min-h-screen bg-white'>
      {/* Page Header */}
      <div className='bg-[#0A1F44] py-12'>
        <div className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8'>
          <div className='flex items-center gap-2 text-white/60 text-sm font-lato mb-4'>
            <Link href='/' className='hover:text-white transition-colors'>
              Home
            </Link>
            <span>/</span>
            <Link href='/shop' className='hover:text-white transition-colors'>
              Shop
            </Link>
            {(sport || badge || q) && (
              <>
                <span>/</span>
                <span className='text-white'>{pageTitle}</span>
              </>
            )}
          </div>
          <h1 className='font-montserrat font-black text-3xl sm:text-4xl text-white mb-2'>
            {pageTitle}
          </h1>
          <p className='font-lato text-white/70'>
            {isLoading
              ? 'Loading products...'
              : `${filtered.length} product${filtered.length !== 1 ? 's' : ''} found`}
          </p>
        </div>
      </div>

      {/* Main layout */}
      <div className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10'>
        {/* Mobile filter toggle */}
        <div className='flex items-center justify-between mb-6 lg:hidden'>
          <p className='text-sm font-lato text-gray-500'>
            {filtered.length} products
          </p>
          <button
            type='button'
            onClick={() => setMobileOpen(true)}
            className='flex items-center gap-2 px-4 py-2 rounded-xl border-2 border-gray-200 text-sm font-montserrat font-bold text-[#0A1F44] hover:border-[#E8553A] transition-colors'
          >
            <svg
              width='16'
              height='16'
              viewBox='0 0 24 24'
              fill='none'
              stroke='currentColor'
              strokeWidth='2.2'
              strokeLinecap='round'
              strokeLinejoin='round'
            >
              <line x1='4' y1='6' x2='20' y2='6' />
              <line x1='8' y1='12' x2='16' y2='12' />
              <line x1='11' y1='18' x2='13' y2='18' />
            </svg>
            Filters
            {activeCount > 0 && (
              <span className='bg-[#E8553A] text-white text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center'>
                {activeCount}
              </span>
            )}
          </button>
        </div>

        <div className='flex gap-8'>
          {/* Desktop Sidebar */}
          <div className='hidden lg:block w-60 shrink-0'>
            <ShopFilterSidebar
              filters={filters}
              onChange={setFilters}
              onClear={handleClear}
              activeCount={activeCount}
              // Lets the sidebar disable Brand checkboxes that have no
              // products for the currently selected sport(s).
              allProducts={products}
              activeSports={effectiveSports}
              categoryProducts={categoryScopedProducts}
              // On a dedicated sport page (navbar's ?sport=... link), hide
              // the Sport pills — go straight into that sport's categories.
              // Generic pages (plain /shop, or Sale which has no ?sport=)
              // keep the Sport pills so all sports stay browsable.
              hideSportSection={!!sport}
            />
          </div>

          {/* Mobile Sidebar Drawer */}
          {mobileOpen && (
            <>
              <div
                className='fixed inset-0 bg-black/40 z-40 lg:hidden'
                onClick={() => setMobileOpen(false)}
              />
              <div className='fixed top-0 left-0 h-full w-72 bg-white z-50 overflow-y-auto p-6 shadow-2xl lg:hidden'>
                <div className='flex items-center justify-between mb-4'>
                  <span className='font-montserrat font-black text-[#0A1F44]'>
                    Filters
                  </span>
                  <button
                    type='button'
                    onClick={() => setMobileOpen(false)}
                    className='text-gray-400 hover:text-gray-600'
                  >
                    <svg
                      width='20'
                      height='20'
                      viewBox='0 0 24 24'
                      fill='none'
                      stroke='currentColor'
                      strokeWidth='2'
                    >
                      <line x1='18' y1='6' x2='6' y2='18' />
                      <line x1='6' y1='6' x2='18' y2='18' />
                    </svg>
                  </button>
                </div>
                <ShopFilterSidebar
                  filters={filters}
                  onChange={setFilters}
                  onClear={handleClear}
                  activeCount={activeCount}
                  allProducts={products}
                  activeSports={effectiveSports}
                  categoryProducts={categoryScopedProducts}
                  hideSportSection={!!sport}
                />
              </div>
            </>
          )}

          {/* Products */}
          <div className='flex-1 min-w-0'>
            {/* Active filter chips */}
            {chips.length > 0 && (
              <div className='flex flex-wrap items-center gap-2 mb-6'>
                {chips.map((chip) => (
                  <span
                    key={chip.label}
                    className='flex items-center gap-1.5 px-3 py-1 bg-[#E8553A]/10 text-[#E8553A] text-xs font-semibold font-lato rounded-full'
                  >
                    {chip.label}
                    <button
                      type='button'
                      onClick={chip.onRemove}
                      className='hover:text-[#D4441F] transition-colors leading-none text-base'
                    >
                      ×
                    </button>
                  </span>
                ))}
                <button
                  type='button'
                  onClick={handleClear}
                  className='text-xs text-gray-400 font-lato hover:text-[#E8553A] transition-colors underline underline-offset-2'
                >
                  Clear all
                </button>
              </div>
            )}

            {/* Loading state */}
            {isLoading && <ProductGridSkeleton count={12} />}

            {/* Error state */}
            {isError && (
              <div className='flex flex-col items-center justify-center py-24 text-center'>
                <span className='text-5xl mb-4'>⚠️</span>
                <h3 className='font-montserrat font-black text-xl text-[#0A1F44] mb-2'>
                  Could not load products
                </h3>
                <p className='text-gray-400 font-lato text-sm'>
                  Make sure the backend is running on port 9000.
                </p>
              </div>
            )}

            {/* Empty state */}
            {!isLoading && !isError && filtered.length === 0 && (
              <div className='flex flex-col items-center justify-center py-24 text-center'>
                <span className='text-5xl mb-4'>🔍</span>
                <h3 className='font-montserrat font-black text-xl text-[#0A1F44] mb-2'>
                  No products found
                </h3>
                <p className='text-gray-400 font-lato text-sm mb-6'>
                  Try adjusting your filters.
                </p>
                <button
                  type='button'
                  onClick={handleClear}
                  className='px-6 py-2.5 bg-[#E8553A] text-white font-montserrat font-bold text-sm rounded-xl hover:bg-[#D4441F] transition-colors'
                >
                  Clear Filters
                </button>
              </div>
            )}

            {/* Products grid */}
            {!isLoading && !isError && filtered.length > 0 && (
              <ProductGrid
                products={filtered}
                showFilters={false}
                showSort={true}
                showViewToggle={true}
                showPagination={true}
                columns={4}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
