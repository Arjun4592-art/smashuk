/**
 * Client-side "recently viewed" product tracker.
 *
 * Stores an ordered list of product ids (most-recent-first) in
 * localStorage. No backend call — purely a nice-to-have UI feature
 * used by the cart page's "Recently viewed" rail and recorded by
 * the product detail page whenever a customer views a product.
 */

const STORAGE_KEY = 'recentlyViewedProductIds'
const MAX_ITEMS = 12

function isBrowser() {
  return typeof window !== 'undefined'
}

/**
 * Returns the list of recently viewed product ids, most-recent-first.
 * Safe to call on the server (returns an empty array) and fails
 * silently on any storage errors.
 */
export function getRecentlyViewedIds(): string[] {
  if (!isBrowser()) return []
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed.filter((id): id is string => typeof id === 'string')
  } catch {
    return []
  }
}

/**
 * Records that a product was viewed, moving it to the front of the
 * list (de-duped) and capping the list at MAX_ITEMS entries.
 */
export function recordRecentlyViewed(productId: string): void {
  if (!isBrowser() || !productId) return
  try {
    const current = getRecentlyViewedIds()
    const next = [productId, ...current.filter((id) => id !== productId)].slice(
      0,
      MAX_ITEMS,
    )
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
  } catch {
    /* localStorage unavailable or full — fail silently */
  }
}

/**
 * Clears the recently viewed list entirely.
 */
export function clearRecentlyViewed(): void {
  if (!isBrowser()) return
  try {
    window.localStorage.removeItem(STORAGE_KEY)
  } catch {
    /* no-op */
  }
}
