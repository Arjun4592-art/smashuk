'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import toast from 'react-hot-toast'
import { useCartStore } from '@/store/cartStore'
import { formatPrice } from '@/lib/api/store'
import type { CrossSellProduct } from '@/types'
import { CartIcon, CheckIcon } from '@/components/ui/Icons'

interface Props {
  products: CrossSellProduct[]
}

const variantInStock = (v: any) =>
  typeof v.inventory_quantity !== 'number' || v.inventory_quantity > 0

// Value of one option (e.g. Size) on a variant, matched by option title.
function optionValue(p: any, v: any, re: RegExp): string | undefined {
  const group = (p.options ?? []).find((o: any) => re.test(o.title ?? ''))
  if (!group) return undefined
  return v.options?.find((o: any) => o.option_id === group.id)?.value
}

// "M / White" style label, in the product's own option order.
function variantLabel(p: any, v: any): string {
  const parts = (p.options ?? [])
    .map((g: any) => v.options?.find((o: any) => o.option_id === g.id)?.value)
    .filter(Boolean)
  const base = parts.length > 0 ? parts.join(' / ') : (v.title ?? 'Option')
  return variantInStock(v) ? base : `${base} (sold out)`
}

/**
 * "Frequently bought together" panel for the product page buy box (right
 * column, under Add to Cart). Uses the same cross-sell products and
 * per-product discount % the dashboard already saves.
 *
 * Items with several variants (sizes, colours...) get a dropdown right here,
 * so the shopper can pick an option and add it WITHOUT leaving the page — the
 * cross-sell discount only applies to items added from this panel.
 */
export default function FrequentlyBoughtTogether({ products }: Props) {
  const addItem = useCartStore((s) => s.addItem)

  const isMulti = (p: CrossSellProduct) => (p.variants?.length ?? 0) > 1
  // Single-variant items are ready to tick straight away.
  const readyNow = useMemo(
    () => products.filter((p) => p.inStock && !isMulti(p)),
    [products],
  )
  const [selected, setSelected] = useState<Set<string>>(
    () => new Set(readyNow.map((p) => p.id)),
  )
  // productId -> chosen variantId (multi-variant items only)
  const [chosenVariant, setChosenVariant] = useState<Record<string, string>>({})
  const [added, setAdded] = useState(false)

  if (products.length === 0) return null

  const priceOf = (p: CrossSellProduct) =>
    p.price -
    (p.crossSellDiscountPct > 0 ? p.price * (p.crossSellDiscountPct / 100) : 0)

  const canSelect = (p: CrossSellProduct) =>
    p.inStock && (!isMulti(p) || Boolean(chosenVariant[p.id]))

  const chosen = products.filter((p) => canSelect(p) && selected.has(p.id))
  const total = chosen.reduce((sum, p) => sum + priceOf(p), 0)
  const hasAnyBuyable = products.some(
    (p) =>
      p.inStock && (!isMulti(p) || (p.variants ?? []).some(variantInStock)),
  )

  const toggle = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })

  const pickVariant = (p: CrossSellProduct, variantId: string) => {
    setChosenVariant((prev) => ({ ...prev, [p.id]: variantId }))
    // Choosing an option ticks the item automatically.
    setSelected((prev) => {
      const next = new Set(prev)
      if (variantId) next.add(p.id)
      else next.delete(p.id)
      return next
    })
  }

  const handleAdd = () => {
    if (chosen.length === 0 || added) return
    for (const p of chosen) {
      const discountPerUnit =
        p.crossSellDiscountPct > 0
          ? p.price * (p.crossSellDiscountPct / 100)
          : 0
      let variant: { id: string; size?: string; color?: string } | undefined
      if (isMulti(p)) {
        const v: any = (p.variants ?? []).find(
          (x: any) => x.id === chosenVariant[p.id],
        )
        if (!v) continue
        const hasGroups = (p.options ?? []).length > 0
        variant = {
          id: v.id,
          size: optionValue(p, v, /size/i) ?? (hasGroups ? undefined : v.title),
          color: optionValue(p, v, /colou?r/i),
        }
      }
      addItem(p, 1, variant, undefined, discountPerUnit)
    }
    toast.success(
      chosen.length === 1
        ? 'Added to cart!'
        : `${chosen.length} items added to cart!`,
    )
    setAdded(true)
    setTimeout(() => setAdded(false), 2500)
  }

  return (
    <div className='order-7 lg:order-6 mb-6 rounded-2xl border border-gray-200 bg-white p-4'>
      <h2 className='font-montserrat font-black text-sm text-[#0A1F44] uppercase tracking-wider mb-3'>
        Frequently bought together
      </h2>

      <ul className='divide-y divide-gray-100'>
        {products.map((p) => {
          const multi = isMulti(p)
          const buyable =
            p.inStock && (!multi || (p.variants ?? []).some(variantInStock))
          const discounted = priceOf(p)
          const ticked = canSelect(p) && selected.has(p.id)
          return (
            <li key={p.id} className='flex items-start gap-3 py-2.5'>
              {buyable ? (
                <input
                  type='checkbox'
                  checked={ticked}
                  disabled={multi && !chosenVariant[p.id]}
                  onChange={() => toggle(p.id)}
                  aria-label={`Add ${p.name}`}
                  className='mt-5 h-4 w-4 flex-shrink-0 accent-[#E8553A] disabled:opacity-40'
                />
              ) : (
                <span className='h-4 w-4 flex-shrink-0' />
              )}
              <Link
                href={`/shop/${p.slug}`}
                className='h-14 w-14 flex-shrink-0 overflow-hidden rounded-lg bg-gray-50'
              >
                <img
                  src={p.images?.[0]}
                  alt={p.name}
                  className='h-full w-full object-cover'
                />
              </Link>
              <div className='min-w-0 flex-1'>
                <Link
                  href={`/shop/${p.slug}`}
                  className='block font-lato text-[13px] font-semibold leading-snug text-[#0A1F44] line-clamp-2 hover:text-[#E8553A]'
                >
                  {p.name}
                </Link>
                <div className='mt-0.5 flex items-center gap-1.5'>
                  <span className='font-montserrat text-[13px] font-black text-[#0A1F44]'>
                    {formatPrice(discounted)}
                  </span>
                  {p.crossSellDiscountPct > 0 && (
                    <>
                      <span className='text-[11px] text-gray-400 line-through'>
                        {formatPrice(p.price)}
                      </span>
                      <span className='rounded-full bg-[#E8553A] px-1.5 py-0.5 text-[10px] font-black text-white'>
                        {p.crossSellDiscountPct}% OFF
                      </span>
                    </>
                  )}
                </div>
                {multi && buyable && (
                  <select
                    value={chosenVariant[p.id] ?? ''}
                    onChange={(e) => pickVariant(p, e.target.value)}
                    aria-label={`Choose option for ${p.name}`}
                    className='mt-1.5 w-full max-w-[220px] cursor-pointer rounded-lg border border-gray-200 bg-gray-50 px-2.5 py-1.5 font-lato text-[12px] font-semibold text-[#0A1F44] outline-none focus:border-[#E8553A]'
                  >
                    <option value=''>Select option</option>
                    {(p.variants ?? []).map((v: any) => (
                      <option
                        key={v.id}
                        value={v.id}
                        disabled={!variantInStock(v)}
                      >
                        {variantLabel(p, v)}
                      </option>
                    ))}
                  </select>
                )}
                {!buyable && (
                  <span className='text-[11px] font-semibold text-gray-400'>
                    Out of stock
                  </span>
                )}
              </div>
            </li>
          )
        })}
      </ul>

      {hasAnyBuyable && (
        <div className='mt-3 flex items-center justify-between gap-3 border-t border-gray-100 pt-3'>
          <div className='text-[12px] text-gray-500 font-lato'>
            {chosen.length} selected
            <span className='ml-2 font-montserrat text-sm font-black text-[#0A1F44]'>
              {formatPrice(total)}
            </span>
          </div>
          <button
            type='button'
            onClick={handleAdd}
            disabled={chosen.length === 0}
            className={`flex items-center gap-1.5 rounded-lg px-4 py-2 font-montserrat text-xs font-bold transition-all ${
              chosen.length === 0
                ? 'cursor-not-allowed bg-gray-100 text-gray-400'
                : added
                  ? 'bg-green-500 text-white'
                  : 'bg-[#0A1F44] text-white hover:bg-[#0A1F44]/90'
            }`}
          >
            {added ? (
              <>
                <CheckIcon size={14} /> Added
              </>
            ) : (
              <>
                <CartIcon size={14} /> Add selected to cart
              </>
            )}
          </button>
        </div>
      )}
    </div>
  )
}
