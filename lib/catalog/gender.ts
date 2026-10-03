import type { Product } from '@/types'
import { genderWordsInHandle, genderWordsInTitle } from './category-match'

export type GenderKey = 'men' | 'women'

const MEN_WORDS = new Set(['men', 'mens', "men's", 'man', 'male'])
const WOMEN_WORDS = new Set([
  'women',
  'womens',
  "women's",
  'woman',
  'female',
  'ladies',
])
const UNISEX_WORDS = new Set(['unisex'])

function normalise(s: string): string {
  return s.toLowerCase().replace(/[\u2018\u2019]/g, "'")
}

function addWord(word: string, out: Set<GenderKey>) {
  if (MEN_WORDS.has(word)) out.add('men')
  else if (WOMEN_WORDS.has(word)) out.add('women')
  else if (UNISEX_WORDS.has(word)) {
    out.add('men')
    out.add('women')
  }
}

/**
 * Which genders a product is for, read from BOTH places the dashboard can
 * hold it:
 *  - Tags: a tag that is exactly a gender word ("Men", "Women", "Unisex").
 *    Whole-tag match only, so tags like "Women's Day sale" don't count.
 *  - Specs: any spec whose label contains "gender"; its value may list
 *    several ("Men, Women", "Men / Women") or say "Unisex".
 *
 * "Unisex", or both men and women present, means the product is for both.
 */
export function getProductGenders(p: Product): Set<GenderKey> {
  const out = new Set<GenderKey>()
  for (const tag of p.tags ?? []) addWord(normalise(String(tag)).trim(), out)
  for (const spec of p.filterSpecs ?? p.specs ?? []) {
    if (!normalise(String(spec?.label ?? '')).includes('gender')) continue
    for (const word of normalise(String(spec?.value ?? '')).split(/[^a-z']+/)) {
      if (word) addWord(word, out)
    }
  }
  // Tags and specs are the source of truth. Only when they say nothing do we
  // fall back to the category handle ("men-clothing") and then, for clothing,
  // the title ("Yonex Men's Match Polo"), so untagged kit still shows up.
  if (out.size === 0) for (const g of genderWordsInHandle(p)) out.add(g)
  if (out.size === 0) for (const g of genderWordsInTitle(p)) out.add(g)
  return out
}

export function matchesGender(p: Product, wanted: string): boolean {
  const w = normalise(wanted).trim()
  const genders = getProductGenders(p)
  if (w === 'men' || w === 'women') return genders.has(w)
  if (w === 'unisex') return genders.has('men') && genders.has('women')
  return p.tags?.some((t) => normalise(t) === w) ?? false
}
