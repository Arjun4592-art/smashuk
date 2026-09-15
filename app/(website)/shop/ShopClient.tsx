'use client'

import { useSearchParams } from 'next/navigation'
import { useMemo, useState, useCallback, useEffect } from 'react'
import { useCatalog } from '@/hooks/useCatalog'
import type { CatalogQuery } from '@/lib/catalog/types'
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

/**
 * Browse / search UI.
 *
 * This component used to pull the ENTIRE catalogue into the browser via
 * useAllStoreProductsProgressive (96 products, then 100 at a time until all
 * ~1700 had arrived) and then do every filter, count and sort in JavaScript.
 * That is why a collection page showed "0 products found" and then changed its
 * mind, and why filter clicks re-walked thousands of products on the main
 * thread.
 *
 * It now sends the filter state to /api/store/catalog and renders one page of
 * results plus the facet counts that came back with them. The filtering logic
 * itself was not rewritten — it was moved to lib/catalog/filter.ts and
 * lib/catalog/facets.ts so the server runs exactly what the client used to.
 */
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
  // Sort and paging used to live inside ProductGrid, which could only sort and
  // slice the array it had been handed. Now that the grid only ever holds one
  // page, they have to be owned here and sent to the server — otherwise
  // "price: low to high" would sort page 3 rather than the whole result set.
  const [sort, setSort] = useState('featured')
  const [page, setPage] = useState(1)
  const [perPage, setPerPage] = useState(12)

  useEffect(() => {
    setFilters((f) => ({ ...f, sports: sport ? [sport] : [] }))
  }, [sport])
  useEffect(() => {
    setFilters((f) => ({ ...f, categories: category ? [category] : [] }))
  }, [category])

  const query: CatalogQuery = useMemo(
    () => ({
      sport: sport || undefined,
      category: category || undefined,
      brand: brandParam || undefined,
      badge: badge || undefined,
      gender: gender || undefined,
      level: level || undefined,
      style: style || undefined,
      q: q || undefined,
      sports: filters.sports,
      brands: filters.brands,
      categories: filters.categories,
      badges: filters.badges,
      priceRange: filters.priceRange,
      inStockOnly: filters.inStockOnly,
      minRating: filters.minRating,
      specs: filters.specs,
      sort,
      page,
      perPage,
    }),
    [
      sport,
      category,
      brandParam,
      badge,
      gender,
      level,
      style,
      q,
      filters,
      sort,
      page,
      perPage,
    ],
  )

  const { products, count, facets, isLoading, isFetching, isError } =
    useCatalog(query)

  // Any change that alters *which* products match has to reset paging,
  // otherwise a shopper on page 4 of "rackets" lands on an empty page 4 of
  // "shoes". Sort is included because page 1 of a re-sorted list is a
  // different set of products.
  const filterSignature = JSON.stringify([
    filters,
    sport,
    category,
    brandParam,
    badge,
    gender,
    level,
    style,
    q,
    sort,
    perPage,
  ])
  useEffect(() => {
    setPage(1)
  }, [filterSignature])

  const effectiveSports = filters.sports.length
    ? filters.sports
    : sport
      ? [sport]
      : []
  const effectiveBadges = filters.badges.length
    ? filters.badges
    : badge
      ? [badge]
      : []

  const activeCount = useMemo(() => countActiveFilters(filters), [filters])
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

  const sidebar = (
    <ShopFilterSidebar
      filters={filters}
      onChange={setFilters}
      onClear={handleClear}
      activeCount={activeCount}
      facets={facets}
      activeSports={effectiveSports}
      activeBadges={effectiveBadges}
      hideSportSection={!!sport}
      hideCategorySection={!!category}
    />
  )

  return (
    <div className='bg-white'>
      <div className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10'>
        <div className='flex items-center justify-between mb-6'>
          <p className='text-sm font-lato text-gray-500'>
            {isLoading
              ? 'Loading products...'
              : `${count} product${count !== 1 ? 's' : ''} found`}
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
          <div className='hidden lg:block w-60 shrink-0'>{sidebar}</div>

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
                {sidebar}
              </div>
            </>
          )}

          <div className='flex-1 min-w-0'>
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

            {isLoading && <ProductGridSkeleton count={12} columns={3} />}

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

            {!isLoading && !isError && count === 0 && (
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

            {!isLoading && !isError && count > 0 && (
              <div
                className={
                  // Dim while the next page/filter lands — the grid stays in
                  // place instead of collapsing back to a skeleton.
                  isFetching ? 'opacity-60 transition-opacity' : undefined
                }
              >
                <ProductGrid
                  products={products}
                  showFilters={false}
                  showSort={true}
                  showViewToggle={true}
                  showPagination={true}
                  columns={3}
                  serverPaginated
                  totalCount={count}
                  sort={sort}
                  onSortChange={setSort}
                  page={page}
                  onPageChange={setPage}
                  perPage={perPage}
                  onPerPageChange={setPerPage}
                />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
