import { MAIL_IN_EXTRAS, MAIL_IN_HANDLES } from '@/lib/mail-in'
import { isStringingServiceProduct } from '@/lib/stringing'

const INTERNAL_HANDLES = new Set<string>([
  ...Object.values(MAIL_IN_HANDLES),
  ...MAIL_IN_EXTRAS.map((e) => e.handle),
])

const INTERNAL_TITLES = new Set([
  'custom item',
  'racket box kit',
  'mail-in stringing shipping',
])

const INTERNAL_META_FLAGS = [
  'pos_custom',
  'pos_custom_item',
  'custom_item',
  'is_custom',
  'internal',
  'hidden',
  'storefront_hidden',
  'hide_from_storefront',
]

/**
 * Products that exist only to be sold through a flow (POS custom items,
 * mail-in stringing shipping / box kit, stringing services) and must never
 * appear in shop listings, New Arrivals, feeds or the sitemap.
 *
 * Direct lookups by handle (mail-in booking, gift cards) are NOT affected —
 * only listing code should call this.
 */
export function isHiddenFromStorefront(p: any): boolean {
  if (!p) return false
  if (isStringingServiceProduct(p)) return true
  const handle = String(p.handle ?? p.slug ?? '').toLowerCase()
  if (INTERNAL_HANDLES.has(handle)) return true
  if (handle === 'custom-item' || /^custom-item(-|$)/.test(handle)) return true
  const title = String(p.title ?? p.name ?? '')
    .trim()
    .toLowerCase()
  if (INTERNAL_TITLES.has(title)) return true
  const meta = p.metadata ?? {}
  return INTERNAL_META_FLAGS.some((k) => {
    const v = meta[k]
    return v === true || v === 'true' || v === 1 || v === '1'
  })
}
