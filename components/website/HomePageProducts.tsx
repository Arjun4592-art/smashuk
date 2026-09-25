'use client'

import { useQuery } from '@tanstack/react-query'
import Link from 'next/link'
import ProductGrid from '@/components/website/ProductGrid'
import { ProductGridSkeleton } from '@/components/ui/Skeleton'
import { ArrowRightIcon } from '@/components/ui/Icons'
import { getProductsByIds, normalizeProduct } from '@/lib/api/store'
import type { HomeProductsBlock } from '@/lib/home-layout-shared'
import type { Product } from '@/types'

// One product section on the homepage, driven entirely by the block the
// dashboard saved (Dashboard → Marketing → Home Page).
//
//  - "auto" sections ask /api/store/catalog — the same server-side filter/sort
//    the shop page uses — so "sport = badminton, badge = NEW, newest first"
//    here returns exactly what /shop?sport=badminton&badge=NEW would.
//  - "manual" sections load the hand-picked product ids, in the saved order.

async function loadProducts(block: HomeProductsBlock): Promise<Product[]> {
  if (block.source === 'manual') {
    const ids = block.products.map((p) => p.id)
    if (ids.length === 0) return []
    const raw = await getProductsByIds(ids)
    const byId = new Map<string, Product>()
    for (const p of raw) byId.set(p.id, normalizeProduct(p))
    return ids
      .map((id) => byId.get(id))
      .filter((p): p is Product => !!p)
      .filter((p) => !block.onlyInStock || p.inStock)
  }

  const sp = new URLSearchParams()
  const { sport, category, brand, badge } = block.filters
  if (sport) sp.set('sport', sport)
  if (category) sp.set('category', category)
  if (brand) sp.set('brand', brand)
  if (badge) sp.set('badge', badge)
  sp.set('sort', block.sort)
  sp.set('page', '1')
  sp.set('perPage', String(block.limit))
  // The catalogue endpoint applies the shop's default price slider (0–500)
  // unless told otherwise. A homepage section shouldn't silently drop
  // expensive products, so open the range right up.
  sp.set('price', '0-1000000')
  if (block.onlyInStock) sp.set('inStock', '1')

  const res = await fetch(`/api/store/catalog?${sp.toString()}`)
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  const data = await res.json()
  return (data.products ?? []) as Product[]
}

export default function HomeProductSection({
  block,
}: {
  block: HomeProductsBlock
}) {
  const { data, isLoading, isError } = useQuery({
    // Everything that changes what is shown, and nothing that doesn't (title,
    // colours …) so restyling a section doesn't refetch it.
    queryKey: [
      'home-section',
      block.source,
      block.source === 'manual'
        ? block.products.map((p) => p.id).join(',')
        : `${JSON.stringify(block.filters)}|${block.sort}|${block.limit}`,
      block.onlyInStock,
    ],
    queryFn: () => loadProducts(block),
    staleTime: 60 * 1000,
    retry: 1,
  })

  const bg = block.background === 'gray' ? 'bg-[#F2F4F7]' : 'bg-white'

  if (isLoading) {
    return (
      <section className={`py-16 ${bg}`}>
        <div className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8'>
          <ProductGridSkeleton
            count={Math.min(block.limit, block.columns * 2)}
            columns={block.columns}
          />
        </div>
      </section>
    )
  }

  const products = data ?? []
  // An empty (or failed) section disappears instead of leaving a blank band.
  if (isError || products.length === 0) return null

  const showViewAll = !!block.viewAllLabel && !!block.viewAllHref

  return (
    <section className={`py-16 ${bg}`}>
      <div className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8'>
        <ProductGrid
          products={products}
          title={block.title || undefined}
          showSort={block.showSort}
          showViewToggle={block.showViewToggle}
          columns={block.columns}
        />
        {showViewAll && (
          <div className='mt-10 text-center'>
            <Link
              href={block.viewAllHref}
              className='inline-flex items-center gap-2 bg-[#0A1F44] hover:bg-[#E8553A] text-white font-montserrat font-bold px-6 py-3 rounded-full transition-all duration-300 shadow-md text-sm'
            >
              {block.viewAllLabel}
              <ArrowRightIcon size={14} />
            </Link>
          </div>
        )}
      </div>
    </section>
  )
}
