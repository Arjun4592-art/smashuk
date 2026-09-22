'use client'

import { useMedusaProducts } from '@/hooks/useProducts'
import { normalizeProduct, isNewArrival, isBestSeller } from '@/lib/api/store'
import ProductGrid from '@/components/website/ProductGrid'
import { useMemo } from 'react'
import type { Product } from '@/types'
import { ProductGridSkeleton } from '@/components/ui/Skeleton'
export default function HomepageProducts() {
  const { data, isLoading } = useMedusaProducts({
    limit: 12,
  })
  const products: Product[] = useMemo(
    () =>
      (data?.products ?? [])
        .map(normalizeProduct)
        .filter((p: Product) => p.inStock),
    [data],
  )
  const featured = products.slice(0, 8)
  // New Arrivals is its own newest-first query. It used to be filtered out of
  // the same 12 products as Featured, which come back in Medusa's default
  // order — so a product added today only showed up if it happened to be in
  // those first 12.
  const { data: newestData } = useMedusaProducts({
    limit: 24,
    order: '-created_at',
  })
  const newArrivals: Product[] = useMemo(
    () =>
      (newestData?.products ?? [])
        .map(normalizeProduct)
        .filter((p: Product) => p.inStock && isNewArrival(p))
        .sort(
          (a: Product, b: Product) =>
            new Date(b.createdAt ?? 0).getTime() -
            new Date(a.createdAt ?? 0).getTime(),
        )
        .slice(0, 4),
    [newestData],
  )
  const bestSellers = products.filter(isBestSeller).slice(0, 6)
  if (isLoading) {
    return (
      <section className='py-16 bg-white'>
        <div className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8'>
          <ProductGridSkeleton count={8} columns={4} />
        </div>
      </section>
    )
  }
  return (
    <>
      {featured.length > 0 && (
        <section className='py-16 bg-white'>
          <div className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8'>
            <ProductGrid
              products={featured}
              title='Featured Products'
              showSort={true}
              showViewToggle={true}
              columns={4}
            />
          </div>
        </section>
      )}

      {newArrivals.length > 0 && (
        <section className='py-16 bg-[#F2F4F7]'>
          <div className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8'>
            <ProductGrid
              products={newArrivals}
              title='New Arrivals'
              showSort={false}
              showViewToggle={false}
              columns={4}
            />
          </div>
        </section>
      )}

      {bestSellers.length > 0 && (
        <section className='py-16 bg-white'>
          <div className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8'>
            <ProductGrid
              products={bestSellers}
              title='Best Sellers'
              showSort={false}
              showViewToggle={false}
              columns={4}
            />
          </div>
        </section>
      )}
    </>
  )
}
