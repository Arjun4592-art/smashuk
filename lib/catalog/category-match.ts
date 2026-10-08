import type { Product } from '@/types'

const GENDER_WORDS = new Set([
  'men',
  'mens',
  'man',
  'male',
  'women',
  'womens',
  'woman',
  'female',
  'ladies',
  'unisex',
  's', // what is left of "men's" once the apostrophe is split on
])

const CATEGORY_SPEC_LABELS = ['apparel', 'category', 'product type']

/**
 * Clothing categories and the words that mean the same thing. Used for tags,
 * spec values and (clothing products only) titles, so "Tops" also finds
 * T-Shirts, Polos, Tanks and Jackets without every product being re-tagged.
 */
const CLOTHING_CATEGORY_WORDS: Record<string, string[]> = {
  tops: [
    'top',
    'shirt',
    't-shirt',
    'tshirt',
    'tee',
    'polo',
    'tank',
    'vest',
    'singlet',
    'jersey',
    'jacket',
    'hoodie',
    'sweatshirt',
    'sweater',
    'jumper',
    'tracksuit',
  ],
  bottoms: [
    'bottom',
    'short',
    'skirt',
    'skort',
    'trackpant',
    'pant',
    'trouser',
    'legging',
    'tight',
    'jogger',
  ],
  socks: ['sock'],
}

/** Words that mark a category handle / tag / spec as clothing. */
const CLOTHING_WORDS = new Set([
  'clothing',
  'apparel',
  'sportswear',
  'sock',
  ...Object.keys(CLOTHING_CATEGORY_WORDS).map(singular),
  ...Object.values(CLOTHING_CATEGORY_WORDS).flat(),
])

function words(s: string): string[] {
  return String(s ?? '')
    .toLowerCase()
    .replace(/[\u2018\u2019]/g, "'")
    .split(/[^a-z0-9]+/)
    .filter(Boolean)
}

function slug(s: string): string {
  return words(s)
    .filter((w) => !GENDER_WORDS.has(w))
    .join('-')
}

// "top" and "tops", "sock" and "socks" are the same thing.
function singular(s: string): string {
  return s.endsWith('s') ? s.slice(0, -1) : s
}

function sameName(a: string, b: string): boolean {
  return !!a && !!b && (a === b || singular(a) === singular(b))
}

function labelIsCategory(label: unknown): boolean {
  const l = String(label ?? '').toLowerCase()
  return CATEGORY_SPEC_LABELS.some((k) => l.includes(k))
}

function specsOf(p: Product) {
  return p.filterSpecs ?? p.specs ?? []
}

/** Individual values of every category-like spec ("Tops, Jackets" -> 2). */
function categorySpecValues(p: Product): string[] {
  const out: string[] = []
  for (const spec of specsOf(p)) {
    if (!labelIsCategory(spec?.label)) continue
    for (const part of String(spec?.value ?? '').split(/[,/|;]+/)) {
      if (part.trim()) out.push(part)
    }
  }
  return out
}

/** Is this product clothing, however the catalogue happened to record it? */
export function isClothing(p: Product): boolean {
  if (p.sport === 'clothing') return true
  if (
    words(p.category ?? '').some(
      (w) => CLOTHING_WORDS.has(singular(w)) || CLOTHING_WORDS.has(w),
    )
  )
    return true
  for (const tag of p.tags ?? []) {
    const t = slug(tag)
    if (t === 'clothing' || t === 'apparel') return true
  }
  // A spec literally called "Apparel" only exists on clothing.
  return specsOf(p).some((s) =>
    String(s?.label ?? '')
      .toLowerCase()
      .includes('apparel'),
  )
}

export function matchesSport(p: Product, wanted: string): boolean {
  if (p.sport === wanted) return true
  // A product filed under extra categories ("tennis-bags" AND "badminton-bags")
  // also belongs to each of those sports, not just the one in its metadata.
  if (wanted) {
    for (const h of p.categoryHandles ?? []) {
      if (h === wanted || h.startsWith(`${wanted}-`)) return true
    }
  }
  return wanted === 'clothing' && isClothing(p)
}

export function matchesAnySport(p: Product, wanted: string[]): boolean {
  return wanted.some((s) => matchesSport(p, s))
}

export function matchesCategory(p: Product, wanted: string): boolean {
  const w = slug(wanted)
  if (!w) return false

  // 1. Category handle (original behaviour) — checked for the main category
  //    and for every extra category the product is also filed under.
  for (const handle of [p.category, ...(p.categoryHandles ?? [])]) {
    if (handle && (handle.includes(wanted) || wanted.includes(handle)))
      return true
  }

  // 2. Tags, 3. category-like specs
  const names = [
    ...(p.tags ?? []).map(slug),
    ...categorySpecValues(p).map(slug),
  ]
  if (names.some((n) => sameName(n, w))) return true

  // 4. Clothing synonyms: "tops" also means shirt / polo / tank / jacket ...
  const synonyms =
    CLOTHING_CATEGORY_WORDS[singular(w) + 's'] ?? CLOTHING_CATEGORY_WORDS[w]
  if (synonyms) {
    if (names.some((n) => synonyms.some((syn) => sameName(n, syn)))) return true
    // Last resort for products with no usable tag/spec at all: the title.
    // Clothing only, and whole words only ("Top Quality Racket" is not a top).
    if (isClothing(p)) {
      const titleWords = words(p.name).map(singular)
      const hit = synonyms
        .filter((syn) => syn !== 'top')
        .some((syn) => titleWords.includes(singular(syn)))
      if (hit) return true
    }
  }
  return false
}

export function matchesAnyCategory(p: Product, wanted: string[]): boolean {
  return wanted.some((c) => matchesCategory(p, c))
}

/**
 * Gender read from the product title, for clothing only and only when tags and
 * specs said nothing ("Yonex Men's Match Polo").
 */
export function genderWordsInTitle(p: Product): Set<'men' | 'women'> {
  const out = new Set<'men' | 'women'>()
  if (!isClothing(p)) return out
  for (const w of words(p.name)) {
    if (w === 'men' || w === 'mens' || w === 'man' || w === 'male')
      out.add('men')
    else if (['women', 'womens', 'woman', 'female', 'ladies'].includes(w))
      out.add('women')
  }
  return out
}

/** Gender read from the category handle ("men-clothing", "womens-tops"). */
export function genderWordsInHandle(p: Product): Set<'men' | 'women'> {
  const out = new Set<'men' | 'women'>()
  for (const w of words(p.category ?? '')) {
    if (w === 'men' || w === 'mens') out.add('men')
    else if (w === 'women' || w === 'womens') out.add('women')
  }
  return out
}
