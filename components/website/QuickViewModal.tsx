'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useCartStore } from '@/store/cartStore'
import { formatCurrency, calculateDiscount } from '@/lib/utils'
import type { Product } from '@/types'
import { StarIcon, CartIcon, CheckIcon } from '@/components/ui/Icons'

interface Props {
  product: Product
  onClose: () => void
}

export default function QuickViewModal({ product, onClose }: Props) {
  const [adding, setAdding] = useState(false)
  const [added, setAdded] = useState(false)
  const addItem = useCartStore((s) => s.addItem)

  const discount = product.originalPrice
    ? calculateDiscount(product.price, product.originalPrice)
    : 0
  // Same fallback as ProductCard.tsx — show SALE automatically when the
  // product is genuinely discounted, not only on an explicit badge.
  const displayBadge = product.badge ?? (discount > 0 ? 'SALE' : null)

  const handleAddToCart = async () => {
    if (adding || added) return
    setAdding(true)
    await new Promise((r) => setTimeout(r, 400))
    addItem(product, 1)
    setAdding(false)
    setAdded(true)
    setTimeout(() => setAdded(false), 2000)
  }

  return (
    <div
      className='fixed inset-0 z-[100] flex items-center justify-center p-4'
      onClick={onClose}
    >
      <div className='absolute inset-0 bg-[#0A1F44]/50 backdrop-blur-sm' />
      <div
        onClick={(e) => e.stopPropagation()}
        className='relative bg-white rounded-2xl overflow-hidden max-w-3xl w-full max-h-[85vh] overflow-y-auto shadow-2xl grid grid-cols-1 sm:grid-cols-2'
      >
        <button
          onClick={onClose}
          className='absolute top-4 right-4 z-10 w-9 h-9 bg-white/90 backdrop-blur-sm rounded-full flex items-center justify-center shadow-sm hover:bg-white transition-colors'
          aria-label='Close'
        >
          <svg width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='#0A1F44' strokeWidth='2' strokeLinecap='round'>
            <line x1='18' y1='6' x2='6' y2='18' />
            <line x1='6' y1='6' x2='18' y2='18' />
          </svg>
        </button>

        {/* Image */}
        <div className='relative aspect-square bg-[#F2F4F7]'>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={product.images[0]} alt={product.name} className='w-full h-full object-cover' />
          {displayBadge && (
            <span className='absolute top-3 left-3 text-[9px] font-black px-2.5 py-1 rounded-full font-montserrat tracking-wide bg-white/90 text-[#0A1F44]'>
              {displayBadge}
            </span>
          )}
        </div>

        {/* Info */}
        <div className='p-6 sm:p-7 flex flex-col'>
          <p className='text-[10px] text-[#E8553A] font-bold font-lato uppercase tracking-wider mb-1.5'>
            {product.brand} · {product.sport}
          </p>
          <h2 className='font-montserrat font-black text-xl text-[#0A1F44] leading-snug mb-2'>
            {product.name}
          </h2>

          <div className='flex items-center gap-1.5 mb-4'>
            <div className='flex items-center gap-0.5'>
              {[...Array(5)].map((_, i) => (
                <StarIcon key={i} size={12} filled={i < Math.floor(product.rating)} className={i < Math.floor(product.rating) ? 'text-amber-400' : 'text-[#E5E7EB]'} />
              ))}
            </div>
            <span className='text-[11px] text-[#9CA3AF] font-lato'>({product.reviewCount})</span>
          </div>

          <div className='flex items-center gap-2 mb-4'>
            <span className='font-montserrat font-black text-2xl text-[#0A1F44]'>
              {formatCurrency(product.price)}
            </span>
            {product.originalPrice && (
              <>
                <span className='text-sm text-[#9CA3AF] line-through font-lato'>
                  {formatCurrency(product.originalPrice)}
                </span>
                <span className='text-[10px] font-black text-[#10B981] bg-[#D1FAE5] px-1.5 py-0.5 rounded-full font-montserrat'>
                  Save {discount}%
                </span>
              </>
            )}
          </div>

          {product.description && (
            <p className='text-[13px] text-[#4B5563] font-lato leading-relaxed line-clamp-4 mb-5'>
              {product.description}
            </p>
          )}

          {product.specs?.length > 0 && (
            <div className='grid grid-cols-2 gap-x-4 gap-y-1.5 mb-6 text-[12px] font-lato'>
              {product.specs.slice(0, 6).map((s) => (
                <div key={s.label} className='flex justify-between border-b border-gray-100 pb-1'>
                  <span className='text-gray-400'>{s.label}</span>
                  <span className='text-[#0A1F44] font-medium'>{s.value}</span>
                </div>
              ))}
            </div>
          )}

          <div className='mt-auto flex gap-3'>
            <button
              onClick={handleAddToCart}
              disabled={!product.inStock}
              className={`flex-1 py-3 rounded-xl text-[13px] font-black font-montserrat transition-all flex items-center justify-center gap-2 ${
                !product.inStock
                  ? 'bg-[#F2F4F7] text-[#9CA3AF] cursor-not-allowed'
                  : added
                    ? 'bg-[#10B981] text-white'
                    : 'bg-[#0A1F44] hover:bg-[#E8553A] text-white'
              }`}
            >
              {added ? <CheckIcon size={14} /> : <CartIcon size={14} />}
              {!product.inStock ? 'Out of Stock' : adding ? 'Adding...' : added ? 'Added!' : 'Add to Cart'}
            </button>
            <Link
              href={`/shop/${product.slug}`}
              className='px-5 py-3 rounded-xl text-[13px] font-bold font-montserrat border border-[#E5E7EB] text-[#0A1F44] hover:border-[#E8553A] transition-colors flex items-center justify-center whitespace-nowrap'
            >
              Full Details
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
