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
import {
  canonicalizeSpecLabel,
  SPEC_FILTER_ORDER,
  resolveSpecFilterValue,
  compareWeightValues,
} from '@/lib/spec-filters'
import type { Product } from '@/types'
export interface FilterState {
  sports: string[]
  brands: string[]
  categories: string[]
  priceRange: [number, number]
  inStockOnly: boolean
  minRating: number | null
  badges: string[]
  specs: Record<string, string[]>
}
interface ShopFilterSidebarProps {
  filters: FilterState
  onChange: (filters: FilterState) => void
  onClear: () => void
  activeCount: number
  allProducts?: Product[]
  activeSports?: string[]
  activeBadges?: string[]
  categoryProducts?: Product[]
  hideSportSection?: boolean
  hideCategorySection?: boolean
}
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
  {
    id: 'NEW',
    label: 'New Arrivals',
    style: 'bg-[#E6F1FB] text-[#185FA5]',
  },
  {
    id: 'SALE',
    label: 'On Sale',
    style: 'bg-[#FCEBEB] text-[#A32D2D]',
  },
  {
    id: 'BESTSELLER',
    label: 'Best Sellers',
    style: 'bg-[#FEF3C7] text-[#92400E]',
  },
  {
    id: 'LIMITED',
    label: 'Limited',
    style: 'bg-[#F3E8FF] text-[#6B21A8]',
  },
]
const RATINGS = [4, 3, 2, 1]
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
function resolveSwatchColor(value: string): string | null {
  const lower = value.toLowerCase()
  for (const [name, hex] of Object.entries(COLOR_MAP)) {
    if (lower.includes(name)) return hex
  }
  return null
}
function formatCategoryLabel(handle: string): string {
  let rest = handle
  for (const s of SPORTS) {
    if (rest.startsWith(`${s.slug}-`)) {
      rest = rest.slice(s.slug.length + 1)
      break
    }
  }
  return rest
    .split('-')
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ')
}
const MIN_PRICE = 0
const MAX_PRICE = 500
const PRICE_STEP = 10
const PRICE_PRESETS: {
  label: string
  range: [number, number]
}[] = [
  {
    label: 'Under £50',
    range: [0, 50],
  },
  {
    label: '£50–£150',
    range: [50, 150],
  },
  {
    label: '£150–£300',
    range: [150, 300],
  },
  {
    label: 'Above £300',
    range: [300, 500],
  },
]
export const DEFAULT_FILTERS: FilterState = {
  sports: [],
  brands: [],
  categories: [],
  priceRange: [MIN_PRICE, MAX_PRICE],
  inStockOnly: true,
  minRating: null,
  badges: [],
  specs: {},
}
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
        className={`overflow-hidden transition-all duration-200 ${open ? 'max-h-[600px] opacity-100 mt-3' : 'max-h-0 opacity-0'}`}
      >
        {children}
      </div>
    </div>
  )
}
export default function ShopFilterSidebar({
  filters,
  onChange,
  onClear,
  activeCount,
  allProducts,
  activeSports = [],
  activeBadges = [],
  categoryProducts,
  hideSportSection = false,
  hideCategorySection = false,
}: ShopFilterSidebarProps) {
  const availableBrands = (() => {
    if (!allProducts || activeSports.length === 0) return null
    const set = new Set<string>()
    for (const p of allProducts) {
      if (activeSports.includes(p.sport) && p.brand) set.add(p.brand)
    }
    return set
  })()
  useEffect(() => {
    if (!availableBrands) return
    const stillValid = filters.brands.filter((b) => availableBrands.has(b))
    if (stillValid.length !== filters.brands.length) {
      onChange({
        ...filters,
        brands: stillValid,
      })
    }
  }, [activeSports.join(',')])
  useEffect(() => {
    if (!allProducts) return
    const validHandles = new Set(
      allProducts
        .filter((p) => !activeSports.length || activeSports.includes(p.sport))
        .map((p) => p.category)
        .filter(Boolean),
    )
    const stillValid = filters.categories.filter((c) =>
      [...validHandles].some((h) => h.includes(c) || c.includes(h)),
    )
    if (stillValid.length !== filters.categories.length) {
      onChange({
        ...filters,
        categories: stillValid,
      })
    }
  }, [activeSports.join(',')])
  const categoryOptions = (() => {
    const map = new Map<string, number>()
    if (!allProducts)
      return [] as {
        handle: string
        label: string
        count: number
      }[]
    for (const p of allProducts) {
      if (!p.inStock) continue
      if (activeSports.length && !activeSports.includes(p.sport)) continue
      if (filters.brands.length && !filters.brands.includes(p.brand)) continue
      if (
        activeBadges.length &&
        !activeBadges.some((b) => matchesBadgeFilter(p, b))
      )
        continue
      if (!p.category) continue
      map.set(p.category, (map.get(p.category) ?? 0) + 1)
    }
    return [...map.entries()]
      .sort((a, b) => b[1] - a[1])
      .map(([handle, count]) => ({
        handle,
        count,
        label: formatCategoryLabel(handle),
      }))
  })()
  const toggle = useCallback(
    <K extends 'sports' | 'brands' | 'badges' | 'categories'>(
      key: K,
      value: string,
    ) => {
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
      const nextSpecs = {
        ...filters.specs,
      }
      if (next.length === 0) delete nextSpecs[label]
      else nextSpecs[label] = next
      onChange({
        ...filters,
        specs: nextSpecs,
      })
    },
    [filters, onChange],
  )
  // Which raw spec labels are allowed to become filters — and what canonical
  // name/order they show up under — is centralised in lib/spec-filters.ts so
  // the sidebar and the actual product filtering (ShopClient) always agree.
  // Every raw label variant that describes the same attribute (e.g. "Colour",
  // "Frame Colour", "Racket Weight (g)") gets merged into a single canonical
  // section instead of showing up as separate near-duplicate filters.
  const dynamicSpecGroups = (() => {
    if (!categoryProducts || categoryProducts.length === 0) return []
    const map = new Map<string, Set<string>>()
    for (const p of categoryProducts) {
      for (const s of p.specs ?? []) {
        if (!s.label || !s.value) continue
        const canonicalLabel = canonicalizeSpecLabel(
          p.sport,
          p.category,
          s.label,
        )
        if (!canonicalLabel) continue
        const resolvedValue = resolveSpecFilterValue(
          p.sport,
          p.category,
          canonicalLabel,
          s.value,
        )
        if (!resolvedValue) continue
        if (!map.has(canonicalLabel)) map.set(canonicalLabel, new Set())
        map.get(canonicalLabel)!.add(resolvedValue)
      }
    }
    const MAX_SPEC_GROUPS = 6
    const MAX_DISTINCT_VALUES = 12
    const MAX_UNIQUE_RATIO = 0.6
    return [...map.entries()]
      .filter(([, values]) => values.size > 1)
      .filter(([, values]) => values.size <= MAX_DISTINCT_VALUES)
      .filter(
        ([, values]) =>
          values.size / categoryProducts.length <= MAX_UNIQUE_RATIO,
      )
      .sort(
        (a, b) =>
          SPEC_FILTER_ORDER.indexOf(a[0]) - SPEC_FILTER_ORDER.indexOf(b[0]),
      )
      .slice(0, MAX_SPEC_GROUPS)
      .map(([label, values]) => ({
        label,
        values:
          label === 'Weight'
            ? [...values].sort(compareWeightValues)
            : [...values].sort(),
      }))
  })()
  useEffect(() => {
    if (!categoryProducts) return
    const validLabels = new Set(dynamicSpecGroups.map((g) => g.label))
    const cleaned = Object.fromEntries(
      Object.entries(filters.specs).filter(([label]) => validLabels.has(label)),
    )
    if (Object.keys(cleaned).length !== Object.keys(filters.specs).length) {
      onChange({
        ...filters,
        specs: cleaned,
      })
    }
  }, [dynamicSpecGroups.map((g) => g.label).join(',')])
  const sportCounts = (() => {
    const map = new Map<string, number>()
    if (!allProducts) return map
    for (const p of allProducts) {
      if (!p.inStock) continue
      if (filters.brands.length && !filters.brands.includes(p.brand)) continue
      if (
        activeBadges.length &&
        !activeBadges.some((b) => matchesBadgeFilter(p, b))
      )
        continue
      map.set(p.sport, (map.get(p.sport) ?? 0) + 1)
    }
    return map
  })()
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
  const availabilityCounts = (() => {
    let source = allProducts ?? []
    if (activeSports.length)
      source = source.filter((p) => activeSports.includes(p.sport))
    if (filters.brands.length)
      source = source.filter((p) => filters.brands.includes(p.brand))
    if (activeBadges.length)
      source = source.filter((p) =>
        activeBadges.some((b) => matchesBadgeFilter(p, b)),
      )
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
        const canonicalLabel = canonicalizeSpecLabel(
          p.sport,
          p.category,
          s.label,
        )
        if (!canonicalLabel) continue
        const resolvedValue = resolveSpecFilterValue(
          p.sport,
          p.category,
          canonicalLabel,
          s.value,
        )
        if (!resolvedValue) continue
        const key = `${canonicalLabel}::${resolvedValue}`
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
      {}
      <div className='bg-white border border-[#E5E7EB] rounded-2xl overflow-hidden sticky top-36 shadow-sm'>
        {}
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

        {}
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
                onClick={() =>
                  onChange({
                    ...filters,
                    minRating: null,
                  })
                }
                className='inline-flex items-center gap-1 bg-white border border-[#E8553A]/30 text-[#E8553A] text-[10px] font-bold font-montserrat px-2 py-1 rounded-full cursor-pointer hover:bg-[#E8553A] hover:text-white transition-colors'
              >
                {filters.minRating}★+ ×
              </span>
            )}
            {!filters.inStockOnly && (
              <span
                onClick={() =>
                  onChange({
                    ...filters,
                    inStockOnly: true,
                  })
                }
                className='inline-flex items-center gap-1 bg-white border border-[#E8553A]/30 text-[#E8553A] text-[10px] font-bold font-montserrat px-2 py-1 rounded-full cursor-pointer hover:bg-[#E8553A] hover:text-white transition-colors'
              >
                Showing Out of Stock ×
              </span>
            )}
          </div>
        )}

        {}
        <div className='px-5 py-2'>
          {}
          {!hideSportSection && (
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
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-semibold font-lato border transition-all duration-150 ${active ? 'bg-[#0A1F44] text-white border-[#0A1F44] shadow-sm' : 'bg-[#F2F4F7] text-[#4B5563] border-transparent hover:border-[#0A1F44]/20 hover:text-[#0A1F44]'}`}
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
          )}

          {}
          {}
          {!hideCategorySection &&
            activeSports.length > 0 &&
            categoryOptions.length > 0 && (
              <Section
                title='Category'
                count={filters.categories.length || undefined}
              >
                <div className='flex flex-wrap gap-1.5'>
                  {categoryOptions.map((c) => {
                    const active = filters.categories.some(
                      (v) => c.handle.includes(v) || v.includes(c.handle),
                    )
                    return (
                      <button
                        key={c.handle}
                        type='button'
                        onClick={() => toggle('categories', c.handle)}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-semibold font-lato border transition-all duration-150 ${active ? 'bg-[#0A1F44] text-white border-[#0A1F44] shadow-sm' : 'bg-[#F2F4F7] text-[#4B5563] border-transparent hover:border-[#0A1F44]/20 hover:text-[#0A1F44]'}`}
                      >
                        <span>{c.label}</span>
                        <span
                          className={`text-[10px] ${active ? 'text-white/60' : 'text-[#9CA3AF]'}`}
                        >
                          ({c.count})
                        </span>
                      </button>
                    )
                  })}
                </div>
              </Section>
            )}

          {}
          <Section title='Brand' count={filters.brands.length || undefined}>
            <div className='space-y-0.5 max-h-52 overflow-y-auto pr-1 scrollbar-none'>
              {BRANDS.filter((b) => {
                const active = filters.brands.includes(b)
                const count = brandCounts.get(b) ?? 0
                const unavailable =
                  availableBrands !== null && !availableBrands.has(b)
                return active || (!unavailable && count > 0)
              }).map((b) => {
                const active = filters.brands.includes(b)
                const count = brandCounts.get(b) ?? 0
                return (
                  <label
                    key={b}
                    onClick={() => toggle('brands', b)}
                    className={`flex items-center gap-2.5 px-3 py-2 rounded-xl cursor-pointer transition-all duration-150 ${active ? 'bg-[#E8553A]/6 border border-[#E8553A]/20' : 'hover:bg-[#F2F4F7] border border-transparent'}`}
                  >
                    <span
                      className={`w-4 h-4 rounded border-2 flex items-center justify-center shrink-0 transition-all ${active ? 'bg-[#0A1F44] border-[#0A1F44]' : 'border-[#D1D5DB] hover:border-[#0A1F44]/40'}`}
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

          {}
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
                          className={`flex items-center gap-1.5 pl-1 pr-2.5 py-1 rounded-full text-[11px] font-semibold font-lato border transition-all duration-150 ${active ? 'bg-[#0A1F44] text-white border-[#0A1F44] shadow-sm' : 'bg-[#F2F4F7] text-[#4B5563] border-transparent hover:border-[#0A1F44]/20 hover:text-[#0A1F44]'}`}
                        >
                          <span
                            className='w-4 h-4 rounded-full border border-black/10 shrink-0'
                            style={{
                              backgroundColor: swatch,
                            }}
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
                        className={`px-3 py-1.5 rounded-full text-[11px] font-semibold font-lato border transition-all duration-150 ${active ? 'bg-[#0A1F44] text-white border-[#0A1F44] shadow-sm' : 'bg-[#F2F4F7] text-[#4B5563] border-transparent hover:border-[#0A1F44]/20 hover:text-[#0A1F44]'}`}
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

          {}
          <Section title='Price Range'>
            <div>
              {}
              <div className='flex items-center justify-between mb-3'>
                <span className='bg-[#F2F4F7] border border-[#E5E7EB] px-2.5 py-1 rounded-lg text-[11px] font-black font-montserrat text-[#0A1F44]'>
                  {fmt(filters.priceRange[0])}
                </span>
                <span className='text-[#D1D5DB] text-xs'>——</span>
                <span className='bg-[#F2F4F7] border border-[#E5E7EB] px-2.5 py-1 rounded-lg text-[11px] font-black font-montserrat text-[#0A1F44]'>
                  {fmt(filters.priceRange[1])}
                </span>
              </div>

              {}
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
                  style={{
                    left: `calc(${fillPctLow}% - 8px)`,
                  }}
                />
                <div
                  className='absolute w-4 h-4 rounded-full bg-[#E8553A] border-2 border-white shadow-md pointer-events-none z-10'
                  style={{
                    left: `calc(${fillPctHigh}% - 8px)`,
                  }}
                />
              </div>

              {}
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
                        onChange({
                          ...filters,
                          priceRange: p.range,
                        })
                      }
                      className={`text-[10px] px-2.5 py-1 rounded-full font-semibold font-lato transition-all border ${active ? 'bg-[#E8553A] text-white border-[#E8553A]' : 'bg-[#F2F4F7] text-[#4B5563] border-transparent hover:border-[#E8553A]/30 hover:text-[#E8553A]'}`}
                    >
                      {p.label}
                    </button>
                  )
                })}
              </div>
            </div>
          </Section>

          {}
          <Section title='Availability'>
            <button
              type='button'
              onClick={() =>
                onChange({
                  ...filters,
                  inStockOnly: !filters.inStockOnly,
                })
              }
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl border transition-all duration-200 ${filters.inStockOnly ? 'border-[#0A1F44]/30 bg-[#0A1F44]/4' : 'border-[#E5E7EB] bg-[#F2F4F7] hover:border-[#0A1F44]/20'}`}
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

          {}
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
                      onChange({
                        ...filters,
                        minRating: active ? null : r,
                      })
                    }
                    className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl transition-all duration-150 border ${active ? 'bg-[#FEF3C7]/60 border-[#F59E0B]/30' : 'border-transparent hover:bg-[#F2F4F7]'}`}
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

          {}
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
                    className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl border transition-all duration-150 ${active ? 'border-[#E8553A]/30 bg-[#E8553A]/4' : 'border-[#E5E7EB] bg-[#F2F4F7] hover:border-[#E8553A]/20'}`}
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
