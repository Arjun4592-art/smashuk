'use client'

import { useEffect, useRef, useState } from 'react'
import type { PickedProduct } from '@/components/dashboard/ProductPickerModal'

interface MedusaVariantPrice {
  amount: number
  currency_code: string
}

interface MedusaVariant {
  prices?: MedusaVariantPrice[]
}

interface MedusaProduct {
  id: string
  title: string
  handle: string
  thumbnail: string | null
  variants?: MedusaVariant[]
}

function formatPrice(product: MedusaProduct): string | null {
  const variant = product.variants?.[0]
  const priceEntry =
    variant?.prices?.find((p) => p.currency_code?.toLowerCase() === 'gbp') ??
    variant?.prices?.[0]
  if (!priceEntry) return null
  return new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency: priceEntry.currency_code?.toUpperCase() || 'GBP',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(priceEntry.amount)
}

const MIN_PRODUCTS = 2
const MAX_PRODUCTS = 4

interface Props {
  onConfirm: (products: PickedProduct[]) => void
  onClose: () => void
}

export default function ProductGridPickerModal({ onConfirm, onClose }: Props) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<MedusaProduct[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selected, setSelected] = useState<Map<string, PickedProduct>>(
    new Map(),
  )
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  useEffect(() => {
    const controller = new AbortController()
    const timer = setTimeout(async () => {
      setLoading(true)
      setError(null)
      try {
        const params = new URLSearchParams({ limit: '20' })
        if (query.trim()) params.set('q', query.trim())
        const res = await fetch(`/api/admin/products?${params}`, {
          signal: controller.signal,
        })
        const data = await res.json()
        if (!res.ok) throw new Error(data.error || 'Failed to load products')
        setResults(data.products ?? [])
      } catch (err: any) {
        if (err.name !== 'AbortError') {
          setError(err.message || 'Failed to load products')
        }
      } finally {
        setLoading(false)
      }
    }, 300)
    return () => {
      clearTimeout(timer)
      controller.abort()
    }
  }, [query])

  function toggle(product: MedusaProduct) {
    setSelected((prev) => {
      const next = new Map(prev)
      if (next.has(product.id)) {
        next.delete(product.id)
        return next
      }
      if (next.size >= MAX_PRODUCTS) return prev
      next.set(product.id, {
        productId: product.id,
        handle: product.handle,
        title: product.title,
        thumbnail: product.thumbnail,
        price: formatPrice(product),
      })
      return next
    })
  }

  const count = selected.size
  const canInsert = count >= MIN_PRODUCTS

  return (
    <div className='fixed inset-0 z-50 flex items-center justify-center p-4'>
      <div
        className='absolute inset-0 bg-black/40 backdrop-blur-sm'
        onClick={onClose}
      />
      <div className='relative w-full max-w-lg bg-white rounded-xl shadow-xl border border-[#E1E3E5] flex flex-col max-h-[80vh]'>
        <div className='flex items-center justify-between px-4 py-3 border-b border-[#E1E3E5]'>
          <div>
            <h3 className='text-[15px] font-semibold text-[#202223]'>
              Insert product grid
            </h3>
            <p className='text-[12px] text-[#6D7175] mt-0.5'>
              Pick {MIN_PRODUCTS}-{MAX_PRODUCTS} products to show side by side
            </p>
          </div>
          <button
            type='button'
            onClick={onClose}
            className='w-7 h-7 rounded-full text-[#6D7175] hover:bg-[#F1F1F1] text-sm'
          >
            ✕
          </button>
        </div>

        <div className='px-4 pt-3'>
          <input
            ref={inputRef}
            type='text'
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder='Search products by name...'
            className='w-full border border-[#E1E3E5] rounded-lg px-3 py-2 text-[13px] outline-none focus:border-[#008060]'
          />
        </div>

        <div className='flex-1 overflow-y-auto px-2 py-2 mt-1'>
          {loading && (
            <p className='text-[13px] text-[#6D7175] px-2 py-4 text-center'>
              Searching...
            </p>
          )}
          {!loading && error && (
            <p className='text-[13px] text-[#D82C0D] px-2 py-4 text-center'>
              {error}
            </p>
          )}
          {!loading && !error && results.length === 0 && (
            <p className='text-[13px] text-[#6D7175] px-2 py-4 text-center'>
              No products found.
            </p>
          )}
          {!loading &&
            !error &&
            results.map((product) => {
              const price = formatPrice(product)
              const isSelected = selected.has(product.id)
              const disabled = !isSelected && count >= MAX_PRODUCTS
              return (
                <button
                  key={product.id}
                  type='button'
                  disabled={disabled}
                  onClick={() => toggle(product)}
                  className={`w-full flex items-center gap-3 px-2 py-2 rounded-lg text-left transition-colors ${
                    isSelected
                      ? 'bg-[#008060]/10'
                      : disabled
                        ? 'opacity-40 cursor-not-allowed'
                        : 'hover:bg-[#F6F6F7]'
                  }`}
                >
                  <div
                    className={`w-5 h-5 rounded-md border flex-shrink-0 flex items-center justify-center text-white text-[11px] ${
                      isSelected
                        ? 'bg-[#008060] border-[#008060]'
                        : 'border-[#C9CCCF]'
                    }`}
                  >
                    {isSelected && '✓'}
                  </div>
                  <div className='w-11 h-11 rounded-md bg-[#F1F1F1] overflow-hidden flex-shrink-0'>
                    {product.thumbnail && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={product.thumbnail}
                        alt=''
                        className='w-full h-full object-cover'
                      />
                    )}
                  </div>
                  <div className='min-w-0 flex-1'>
                    <p className='text-[13px] font-medium text-[#202223] truncate'>
                      {product.title}
                    </p>
                    {price && (
                      <p className='text-[12px] text-[#6D7175]'>{price}</p>
                    )}
                  </div>
                </button>
              )
            })}
        </div>

        <div className='flex items-center justify-between gap-3 px-4 py-3 border-t border-[#E1E3E5]'>
          <p className='text-[12px] text-[#6D7175]'>
            {count} / {MAX_PRODUCTS} selected
          </p>
          <button
            type='button'
            disabled={!canInsert}
            onClick={() => onConfirm(Array.from(selected.values()))}
            className={`px-4 py-2 rounded-lg text-[13px] font-semibold text-white transition-colors ${
              canInsert
                ? 'bg-[#008060] hover:bg-[#006E52]'
                : 'bg-[#C9CCCF] cursor-not-allowed'
            }`}
          >
            Insert {count > 0 ? count : ''} product{count === 1 ? '' : 's'}
          </button>
        </div>
      </div>
    </div>
  )
}
