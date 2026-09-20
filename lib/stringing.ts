/**
 * Single source of truth for stringing.
 *
 * Vocabulary
 *   - "service": a stringing job offered as an add-on on a racket's page
 *     (free or paid — the owner decides per racket in the dashboard).
 *   - "reel":    a spool of string sold on its own. Never shown as an add-on.
 *
 * WHERE A SERVICE SHOWS
 *   A service appears in the "String Selection" dropdown of rackets of the
 *   SAME SPORT as the service. The sport is detected from the product itself
 *   (see detectStringingSport), not from which category it happens to sit in,
 *   because three categories are all literally called "Stringing".
 *
 * This file is pure (no imports) so the storefront, the dashboard and the
 * API route can all use it.
 */

export const STRINGING_SPORTS = ['badminton', 'tennis', 'squash'] as const
export type StringingSport = (typeof STRINGING_SPORTS)[number]
export type StringingKind = 'service' | 'reel'

export const STRINGING_SPORT_LABEL: Record<StringingSport, string> = {
  badminton: 'Badminton',
  tennis: 'Tennis',
  squash: 'Squash',
}

export function isStringingSport(v: unknown): v is StringingSport {
  return (
    typeof v === 'string' && (STRINGING_SPORTS as readonly string[]).includes(v)
  )
}

/** Handle of the sport's own stringing category, e.g. "stringing-tennis". */
export function stringingCategoryHandle(sport: StringingSport): string {
  return `stringing-${sport}`
}

/** "stringing-tennis" -> "tennis". Anything else -> null. */
export function sportFromStringingHandle(
  handle?: string | null,
): StringingSport | null {
  const m = /^stringing-(badminton|tennis|squash)$/.exec(
    (handle ?? '').toLowerCase().trim(),
  )
  return m ? (m[1] as StringingSport) : null
}

/** Any category that is about stringing / strings (sport-specific or not). */
export function isStringingCategoryHandle(handle?: string | null): boolean {
  return /string/i.test(handle ?? '')
}

/** True for "…String…", "…Stringing…", and typos like "Strining". */
export function looksLikeStringing(title?: string | null): boolean {
  return /\bstrin/i.test(title ?? '')
}

/** Rows that are not real products (signed disclaimers etc.). */
export function isJunkStringingTitle(title?: string | null): boolean {
  const t = (title ?? '').toLowerCase().trim()
  return t.startsWith('disclaimer') || t === 'string selection'
}

/**
 * Service or reel? An explicit metadata.stringing_type always wins; otherwise
 * the word "Service" in the title means service (same rule the old backfill
 * script used).
 */
export function stringingKind(
  title?: string | null,
  explicit?: unknown,
): StringingKind {
  if (explicit === 'service' || explicit === 'reel') return explicit
  return /\bservice\b/i.test(title ?? '') ? 'service' : 'reel'
}

// Model-name keywords, for reels/services whose name has no sport word at all
// (e.g. "Yonex BG65 Service" -> badminton). Same lists the old assign script
// used.
const SPORT_KEYWORDS: Record<StringingSport, string[]> = {
  badminton: [
    'bg 65',
    'bg65',
    'bg 66',
    'bg66',
    'bg 80',
    'bg80',
    'nanogy',
    'aerobite',
    'exbolt',
    'no.1',
    'no 1',
    'vbs',
    'zymax',
    'skyarc',
    'kizuna',
    'ultimax',
    'li-ning',
  ],
  tennis: [
    'spiraltek',
    'vs touch',
    'velocity mlt',
    'nxt power',
    'rpm',
    'hurrican',
    'luxilon',
    'xcel',
    'addixion',
    'polytour',
    'poly tour',
    'alu power',
    'solinco',
    'tour bite',
    'hyper-g',
    'multifilament',
    'hybrid',
  ],
  squash: [
    'supernick',
    '305 slick',
    'powerkill',
    'dunlop silk',
    'synthetic gut pps',
    'perfect power',
    'powernick',
  ],
}

/**
 * Which sport is this stringing product for? First match wins:
 *   1. a sport word in the NAME        "Tennis Stringing Service"
 *   2. the product's Sport field       metadata.sport
 *   3. the category it sits in         stringing-tennis
 *   4. a known model keyword           "BG65", "RPM", "Supernick"
 * A name that mentions two sports is ambiguous, so it falls through to 2-4.
 */
export function detectStringingSport(input: {
  title?: string | null
  sport?: string | null
  categoryHandles?: Array<string | null | undefined>
}): StringingSport | null {
  const t = (input.title ?? '').toLowerCase()

  const named = STRINGING_SPORTS.filter((s) => new RegExp(`\\b${s}\\b`).test(t))
  if (named.length === 1) return named[0]

  const meta = (input.sport ?? '').toLowerCase().trim()
  if (isStringingSport(meta)) return meta
  const metaAsHandle = sportFromStringingHandle(meta)
  if (metaAsHandle) return metaAsHandle

  for (const h of input.categoryHandles ?? []) {
    const s = sportFromStringingHandle(h)
    if (s) return s
  }

  for (const sport of STRINGING_SPORTS) {
    if (SPORT_KEYWORDS[sport].some((k) => t.includes(k))) return sport
  }
  return null
}

/**
 * From raw Medusa store products (with metadata + categories), keep the
 * stringing SERVICES that belong to `sport`. `debug` says how every product
 * was classified, so a missing one can be explained.
 */
export function pickStringingServices<T extends Record<string, any>>(
  products: T[],
  sport: StringingSport,
): {
  matched: T[]
  debug: Array<{
    title: string
    kind: StringingKind
    detectedSport: StringingSport | null
    shown: boolean
  }>
} {
  const matched: T[] = []
  const debug: Array<{
    title: string
    kind: StringingKind
    detectedSport: StringingSport | null
    shown: boolean
  }> = []
  for (const p of products) {
    const title: string = p.title ?? ''
    if (isJunkStringingTitle(title)) continue
    const kind = stringingKind(title, p.metadata?.stringing_type)
    const detectedSport = detectStringingSport({
      title,
      sport: p.metadata?.sport,
      categoryHandles: (p.categories ?? []).map((c: any) => c?.handle),
    })
    const shown = kind === 'service' && detectedSport === sport
    if (shown) matched.push(p)
    debug.push({ title, kind, detectedSport, shown })
  }
  return { matched, debug }
}