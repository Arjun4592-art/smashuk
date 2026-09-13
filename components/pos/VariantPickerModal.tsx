'use client'

import { CURRENCY_SYMBOL } from '@/lib/constants'
import { POSProduct } from './ProductGrid'

interface Props {
  productName: string
  image?: string
  variants: POSProduct[]
  onSelect: (variant: POSProduct) => void
  onClose: () => void
}

// Opened from ProductGrid when a collapsed tile (one product, many sizes)
// is clicked — lets staff pick the exact variant to add, without every
// size cluttering the main grid as its own tile. Works the same for any
// category (shoes, rackets, grips, apparel...) since it's just listing
// whatever POSProduct rows share that product id.
export default function VariantPickerModal({
  productName,
  image,
  variants,
  onSelect,
  onClose,
}: Props) {
  const sorted = [...variants].sort((a, b) =>
    (a.size ?? '').localeCompare(b.size ?? '', undefined, { numeric: true }),
  )
  return (
    <div
      className='fixed inset-0 flex items-center justify-center z-50 p-4'
      style={{ background: 'rgba(0,0,0,0.4)' }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        className='w-full max-w-md rounded-xl overflow-hidden flex flex-col'
        style={{ background: '#FFFFFF', maxHeight: '80vh' }}
      >
        <div
          className='flex items-center gap-3 p-4 border-b'
          style={{ borderColor: '#E1E3E5' }}
        >
          {image && (
            <img
              src={image}
              alt={productName}
              className='w-10 h-10 rounded-md object-cover shrink-0'
              style={{ background: '#F6F6F7' }}
            />
          )}
          <div className='min-w-0 flex-1'>
            <p
              className='text-sm font-semibold leading-tight line-clamp-2'
              style={{ color: '#202223' }}
            >
              {productName}
            </p>
            <p className='text-xs' style={{ color: '#8C9196' }}>
              Choose a size / variant
            </p>
          </div>
          <button
            onClick={onClose}
            className='shrink-0 w-7 h-7 flex items-center justify-center rounded-full'
            style={{ color: '#6D7175' }}
          >
            ✕
          </button>
        </div>

        <div className='overflow-y-auto p-2'>
          {sorted.map((v) => {
            const isOut = v.stock === 0
            return (
              <button
                key={v.variantId ?? v.size}
                onClick={() => onSelect(v)}
                className='w-full flex items-center justify-between gap-3 px-3 py-2.5 rounded-lg text-left transition-colors'
                style={{ background: '#FFFFFF' }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = '#F2F7F5'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = '#FFFFFF'
                }}
              >
                <div className='flex items-center gap-2 min-w-0'>
                  <span
                    className='text-sm font-semibold px-2 py-0.5 rounded'
                    style={{ background: '#F0F1F2', color: '#202223' }}
                  >
                    {v.size ?? '—'}
                  </span>
                  {isOut && (
                    <span className='text-[11px]' style={{ color: '#D82C0D' }}>
                      Out of stock
                    </span>
                  )}
                </div>
                <span
                  className='text-sm font-semibold shrink-0'
                  style={{ color: '#202223' }}
                >
                  {CURRENCY_SYMBOL}
                  {v.price.toLocaleString('en-GB')}
                </span>
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}
