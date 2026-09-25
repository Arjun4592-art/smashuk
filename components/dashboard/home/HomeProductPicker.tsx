'use client'

import { useEffect, useRef, useState } from 'react'
import { errorMessage } from '@/lib/error-message'
import type { HomePickedProduct } from '@/lib/home-layout-shared'

interface AdminProduct {
  id: string
  title: string
  handle: string
  thumbnail: string | null
  status?: string
}

interface Props {
  /** Ids already in the section — shown as ticked and not selectable again. */
  alreadyPicked: string[]
  /** How many more products this section can still take. */
  slotsLeft: number
  onConfirm: (products: HomePickedProduct[]) => void
  onClose: () => void
}

export default function HomeProductPicker({
  alreadyPicked,
  slotsLeft,
  onConfirm,
  onClose,
}: Props) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<AdminProduct[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selected, setSelected] = useState<Map<string, HomePickedProduct>>(
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
        // Only published products can show on the storefront, so only offer those.
        const params = new URLSearchParams({ limit: '20', status: 'published' })
        if (query.trim()) params.set('q', query.trim())
        const res = await fetch(`/api/admin/products?${params}`, {
          signal: controller.signal,
        })
        const data = await res.json()
        if (!res.ok) throw new Error(data.error || 'Failed to load products')
        setResults(data.products ?? [])
      } catch (err) {
        if (!(err instanceof DOMException && err.name === 'AbortError')) {
          setError(errorMessage(err, 'Failed to load products'))
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

  const toggle = (p: AdminProduct) => {
    setSelected((prev) => {
      const next = new Map(prev)
      if (next.has(p.id)) {
        next.delete(p.id)
      } else if (next.size < slotsLeft) {
        next.set(p.id, {
          id: p.id,
          title: p.title,
          thumbnail: p.thumbnail ?? '',
        })
      }
      return next
    })
  }

  const count = selected.size

  return (
    <div className='fixed inset-0 z-50 flex items-center justify-center p-4'>
      <div
        className='absolute inset-0 bg-black/40 backdrop-blur-sm'
        onClick={onClose}
      />
      <div className='relative w-full max-w-lg bg-white rounded-xl shadow-xl border border-[#E1E3E5] flex flex-col max-h-[80vh]'>
        <div className='flex items-center justify-between px-4 py-3 border-b border-[#E1E3E5]'>
          <h3 className='text-[15px] font-semibold text-[#202223]'>
            Add products to this section
          </h3>
          <button
            type='button'
            onClick={onClose}
            className='w-7 h-7 rounded-full text-[#6D7175] hover:bg-[#F1F1F1] text-sm border-none bg-transparent cursor-pointer'
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
              const already = alreadyPicked.includes(product.id)
              const isSelected = selected.has(product.id)
              const disabled = already || (!isSelected && count >= slotsLeft)
              return (
                <button
                  key={product.id}
                  type='button'
                  disabled={disabled}
                  onClick={() => toggle(product)}
                  className={`w-full flex items-center gap-3 px-2 py-2 rounded-lg text-left transition-colors border-none cursor-pointer ${
                    isSelected
                      ? 'bg-[#008060]/10'
                      : disabled
                        ? 'opacity-40 cursor-not-allowed bg-transparent'
                        : 'bg-transparent hover:bg-[#F6F6F7]'
                  }`}
                >
                  <div
                    className={`w-5 h-5 rounded-md border flex-shrink-0 flex items-center justify-center text-white text-[11px] ${
                      isSelected || already
                        ? 'bg-[#008060] border-[#008060]'
                        : 'border-[#C9CCCF]'
                    }`}
                  >
                    {(isSelected || already) && '✓'}
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
                    <p className='text-[13px] font-medium text-[#202223] truncate m-0'>
                      {product.title}
                    </p>
                    {already && (
                      <p className='text-[11.5px] text-[#6D7175] m-0'>
                        Already in this section
                      </p>
                    )}
                  </div>
                </button>
              )
            })}
        </div>

        <div className='flex items-center justify-between gap-3 px-4 py-3 border-t border-[#E1E3E5]'>
          <p className='text-[12px] text-[#6D7175] m-0'>
            {count} selected · room for {Math.max(slotsLeft - count, 0)} more
          </p>
          <button
            type='button'
            disabled={count === 0}
            onClick={() => onConfirm(Array.from(selected.values()))}
            className={`px-4 py-2 rounded-lg text-[13px] font-semibold text-white transition-colors border-none ${
              count > 0
                ? 'bg-[#008060] hover:bg-[#006E52] cursor-pointer'
                : 'bg-[#C9CCCF] cursor-not-allowed'
            }`}
          >
            Add {count > 0 ? count : ''} product{count === 1 ? '' : 's'}
          </button>
        </div>
      </div>
    </div>
  )
}
