'use client'

import { useEffect, useMemo, useState } from 'react'
import {
  HOME_BADGE_OPTIONS,
  HOME_SORT_OPTIONS,
  MAX_HOME_PRODUCTS_PER_SECTION,
  shopHrefForFilters,
  type HomePickedProduct,
  type HomeProductBadge,
  type HomeProductSort,
  type HomeProductsBlock,
} from '@/lib/home-layout-shared'
import HomeProductPicker from './HomeProductPicker'
import {
  ToggleRow,
  ghostBtn,
  hintCls,
  iconBtn,
  inputCls,
  labelCls,
  primaryOutlineBtn,
} from './ui'

export interface HomeTaxonomy {
  sports: { value: string; label: string }[]
  categories: { value: string; label: string }[]
  brands: string[]
}

interface Props {
  block: HomeProductsBlock
  taxonomy: HomeTaxonomy
  onChange: (changes: Partial<HomeProductsBlock>) => void
}

/** A <select> that keeps a saved value even if it isn't in the fetched list. */
function OptionSelect({
  value,
  onChange,
  options,
  anyLabel,
}: {
  value: string
  onChange: (v: string) => void
  options: { value: string; label: string }[]
  anyLabel: string
}) {
  const hasValue = !value || options.some((o) => o.value === value)
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={inputCls}
    >
      <option value=''>{anyLabel}</option>
      {!hasValue && <option value={value}>{value}</option>}
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  )
}

/**
 * "This filter matches N products right now" — asks the same endpoint the
 * homepage uses, so an empty section is caught before the owner saves it.
 */
function useMatchCount(block: HomeProductsBlock) {
  const [count, setCount] = useState<number | null>(null)
  const [loading, setLoading] = useState(false)

  const qs = useMemo(() => {
    const sp = new URLSearchParams()
    const { sport, category, brand, badge } = block.filters
    if (sport) sp.set('sport', sport)
    if (category) sp.set('category', category)
    if (brand) sp.set('brand', brand)
    if (badge) sp.set('badge', badge)
    sp.set('page', '1')
    sp.set('perPage', '1')
    sp.set('price', '0-1000000')
    if (block.onlyInStock) sp.set('inStock', '1')
    return sp.toString()
  }, [block.filters, block.onlyInStock])

  useEffect(() => {
    if (block.source !== 'auto') return
    const controller = new AbortController()
    const timer = setTimeout(async () => {
      setLoading(true)
      try {
        const res = await fetch(`/api/store/catalog?${qs}`, {
          signal: controller.signal,
        })
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        const data = await res.json()
        setCount(typeof data.count === 'number' ? data.count : null)
      } catch (err) {
        if (!(err instanceof DOMException && err.name === 'AbortError'))
          setCount(null)
      } finally {
        setLoading(false)
      }
    }, 400)
    return () => {
      clearTimeout(timer)
      controller.abort()
    }
  }, [qs, block.source])

  return { count, loading }
}

export default function ProductsBlockEditor({
  block,
  taxonomy,
  onChange,
}: Props) {
  const [pickerOpen, setPickerOpen] = useState(false)
  const { count, loading } = useMatchCount(block)

  const setFilters = (changes: Partial<HomeProductsBlock['filters']>) =>
    onChange({ filters: { ...block.filters, ...changes } })

  const movePick = (index: number, dir: -1 | 1) => {
    const to = index + dir
    if (to < 0 || to >= block.products.length) return
    const next = [...block.products]
    ;[next[index], next[to]] = [next[to], next[index]]
    onChange({ products: next })
  }

  const removePick = (id: string) =>
    onChange({ products: block.products.filter((p) => p.id !== id) })

  const addPicks = (picked: HomePickedProduct[]) => {
    const have = new Set(block.products.map((p) => p.id))
    const merged = [
      ...block.products,
      ...picked.filter((p) => !have.has(p.id)),
    ].slice(0, MAX_HOME_PRODUCTS_PER_SECTION)
    onChange({ products: merged })
    setPickerOpen(false)
  }

  return (
    <div className='space-y-5'>
      <div className='grid grid-cols-1 md:grid-cols-2 gap-3.5'>
        <div>
          <label className={labelCls}>
            Section title
            <span className={hintCls}>(shown above the products)</span>
          </label>
          <input
            type='text'
            value={block.title}
            maxLength={60}
            onChange={(e) => onChange({ title: e.target.value })}
            placeholder='Badminton Picks'
            className={inputCls}
          />
        </div>
        <div>
          <label className={labelCls}>Which products?</label>
          <div className='flex gap-2'>
            {(
              [
                ['auto', 'Automatic (by filters)'],
                ['manual', 'Hand-picked'],
              ] as const
            ).map(([value, label]) => (
              <button
                key={value}
                type='button'
                onClick={() => onChange({ source: value })}
                className={`flex-1 px-3 py-2.5 rounded-lg text-[13px] font-medium border cursor-pointer transition-colors ${
                  block.source === value
                    ? 'bg-[#008060] text-white border-[#008060]'
                    : 'bg-white text-[#202223] border-[#E1E3E5] hover:bg-[#F6F6F7]'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {block.source === 'auto' ? (
        <div className='p-3.5 bg-[#F6F6F7] border border-[#E1E3E5] rounded-lg space-y-3.5'>
          <p className='text-[12px] text-[#6D7175] m-0'>
            Pick any combination — leave a filter on “Any” to ignore it. New
            products that match show up here on their own.
          </p>
          <div className='grid grid-cols-1 md:grid-cols-2 gap-3.5'>
            <div>
              <label className={labelCls}>Sport</label>
              <OptionSelect
                value={block.filters.sport}
                onChange={(v) => setFilters({ sport: v })}
                options={taxonomy.sports}
                anyLabel='Any sport'
              />
            </div>
            <div>
              <label className={labelCls}>Category</label>
              <OptionSelect
                value={block.filters.category}
                onChange={(v) => setFilters({ category: v })}
                options={taxonomy.categories}
                anyLabel='Any category'
              />
            </div>
            <div>
              <label className={labelCls}>Brand</label>
              <OptionSelect
                value={block.filters.brand}
                onChange={(v) => setFilters({ brand: v })}
                options={taxonomy.brands.map((b) => ({ value: b, label: b }))}
                anyLabel='Any brand'
              />
            </div>
            <div>
              <label className={labelCls}>Type</label>
              <select
                value={block.filters.badge}
                onChange={(e) =>
                  setFilters({ badge: e.target.value as HomeProductBadge })
                }
                className={inputCls}
              >
                {HOME_BADGE_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelCls}>Order</label>
              <select
                value={block.sort}
                onChange={(e) =>
                  onChange({ sort: e.target.value as HomeProductSort })
                }
                className={inputCls}
              >
                {HOME_SORT_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelCls}>
                How many to show
                <span className={hintCls}>
                  (1–{MAX_HOME_PRODUCTS_PER_SECTION})
                </span>
              </label>
              <input
                type='number'
                min={1}
                max={MAX_HOME_PRODUCTS_PER_SECTION}
                value={block.limit}
                onChange={(e) => {
                  const n = Math.round(Number(e.target.value))
                  onChange({
                    limit: Number.isFinite(n)
                      ? Math.min(Math.max(n, 1), MAX_HOME_PRODUCTS_PER_SECTION)
                      : 8,
                  })
                }}
                className={inputCls}
              />
            </div>
          </div>
          <p
            className={`text-[12.5px] font-medium m-0 ${
              !loading && count === 0 ? 'text-[#B98900]' : 'text-[#6D7175]'
            }`}
          >
            {loading
              ? 'Checking how many products match…'
              : count === null
                ? ''
                : count === 0
                  ? '⚠ No products match these filters right now — the section will be hidden on the homepage.'
                  : `${count} product${count === 1 ? '' : 's'} match right now${
                      count > block.limit ? ` (showing ${block.limit})` : ''
                    }.`}
          </p>
        </div>
      ) : (
        <div className='space-y-2.5'>
          <div className='flex items-center justify-between gap-3 flex-wrap'>
            <p className='text-[12.5px] font-medium text-[#202223] m-0'>
              {block.products.length} of {MAX_HOME_PRODUCTS_PER_SECTION}{' '}
              products
              <span className={hintCls}>(shown in this order)</span>
            </p>
            <button
              type='button'
              className={primaryOutlineBtn}
              disabled={block.products.length >= MAX_HOME_PRODUCTS_PER_SECTION}
              onClick={() => setPickerOpen(true)}
            >
              + Add products
            </button>
          </div>
          {block.products.length === 0 ? (
            <div className='p-4 border border-dashed border-[#C9CCCF] rounded-lg text-[13px] text-[#6D7175] text-center'>
              No products yet — click “Add products”.
            </div>
          ) : (
            <ul className='m-0 p-0 list-none space-y-1.5'>
              {block.products.map((p, i) => (
                <li
                  key={p.id}
                  className='flex items-center gap-3 p-2 border border-[#E1E3E5] rounded-lg bg-white'
                >
                  <span className='w-5 text-center text-[12px] text-[#8C9196]'>
                    {i + 1}
                  </span>
                  <div className='w-10 h-10 rounded-md bg-[#F1F1F1] overflow-hidden shrink-0'>
                    {p.thumbnail && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={p.thumbnail}
                        alt=''
                        className='w-full h-full object-cover'
                      />
                    )}
                  </div>
                  <p className='flex-1 min-w-0 text-[13px] text-[#202223] truncate m-0'>
                    {p.title || p.id}
                  </p>
                  <button
                    type='button'
                    className={iconBtn}
                    disabled={i === 0}
                    onClick={() => movePick(i, -1)}
                    aria-label='Move product up'
                  >
                    ↑
                  </button>
                  <button
                    type='button'
                    className={iconBtn}
                    disabled={i === block.products.length - 1}
                    onClick={() => movePick(i, 1)}
                    aria-label='Move product down'
                  >
                    ↓
                  </button>
                  <button
                    type='button'
                    className={`${iconBtn} text-[#D82C0D] border-[#D82C0D]`}
                    onClick={() => removePick(p.id)}
                    aria-label='Remove product'
                  >
                    ✕
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      <div className='grid grid-cols-1 md:grid-cols-2 gap-3.5'>
        <div>
          <label className={labelCls}>
            “View all” button — text
            <span className={hintCls}>(optional)</span>
          </label>
          <input
            type='text'
            value={block.viewAllLabel}
            maxLength={40}
            onChange={(e) => onChange({ viewAllLabel: e.target.value })}
            placeholder='Shop all badminton'
            className={inputCls}
          />
        </div>
        <div>
          <label className={labelCls}>“View all” button — link</label>
          <div className='flex gap-2'>
            <input
              type='text'
              value={block.viewAllHref}
              onChange={(e) => onChange({ viewAllHref: e.target.value })}
              placeholder='/shop?sport=badminton'
              className={inputCls}
            />
            {block.source === 'auto' && (
              <button
                type='button'
                className={`${ghostBtn} shrink-0`}
                title='Fill the link with the shop page matching these filters'
                onClick={() =>
                  onChange({ viewAllHref: shopHrefForFilters(block.filters) })
                }
              >
                Match filters
              </button>
            )}
          </div>
        </div>
      </div>

      <div className='p-3.5 bg-[#F6F6F7] border border-[#E1E3E5] rounded-lg space-y-3.5'>
        <p className='text-[11.5px] font-semibold text-[#6D7175] uppercase tracking-wide m-0'>
          Look &amp; layout
        </p>
        <div className='grid grid-cols-1 md:grid-cols-3 gap-3.5'>
          <div>
            <label className={labelCls}>Background</label>
            <select
              value={block.background}
              onChange={(e) =>
                onChange({ background: e.target.value as 'white' | 'gray' })
              }
              className={inputCls}
            >
              <option value='white'>White</option>
              <option value='gray'>Light grey</option>
            </select>
          </div>
          <div>
            <label className={labelCls}>Products per row (desktop)</label>
            <select
              value={block.columns}
              onChange={(e) =>
                onChange({ columns: Number(e.target.value) as 2 | 3 | 4 })
              }
              className={inputCls}
            >
              <option value={4}>4</option>
              <option value={3}>3</option>
              <option value={2}>2</option>
            </select>
          </div>
        </div>
        <div className='grid grid-cols-1 md:grid-cols-3 gap-3.5'>
          <ToggleRow
            on={block.onlyInStock}
            onClick={() => onChange({ onlyInStock: !block.onlyInStock })}
            label='Hide out-of-stock products'
          />
          <ToggleRow
            on={block.showSort}
            onClick={() => onChange({ showSort: !block.showSort })}
            label='Show “Sort” dropdown'
          />
          <ToggleRow
            on={block.showViewToggle}
            onClick={() => onChange({ showViewToggle: !block.showViewToggle })}
            label='Show grid / list toggle'
          />
        </div>
      </div>

      {pickerOpen && (
        <HomeProductPicker
          alreadyPicked={block.products.map((p) => p.id)}
          slotsLeft={MAX_HOME_PRODUCTS_PER_SECTION - block.products.length}
          onConfirm={addPicks}
          onClose={() => setPickerOpen(false)}
        />
      )}
    </div>
  )
}
