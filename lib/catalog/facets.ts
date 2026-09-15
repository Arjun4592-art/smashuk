import type { Product } from '@/types'
import { matchesBadgeFilter } from '@/lib/api/store'
import { SPORTS } from '@/lib/constants'
import {
  canonicalizeSpecLabel,
  SPEC_FILTER_ORDER,
  resolveSpecFilterValue,
  compareWeightValues,
} from '@/lib/spec-filters'
import type { CatalogQuery, CatalogFacets } from './types'
import { DEFAULT_PRICE_RANGE } from './types'
import { scopedForFacets } from './filter'

/**
 * Every count the sidebar renders, computed once on the server over the full
 * catalogue and sent down as a small JSON object.
 *
 * These are lifted from the derivation blocks that used to sit inside
 * ShopFilterSidebar and run in the browser over an array of ~1700 products —
 * which is why the whole catalogue had to be downloaded before a single count
 * could be shown, and why every filter click re-walked all of it on the main
 * thread. The logic is preserved as-is; only where it runs has changed.
 */

const BADGE_IDS = ['NEW', 'SALE', 'BESTSELLER', 'LIMITED']
const RATINGS = [4, 3, 2, 1]

const MAX_SPEC_GROUPS = 6
const MAX_DISTINCT_VALUES = 12
const MAX_UNIQUE_RATIO = 0.6

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

function toRecord(map: Map<string, number>): Record<string, number> {
  return Object.fromEntries(map)
}

export function buildFacets(
  catalog: Product[],
  q: CatalogQuery,
): CatalogFacets {
  // Mirrors ShopClient's effectiveSports / effectiveBadges: a page-level sport
  // or badge (from a collection route) counts as active even though it never
  // appears in the sidebar's own state.
  const activeSports = q.sports.length
    ? q.sports
    : q.sport
      ? [q.sport]
      : []
  const activeBadges = q.badges.length
    ? q.badges
    : q.badge
      ? [q.badge]
      : []

  // `catalog` plays the role the sidebar's `allProducts` used to; `scoped`
  // plays the role of `categoryProducts`.
  const scoped = scopedForFacets(catalog, q)

  const availableBrands = (() => {
    if (activeSports.length === 0) return null
    const set = new Set<string>()
    for (const p of catalog) {
      if (activeSports.includes(p.sport) && p.brand) set.add(p.brand)
    }
    return [...set]
  })()

  const categoryOptions = (() => {
    const map = new Map<string, number>()
    for (const p of catalog) {
      if (!p.inStock) continue
      if (activeSports.length && !activeSports.includes(p.sport)) continue
      if (q.brands.length && !q.brands.includes(p.brand)) continue
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

  const specGroups = (() => {
    if (scoped.length === 0) return []
    const map = new Map<string, Set<string>>()
    for (const p of scoped) {
      for (const s of p.specs ?? []) {
        if (!s.label || !s.value) continue
        const canonicalLabel = canonicalizeSpecLabel(p.sport, p.category, s.label)
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
    return [...map.entries()]
      .filter(([, values]) => values.size > 1)
      .filter(([, values]) => values.size <= MAX_DISTINCT_VALUES)
      .filter(([, values]) => values.size / scoped.length <= MAX_UNIQUE_RATIO)
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

  const sportCounts = (() => {
    const map = new Map<string, number>()
    for (const p of catalog) {
      if (!p.inStock) continue
      if (q.brands.length && !q.brands.includes(p.brand)) continue
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
    for (const p of scoped) {
      if (
        q.badges.length &&
        !q.badges.some((b) => matchesBadgeFilter(p, b))
      )
        continue
      if (p.brand) map.set(p.brand, (map.get(p.brand) ?? 0) + 1)
    }
    return map
  })()

  const badgeCounts = (() => {
    const map = new Map<string, number>()
    for (const id of BADGE_IDS) {
      map.set(id, scoped.filter((p) => matchesBadgeFilter(p, id)).length)
    }
    return map
  })()

  const ratingCounts = (() => {
    const map = new Map<string, number>()
    for (const r of RATINGS) {
      map.set(String(r), scoped.filter((p) => p.rating >= r).length)
    }
    return map
  })()

  const availability = (() => {
    let source = catalog
    if (activeSports.length)
      source = source.filter((p) => activeSports.includes(p.sport))
    if (q.brands.length)
      source = source.filter((p) => q.brands.includes(p.brand))
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
    for (const p of scoped) {
      for (const s of p.specs ?? []) {
        if (!s.label || !s.value) continue
        const canonicalLabel = canonicalizeSpecLabel(p.sport, p.category, s.label)
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

  const priceBounds = (() => {
    if (scoped.length === 0) return DEFAULT_PRICE_RANGE
    let lo = Infinity
    let hi = -Infinity
    for (const p of scoped) {
      if (p.price < lo) lo = p.price
      if (p.price > hi) hi = p.price
    }
    return [Math.floor(lo), Math.ceil(hi)] as [number, number]
  })()

  return {
    availableBrands,
    categoryOptions,
    specGroups,
    sportCounts: toRecord(sportCounts),
    brandCounts: toRecord(brandCounts),
    badgeCounts: toRecord(badgeCounts),
    ratingCounts: toRecord(ratingCounts),
    specValueCounts: toRecord(specValueCounts),
    availability,
    priceBounds,
  }
}
