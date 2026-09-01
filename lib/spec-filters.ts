// Central definition of which product "specs" are allowed to become sidebar
// filters, per sport + category — and what canonical name/order they should
// show up under. This exists so the reference site's exact per-category
// filter sets are reproduced instead of one filter section per raw scraped
// spec label (which is messy — e.g. "Colour" vs "Frame Colour" vs
// "Racket Weight (g)" vs "Swing Weight" all describing the same thing).
//
// Reference (smashuk.co) filter sets this mirrors:
//   Badminton rackets  -> Racket Model, Balance, Weight, Stiffness, Color, Player Level
//   Tennis rackets     -> Grip Size, Color
//   Padel rackets      -> Weight, Balance, Material, Player Level
//   Squash rackets     -> Weight, Balance, Grip Size, Color
//   Shoes (any sport)  -> Gender, Color, Size
//   Clothing           -> Gender, Apparel, Color, Size
//   Balls              -> none (brand/price/availability only)

export interface SpecFilterDef {
  /** Canonical display label shown in the sidebar (and used as the filter key). */
  label: string
  /**
   * Keywords that identify a raw spec label as belonging to this filter.
   * Single-word keywords are matched as a whole token (so "grip" matches
   * "Grip Size" but not "Overgrip Included"); keywords containing a space
   * are matched as a substring phrase.
   */
  matchers: string[]
}

const BADMINTON_RACKET_SPEC_FILTERS: SpecFilterDef[] = [
  { label: 'Racket Model', matchers: ['model'] },
  { label: 'Balance', matchers: ['balance'] },
  { label: 'Weight', matchers: ['weight'] },
  { label: 'Stiffness', matchers: ['stiffness', 'flex'] },
  { label: 'Color', matchers: ['colour', 'color'] },
  {
    label: 'Player Level',
    matchers: ['player level', 'playing level', 'level'],
  },
]

const TENNIS_RACKET_SPEC_FILTERS: SpecFilterDef[] = [
  { label: 'Grip Size', matchers: ['grip'] },
  { label: 'Color', matchers: ['colour', 'color'] },
]

const PADEL_RACKET_SPEC_FILTERS: SpecFilterDef[] = [
  { label: 'Weight', matchers: ['weight'] },
  { label: 'Balance', matchers: ['balance'] },
  { label: 'Material', matchers: ['material'] },
  {
    label: 'Player Level',
    matchers: ['player level', 'playing level', 'level'],
  },
]

const SQUASH_RACKET_SPEC_FILTERS: SpecFilterDef[] = [
  { label: 'Weight', matchers: ['weight'] },
  { label: 'Balance', matchers: ['balance'] },
  { label: 'Grip Size', matchers: ['grip'] },
  { label: 'Color', matchers: ['colour', 'color'] },
]

const SHOE_SPEC_FILTERS: SpecFilterDef[] = [
  { label: 'Gender', matchers: ['gender'] },
  { label: 'Color', matchers: ['colour', 'color'] },
  { label: 'Size', matchers: ['size'] },
]

const CLOTHING_SPEC_FILTERS: SpecFilterDef[] = [
  { label: 'Gender', matchers: ['gender'] },
  { label: 'Apparel', matchers: ['apparel'] },
  { label: 'Color', matchers: ['colour', 'color'] },
  { label: 'Size', matchers: ['size'] },
]

const BALL_SPEC_FILTERS: SpecFilterDef[] = []

const RACKET_SPEC_FILTERS_BY_SPORT: Record<string, SpecFilterDef[]> = {
  badminton: BADMINTON_RACKET_SPEC_FILTERS,
  tennis: TENNIS_RACKET_SPEC_FILTERS,
  padel: PADEL_RACKET_SPEC_FILTERS,
  squash: SQUASH_RACKET_SPEC_FILTERS,
}

// Fallback used for categories the reference site doesn't have a dedicated
// collection page for (bags, grips, shuttlecocks) or a generic /shop view
// spanning several categories at once. Also defines the fixed display order
// for every canonical label above.
const DEFAULT_SPEC_FILTERS: SpecFilterDef[] = [
  { label: 'Racket Model', matchers: ['model'] },
  { label: 'Balance', matchers: ['balance'] },
  { label: 'Weight', matchers: ['weight'] },
  { label: 'Stiffness', matchers: ['stiffness', 'flex'] },
  { label: 'Grip Size', matchers: ['grip'] },
  { label: 'Material', matchers: ['material'] },
  { label: 'Color', matchers: ['colour', 'color'] },
  { label: 'Gender', matchers: ['gender'] },
  { label: 'Apparel', matchers: ['apparel'] },
  { label: 'Size', matchers: ['size'] },
  {
    label: 'Player Level',
    matchers: ['player level', 'playing level', 'level'],
  },
]

export const SPEC_FILTER_ORDER = DEFAULT_SPEC_FILTERS.map((d) => d.label)

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

/** Returns the ordered, allowed spec-filter set for a given sport + category. */
export function getAllowedSpecFilters(
  sport: string,
  category: string,
): SpecFilterDef[] {
  const cat = (category || '').toLowerCase()
  if (cat.includes('shoe')) return SHOE_SPEC_FILTERS
  if (cat.includes('cloth') || cat.includes('shirt') || cat.includes('apparel'))
    return CLOTHING_SPEC_FILTERS
  if (cat.includes('ball')) return BALL_SPEC_FILTERS
  if (cat.includes('racket'))
    return (
      RACKET_SPEC_FILTERS_BY_SPORT[(sport || '').toLowerCase()] ??
      DEFAULT_SPEC_FILTERS
    )
  return DEFAULT_SPEC_FILTERS
}

function matchesKeyword(normalizedLabel: string, keyword: string): boolean {
  if (keyword.includes(' ')) return normalizedLabel.includes(keyword)
  const tokens = normalizedLabel.split(/[^a-z0-9]+/).filter(Boolean)
  return tokens.includes(keyword)
}

/**
 * Resolves a raw, possibly messy scraped spec label (e.g. "Frame Colour",
 * "Racket Weight (g)", "Overgrip Included") to the single canonical filter
 * name it belongs to for this product's sport/category — or null if it
 * shouldn't become a filter at all. Using this everywhere (sidebar +
 * product filtering) keeps every raw variant of the same attribute merged
 * into one section instead of scattered across several near-duplicates.
 */
export function canonicalizeSpecLabel(
  sport: string,
  category: string,
  rawLabel: string,
): string | null {
  const key = rawLabel.trim().toLowerCase()
  if (!key || NON_FILTER_SPEC_LABELS.has(key)) return null
  const defs = getAllowedSpecFilters(sport, category)
  const hit = defs.find((d) => d.matchers.some((m) => matchesKeyword(key, m)))
  return hit ? hit.label : null
}
