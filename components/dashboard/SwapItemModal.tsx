'use client'

import { useEffect, useState } from 'react'

function Thumb({ src, alt }: { src?: string | null; alt: string }) {
  return src ? (
    <img
      src={src}
      alt={alt}
      className='h-14 w-14 shrink-0 rounded-lg border border-[#E1E3E5] bg-white object-contain'
    />
  ) : (
    <div className='h-14 w-14 shrink-0 rounded-lg border border-[#E1E3E5] bg-[#F6F6F7]' />
  )
}

function money(n: number, currency = 'GBP') {
  const sym =
    currency.toUpperCase() === 'GBP' ? '£' : currency.toUpperCase() + ' '
  return sym + (Number(n) || 0).toFixed(2)
}

interface Props {
  order: any
  onSubmit: (payload: {
    item_id: string
    variant_id: string
    quantity: number
    keep_price: boolean
    notify_customer: boolean
  }) => Promise<void>
  onClose: () => void
}

export default function SwapItemModal({ order, onSubmit, onClose }: Props) {
  const items: any[] = order.items ?? []
  const currency = order.currency_code ?? 'GBP'
  const [itemId, setItemId] = useState<string>(items[0]?.id ?? '')
  const [q, setQ] = useState('')
  const [results, setResults] = useState<any[]>([])
  const [searching, setSearching] = useState(false)
  const [variantId, setVariantId] = useState('')
  const [quantity, setQuantity] = useState<number>(items[0]?.quantity ?? 1)
  const [keepPrice, setKeepPrice] = useState(false)
  const [notify, setNotify] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    const term = q.trim()
    if (term.length < 2) {
      setResults([])
      return
    }
    const t = setTimeout(async () => {
      setSearching(true)
      try {
        const res = await fetch(
          `/api/admin/products?q=${encodeURIComponent(term)}&limit=8`,
          { credentials: 'include' },
        )
        const data = await res.json()
        setResults(data.products ?? [])
      } catch {
        setResults([])
      } finally {
        setSearching(false)
      }
    }, 350)
    return () => clearTimeout(t)
  }, [q])

  const priceOf = (v: any) => {
    const p =
      v.prices?.find((x: any) => x.currency_code?.toLowerCase() === 'gbp') ??
      v.prices?.[0]
    return typeof p?.amount === 'number' ? p.amount : null
  }

  const submit = async () => {
    if (!itemId || !variantId) {
      setError('Choose the item to replace and the new variant.')
      return
    }
    setSaving(true)
    setError('')
    try {
      await onSubmit({
        item_id: itemId,
        variant_id: variantId,
        quantity,
        keep_price: keepPrice,
        notify_customer: notify,
      })
    } catch (e: any) {
      setError(e?.message ?? 'Could not replace the item')
      setSaving(false)
    }
  }

  return (
    <div className='fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 p-0 sm:p-4'>
      <div className='w-full sm:max-w-xl max-h-[92vh] overflow-y-auto rounded-t-2xl sm:rounded-2xl bg-white p-5 shadow-xl'>
        <div className='flex items-center justify-between mb-4'>
          <h2 className='text-lg font-semibold text-[#202223]'>
            Replace an item
          </h2>
          <button
            onClick={onClose}
            className='text-[#6D7175] text-2xl leading-none'
            aria-label='Close'
          >
            ×
          </button>
        </div>

        <p className='text-sm font-medium text-[#202223] mb-2'>
          1. Item to replace
        </p>
        <div className='space-y-2 mb-5'>
          {items.map((it) => (
            <label
              key={it.id}
              className={`flex items-center gap-3 rounded-xl border p-3 cursor-pointer ${
                itemId === it.id
                  ? 'border-[#008060] bg-[#F1F8F5]'
                  : 'border-[#C4C8CC]'
              }`}
            >
              <input
                type='radio'
                name='swap-item'
                checked={itemId === it.id}
                onChange={() => {
                  setItemId(it.id)
                  setQuantity(it.quantity)
                }}
              />
              <Thumb
                src={it.thumbnail ?? it.variant?.product?.thumbnail}
                alt={it.title}
              />
              <span className='flex-1 text-sm text-[#202223]'>
                {it.title}
                {it.variant_title ? ` — ${it.variant_title}` : ''}
                <span className='block text-xs text-[#6D7175]'>
                  Qty {it.quantity} · {money(it.unit_price, currency)}
                </span>
              </span>
            </label>
          ))}
        </div>

        <p className='text-sm font-medium text-[#202223] mb-2'>
          2. Replace with
        </p>
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder='Search your inventory…'
          className='w-full rounded-xl border border-[#C4C8CC] px-3 py-2.5 text-[15px] mb-2 outline-none focus:border-[#008060]'
        />
        {searching && <p className='text-xs text-[#6D7175] mb-2'>Searching…</p>}
        <div className='space-y-3 mb-5'>
          {results.map((p) => (
            <div key={p.id} className='rounded-xl border border-[#E1E3E5] p-3'>
              <div className='flex items-center gap-3 mb-3'>
                <Thumb src={p.thumbnail ?? p.images?.[0]?.url} alt={p.title} />
                <p className='text-sm font-medium text-[#202223]'>{p.title}</p>
              </div>
              <div className='flex flex-wrap gap-2'>
                {(p.variants ?? []).map((v: any) => {
                  const price = priceOf(v)
                  const active = variantId === v.id
                  return (
                    <button
                      key={v.id}
                      type='button'
                      onClick={() => setVariantId(v.id)}
                      className={`rounded-lg border px-3 py-1.5 text-xs ${
                        active
                          ? 'border-[#008060] bg-[#008060] text-white'
                          : 'border-[#C4C8CC] text-[#202223]'
                      }`}
                    >
                      {v.title && v.title !== 'Default' ? v.title : 'Default'}
                      {price !== null ? ` · ${money(price, currency)}` : ''}
                    </button>
                  )
                })}
              </div>
            </div>
          ))}
        </div>

        <div className='flex items-center gap-3 mb-3'>
          <label className='text-sm text-[#202223]'>Quantity</label>
          <input
            type='number'
            min={1}
            value={quantity}
            onChange={(e) =>
              setQuantity(Math.max(1, Number(e.target.value) || 1))
            }
            className='w-20 rounded-lg border border-[#C4C8CC] px-2 py-1.5 text-sm'
          />
        </div>
        <label className='flex items-center gap-2 text-sm text-[#202223] mb-2'>
          <input
            type='checkbox'
            checked={keepPrice}
            onChange={(e) => setKeepPrice(e.target.checked)}
          />
          Charge the same price as the item being replaced
        </label>
        <label className='flex items-center gap-2 text-sm text-[#202223] mb-4'>
          <input
            type='checkbox'
            checked={notify}
            onChange={(e) => setNotify(e.target.checked)}
          />
          Email the customer a new receipt
        </label>

        {error && <p className='text-sm text-red-600 mb-3'>{error}</p>}

        <div className='flex gap-3 justify-end'>
          <button
            onClick={onClose}
            className='rounded-full border border-[#C4C8CC] px-4 py-2 text-sm text-[#202223]'
          >
            Cancel
          </button>
          <button
            onClick={submit}
            disabled={saving}
            className='rounded-full bg-[#008060] px-5 py-2 text-sm font-medium text-white disabled:opacity-60'
          >
            {saving ? 'Replacing…' : 'Replace item'}
          </button>
        </div>
      </div>
    </div>
  )
}
