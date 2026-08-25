'use client'

import { useState, useMemo, useEffect } from 'react'
import ProductCard from '@/components/website/ProductCard'
import type { Product } from '@/types'
import {
  GridIcon,
  ListIcon,
  FilterIcon,
  ChevronDownIcon,
  CloseIcon,
  SortIcon,
} from '@/components/ui/Icons'
import { SPORTS } from '@/lib/constants'
import { PRODUCT_GRID_COLS } from '@/lib/utils'
interface ProductGridProps {
  products: Product[]
  title?: string
  showFilters?: boolean
  showSort?: boolean
  showViewToggle?: boolean
  showPagination?: boolean
  columns?: 2 | 3 | 4
  isLoading?: boolean
}
const SORT_OPTIONS = [
  {
    value: 'featured',
    label: 'Featured',
  },
  {
    value: 'newest',
    label: 'Newest First',
  },
  {
    value: 'price-asc',
    label: 'Price: Low to High',
  },
  {
    value: 'price-desc',
    label: 'Price: High to Low',
  },
  {
    value: 'rating',
    label: 'Top Rated',
  },
  {
    value: 'discount',
    label: 'Biggest Discount',
  },
]
const BADGE_FILTERS = [
  {
    value: 'ALL',
    label: 'All',
  },
  {
    value: 'NEW',
    label: '🆕 New',
  },
  {
    value: 'SALE',
    label: '🔥 Sale',
  },
  {
    value: 'BESTSELLER',
    label: '⭐ Bestseller',
  },
  {
    value: 'LIMITED',
    label: '⚡ Limited',
  },
]
function SkeletonCard({ view }: { view: 'grid' | 'list' }) {
  if (view === 'list') {
    return (
      <div className='flex gap-4 bg-white border border-[#E5E7EB] rounded-2xl p-4 animate-pulse'>
        <div className='w-24 h-24 rounded-xl bg-[#F2F4F7] shrink-0' />
        <div className='flex-1 space-y-2.5 py-1'>
          <div className='h-3 bg-[#F2F4F7] rounded-full w-1/4' />
          <div className='h-4 bg-[#F2F4F7] rounded-full w-3/4' />
          <div className='h-3 bg-[#F2F4F7] rounded-full w-1/2' />
          <div className='h-8 bg-[#F2F4F7] rounded-xl w-28 mt-2' />
        </div>
      </div>
    )
  }
  return (
    <div className='bg-white border border-[#E5E7EB] rounded-2xl overflow-hidden animate-pulse'>
      <div className='aspect-square bg-[#F2F4F7]' />
      <div className='p-3 space-y-2'>
        <div className='h-2.5 bg-[#F2F4F7] rounded-full w-1/3' />
        <div className='h-4 bg-[#F2F4F7] rounded-full w-5/6' />
        <div className='h-3 bg-[#F2F4F7] rounded-full w-1/2' />
        <div className='h-8 bg-[#F2F4F7] rounded-xl w-full mt-1' />
      </div>
    </div>
  )
}
export default function ProductGrid({
  products,
  title,
  showFilters = false,
  showSort = true,
  showViewToggle = true,
  showPagination = false,
  columns = 4,
  isLoading = false,
}: ProductGridProps) {
  const [view, setView] = useState<'grid' | 'list'>('grid')
  const [sort, setSort] = useState('featured')
  const [sortOpen, setSortOpen] = useState(false)
  const [activeSport, setActiveSport] = useState('ALL')
  const [activeBadge, setActiveBadge] = useState('ALL')
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [perPage, setPerPage] = useState(12)
  const [page, setPage] = useState(1)
  const filtered = useMemo(() => {
    let result = [...products]
    if (activeSport !== 'ALL')
      result = result.filter((p) => p.sport === activeSport)
    if (activeBadge !== 'ALL')
      result = result.filter((p) => p.badge === activeBadge)
    switch (sort) {
      case 'newest':
        result.sort(
          (a, b) =>
            new Date(b.createdAt ?? 0).getTime() -
            new Date(a.createdAt ?? 0).getTime(),
        )
        break
      case 'price-asc':
        result.sort((a, b) => a.price - b.price)
        break
      case 'price-desc':
        result.sort((a, b) => b.price - a.price)
        break
      case 'rating':
        result.sort((a, b) => b.rating - a.rating)
        break
      case 'discount':
        result.sort((a, b) => {
          const dA = a.originalPrice
            ? ((a.originalPrice - a.price) / a.originalPrice) * 100
            : 0
          const dB = b.originalPrice
            ? ((b.originalPrice - b.price) / b.originalPrice) * 100
            : 0
          return dB - dA
        })
        break
    }
    return result
  }, [products, activeSport, activeBadge, sort])
  useEffect(() => {
    setPage(1)
  }, [products, activeSport, activeBadge, sort, perPage])
  const pageCount = Math.max(1, Math.ceil(filtered.length / perPage))
  const paged = showPagination
    ? filtered.slice((page - 1) * perPage, page * perPage)
    : filtered
  const currentSort = SORT_OPTIONS.find((o) => o.value === sort)
  const activeFilterCount =
    (activeSport !== 'ALL' ? 1 : 0) + (activeBadge !== 'ALL' ? 1 : 0)
  const gridCols = PRODUCT_GRID_COLS[columns]
  return (
    <div>
      {}
      {(title || showSort || showViewToggle) && (
        <div className='flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6'>
          {title && (
            <div>
              <h2 className='font-montserrat font-black text-2xl text-[#0A1F44] tracking-tight'>
                {title}
              </h2>
              <p className='text-[12px] text-[#9CA3AF] font-lato mt-0.5'>
                {filtered.length} product{filtered.length !== 1 ? 's' : ''}
              </p>
            </div>
          )}

          <div className='flex items-center gap-2.5 ml-auto'>
            {}
            {showFilters && (
              <button
                onClick={() => setFiltersOpen(!filtersOpen)}
                className={`sm:hidden flex items-center gap-2 px-3.5 py-2 rounded-xl text-[13px] font-semibold font-lato border transition-all ${filtersOpen || activeFilterCount > 0 ? 'bg-[#0A1F44] text-white border-[#0A1F44]' : 'bg-white text-[#0A1F44] border-[#E5E7EB] hover:border-[#0A1F44]/30'}`}
              >
                <FilterIcon size={15} />
                Filters
                {activeFilterCount > 0 && (
                  <span className='bg-[#E8553A] text-white text-[10px] font-black w-4 h-4 rounded-full flex items-center justify-center'>
                    {activeFilterCount}
                  </span>
                )}
              </button>
            )}

            {}
            {showSort && (
              <div className='relative'>
                <button
                  onClick={() => setSortOpen(!sortOpen)}
                  className='flex items-center gap-2 px-3.5 py-2 border border-[#E5E7EB] rounded-xl text-[13px] font-medium text-[#0A1F44] hover:border-[#0A1F44]/30 transition-colors font-lato bg-white min-w-[160px] justify-between'
                >
                  <span className='flex items-center gap-1.5'>
                    <SortIcon size={14} className='text-[#9CA3AF]' />
                    {currentSort?.label}
                  </span>
                  <ChevronDownIcon
                    size={14}
                    className={`text-[#9CA3AF] transition-transform ${sortOpen ? 'rotate-180' : ''}`}
                  />
                </button>

                {sortOpen && (
                  <>
                    <div
                      className='fixed inset-0 z-10'
                      onClick={() => setSortOpen(false)}
                    />
                    <div className='absolute right-0 top-full mt-1.5 w-52 bg-white rounded-2xl shadow-[0_8px_32px_rgba(0,0,0,0.10)] border border-[#E5E7EB] z-20 overflow-hidden py-1.5'>
                      {SORT_OPTIONS.map((option) => (
                        <button
                          key={option.value}
                          onClick={() => {
                            setSort(option.value)
                            setSortOpen(false)
                          }}
                          className={`w-full text-left px-4 py-2.5 text-[13px] font-lato transition-colors flex items-center justify-between ${sort === option.value ? 'bg-[#E8553A]/6 text-[#E8553A] font-semibold' : 'text-[#4B5563] hover:bg-[#F2F4F7]'}`}
                        >
                          {option.label}
                          {sort === option.value && (
                            <span className='w-1.5 h-1.5 rounded-full bg-[#E8553A]' />
                          )}
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>
            )}

            {}
            {showViewToggle && (
              <div className='flex items-center bg-[#F2F4F7] rounded-xl p-1 gap-0.5'>
                <button
                  onClick={() => setView('grid')}
                  aria-label='Grid view'
                  className={`p-2 rounded-lg transition-all ${view === 'grid' ? 'bg-white text-[#0A1F44] shadow-sm' : 'text-[#9CA3AF] hover:text-[#0A1F44]'}`}
                >
                  <GridIcon size={15} />
                </button>
                <button
                  onClick={() => setView('list')}
                  aria-label='List view'
                  className={`p-2 rounded-lg transition-all ${view === 'list' ? 'bg-white text-[#0A1F44] shadow-sm' : 'text-[#9CA3AF] hover:text-[#0A1F44]'}`}
                >
                  <ListIcon size={15} />
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {}
      {showFilters && (
        <div className={`mb-6 ${filtersOpen ? 'block' : 'hidden sm:block'}`}>
          <div className='bg-white border border-[#E5E7EB] rounded-2xl p-4 space-y-4'>
            {}
            <div>
              <p className='text-[10px] font-black text-[#9CA3AF] uppercase tracking-[0.15em] mb-2.5 font-montserrat'>
                Sport
              </p>
              <div className='flex flex-wrap gap-2'>
                <button
                  onClick={() => setActiveSport('ALL')}
                  className={`px-3.5 py-1.5 rounded-full text-[12px] font-semibold transition-all font-lato border ${activeSport === 'ALL' ? 'bg-[#0A1F44] text-white border-[#0A1F44] shadow-sm' : 'bg-[#F2F4F7] text-[#4B5563] border-transparent hover:border-[#0A1F44]/20 hover:text-[#0A1F44]'}`}
                >
                  All Sports
                </button>
                {SPORTS.map((sport) => (
                  <button
                    key={sport.slug}
                    onClick={() => setActiveSport(sport.slug)}
                    className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-[12px] font-semibold transition-all font-lato border ${activeSport === sport.slug ? 'bg-[#E8553A] text-white border-[#E8553A] shadow-sm' : 'bg-[#F2F4F7] text-[#4B5563] border-transparent hover:border-[#E8553A]/20 hover:text-[#E8553A]'}`}
                  >
                    <span>{sport.icon}</span>
                    <span>{sport.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {}
            <div className='border-t border-[#F2F4F7] pt-4'>
              <p className='text-[10px] font-black text-[#9CA3AF] uppercase tracking-[0.15em] mb-2.5 font-montserrat'>
                Filter By
              </p>
              <div className='flex flex-wrap gap-2'>
                {BADGE_FILTERS.map((badge) => (
                  <button
                    key={badge.value}
                    onClick={() => setActiveBadge(badge.value)}
                    className={`px-3.5 py-1.5 rounded-full text-[12px] font-semibold transition-all font-lato border ${activeBadge === badge.value ? 'bg-[#0A1F44] text-white border-[#0A1F44] shadow-sm' : 'bg-[#F2F4F7] text-[#4B5563] border-transparent hover:border-[#0A1F44]/20 hover:text-[#0A1F44]'}`}
                  >
                    {badge.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {}
      {activeFilterCount > 0 && (
        <div className='flex items-center gap-2 mb-5 flex-wrap'>
          <span className='text-[11px] text-[#9CA3AF] font-lato'>Active:</span>
          {activeSport !== 'ALL' && (
            <span className='flex items-center gap-1.5 px-3 py-1 bg-[#FDF0ED] border border-[#E8553A]/20 text-[#E8553A] rounded-full text-[11px] font-bold font-lato'>
              {SPORTS.find((s) => s.slug === activeSport)?.icon}{' '}
              {SPORTS.find((s) => s.slug === activeSport)?.label}
              <button
                onClick={() => setActiveSport('ALL')}
                className='hover:text-[#D4441F]'
              >
                <CloseIcon size={10} />
              </button>
            </span>
          )}
          {activeBadge !== 'ALL' && (
            <span className='flex items-center gap-1.5 px-3 py-1 bg-[#F2F4F7] border border-[#E5E7EB] text-[#0A1F44] rounded-full text-[11px] font-bold font-lato'>
              {activeBadge}
              <button
                onClick={() => setActiveBadge('ALL')}
                className='hover:text-[#E8553A]'
              >
                <CloseIcon size={10} />
              </button>
            </span>
          )}
          <button
            onClick={() => {
              setActiveSport('ALL')
              setActiveBadge('ALL')
            }}
            className='text-[11px] text-[#9CA3AF] hover:text-[#E8553A] font-lato transition-colors'
          >
            Clear all
          </button>
        </div>
      )}

      {}
      {isLoading ? (
        view === 'list' ? (
          <div className='space-y-3'>
            {Array.from({
              length: 6,
            }).map((_, i) => (
              <SkeletonCard key={i} view='list' />
            ))}
          </div>
        ) : (
          <div className={`grid ${gridCols} gap-4 sm:gap-5`}>
            {Array.from({
              length: columns * 2,
            }).map((_, i) => (
              <SkeletonCard key={i} view='grid' />
            ))}
          </div>
        )
      ) : filtered.length === 0 ? (
        <div className='text-center py-24'>
          <div className='w-20 h-20 bg-[#F2F4F7] rounded-2xl flex items-center justify-center mx-auto mb-5 text-4xl'>
            🔍
          </div>
          <h3 className='font-montserrat font-black text-xl text-[#0A1F44] mb-2'>
            No products found
          </h3>
          <p className='text-[#9CA3AF] font-lato text-sm mb-6'>
            Try adjusting your filters
          </p>
          <button
            onClick={() => {
              setActiveSport('ALL')
              setActiveBadge('ALL')
            }}
            className='px-6 py-2.5 bg-[#E8553A] hover:bg-[#D4441F] text-white rounded-xl text-sm font-black font-montserrat transition-colors'
          >
            Clear Filters
          </button>
        </div>
      ) : view === 'list' ? (
        <div className='space-y-3'>
          {paged.map((product) => (
            <ProductCard key={product.id} product={product} view='list' />
          ))}
        </div>
      ) : (
        <div className={`grid ${gridCols} gap-4 sm:gap-5`}>
          {paged.map((product) => (
            <ProductCard key={product.id} product={product} view='grid' />
          ))}
        </div>
      )}

      {}
      {showPagination && !isLoading && filtered.length > 0 && (
        <div className='flex flex-col sm:flex-row items-center justify-between gap-4 mt-8 pt-6 border-t border-[#F2F4F7]'>
          <div className='flex items-center gap-2 text-xs font-lato text-gray-500'>
            <span>Show</span>
            <select
              value={perPage}
              onChange={(e) => setPerPage(Number(e.target.value))}
              className='border border-[#E5E7EB] rounded-lg px-2 py-1 text-xs font-semibold text-[#0A1F44] focus:outline-none focus:border-[#E8553A]'
            >
              {[12, 24, 36, 48].map((n) => (
                <option key={n} value={n}>
                  {n} per page
                </option>
              ))}
            </select>
          </div>

          {pageCount > 1 && (
            <div className='flex items-center gap-3'>
              <button
                type='button'
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className='px-3 py-1.5 rounded-lg border border-[#E5E7EB] text-xs font-semibold font-lato text-[#0A1F44] disabled:opacity-30 disabled:cursor-not-allowed hover:border-[#E8553A] transition-colors'
              >
                Prev
              </button>
              <span className='text-xs font-lato text-gray-500'>
                Page {page} / {pageCount}
              </span>
              <button
                type='button'
                onClick={() => setPage((p) => Math.min(pageCount, p + 1))}
                disabled={page === pageCount}
                className='px-3 py-1.5 rounded-lg border border-[#E5E7EB] text-xs font-semibold font-lato text-[#0A1F44] disabled:opacity-30 disabled:cursor-not-allowed hover:border-[#E8553A] transition-colors'
              >
                Next
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
