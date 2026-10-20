export interface SearchableEntry {
  name?: string
  brand?: string
  category?: string
  sku?: string
  ean?: string
  barcode?: string
  variantLabel?: string
  sizes?: { title: string; value: string }[]
}

const STOP_WORDS = new Set([
  'a',
  'an',
  'the',
  'for',
  'of',
  'and',
  'with',
  'in',
  'any',
  'all',
  'some',
  'me',
  'my',
  'please',
  'product',
  'products',
  'item',
  'items',
])
const SYNONYMS: Record<string, string> = {
  racquet: 'racket',
  racquets: 'racket',
  trainer: 'shoe',
  trainers: 'shoe',
  footwear: 'shoe',
}

export function stemToken(token: string): string {
  const t = token.toLowerCase()
  if (SYNONYMS[t]) return SYNONYMS[t]
  if (t.length > 4 && t.endsWith('ies')) return t.slice(0, -3) + 'y'
  if (t.length > 4 && /(?:ss|x|z|ch|sh)es$/.test(t)) return t.slice(0, -2)
  if (t.length > 3 && t.endsWith('s') && !t.endsWith('ss'))
    return t.slice(0, -1)
  return t
}

const haystackCache = new WeakMap<object, string>()
function haystackOf(e: SearchableEntry): string {
  const hit = haystackCache.get(e)
  if (hit !== undefined) return hit
  const h = [
    e.name,
    e.brand,
    e.category,
    e.sku,
    e.variantLabel,
    ...(e.sizes ?? []).map((s) => s.value),
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase()
  haystackCache.set(e, h)
  return h
}

/** `rawQuery` is the trimmed, lower-cased search text (as the billing page passes it). */
export function matchesPosSearch(
  e: SearchableEntry,
  rawQuery: string,
): boolean {
  const q = rawQuery.trim().toLowerCase()
  if (!q) return true
  // 1. Everything the old search matched — kept first so nothing is lost.
  if (
    (e.name ?? '').toLowerCase().includes(q) ||
    (e.sku ?? '').toLowerCase().includes(q) ||
    (e.ean ?? '').includes(q) ||
    (e.barcode ?? '').toLowerCase().includes(q)
  ) {
    return true
  }
  // 2. Every word must appear somewhere (name, brand, category, sku, label).
  const tokens = q
    .split(/[\s,]+/)
    .filter((w) => w && !STOP_WORDS.has(w))
    .map(stemToken)
  if (tokens.length === 0) return true
  const hay = haystackOf(e)
  return tokens.every((tok) => hay.includes(tok))
}
