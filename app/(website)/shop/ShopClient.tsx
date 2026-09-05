'use client'

import { useSearchParams } from 'next/navigation'
import { useMemo, useState, useCallback, useEffect } from 'react'
import { useAllStoreProductsProgressive } from '@/hooks/useProducts'
import { normalizeProduct, matchesBadgeFilter } from '@/lib/api/store'
import {
  canonicalizeSpecLabel,
  resolveSpecFilterValue,
} from '@/lib/spec-filters'
import ProductGrid from '@/components/website/ProductGrid'
import ShopFilterSidebar, {
  DEFAULT_FILTERS,
  type FilterState,
} from '@/components/website/ShopFilterSidebar'
import { ProductGridSkeleton } from '@/components/ui/Skeleton'
function countActiveFilters(f: FilterState): number {
  let n = 0
  if (f.brands.length) n += f.brands.length
  if (f.badges.length) n += f.badges.length
  if (f.inStockOnly !== DEFAULT_FILTERS.inStockOnly) n += 1
  if (f.minRating) n += 1
  if (
    f.priceRange[0] !== DEFAULT_FILTERS.priceRange[0] ||
    f.priceRange[1] !== DEFAULT_FILTERS.priceRange[1]
  )
    n += 1
  n += Object.values(f.specs).reduce((sum, values) => sum + values.length, 0)
  return n
}
export interface ShopClientOverrides {
  sport?: string
  badge?: string
  q?: string
  category?: string
  brand?: string
  gender?: string
  level?: string
  style?: string
}
export default function ShopClient({
  overrides,
}: {
  overrides?: ShopClientOverrides
} = {}) {
  const searchParams = useSearchParams()
  const sport = overrides?.sport ?? searchParams.get('sport') ?? ''
  const badge = overrides?.badge ?? searchParams.get('badge') ?? ''
  const q = overrides?.q ?? searchParams.get('q') ?? ''
  const category = overrides?.category ?? searchParams.get('category') ?? ''
  const brandParam = overrides?.brand ?? searchParams.get('brand') ?? ''
  const gender = overrides?.gender ?? searchParams.get('gender') ?? ''
  const level = overrides?.level ?? searchParams.get('level') ?? ''
  const style = overrides?.style ?? searchParams.get('style') ?? ''
  const [filters, setFilters] = useState<FilterState>(DEFAULT_FILTERS)
  const [mobileOpen, setMobileOpen] = useState(false)
  useEffect(() => {
    setFilters((f) => ({
      ...f,
      sports: sport ? [sport] : [],
    }))
  }, [sport])
  useEffect(() => {
    setFilters((f) => ({
      ...f,
      categories: category ? [category] : [],
    }))
  }, [category])
  // NOTE: we deliberately do NOT push a bare `sport` down to Medusa as a
  // server-side category filter, even though that would cut fetch size a
  // lot. Tried it — and on this catalog, most products are linked ONLY to
  // their specific sub-category in Medusa (e.g. "Tennis Rackets"), not also
  // to the parent sport category ("Tennis"), even though the admin
  // dashboard's per-sport rollup count (580 for Tennis) makes it look that
  // way — that number is a sum of the sub-category counts, not a count of
  // products directly linked to "Tennis" itself. Filtering by the sport's
  // top-level id server-side only returned the handful of products directly
  // tagged to that parent node (39, instead of the real ~580) — a silent
  // under-count.
  //
  // `sport` + `category` TOGETHER are a different story: that resolves to
  // one specific LEAF sub-category handle (e.g. "squash-rackets"), which
  // products link to directly — no parent/descendant recursion involved, so
  // there's no under-count risk. Without this, a page like
  // /shop?sport=squash&category=rackets had to progressively fetch and
  // filter through all ~1700 products client-side before every matching
  // racket had actually loaded in, showing "0 products found" for a while
  // and then the real results a good deal later once enough batches had
  // come in. Resolving the exact category server-side fixes that — and it's
  // safe specifically because whenever `category` is set from the URL/route,
  // the sidebar's category chips are hidden (hideCategorySection below), so
  // there's no client interaction that could ask for a different category
  // out from under this narrowed fetch.
  //
  // Forwarding the typed search text (and, failing that, a selected brand)
  // as a server-side search hint is still safe and kept: it only narrows the
  // fetch, and the exact brand/text match is re-checked client-side below
  // regardless, so it can't cause an under-count the way category_id can.
  const searchHint = q || brandParam || undefined
  const categoryHandleHint =
    sport && category ? `${sport}-${category}` : undefined
  const {
    products: rawProducts,
    isLoading,
    isError,
  } = useAllStoreProductsProgressive({
    q: searchHint,
    category_handle: categoryHandleHint,
  })
  const products = useMemo(
    () => rawProducts.map(normalizeProduct),
    [rawProducts],
  )
  const filtered = useMemo(() => {
    // BUGFIX: this used to unconditionally start from products.filter(p =>
    // p.inStock), which made the "In Stock Only" sidebar toggle a no-op —
    // every out-of-stock product was already gone before that toggle (line
    // below, `filters.inStockOnly`) ever ran. That's why some products never
    // turned up in /shop search or sport/category browsing at all, even
    // though they existed, were published, and were correctly tagged: they
    // were simply out of stock. Now inStockOnly (default: off) is the only
    // thing that hides them, same as every other filter here.
    let result = products
    if (badge) result = result.filter((p) => matchesBadgeFilter(p, badge))
    if (brandParam)
      result = result.filter(
        (p) => p.brand?.toLowerCase() === brandParam.toLowerCase(),
      )
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
    // A collection page's own sport/category (e.g. /collections/badminton-rackets)
    // must always win, on every handle — it's the page's identity, not a
    // togglable preference. Enforcing it here (instead of only seeding
    // filters.sports/categories once on mount) means it can't be lost by
    // clicking the matching sidebar chip again, or by "Clear all filters".
    if (sport) result = result.filter((p) => p.sport === sport)
    else if (filters.sports.length)
      result = result.filter((p) => filters.sports.includes(p.sport))
    if (category)
      result = result.filter(
        (p) =>
          !!p.category &&
          (p.category.includes(category) || category.includes(p.category)),
      )
    else if (filters.categories.length)
      result = result.filter(
        (p) =>
          !!p.category &&
          filters.categories.some(
            (c) => p.category!.includes(c) || c.includes(p.category!),
          ),
      )
    if (filters.brands.length)
      result = result.filter((p) => filters.brands.includes(p.brand))
    if (filters.badges.length)
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
    const norm = (s: string) => s.trim().toLowerCase()
    const specEntries = Object.entries(filters.specs)
    if (specEntries.length > 0) {
      result = result.filter((p) =>
        specEntries.every(([label, values]) =>
          values.some((v) =>
            p.specs?.some((s) => {
              const canonicalLabel = canonicalizeSpecLabel(
                p.sport,
                p.category,
                s.label,
              )
              if (canonicalLabel !== label) return false
              const resolvedValue = resolveSpecFilterValue(
                p.sport,
                p.category,
                canonicalLabel,
                s.value,
              )
              return resolvedValue !== null && norm(resolvedValue) === norm(v)
            }),
          ),
        ),
      )
    }
    return result
  }, [products, sport, badge, brandParam, gender, level, style, q, filters])
  const categoryScopedProducts = useMemo(() => {
    // Same fix as `filtered` above — no blanket inStock filter here either,
    // otherwise this list (used for the sidebar's per-category counts) would
    // undercount and hide out-of-stock products from those counts too.
    let result = products
    if (badge) result = result.filter((p) => matchesBadgeFilter(p, badge))
    if (brandParam)
      result = result.filter(
        (p) => p.brand?.toLowerCase() === brandParam.toLowerCase(),
      )
    if (sport) result = result.filter((p) => p.sport === sport)
    else if (filters.sports.length)
      result = result.filter((p) => filters.sports.includes(p.sport))
    if (category)
      result = result.filter(
        (p) =>
          !!p.category &&
          (p.category.includes(category) || category.includes(p.category)),
      )
    else if (filters.categories.length)
      result = result.filter(
        (p) =>
          !!p.category &&
          filters.categories.some(
            (c) => p.category!.includes(c) || c.includes(p.category!),
          ),
      )
    if (filters.inStockOnly) result = result.filter((p) => p.inStock)
    return result
  }, [
    products,
    badge,
    brandParam,
    sport,
    category,
    filters.sports,
    filters.categories,
    filters.inStockOnly,
  ])
  const effectiveSports = filters.sports.length
    ? filters.sports
    : sport
      ? [sport]
      : []
  // Same idea as effectiveSports: a page-level badge (e.g. the "Sale" nav
  // link, ?badge=SALE) is enforced directly in `filtered`/`categoryScopedProducts`
  // above, but was never reflected in the sidebar's own counts — so "Rackets
  // (21)" was counting ALL in-stock padel rackets while the grid below only
  // showed the 7 that are actually on sale. Passing it through explicitly
  // keeps every count in the sidebar in sync with what's really on screen.
  const effectiveBadges = filters.badges.length
    ? filters.badges
    : badge
      ? [badge]
      : []
  const activeCount = useMemo(() => countActiveFilters(filters), [filters])
  const handleClear = useCallback(() => setFilters(DEFAULT_FILTERS), [])
  const chips: {
    label: string
    onRemove: () => void
  }[] = [
    ...filters.brands.map((b) => ({
      label: b,
      onRemove: () =>
        setFilters((f) => ({
          ...f,
          brands: f.brands.filter((x) => x !== b),
        })),
    })),
    ...filters.badges.map((b) => ({
      label: b,
      onRemove: () =>
        setFilters((f) => ({
          ...f,
          badges: f.badges.filter((x) => x !== b),
        })),
    })),
    ...(filters.inStockOnly
      ? [
          {
            label: 'In Stock',
            onRemove: () =>
              setFilters((f) => ({
                ...f,
                inStockOnly: false,
              })),
          },
        ]
      : []),
    ...(filters.minRating
      ? [
          {
            label: `${filters.minRating}+ ★`,
            onRemove: () =>
              setFilters((f) => ({
                ...f,
                minRating: null,
              })),
          },
        ]
      : []),
    ...Object.entries(filters.specs).flatMap(([label, values]) =>
      values.map((v) => ({
        label: v,
        onRemove: () =>
          setFilters((f) => {
            const nextValues = (f.specs[label] ?? []).filter((x) => x !== v)
            const nextSpecs = {
              ...f.specs,
            }
            if (nextValues.length === 0) delete nextSpecs[label]
            else nextSpecs[label] = nextValues
            return {
              ...f,
              specs: nextSpecs,
            }
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
    <div className='bg-white'>
      {}
      <div className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10'>
        {}
        <div className='flex items-center justify-between mb-6'>
          <p className='text-sm font-lato text-gray-500'>
            {isLoading
              ? 'Loading products...'
              : `${filtered.length} product${filtered.length !== 1 ? 's' : ''} found`}
          </p>
          <button
            type='button'
            onClick={() => setMobileOpen(true)}
            className='lg:hidden flex items-center gap-2 px-4 py-2 rounded-xl border-2 border-gray-200 text-sm font-montserrat font-bold text-[#0A1F44] hover:border-[#E8553A] transition-colors'
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
          {}
          <div className='hidden lg:block w-60 shrink-0'>
            <ShopFilterSidebar
              filters={filters}
              onChange={setFilters}
              onClear={handleClear}
              activeCount={activeCount}
              allProducts={products}
              activeSports={effectiveSports}
              activeBadges={effectiveBadges}
              categoryProducts={categoryScopedProducts}
              hideSportSection={!!sport}
              hideCategorySection={!!category}
            />
          </div>

          {}
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
                  activeBadges={effectiveBadges}
                  categoryProducts={categoryScopedProducts}
                  hideSportSection={!!sport}
                  hideCategorySection={!!category}
                />
              </div>
            </>
          )}

          {}
          <div className='flex-1 min-w-0'>
            {}
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

            {}
            {isLoading && <ProductGridSkeleton count={12} columns={3} />}

            {}
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

            {}
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

            {}
            {!isLoading && !isError && filtered.length > 0 && (
              <ProductGrid
                products={filtered}
                showFilters={false}
                showSort={true}
                showViewToggle={true}
                showPagination={true}
                columns={3}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
