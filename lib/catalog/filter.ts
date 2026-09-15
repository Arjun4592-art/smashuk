import type { Product } from '@/types'
import { matchesBadgeFilter } from '@/lib/api/store'
import {
  canonicalizeSpecLabel,
  resolveSpecFilterValue,
} from '@/lib/spec-filters'
import type { CatalogQuery } from './types'

/**
 * This is the filtering that used to live in ShopClient's `filtered` useMemo,
 * moved here so it can run on the server over the full catalogue instead of in
 * the browser over a catalogue the browser had to download first.
 *
 * The semantics are carried over deliberately unchanged, including the two
 * behaviours the original had explicit comments about:
 *
 *  - There is NO blanket `p.inStock` pre-filter. Out-of-stock products are only
 *    hidden by the `inStockOnly` toggle. The original comment explains why: an
 *    unconditional in-stock filter made that toggle a no-op and silently hid
 *    published, correctly-tagged products from search and browse entirely.
 *
 *  - A page-level `sport` / `category` / `badge` (from a collection route)
 *    always wins over the equivalent sidebar selection. It's the page's
 *    identity, not a togglable preference, so it can't be cleared by "Clear all
 *    filters" or by re-clicking the matching sidebar chip.
 */
export function applyCatalogFilters(
  products: Product[],
  q: CatalogQuery,
  opts: { skipPrice?: boolean; skipSpecs?: boolean } = {},
): Product[] {
  let result = products

  if (q.badge) result = result.filter((p) => matchesBadgeFilter(p, q.badge!))
  if (q.brand)
    result = result.filter(
      (p) => p.brand?.toLowerCase() === q.brand!.toLowerCase(),
    )
  if (q.gender)
    result = result.filter((p) =>
      p.tags?.some((t) => t.toLowerCase() === q.gender!.toLowerCase()),
    )
  if (q.level)
    result = result.filter((p) =>
      p.tags?.some((t) => t.toLowerCase() === q.level!.toLowerCase()),
    )
  if (q.style)
    result = result.filter((p) =>
      p.tags?.some(
        (t) => t.toLowerCase().replace(/\s+/g, '-') === q.style!.toLowerCase(),
      ),
    )

  if (q.q) {
    // Free-text search runs here, over the in-memory catalogue, matching the
    // same three fields the client used to match on. It is NOT forwarded to
    // Medusa as `q` any more: that triggered an ILIKE across title/description/
    // sku on every browse request and was a large share of the old latency,
    // while the client re-checked the match locally anyway.
    const needle = q.q.toLowerCase()
    result = result.filter(
      (p) =>
        p.name.toLowerCase().includes(needle) ||
        p.brand.toLowerCase().includes(needle) ||
        p.sport.toLowerCase().includes(needle),
    )
  }

  if (q.sport) result = result.filter((p) => p.sport === q.sport)
  else if (q.sports.length)
    result = result.filter((p) => q.sports.includes(p.sport))

  if (q.category)
    result = result.filter(
      (p) =>
        !!p.category &&
        (p.category.includes(q.category!) || q.category!.includes(p.category)),
    )
  else if (q.categories.length)
    result = result.filter(
      (p) =>
        !!p.category &&
        q.categories.some(
          (c) => p.category!.includes(c) || c.includes(p.category!),
        ),
    )

  if (q.brands.length)
    result = result.filter((p) => q.brands.includes(p.brand))
  if (q.badges.length)
    result = result.filter((p) =>
      q.badges.some((b) => matchesBadgeFilter(p, b)),
    )
  if (q.inStockOnly) result = result.filter((p) => p.inStock)
  if (q.minRating)
    result = result.filter((p) => p.rating >= q.minRating!)

  if (!opts.skipPrice)
    result = result.filter(
      (p) => p.price >= q.priceRange[0] && p.price <= q.priceRange[1],
    )

  if (!opts.skipSpecs) result = applySpecFilters(result, q.specs)

  return result
}

export function applySpecFilters(
  products: Product[],
  specs: Record<string, string[]>,
): Product[] {
  const entries = Object.entries(specs)
  if (entries.length === 0) return products
  const norm = (s: string) => s.trim().toLowerCase()
  return products.filter((p) =>
    entries.every(([label, values]) =>
      values.some((v) =>
        p.specs?.some((s) => {
          const canonicalLabel = canonicalizeSpecLabel(
            p.sport,
            p.category,
            s.label,
          )
          if (canonicalLabel !== label) return false
          const resolvedValue = resolveSpecFilterValue(
            p.sport,
            p.category,
            canonicalLabel,
            s.value,
          )
          return resolvedValue !== null && norm(resolvedValue) === norm(v)
        }),
      ),
    ),
  )
}

/**
 * The "category scoped" set the sidebar counts are built from: page scoping and
 * sport/category/brand/stock, but NOT the facet dimensions themselves. Counting
 * brands within a brand-filtered set would make every brand read as 0 except
 * the selected one.
 */
export function scopedForFacets(
  products: Product[],
  q: CatalogQuery,
): Product[] {
  let result = products
  if (q.badge) result = result.filter((p) => matchesBadgeFilter(p, q.badge!))
  if (q.brand)
    result = result.filter(
      (p) => p.brand?.toLowerCase() === q.brand!.toLowerCase(),
    )
  if (q.q) {
    const needle = q.q.toLowerCase()
    result = result.filter(
      (p) =>
        p.name.toLowerCase().includes(needle) ||
        p.brand.toLowerCase().includes(needle) ||
        p.sport.toLowerCase().includes(needle),
    )
  }
  if (q.sport) result = result.filter((p) => p.sport === q.sport)
  else if (q.sports.length)
    result = result.filter((p) => q.sports.includes(p.sport))
  if (q.category)
    result = result.filter(
      (p) =>
        !!p.category &&
        (p.category.includes(q.category!) || q.category!.includes(p.category)),
    )
  else if (q.categories.length)
    result = result.filter(
      (p) =>
        !!p.category &&
        q.categories.some(
          (c) => p.category!.includes(c) || c.includes(p.category!),
        ),
    )
  if (q.inStockOnly) result = result.filter((p) => p.inStock)
  return result
}

export function sortCatalog(products: Product[], sort: string): Product[] {
  // 'featured' is the catalogue's own order — don't copy or reorder.
  if (sort === 'featured') return products
  const result = [...products]
  switch (sort) {
    case 'newest':
      result.sort(
        (a, b) =>
          new Date(b.createdAt ?? 0).getTime() -
          new Date(a.createdAt ?? 0).getTime(),
      )
      break
    case 'price-asc':
      result.sort((a, b) => a.price - b.price)
      break
    case 'price-desc':
      result.sort((a, b) => b.price - a.price)
      break
    case 'rating':
      result.sort((a, b) => b.rating - a.rating)
      break
    case 'discount':
      result.sort((a, b) => {
        const dA = a.originalPrice
          ? ((a.originalPrice - a.price) / a.originalPrice) * 100
          : 0
        const dB = b.originalPrice
          ? ((b.originalPrice - b.price) / b.originalPrice) * 100
          : 0
        return dB - dA
      })
      break
  }
  return result
}
