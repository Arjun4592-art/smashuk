// Central definition of which product "specs" are allowed to become sidebar
// filters, per sport + category — and what canonical name/order they should
// show up under. This exists so the reference site's exact per-category
// filter sets are reproduced instead of one filter section per raw scraped
// spec label (which is messy — e.g. "Colour" vs "Frame Colour" vs
// "Racket Weight (g)" vs "Swing Weight" all describing the same thing).
//
// Reference (smashuk.co) filter sets this mirrors:
//   Badminton rackets  -> Racket Model, Balance, Weight, Stiffness, Color, Player Level
//   Tennis rackets     -> Size (grip), Color
//   Padel rackets      -> Weight, Balance, Material, Player Level
//   Squash rackets     -> Weight, Balance, Size (grip), Color
//   Shoes (any sport)  -> Gender, Color, Size
//   Clothing           -> Gender, Apparel, Color, Size
//   Balls              -> none (brand/price/availability only)
//
// "Size" is a single unified canonical filter that covers grip size on
// rackets (tennis/squash) and shoe size — the raw label differs but they
// mean "which size do I need" from the shopper's point of view.

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
  { label: 'Size', matchers: ['grip'] },
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
  { label: 'Size', matchers: ['grip'] },
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
  { label: 'Material', matchers: ['material'] },
  { label: 'Color', matchers: ['colour', 'color'] },
  { label: 'Gender', matchers: ['gender'] },
  { label: 'Apparel', matchers: ['apparel'] },
  // Grip size (rackets) and shoe/clothing size both roll up into one
  // "Size" filter — see note above.
  { label: 'Size', matchers: ['grip'] },
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

// ---------------------------------------------------------------------------
// Weight buckets
// ---------------------------------------------------------------------------
// Raw scraped weight specs are messy (e.g. "355-360g", ">300g", "4U
// (80-84.9g)") and, shown as-is, produce a huge wall of near-duplicate
// filter pills. The reference site instead groups weight into a handful of
// fixed bands per sport (badminton's classic 2U-6U scale, tennis/padel's own
// gram bands). Every sport below gets that fixed band list; any sport not
// listed here (currently squash) simply keeps the old behaviour — raw,
// auto-detected distinct values — via resolveSpecFilterValue's fallback.

export interface WeightBucket {
  /** Label shown in the sidebar and used as the filter value. */
  label: string
  /** Inclusive lower bound in grams. */
  min: number
  /** Exclusive upper bound in grams, or null for "and above". */
  max: number | null
}

const BADMINTON_WEIGHT_BUCKETS: WeightBucket[] = [
  { label: 'Under 75g (6U+)', min: 0, max: 75 },
  { label: '75-79g (5U)', min: 75, max: 80 },
  { label: '80-84g (4U)', min: 80, max: 85 },
  { label: '85-89g (3U)', min: 85, max: 90 },
  { label: '90g+ (2U+)', min: 90, max: null },
]

const TENNIS_WEIGHT_BUCKETS: WeightBucket[] = [
  { label: 'Under 260g', min: 0, max: 260 },
  { label: '260-279g', min: 260, max: 280 },
  { label: '280-299g', min: 280, max: 300 },
  { label: '300-314g', min: 300, max: 315 },
  { label: '315-329g', min: 315, max: 330 },
  { label: '330g+', min: 330, max: null },
]

const PADEL_WEIGHT_BUCKETS: WeightBucket[] = [
  { label: 'Under 345g', min: 0, max: 345 },
  { label: '345-359g', min: 345, max: 360 },
  { label: '360-369g', min: 360, max: 370 },
  { label: '370-379g', min: 370, max: 380 },
  { label: '380g+', min: 380, max: null },
]

// Only sports listed here get fixed weight bands. Squash is intentionally
// left out — its Weight filter keeps showing raw, auto-detected values.
const WEIGHT_BUCKETS_BY_SPORT: Record<string, WeightBucket[]> = {
  badminton: BADMINTON_WEIGHT_BUCKETS,
  tennis: TENNIS_WEIGHT_BUCKETS,
  padel: PADEL_WEIGHT_BUCKETS,
}

function getWeightBuckets(
  sport: string,
  category: string,
): WeightBucket[] | null {
  const cat = (category || '').toLowerCase()
  if (!cat.includes('racket')) return null
  return WEIGHT_BUCKETS_BY_SPORT[(sport || '').toLowerCase()] ?? null
}

/** Fixed display order for a sport's weight bands, or null if it has none. */
export function getWeightBucketOrder(
  sport: string,
  category: string,
): string[] | null {
  const buckets = getWeightBuckets(sport, category)
  return buckets ? buckets.map((b) => b.label) : null
}

// Pulls out the number(s) in a raw weight string and returns a representative
// gram figure. Handles plain values ("88g"), ranges ("355-360g", "271g -
// 285g") by averaging, and open-ended values (">300g") by using the number
// present. Returns null if nothing numeric could be found.
function parseWeightGrams(raw: string): number | null {
  const matches = raw.match(/\d+(\.\d+)?/g)
  if (!matches || matches.length === 0) return null
  const nums = matches.map(Number).filter((n) => !Number.isNaN(n))
  if (nums.length === 0) return null
  if (nums.length === 1) return nums[0]
  // Range like "355-360g" — use the midpoint.
  return (nums[0] + nums[1]) / 2
}

function weightBucketLabelFor(
  sport: string,
  category: string,
  rawValue: string,
): string | null {
  const buckets = getWeightBuckets(sport, category)
  if (!buckets) return null
  const grams = parseWeightGrams(rawValue)
  if (grams === null) return null
  for (const b of buckets) {
    if (grams >= b.min && (b.max === null || grams < b.max)) return b.label
  }
  return null
}

// ---------------------------------------------------------------------------
// Balance / Stiffness / Color de-duplication
// ---------------------------------------------------------------------------
// Raw scraped values for these specs are inconsistent in two ways that make
// the exact same option show up multiple times in the sidebar:
//   1. Formatting drift — "Head Heavy" vs "Head-Heavy", "Light Beige" vs
//      "Light-Beige" — same value, different spacing/hyphenation.
//   2. Some products carry a full descriptive sentence instead of the short
//      value — e.g. "Medium – ideal for a blend of power and control"
//      instead of just "Medium" — which then never groups with the plain
//      "Medium" entries even though it means the same thing.
// The helpers below collapse both cases down to one canonical label per
// distinct value, matched against a small known vocabulary per spec.

// Turns hyphen/dash variants into spaces and collapses whitespace, so
// "Head-Heavy" and "Head Heavy" normalize to the same string for comparison.
function normalizeSpacing(s: string): string {
  return s
    .replace(/[-\u2010-\u2015]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function titleCase(s: string): string {
  return s
    .split(' ')
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(' ')
}

// Canonical display forms, longest first so a more specific phrase (e.g.
// "Slightly Head Heavy") is preferred over a shorter one it also starts
// with ("Head Heavy") when matching a raw value's prefix.
const BALANCE_VOCAB = [
  'Slightly Head Heavy',
  'Slightly Head Light',
  'Head Heavy',
  'Head Light',
  'Even Balanced',
].sort((a, b) => b.length - a.length)

const STIFFNESS_VOCAB = [
  'Extra Stiff',
  'Slightly Stiff',
  'Medium Flex',
  'Hi-Flex',
  'Stiff',
  'Flexible',
  'Medium',
].sort((a, b) => b.length - a.length)

// If a raw value (once spacing-normalized) starts with one of the known
// short terms for this spec, return that term's canonical display form —
// this turns a full descriptive sentence back into just the value it's
// describing. Returns null if nothing matches, so the caller can fall back
// to showing the value as-is.
function matchDescriptiveVocab(
  vocab: string[],
  normalizedInput: string,
): string | null {
  const lower = normalizedInput.toLowerCase()
  for (const term of vocab) {
    if (lower.startsWith(normalizeSpacing(term).toLowerCase())) return term
  }
  return null
}

/**
 * Resolves the raw value of a spec that has already been canonicalised to
 * `canonicalLabel` into the value that should actually be shown/filtered on.
 * For "Weight" on a sport with fixed bands, this is the band label (e.g.
 * "85-89g (3U)"). For "Balance"/"Stiffness"/"Color" it's normalized so
 * formatting variants and overly-descriptive text merge into one canonical
 * option (see the de-duplication helpers above). For everything else it's
 * just the trimmed raw value. Sidebar option-building and product filtering
 * both go through this so they can never drift apart.
 */
export function resolveSpecFilterValue(
  sport: string,
  category: string,
  canonicalLabel: string,
  rawValue: string,
): string | null {
  const trimmed = rawValue.trim()
  if (!trimmed) return null
  if (canonicalLabel === 'Weight') {
    const bucket = weightBucketLabelFor(sport, category, trimmed)
    return bucket ?? trimmed
  }
  if (
    canonicalLabel === 'Balance' ||
    canonicalLabel === 'Stiffness' ||
    canonicalLabel === 'Color'
  ) {
    const spaced = normalizeSpacing(trimmed)
    if (canonicalLabel === 'Balance') {
      const short = matchDescriptiveVocab(BALANCE_VOCAB, spaced)
      if (short) return short
    }
    if (canonicalLabel === 'Stiffness') {
      const short = matchDescriptiveVocab(STIFFNESS_VOCAB, spaced)
      if (short) return short
    }
    return titleCase(spaced)
  }
  return trimmed
}

// Sort comparator for values inside a "Weight" filter group. Fixed-band
// labels sort by their band's natural order; anything else (e.g. squash's
// raw values) falls back to a numeric-then-alphabetical sort.
export function compareWeightValues(a: string, b: string): number {
  const rank = (v: string): number => {
    for (const buckets of Object.values(WEIGHT_BUCKETS_BY_SPORT)) {
      const idx = buckets.findIndex((bkt) => bkt.label === v)
      if (idx !== -1) return idx
    }
    const grams = parseWeightGrams(v)
    return grams !== null ? 1000 + grams : Infinity
  }
  const ra = rank(a)
  const rb = rank(b)
  if (ra !== rb) return ra - rb
  return a.localeCompare(b)
}
