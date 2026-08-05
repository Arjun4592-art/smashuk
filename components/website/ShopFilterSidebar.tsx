'use client'

import { useState, useCallback, useEffect } from 'react'
import {
  FilterIcon,
  CloseIcon,
  ChevronDownIcon,
  CheckIcon,
} from '@/components/ui/Icons'
import { SPORTS } from '@/lib/constants'
import { matchesBadgeFilter } from '@/lib/api/store'
import type { Product } from '@/types'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface FilterState {
  sports: string[]
  brands: string[]
  priceRange: [number, number]
  inStockOnly: boolean
  minRating: number | null
  badges: string[]
  // Dynamic spec filters — e.g. { Weight: ['4U (80-84g)'], Balance: ['Even
  // Balance'] }. Keys/values aren't hardcoded: they come straight from
  // whatever `product.specs` (metadata.specs) the in-view products actually
  // have, so a Badminton Rackets listing naturally shows Weight/Balance/
  // Stiffness while a Shoes listing shows whatever specs shoe products
  // carry — no per-category filter list to maintain by hand.
  specs: Record<string, string[]>
}

interface ShopFilterSidebarProps {
  filters: FilterState
  onChange: (filters: FilterState) => void
  onClear: () => void
  activeCount: number
  // Full (unfiltered-by-brand) product list + the sport(s) currently
  // selected. When provided, Brand checkboxes for brands with zero
  // products in the selected sport(s) are disabled rather than removed,
  // so the list stays predictable while making clear what's actually
  // shoppable.
  allProducts?: Product[]
  activeSports?: string[]
  // Products already scoped to the current category/sport/brand/etc (i.e.
  // ShopClient's `filtered` list before the specs filter itself is
  // applied). Used to derive which spec filters (Weight, Balance,
  // Stiffness, ...) to show — a Badminton Rackets listing surfaces
  // different spec groups than a Shoes listing, automatically, because
  // it's reading from the products actually in view rather than a fixed
  // per-category list.
  categoryProducts?: Product[]
}

// ─── Constants ────────────────────────────────────────────────────────────────

const BRANDS = [
  'Yonex',
  'Victor',
  'Li-Ning',
  'Babolat',
  'HEAD',
  'Wilson',
  'K-Swiss',
  'Adidas',
  'Bullpadel',
  'Tecnifibre',
  'Dunlop',
]

const BADGES = [
  { id: 'NEW', label: 'New Arrivals', style: 'bg-[#E6F1FB] text-[#185FA5]' },
  { id: 'SALE', label: 'On Sale', style: 'bg-[#FCEBEB] text-[#A32D2D]' },
  {
    id: 'BESTSELLER',
    label: 'Best Sellers',
    style: 'bg-[#FEF3C7] text-[#92400E]',
  },
  { id: 'LIMITED', label: 'Limited', style: 'bg-[#F3E8FF] text-[#6B21A8]' },
]

const RATINGS = [4, 3, 2, 1]

// Common colour-name → hex mapping so a "Colour"/"Color" spec group renders
// as real visual swatches instead of plain text pills — the one facet type
// where seeing the colour beats reading its name, and something Shopify's
// own filter UI doesn't do (it just lists colour names as text/links).
const COLOR_MAP: Record<string, string> = {
  white: '#FFFFFF',
  black: '#111111',
  blue: '#2563EB',
  navy: '#0A1F44',
  red: '#DC2626',
  green: '#16A34A',
  yellow: '#EAB308',
  pink: '#EC4899',
  purple: '#9333EA',
  orange: '#EA580C',
  grey: '#9CA3AF',
  gray: '#9CA3AF',
  silver: '#C0C0C0',
  gold: '#D4AF37',
  brown: '#78350F',
  beige: '#E8DCC8',
  cream: '#FFFDD0',
  lime: '#84CC16',
  teal: '#0D9488',
  maroon: '#7F1D1D',
  charcoal: '#374151',
}

// Best-effort match against COLOR_MAP for a value like "White/Blue" or
// "Blanc De Blanc" — takes the first word that resolves to a known colour;
// returns null (falls back to the plain pill) if nothing matches.
function resolveSwatchColor(value: string): string | null {
  const lower = value.toLowerCase()
  for (const [name, hex] of Object.entries(COLOR_MAP)) {
    if (lower.includes(name)) return hex
  }
  return null
}
const MIN_PRICE = 0
// BUG FIX: this used to be 100000 (i.e. £100,000) with presets like
// "£10k–£30k" — clearly copy-pasted from a different, much higher-ticket
// category. Every real product on this store is a racket, shoe, ball, or
// item of clothing priced roughly £5–£350, so the slider's usable range
// was almost entirely empty space and one pixel of drag jumped the price
// by hundreds of pounds. £500 comfortably covers the most expensive
// rackets with headroom to spare.
const MAX_PRICE = 500
const PRICE_STEP = 10

const PRICE_PRESETS: { label: string; range: [number, number] }[] = [
  { label: 'Under £50', range: [0, 50] },
  { label: '£50–£150', range: [50, 150] },
  { label: '£150–£300', range: [150, 300] },
  { label: 'Above £300', range: [300, 500] },
]

export const DEFAULT_FILTERS: FilterState = {
  sports: [],
  brands: [],
  priceRange: [MIN_PRICE, MAX_PRICE],
  inStockOnly: false,
  minRating: null,
  badges: [],
  specs: {},
}

// ─── Section wrapper ──────────────────────────────────────────────────────────

function Section({
  title,
  children,
  count,
}: {
  title: string
  children: React.ReactNode
  count?: number
}) {
  const [open, setOpen] = useState(true)
  return (
    <div className='border-b border-[#F2F4F7] py-4 last:border-0'>
      <button
        type='button'
        onClick={() => setOpen((v) => !v)}
        className='w-full flex items-center justify-between mb-1 group'
      >
        <span className='flex items-center gap-2'>
          <span className='text-[10px] font-black font-montserrat text-[#0A1F44] uppercase tracking-[0.15em]'>
            {title}
          </span>
          {count ? (
            <span className='w-4 h-4 bg-[#E8553A] text-white text-[9px] font-black rounded-full flex items-center justify-center'>
              {count}
            </span>
          ) : null}
        </span>
        <ChevronDownIcon
          size={13}
          className={`text-[#9CA3AF] transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
        />
      </button>
      <div
        className={`overflow-hidden transition-all duration-200 ${
          open ? 'max-h-[600px] opacity-100 mt-3' : 'max-h-0 opacity-0'
        }`}
      >
        {children}
      </div>
    </div>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function ShopFilterSidebar({
  filters,
  onChange,
  onClear,
  activeCount,
  allProducts,
  activeSports = [],
  categoryProducts,
}: ShopFilterSidebarProps) {
  // Brands that actually have at least one product for the currently
  // selected sport(s). Undefined `allProducts` (or no sport selected)
  // means "don't restrict" — every brand stays enabled.
  const availableBrands = (() => {
    if (!allProducts || activeSports.length === 0) return null
    const set = new Set<string>()
    for (const p of allProducts) {
      if (activeSports.includes(p.sport) && p.brand) set.add(p.brand)
    }
    return set
  })()

  // If the sport selection changes and a currently-checked brand no longer
  // has any matching products, drop it from the active filters so the
  // "0 products found" state can't silently linger behind a checked-but-
  // disabled brand.
  useEffect(() => {
    if (!availableBrands) return
    const stillValid = filters.brands.filter((b) => availableBrands.has(b))
    if (stillValid.length !== filters.brands.length) {
      onChange({ ...filters, brands: stillValid })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeSports.join(',')])

  const toggle = useCallback(
    <K extends 'sports' | 'brands' | 'badges'>(key: K, value: string) => {
      const arr = filters[key] as string[]
      onChange({
        ...filters,
        [key]: arr.includes(value)
          ? arr.filter((v) => v !== value)
          : [...arr, value],
      })
    },
    [filters, onChange],
  )

  const toggleSpec = useCallback(
    (label: string, value: string) => {
      const current = filters.specs[label] ?? []
      const next = current.includes(value)
        ? current.filter((v) => v !== value)
        : [...current, value]
      const nextSpecs = { ...filters.specs }
      if (next.length === 0) delete nextSpecs[label]
      else nextSpecs[label] = next
      onChange({ ...filters, specs: nextSpecs })
    },
    [filters, onChange],
  )

  // Build { label: Set<value> } from whatever specs the in-view products
  // actually carry. Ordered by how many distinct values each spec has
  // (most-varied first) so the most useful filters surface at the top.
  // Internal/bookkeeping metadata fields that sometimes ended up saved
  // alongside real specs (e.g. `source_url`, left over from importing
  // product data) — these aren't meant to be customer-facing filters at
  // all, so they're excluded from auto-discovery regardless of casing.
  const NON_FILTER_SPEC_LABELS = new Set([
    'source_url',
    'source url',
    'sourceurl',
    'source',
    'url',
    'reference_url',
    'reference url',
    'import_url',
    'scraped_from',
  ])

  const dynamicSpecGroups = (() => {
    if (!categoryProducts || categoryProducts.length === 0) return []
    const map = new Map<string, Set<string>>()
    for (const p of categoryProducts) {
      for (const s of p.specs ?? []) {
        if (!s.label || !s.value) continue
        if (NON_FILTER_SPEC_LABELS.has(s.label.trim().toLowerCase())) continue
        if (!map.has(s.label)) map.set(s.label, new Set())
        map.get(s.label)!.add(s.value)
      }
    }
    return [...map.entries()]
      .filter(([, values]) => values.size > 1) // a spec every product shares isn't useful as a filter
      .sort((a, b) => a[1].size - b[1].size)
      .map(([label, values]) => ({ label, values: [...values].sort() }))
  })()

  // Drop any selected spec filters that no longer apply once the category
  // changes (mirrors the existing brand-cleanup effect below).
  useEffect(() => {
    if (!categoryProducts) return
    const validLabels = new Set(dynamicSpecGroups.map((g) => g.label))
    const cleaned = Object.fromEntries(
      Object.entries(filters.specs).filter(([label]) => validLabels.has(label)),
    )
    if (Object.keys(cleaned).length !== Object.keys(filters.specs).length) {
      onChange({ ...filters, specs: cleaned })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dynamicSpecGroups.map((g) => g.label).join(',')])

  // ── Counts ──────────────────────────────────────────────────────────────
  // "If I added this option on top of what's already selected, how many
  // products would that leave?" — computed per-section so each number stays
  // accurate as other filters change, the same way Shopify's own collection
  // filters behave (e.g. "Babolat (24)").

  // Sport counts ignore the sport selection itself (that's the dimension
  // being counted) but respect brand/badge — so switching sports shows a
  // meaningful number even while sport is the very filter being changed.
  const sportCounts = (() => {
    const map = new Map<string, number>()
    if (!allProducts) return map
    for (const p of allProducts) {
      if (!p.inStock) continue
      if (filters.brands.length && !filters.brands.includes(p.brand)) continue
      if (
        filters.badges.length &&
        !filters.badges.some((b) => matchesBadgeFilter(p, b))
      )
        continue
      map.set(p.sport, (map.get(p.sport) ?? 0) + 1)
    }
    return map
  })()

  // Brand/Badge/Rating/spec counts are scoped to categoryProducts (already
  // sport + category + URL-brand aware) so they narrow together as sport
  // changes, but each count still ignores its OWN dimension the same way.
  const brandCounts = (() => {
    const map = new Map<string, number>()
    const source = categoryProducts ?? []
    for (const p of source) {
      if (
        filters.badges.length &&
        !filters.badges.some((b) => matchesBadgeFilter(p, b))
      )
        continue
      if (p.brand) map.set(p.brand, (map.get(p.brand) ?? 0) + 1)
    }
    return map
  })()

  const badgeCounts = (() => {
    const map = new Map<string, number>()
    const source = categoryProducts ?? []
    for (const id of BADGES.map((b) => b.id)) {
      map.set(id, source.filter((p) => matchesBadgeFilter(p, id)).length)
    }
    return map
  })()

  const ratingCounts = (() => {
    const map = new Map<number, number>()
    const source = categoryProducts ?? []
    for (const r of RATINGS) {
      map.set(r, source.filter((p) => p.rating >= r).length)
    }
    return map
  })()

  // Availability needs the pre-inStock-filter universe — categoryProducts
  // already drops out-of-stock items upstream in ShopClient, so this reads
  // from allProducts instead and re-applies just the sport/brand narrowing.
  const availabilityCounts = (() => {
    let source = allProducts ?? []
    if (activeSports.length)
      source = source.filter((p) => activeSports.includes(p.sport))
    if (filters.brands.length)
      source = source.filter((p) => filters.brands.includes(p.brand))
    return {
      inStock: source.filter((p) => p.inStock).length,
      outOfStock: source.filter((p) => !p.inStock).length,
    }
  })()

  const specValueCounts = (() => {
    const map = new Map<string, number>()
    const source = categoryProducts ?? []
    for (const p of source) {
      for (const s of p.specs ?? []) {
        if (!s.label || !s.value) continue
        const key = `${s.label}::${s.value}`
        map.set(key, (map.get(key) ?? 0) + 1)
      }
    }
    return map
  })()

  const fillPctLow =
    ((filters.priceRange[0] - MIN_PRICE) / (MAX_PRICE - MIN_PRICE)) * 100
  const fillPctHigh =
    ((filters.priceRange[1] - MIN_PRICE) / (MAX_PRICE - MIN_PRICE)) * 100

  const fmt = (v: number) =>
    v >= 1000 ? `£${(v / 1000).toFixed(v % 1000 === 0 ? 0 : 1)}k` : `£${v}`

  return (
    <aside className='w-64 shrink-0'>
      {/* BUG FIX (earlier): this box used to combine `position: sticky` with
          its own `overflow-y-auto` + `max-h`. Once the sidebar got pinned,
          continuing to scroll the page made the browser scroll the *inner*
          box instead of the page (a well-known sticky+overflow gotcha), so
          the top of the Brands section (and sometimes the "Filters" header)
          silently scrolled out of view and looked "cut off". Dropping the
          inner scroll region let the sidebar render at its natural full
          height and rely purely on sticky positioning.
          `overflow-hidden` below is a different, safe thing: with no
          max-height set, it can't trap scroll the way `overflow-y-auto`
          did — it only clips the dark header block's corners to match the
          card's own rounded-2xl border, instead of poking out sharp past
          it. */}
      <div className='bg-white border border-[#E5E7EB] rounded-2xl overflow-hidden sticky top-36 shadow-sm'>
        {/* ── Header ── */}
        <div className='bg-[#0A1F44] px-5 py-4 flex items-center justify-between'>
          <div className='flex items-center gap-2.5'>
            <div className='w-8 h-8 bg-white/10 rounded-xl flex items-center justify-center'>
              <FilterIcon size={14} className='text-white' />
            </div>
            <div>
              <h2 className='font-montserrat font-black text-sm text-white leading-none'>
                Filters
              </h2>
              {activeCount > 0 && (
                <p className='text-[11px] text-white/50 font-lato mt-0.5'>
                  {activeCount} active
                </p>
              )}
            </div>
          </div>
          {activeCount > 0 && (
            <button
              type='button'
              onClick={onClear}
              className='flex items-center gap-1.5 bg-[#E8553A] hover:bg-[#D4441F] text-white text-[11px] font-black font-montserrat px-2.5 py-1.5 rounded-lg transition-colors'
            >
              Clear
              <span className='bg-white/20 text-white rounded-full w-4 h-4 flex items-center justify-center text-[10px] font-black'>
                {activeCount}
              </span>
            </button>
          )}
        </div>

        {/* ── Active chips strip ── */}
        {activeCount > 0 && (
          <div className='bg-[#FDF0ED] border-b border-[#E8553A]/15 px-4 py-2.5 flex flex-wrap gap-1.5'>
            {filters.sports.map((s) => {
              const sport = SPORTS.find((sp) => sp.slug === s)
              return (
                <span
                  key={s}
                  onClick={() => toggle('sports', s)}
                  className='inline-flex items-center gap-1 bg-white border border-[#E8553A]/30 text-[#E8553A] text-[10px] font-bold font-montserrat px-2 py-1 rounded-full cursor-pointer hover:bg-[#E8553A] hover:text-white transition-colors'
                >
                  {sport?.icon} {sport?.label} ×
                </span>
              )
            })}
            {filters.brands.map((b) => (
              <span
                key={b}
                onClick={() => toggle('brands', b)}
                className='inline-flex items-center gap-1 bg-white border border-[#E8553A]/30 text-[#E8553A] text-[10px] font-bold font-montserrat px-2 py-1 rounded-full cursor-pointer hover:bg-[#E8553A] hover:text-white transition-colors'
              >
                {b} ×
              </span>
            ))}
            {filters.badges.map((b) => (
              <span
                key={b}
                onClick={() => toggle('badges', b)}
                className='inline-flex items-center gap-1 bg-white border border-[#E8553A]/30 text-[#E8553A] text-[10px] font-bold font-montserrat px-2 py-1 rounded-full cursor-pointer hover:bg-[#E8553A] hover:text-white transition-colors'
              >
                {b} ×
              </span>
            ))}
            {filters.minRating && (
              <span
                onClick={() => onChange({ ...filters, minRating: null })}
                className='inline-flex items-center gap-1 bg-white border border-[#E8553A]/30 text-[#E8553A] text-[10px] font-bold font-montserrat px-2 py-1 rounded-full cursor-pointer hover:bg-[#E8553A] hover:text-white transition-colors'
              >
                {filters.minRating}★+ ×
              </span>
            )}
            {filters.inStockOnly && (
              <span
                onClick={() => onChange({ ...filters, inStockOnly: false })}
                className='inline-flex items-center gap-1 bg-white border border-[#E8553A]/30 text-[#E8553A] text-[10px] font-bold font-montserrat px-2 py-1 rounded-full cursor-pointer hover:bg-[#E8553A] hover:text-white transition-colors'
              >
                In Stock ×
              </span>
            )}
          </div>
        )}

        {/* ── Body ── */}
        <div className='px-5 py-2'>
          {/* ── Sport ── */}
          <Section title='Sport' count={filters.sports.length || undefined}>
            <div className='flex flex-wrap gap-1.5'>
              {SPORTS.map((s) => {
                const active = filters.sports.includes(s.slug)
                const count = sportCounts.get(s.slug) ?? 0
                return (
                  <button
                    key={s.slug}
                    type='button'
                    onClick={() => toggle('sports', s.slug)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-semibold font-lato border transition-all duration-150 ${
                      active
                        ? 'bg-[#0A1F44] text-white border-[#0A1F44] shadow-sm'
                        : 'bg-[#F2F4F7] text-[#4B5563] border-transparent hover:border-[#0A1F44]/20 hover:text-[#0A1F44]'
                    }`}
                  >
                    <span>{s.icon}</span>
                    <span>{s.label}</span>
                    <span
                      className={`text-[10px] ${active ? 'text-white/60' : 'text-[#9CA3AF]'}`}
                    >
                      ({count})
                    </span>
                  </button>
                )
              })}
            </div>
          </Section>

          {/* ── Brand ── */}
          <Section title='Brand' count={filters.brands.length || undefined}>
            <div className='space-y-0.5 max-h-52 overflow-y-auto pr-1 scrollbar-none'>
              {BRANDS.map((b) => {
                const active = filters.brands.includes(b)
                const count = brandCounts.get(b) ?? 0
                const disabled =
                  (availableBrands !== null && !availableBrands.has(b)) ||
                  (!active && count === 0)
                return (
                  <label
                    key={b}
                    onClick={() => {
                      if (disabled) return
                      toggle('brands', b)
                    }}
                    aria-disabled={disabled}
                    className={`flex items-center gap-2.5 px-3 py-2 rounded-xl transition-all duration-150 ${
                      disabled
                        ? 'opacity-40 cursor-not-allowed'
                        : 'cursor-pointer'
                    } ${
                      active
                        ? 'bg-[#E8553A]/6 border border-[#E8553A]/20'
                        : 'hover:bg-[#F2F4F7] border border-transparent'
                    }`}
                  >
                    <span
                      className={`w-4 h-4 rounded border-2 flex items-center justify-center shrink-0 transition-all ${
                        active
                          ? 'bg-[#0A1F44] border-[#0A1F44]'
                          : 'border-[#D1D5DB] hover:border-[#0A1F44]/40'
                      }`}
                    >
                      {active && <CheckIcon size={9} className='text-white' />}
                    </span>
                    <span
                      className={`text-[13px] font-lato transition-colors flex-1 ${active ? 'text-[#0A1F44] font-semibold' : 'text-[#4B5563]'}`}
                    >
                      {b}
                    </span>
                    <span className='text-[11px] text-[#9CA3AF] font-lato'>
                      {count}
                    </span>
                  </label>
                )
              })}
            </div>
          </Section>

          {/* ── Dynamic spec filters (Weight, Balance, Stiffness, Size...) ──
              Derived from categoryProducts, so these change automatically
              per category instead of being a fixed list. ── */}
          {dynamicSpecGroups.map((group) => {
            const isColorGroup = /colou?r/i.test(group.label)
            return (
              <Section
                key={group.label}
                title={group.label}
                count={filters.specs[group.label]?.length || undefined}
              >
                <div className='flex flex-wrap gap-1.5'>
                  {group.values.map((value) => {
                    const active = (filters.specs[group.label] ?? []).includes(
                      value,
                    )
                    const count =
                      specValueCounts.get(`${group.label}::${value}`) ?? 0
                    const swatch = isColorGroup
                      ? resolveSwatchColor(value)
                      : null

                    if (swatch) {
                      return (
                        <button
                          key={value}
                          type='button'
                          onClick={() => toggleSpec(group.label, value)}
                          title={`${value} (${count})`}
                          className={`flex items-center gap-1.5 pl-1 pr-2.5 py-1 rounded-full text-[11px] font-semibold font-lato border transition-all duration-150 ${
                            active
                              ? 'bg-[#0A1F44] text-white border-[#0A1F44] shadow-sm'
                              : 'bg-[#F2F4F7] text-[#4B5563] border-transparent hover:border-[#0A1F44]/20 hover:text-[#0A1F44]'
                          }`}
                        >
                          <span
                            className='w-4 h-4 rounded-full border border-black/10 shrink-0'
                            style={{ backgroundColor: swatch }}
                          />
                          <span>{value}</span>
                          <span
                            className={
                              active ? 'text-white/60' : 'text-[#9CA3AF]'
                            }
                          >
                            ({count})
                          </span>
                        </button>
                      )
                    }

                    return (
                      <button
                        key={value}
                        type='button'
                        onClick={() => toggleSpec(group.label, value)}
                        className={`px-3 py-1.5 rounded-full text-[11px] font-semibold font-lato border transition-all duration-150 ${
                          active
                            ? 'bg-[#0A1F44] text-white border-[#0A1F44] shadow-sm'
                            : 'bg-[#F2F4F7] text-[#4B5563] border-transparent hover:border-[#0A1F44]/20 hover:text-[#0A1F44]'
                        }`}
                      >
                        {value}{' '}
                        <span
                          className={
                            active ? 'text-white/60' : 'text-[#9CA3AF]'
                          }
                        >
                          ({count})
                        </span>
                      </button>
                    )
                  })}
                </div>
              </Section>
            )
          })}

          {/* ── Price Range ── */}
          <Section title='Price Range'>
            <div>
              {/* Labels */}
              <div className='flex items-center justify-between mb-3'>
                <span className='bg-[#F2F4F7] border border-[#E5E7EB] px-2.5 py-1 rounded-lg text-[11px] font-black font-montserrat text-[#0A1F44]'>
                  {fmt(filters.priceRange[0])}
                </span>
                <span className='text-[#D1D5DB] text-xs'>——</span>
                <span className='bg-[#F2F4F7] border border-[#E5E7EB] px-2.5 py-1 rounded-lg text-[11px] font-black font-montserrat text-[#0A1F44]'>
                  {fmt(filters.priceRange[1])}
                </span>
              </div>

              {/* Dual range track */}
              <div className='relative h-6 flex items-center mb-3 mx-2'>
                <div className='absolute w-full h-1.5 rounded-full bg-[#F2F4F7]' />
                <div
                  className='absolute h-1.5 rounded-full bg-[#E8553A]'
                  style={{
                    left: `${fillPctLow}%`,
                    width: `${fillPctHigh - fillPctLow}%`,
                  }}
                />
                <input
                  type='range'
                  min={MIN_PRICE}
                  max={MAX_PRICE}
                  step={PRICE_STEP}
                  value={filters.priceRange[0]}
                  onChange={(e) => {
                    const val = Math.min(
                      Number(e.target.value),
                      filters.priceRange[1] - PRICE_STEP,
                    )
                    onChange({
                      ...filters,
                      priceRange: [val, filters.priceRange[1]],
                    })
                  }}
                  className='absolute w-full h-full opacity-0 cursor-pointer z-20'
                />
                <input
                  type='range'
                  min={MIN_PRICE}
                  max={MAX_PRICE}
                  step={PRICE_STEP}
                  value={filters.priceRange[1]}
                  onChange={(e) => {
                    const val = Math.max(
                      Number(e.target.value),
                      filters.priceRange[0] + PRICE_STEP,
                    )
                    onChange({
                      ...filters,
                      priceRange: [filters.priceRange[0], val],
                    })
                  }}
                  className='absolute w-full h-full opacity-0 cursor-pointer z-20'
                />
                <div
                  className='absolute w-4 h-4 rounded-full bg-[#E8553A] border-2 border-white shadow-md pointer-events-none z-10'
                  style={{ left: `calc(${fillPctLow}% - 8px)` }}
                />
                <div
                  className='absolute w-4 h-4 rounded-full bg-[#E8553A] border-2 border-white shadow-md pointer-events-none z-10'
                  style={{ left: `calc(${fillPctHigh}% - 8px)` }}
                />
              </div>

              {/* Presets */}
              <div className='flex flex-wrap gap-1.5'>
                {PRICE_PRESETS.map((p) => {
                  const active =
                    filters.priceRange[0] === p.range[0] &&
                    filters.priceRange[1] === p.range[1]
                  return (
                    <button
                      key={p.label}
                      type='button'
                      onClick={() =>
                        onChange({ ...filters, priceRange: p.range })
                      }
                      className={`text-[10px] px-2.5 py-1 rounded-full font-semibold font-lato transition-all border ${
                        active
                          ? 'bg-[#E8553A] text-white border-[#E8553A]'
                          : 'bg-[#F2F4F7] text-[#4B5563] border-transparent hover:border-[#E8553A]/30 hover:text-[#E8553A]'
                      }`}
                    >
                      {p.label}
                    </button>
                  )
                })}
              </div>
            </div>
          </Section>

          {/* ── Availability ── */}
          <Section title='Availability'>
            <button
              type='button'
              onClick={() =>
                onChange({ ...filters, inStockOnly: !filters.inStockOnly })
              }
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl border transition-all duration-200 ${
                filters.inStockOnly
                  ? 'border-[#0A1F44]/30 bg-[#0A1F44]/4'
                  : 'border-[#E5E7EB] bg-[#F2F4F7] hover:border-[#0A1F44]/20'
              }`}
            >
              <div className='flex items-center gap-2'>
                <span
                  className={`w-2 h-2 rounded-full transition-colors ${filters.inStockOnly ? 'bg-[#10B981]' : 'bg-[#D1D5DB]'}`}
                />
                <span
                  className={`text-[13px] font-lato font-semibold transition-colors ${filters.inStockOnly ? 'text-[#0A1F44]' : 'text-[#4B5563]'}`}
                >
                  In Stock Only
                </span>
                <span className='text-[11px] text-[#9CA3AF] font-lato'>
                  ({availabilityCounts.inStock})
                </span>
              </div>
              <div
                className={`w-10 h-5 rounded-full relative shrink-0 transition-colors duration-300 ${filters.inStockOnly ? 'bg-[#0A1F44]' : 'bg-[#E5E7EB]'}`}
              >
                <div
                  className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow-sm transition-all duration-300 ${filters.inStockOnly ? 'left-5' : 'left-0.5'}`}
                />
              </div>
            </button>
            {availabilityCounts.outOfStock > 0 && (
              <p className='mt-2 text-[11px] text-[#9CA3AF] font-lato px-1'>
                {availabilityCounts.outOfStock} currently out of stock (hidden
                from results)
              </p>
            )}
          </Section>

          {/* ── Rating ── */}
          <Section
            title='Minimum Rating'
            count={filters.minRating ? 1 : undefined}
          >
            <div className='space-y-1'>
              {RATINGS.map((r) => {
                const active = filters.minRating === r
                const count = ratingCounts.get(r) ?? 0
                return (
                  <button
                    key={r}
                    type='button'
                    onClick={() =>
                      onChange({ ...filters, minRating: active ? null : r })
                    }
                    className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl transition-all duration-150 border ${
                      active
                        ? 'bg-[#FEF3C7]/60 border-[#F59E0B]/30'
                        : 'border-transparent hover:bg-[#F2F4F7]'
                    }`}
                  >
                    <div className='flex items-center gap-0.5'>
                      {[...Array(5)].map((_, i) => (
                        <svg
                          key={i}
                          width='12'
                          height='12'
                          viewBox='0 0 24 24'
                          fill={i < r ? '#FBBF24' : '#E5E7EB'}
                        >
                          <path d='M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z' />
                        </svg>
                      ))}
                    </div>
                    <span
                      className={`text-[13px] font-lato ${active ? 'text-[#92400E] font-semibold' : 'text-[#4B5563]'}`}
                    >
                      {r}+ stars
                    </span>
                    <span className='text-[11px] text-[#9CA3AF] font-lato'>
                      ({count})
                    </span>
                    {active && (
                      <span className='ml-auto w-4 h-4 bg-[#F59E0B] rounded-full flex items-center justify-center'>
                        <CheckIcon size={8} className='text-white' />
                      </span>
                    )}
                  </button>
                )
              })}
            </div>
          </Section>

          {/* ── Collection / Badge ── */}
          <Section
            title='Collection'
            count={filters.badges.length || undefined}
          >
            <div className='space-y-2'>
              {BADGES.map((b) => {
                const active = filters.badges.includes(b.id)
                const count = badgeCounts.get(b.id) ?? 0
                return (
                  <button
                    key={b.id}
                    type='button'
                    onClick={() => toggle('badges', b.id)}
                    className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl border transition-all duration-150 ${
                      active
                        ? 'border-[#E8553A]/30 bg-[#E8553A]/4'
                        : 'border-[#E5E7EB] bg-[#F2F4F7] hover:border-[#E8553A]/20'
                    }`}
                  >
                    <span className='flex items-center gap-2'>
                      <span
                        className={`text-[13px] font-lato font-semibold ${active ? 'text-[#0A1F44]' : 'text-[#4B5563]'}`}
                      >
                        {b.label}
                      </span>
                      <span className='text-[11px] text-[#9CA3AF] font-lato'>
                        ({count})
                      </span>
                    </span>
                    <span
                      className={`text-[9px] font-black font-montserrat px-2 py-0.5 rounded-full ${b.style}`}
                    >
                      {b.id}
                    </span>
                  </button>
                )
              })}
            </div>
          </Section>
        </div>
      </div>
    </aside>
  )
}
