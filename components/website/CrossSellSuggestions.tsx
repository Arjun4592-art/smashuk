'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useCartStore } from '@/store/cartStore'
import { formatPrice } from '@/lib/api/store'
import type { CrossSellProduct } from '@/types'
import { CartIcon, CheckIcon } from '@/components/ui/Icons'

interface CrossSellSuggestionsProps {
  products: CrossSellProduct[]
}

// "People Also Buy" — curated cross-sell suggestions set from the
// dashboard's Cross-sell tab (Products > edit product > Cross-sell), shown
// on the product detail page. Distinct from the generic "You Might Also
// Like" grid further down the page, which is just same-category filler —
// these are specific products the merchant chose, each with its own
// bought-together discount.
export default function CrossSellSuggestions({
  products,
}: CrossSellSuggestionsProps) {
  if (products.length === 0) return null

  return (
    <div className='mt-16'>
      <h2 className='font-montserrat font-black text-2xl text-[#0A1F44] mb-1'>
        People Also Buy
      </h2>
      <p className='text-sm text-gray-500 font-lato mb-6'>
        Frequently bought together with this product — save when you add these
        too.
      </p>
      <div className='flex gap-4 overflow-x-auto pb-2 -mx-1 px-1 snap-x snap-mandatory'>
        {products.map((p) => (
          <CrossSellCard key={p.id} product={p} />
        ))}
      </div>
    </div>
  )
}

function CrossSellCard({ product }: { product: CrossSellProduct }) {
  const [adding, setAdding] = useState(false)
  const [added, setAdded] = useState(false)
  const addItem = useCartStore((s) => s.addItem)

  const discountPerUnit =
    product.crossSellDiscountPct > 0
      ? product.price * (product.crossSellDiscountPct / 100)
      : 0
  const discountedPrice = product.price - discountPerUnit

  const handleAddToCart = async (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (adding || added || !product.inStock) return
    setAdding(true)
    await new Promise((r) => setTimeout(r, 300))
    addItem(product, 1, undefined, undefined, discountPerUnit)
    setAdding(false)
    setAdded(true)
    setTimeout(() => setAdded(false), 2000)
  }

  return (
    <Link
      href={`/shop/${product.slug}`}
      className='group flex-shrink-0 w-44 sm:w-52 snap-start bg-white border border-gray-100 rounded-xl overflow-hidden hover:shadow-lg hover:border-gray-200 transition-all'
    >
      <div className='relative aspect-square bg-gray-50'>
        <img
          src={product.images[0]}
          alt={product.name}
          className='absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-300'
        />
        {product.crossSellDiscountPct > 0 && (
          <span className='absolute top-2 left-2 bg-[#E8553A] text-white font-montserrat font-black text-[10px] px-2 py-1 rounded-full'>
            {product.crossSellDiscountPct}% OFF
          </span>
        )}
      </div>
      <div className='p-3'>
        <p className='font-montserrat font-bold text-sm text-[#0A1F44] line-clamp-2 min-h-[2.5rem]'>
          {product.name}
        </p>
        <div className='flex items-center gap-1.5 mt-1.5'>
          <span className='font-montserrat font-black text-sm text-[#0A1F44]'>
            {formatPrice(discountedPrice)}
          </span>
          {product.crossSellDiscountPct > 0 && (
            <span className='text-xs text-gray-400 line-through font-lato'>
              {formatPrice(product.price)}
            </span>
          )}
        </div>
        <button
          onClick={handleAddToCart}
          disabled={!product.inStock || adding}
          className={`mt-2.5 w-full flex items-center justify-center gap-1.5 py-2 rounded-lg font-montserrat font-bold text-xs transition-all ${
            !product.inStock
              ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
              : added
                ? 'bg-green-500 text-white'
                : 'bg-[#0A1F44] hover:bg-[#0A1F44]/90 text-white'
          }`}
        >
          {!product.inStock ? (
            'Out of Stock'
          ) : added ? (
            <>
              <CheckIcon size={14} /> Added
            </>
          ) : adding ? (
            'Adding...'
          ) : (
            <>
              <CartIcon size={14} /> Add
            </>
          )}
        </button>
      </div>
    </Link>
  )
}
