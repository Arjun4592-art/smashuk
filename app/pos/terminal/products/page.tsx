'use client'
import { useState, useEffect } from 'react'
import { usePOSStore } from '@/store/posStore'
import ProductSearch from '@/components/pos/ProductSearch'
import CategoryFilter from '@/components/pos/CategoryFilter'

export default function ProductsPage() {
  const products = usePOSStore((s) => s.products)
  const medusaLoading = usePOSStore((s) => s.medusaLoading)
  const showStockCount = usePOSStore((s) => s.showStockCount)
  const [search, setSearch] = useState('')
  const [cat, setCat] = useState('All')
  const [mounted, setMounted] = useState(false)

  // Categories — derived from real backend product data, not hardcoded.
  const CATEGORIES = Array.from(
    new Set(
      products
        .map((p) => p.category)
        .filter((c): c is string => Boolean(c) && c !== 'Uncategorized'),
    ),
  ).sort((a, b) => a.localeCompare(b))

  useEffect(() => {
    const t = setTimeout(() => setMounted(true), 50)
    return () => clearTimeout(t)
  }, [])

  const filtered = products.filter((p) => {
    const matchCat = cat === 'All' || p.category === cat
    const matchSearch =
      !search ||
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.sku.toLowerCase().includes(search.toLowerCase())
    return matchCat && matchSearch
  })

  return (
    <div
      className='flex-1 min-h-0 overflow-y-auto p-3 sm:p-4 space-y-3'
      style={{
        opacity: mounted ? 1 : 0,
        transform: mounted ? 'translateY(0)' : 'translateY(6px)',
        transition: 'opacity 0.2s ease, transform 0.2s ease',
      }}
    >
      <h1 className='text-xl font-semibold' style={{ color: '#202223' }}>
        Products
      </h1>

      <ProductSearch value={search} onChange={setSearch} />
      <CategoryFilter
        categories={CATEGORIES}
        selected={cat}
        onChange={setCat}
      />

      <div
        className='rounded-xl overflow-hidden'
        style={{ background: '#FFFFFF', border: '1px solid #E1E3E5' }}
      >
        {/* Desktop header */}
        <div
          className='hidden sm:grid grid-cols-6 px-4 py-2.5 text-[11px] font-medium uppercase tracking-wide'
          style={{
            background: '#F6F6F7',
            color: '#8C9196',
            borderBottom: '1px solid #E1E3E5',
          }}
        >
          <span className='col-span-2'>Product</span>
          <span>SKU</span>
          <span>Price</span>
          <span>Stock</span>
          <span>Channel</span>
        </div>

        {medusaLoading ? (
          <div className='animate-pulse'>
            {[...Array(8)].map((_, i) => (
              <div key={i} className='flex items-center gap-4 px-4 py-3 border-b border-[#F1F1F1]'>
                <div className='w-10 h-10 bg-[#F1F1F1] rounded-lg shrink-0' />
                <div className='flex-1 space-y-1.5'>
                  <div className='h-3.5 bg-[#F1F1F1] rounded w-3/4' />
                  <div className='h-3 bg-[#F1F1F1] rounded w-1/2' />
                </div>
                <div className='h-3.5 w-16 bg-[#F1F1F1] rounded' />
                <div className='h-3.5 w-16 bg-[#F1F1F1] rounded' />
                <div className='h-5 w-12 bg-[#F1F1F1] rounded-full' />
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className='flex flex-col items-center py-12 gap-2'>
            <svg
              width='32'
              height='32'
              viewBox='0 0 24 24'
              fill='none'
              stroke='#E1E3E5'
              strokeWidth='1.5'
            >
              <path d='M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z' />
            </svg>
            <p className='text-sm' style={{ color: '#8C9196' }}>
              No products found
            </p>
          </div>
        ) : (
          filtered.map((p, i) => {
            const isOut = p.stock === 0
            const isLow = p.stock > 0 && p.stock <= 3
            const stockColor = isOut ? '#D82C0D' : isLow ? '#B7791F' : '#008060'

            return (
              <div key={p.id}>
                {/* Desktop row */}
                <div
                  className='hidden sm:grid grid-cols-6 px-4 py-3 text-sm items-center'
                  style={{
                    borderBottom:
                      i < filtered.length - 1 ? '1px solid #F6F6F7' : 'none',
                  }}
                >
                  <div className='col-span-2'>
                    <p className='font-medium' style={{ color: '#202223' }}>
                      {p.name}
                    </p>
                    <p className='text-xs' style={{ color: '#8C9196' }}>
                      {p.brand}
                    </p>
                  </div>
                  <span className='text-xs' style={{ color: '#8C9196' }}>
                    {p.sku}
                  </span>
                  <span className='font-medium' style={{ color: '#202223' }}>
                    £{p.price.toLocaleString('en-GB')}
                  </span>
                  <span
                    className='text-xs font-medium'
                    style={{ color: stockColor }}
                  >
                    {isOut
                      ? 'Out'
                      : !showStockCount
                        ? '—'
                        : isLow
                          ? `${p.stock} left`
                          : `${p.stock}`}
                  </span>
                  <span
                    className='text-[10px] px-1.5 py-0.5 rounded font-medium w-fit'
                    style={{
                      background:
                        p.channel === 'pos_only' ? '#FFF3CD' : '#F6F6F7',
                      color: p.channel === 'pos_only' ? '#B7791F' : '#6D7175',
                    }}
                  >
                    {p.channel === 'pos_only' ? 'POS only' : 'All channels'}
                  </span>
                </div>

                {/* Mobile card */}
                <div
                  className='sm:hidden flex items-center justify-between px-4 py-3 gap-3'
                  style={{
                    borderBottom:
                      i < filtered.length - 1 ? '1px solid #F6F6F7' : 'none',
                  }}
                >
                  <div className='flex-1 min-w-0'>
                    <p
                      className='font-medium text-sm'
                      style={{ color: '#202223' }}
                    >
                      {p.name}
                    </p>
                    <p className='text-xs' style={{ color: '#8C9196' }}>
                      {p.brand} · {p.sku}
                    </p>
                  </div>
                  <div className='text-right shrink-0'>
                    <p
                      className='font-medium text-sm'
                      style={{ color: '#202223' }}
                    >
                      £{p.price.toLocaleString('en-GB')}
                    </p>
                    <p
                      className='text-xs font-medium'
                      style={{ color: stockColor }}
                    >
                      {isOut
                        ? 'Out of stock'
                        : !showStockCount
                          ? ''
                          : isLow
                            ? `${p.stock} left`
                            : `${p.stock} in stock`}
                    </p>
                  </div>
                </div>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
