import { CURRENCY_SYMBOL } from '@/lib/constants'
import { usePOSStore } from '@/store/posStore'
export interface POSProduct {
  id: string
  name: string
  brand: string
  sku: string
  price: number
  stock: number
  category: string
  image?: string
  description?: string
  channel?: 'both' | 'online_only' | 'pos_only'
  posPrice?: number
  variantId?: string
  size?: string
  sizeOptionTitle?: string
}
interface Props {
  products: POSProduct[]
  onAdd: (product: POSProduct) => void
  isLoading?: boolean
}
export default function ProductGrid({ products, onAdd, isLoading }: Props) {
  const showStockCount = usePOSStore((s) => s.showStockCount)
  if (isLoading && products.length === 0) {
    return (
      <div className='grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2'>
        {Array.from({ length: 15 }).map((_, i) => (
          <div
            key={i}
            className='flex flex-col p-3 rounded-lg border'
            style={{
              background: '#FFFFFF',
              borderColor: '#E1E3E5',
            }}
          >
            <div
              className='w-full aspect-square rounded-md mb-2 animate-pulse'
              style={{ background: '#F0F1F2' }}
            />
            <div
              className='h-3 rounded mb-1.5 animate-pulse'
              style={{ background: '#F0F1F2', width: '85%' }}
            />
            <div
              className='h-2.5 rounded mb-2 animate-pulse'
              style={{ background: '#F0F1F2', width: '50%' }}
            />
            <div
              className='h-3.5 rounded animate-pulse'
              style={{ background: '#F0F1F2', width: '40%' }}
            />
          </div>
        ))}
      </div>
    )
  }
  if (products.length === 0) {
    return (
      <div className='flex flex-col items-center justify-center py-16 gap-3'>
        <svg
          width='40'
          height='40'
          viewBox='0 0 24 24'
          fill='none'
          stroke='#8C9196'
          strokeWidth='1.5'
        >
          <path d='M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z' />
        </svg>
        <p
          className='text-sm'
          style={{
            color: '#8C9196',
          }}
        >
          No products found
        </p>
      </div>
    )
  }
  return (
    <div className='grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2'>
      {products.map((p) => {
        const isOut = p.stock === 0
        const isLow = p.stock > 0 && p.stock <= 3
        return (
          <button
            key={p.variantId ?? p.id}
            onClick={() => onAdd(p)}
            title={
              isOut
                ? `${p.name}${p.size ? ` — ${p.size}` : ''} (out of stock — will still be sold)`
                : `${p.name}${p.size ? ` — ${p.size}` : ''}`
            }
            className='flex flex-col p-3 rounded-lg border text-left transition-all'
            style={{
              background: '#FFFFFF',
              borderColor: '#E1E3E5',
              cursor: 'pointer',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = '#008060'
              e.currentTarget.style.background = '#F2F7F5'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = '#E1E3E5'
              e.currentTarget.style.background = '#FFFFFF'
            }}
          >
            {}
            <div
              className='w-full aspect-square rounded-md flex items-center justify-center mb-2 overflow-hidden'
              style={{
                background: '#F6F6F7',
              }}
            >
              {p.image ? (
                <img
                  src={p.image}
                  alt={p.name}
                  className='w-full h-full object-cover'
                  onError={(e) => {
                    e.currentTarget.style.display = 'none'
                    const svg =
                      e.currentTarget.parentElement?.querySelector('svg')
                    if (svg) svg.style.display = ''
                  }}
                />
              ) : null}
              <svg
                width='28'
                height='28'
                viewBox='0 0 24 24'
                fill='none'
                stroke='#8C9196'
                strokeWidth='1.5'
                style={{
                  display: p.image ? 'none' : undefined,
                }}
              >
                <path d='M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z' />
                <line x1='3' y1='6' x2='21' y2='6' />
                <path d='M16 10a4 4 0 01-8 0' />
              </svg>
            </div>

            {}
            <p
              className='text-xs font-medium leading-tight line-clamp-2 mb-0.5'
              style={{
                color: '#202223',
              }}
            >
              {p.name}
            </p>

            {}
            <div className='flex items-center gap-1 mb-1.5'>
              <p
                className='text-[11px]'
                style={{
                  color: '#8C9196',
                }}
              >
                {p.brand}
              </p>
              {p.size && (
                <span
                  className='text-[10px] font-semibold px-1.5 py-[1px] rounded'
                  style={{
                    background: '#F2F7F5',
                    color: '#008060',
                  }}
                >
                  {p.size}
                </span>
              )}
            </div>

            {}
            <p
              className='text-sm font-semibold mb-1'
              style={{
                color: '#202223',
              }}
            >
              {CURRENCY_SYMBOL}
              {p.price.toLocaleString('en-GB')}
            </p>

            {}
            {(showStockCount || isOut) && (
              <div className='flex items-center gap-1'>
                <div
                  className='w-1.5 h-1.5 rounded-full shrink-0'
                  style={{
                    background: isOut
                      ? '#D82C0D'
                      : isLow
                        ? '#FFC453'
                        : '#008060',
                  }}
                />
                <p
                  className='text-[10px]'
                  style={{
                    color: isOut ? '#D82C0D' : isLow ? '#B7791F' : '#6D7175',
                  }}
                >
                  {isOut
                    ? 'Out of stock'
                    : showStockCount
                      ? isLow
                        ? `Only ${p.stock} left`
                        : `${p.stock} in stock`
                      : ''}
                </p>
              </div>
            )}
          </button>
        )
      })}
    </div>
  )
}
