import { FREE_SHIPPING_THRESHOLD } from '@/lib/constants'
import { formatCurrency } from '@/lib/utils'
import { isValidHref } from '@/lib/hero-slides-shared'

// Shared (client + server) definition of the home page layout.
//
// The whole homepage is described by ONE ordered list of "blocks" stored in the
// Medusa store metadata under `homeLayout` (same place as `heroSlides` and
// `promoBanner`). The dashboard edits that list (Dashboard → Marketing → Home
// Page) and app/(website)/page.tsx simply renders it top to bottom.
//
// Nothing saved yet? buildDefaultHomeLayout() reproduces the homepage exactly as
// it looked before this feature existed, so nothing changes until someone hits
// Save in the dashboard.

// ─── limits ──────────────────────────────────────────────────────────────────

export const MAX_HOME_BLOCKS = 30
export const MAX_HOME_PRODUCTS_PER_SECTION = 24
export const MAX_HOME_CATEGORY_TILES = 12
export const MAX_HOME_TRUST_ITEMS = 4

// ─── types ───────────────────────────────────────────────────────────────────

export type HomeBlockType =
  | 'hero'
  | 'trust'
  | 'categories'
  | 'products'
  | 'promo'
  | 'brands'
  | 'reviews'
  | 'newsletter'

export const HOME_TRUST_ICONS = [
  'truck',
  'shield',
  'refresh',
  'heart',
  'star',
  'gift',
  'tag',
  'package',
  'clock',
  'bolt',
  'phone',
  'check',
] as const
export type HomeTrustIcon = (typeof HOME_TRUST_ICONS)[number]

export const HOME_TRUST_ICON_LABELS: Record<HomeTrustIcon, string> = {
  truck: 'Delivery truck',
  shield: 'Shield',
  refresh: 'Returns / refresh',
  heart: 'Heart',
  star: 'Star',
  gift: 'Gift',
  tag: 'Price tag',
  package: 'Package',
  clock: 'Clock',
  bolt: 'Lightning bolt',
  phone: 'Phone',
  check: 'Tick',
}

export interface HomeTrustItem {
  icon: HomeTrustIcon
  title: string
  desc: string
}

export interface HomeCategoryTile {
  id: string
  label: string
  /** Emoji shown in the small badge on the tile. */
  icon: string
  image: string
  /** Where the tile goes, e.g. "/shop?sport=badminton". */
  href: string
  /** Optional small line under the name, e.g. "120+ products". */
  countLabel: string
  /** Shows the orange "Popular" pill. */
  popular: boolean
}

export type HomeProductSource = 'auto' | 'manual'

export type HomeProductBadge = '' | 'NEW' | 'SALE' | 'BESTSELLER' | 'LIMITED'

export const HOME_BADGE_OPTIONS: { value: HomeProductBadge; label: string }[] =
  [
    { value: '', label: 'Any product' },
    { value: 'NEW', label: 'New arrivals' },
    { value: 'SALE', label: 'On sale (discounted)' },
    { value: 'BESTSELLER', label: 'Best sellers' },
    { value: 'LIMITED', label: 'Limited edition' },
  ]

export type HomeProductSort =
  'featured' | 'newest' | 'price-asc' | 'price-desc' | 'rating' | 'discount'

export const HOME_SORT_OPTIONS: { value: HomeProductSort; label: string }[] = [
  { value: 'featured', label: 'Store default order' },
  { value: 'newest', label: 'Newest first' },
  { value: 'discount', label: 'Biggest discount first' },
  { value: 'rating', label: 'Top rated first' },
  { value: 'price-asc', label: 'Price: low to high' },
  { value: 'price-desc', label: 'Price: high to low' },
]

export interface HomePickedProduct {
  id: string
  title: string
  thumbnail: string
}

export interface HomeProductFilters {
  /** Sport slug, same values as /shop?sport=… ('' = any). */
  sport: string
  /** Category handle, same values as /shop?category=… ('' = any). */
  category: string
  /** Brand name ('' = any). */
  brand: string
  badge: HomeProductBadge
}

export type HomePromoTheme = 'orange' | 'navy' | 'light'

export const HOME_PROMO_THEMES: { value: HomePromoTheme; label: string }[] = [
  { value: 'orange', label: 'Orange (default)' },
  { value: 'navy', label: 'Navy' },
  { value: 'light', label: 'Light grey' },
]

interface BlockBase {
  id: string
  enabled: boolean
}

export interface HomeHeroBlock extends BlockBase {
  type: 'hero'
}

export interface HomeTrustBlock extends BlockBase {
  type: 'trust'
  items: HomeTrustItem[]
}

export interface HomeCategoriesBlock extends BlockBase {
  type: 'categories'
  eyebrow: string
  heading: string
  subheading: string
  ctaLabel: string
  ctaHref: string
  tiles: HomeCategoryTile[]
}

export interface HomeProductsBlock extends BlockBase {
  type: 'products'
  title: string
  source: HomeProductSource
  /** Used when source === 'auto'. */
  filters: HomeProductFilters
  sort: HomeProductSort
  /** Used when source === 'manual' (order = display order). */
  products: HomePickedProduct[]
  /** Max products shown (auto). */
  limit: number
  onlyInStock: boolean
  background: 'white' | 'gray'
  columns: 2 | 3 | 4
  showSort: boolean
  showViewToggle: boolean
  viewAllLabel: string
  viewAllHref: string
}

export interface HomePromoBlock extends BlockBase {
  type: 'promo'
  /**
   * true  = show the store's existing Promo Banner settings (the same ones that
   *         feed the navbar offer code), edited under Marketing → Promo Banner.
   * false = use the fields below, only for this homepage banner.
   */
  linkedToPromoBanner: boolean
  eyebrow: string
  heading: string
  subtext: string
  code: string
  ctaText: string
  ctaLink: string
  theme: HomePromoTheme
}

export interface HomeBrandsBlock extends BlockBase {
  type: 'brands'
}

export interface HomeReviewsBlock extends BlockBase {
  type: 'reviews'
}

export interface HomeNewsletterBlock extends BlockBase {
  type: 'newsletter'
  eyebrow: string
  heading: string
  subtext: string
}

export type HomeBlock =
  | HomeHeroBlock
  | HomeTrustBlock
  | HomeCategoriesBlock
  | HomeProductsBlock
  | HomePromoBlock
  | HomeBrandsBlock
  | HomeReviewsBlock
  | HomeNewsletterBlock

export interface HomeLayout {
  version: 1
  blocks: HomeBlock[]
}

/** The store-wide Promo Banner settings (Marketing → Promo Banner). */
export interface LegacyPromoBanner {
  enabled: boolean
  eyebrow: string
  heading: string
  subtext: string
  code: string
  ctaText: string
  ctaLink: string
}

/** Blocks the dashboard offers a Delete button for. The rest can only be toggled. */
export const HOME_REPEATABLE_TYPES: HomeBlockType[] = [
  'products',
  'promo',
  'categories',
]

export const HOME_BLOCK_LABELS: Record<HomeBlockType, string> = {
  hero: 'Hero slider',
  trust: 'Trust strip',
  categories: 'Browse-by-sport tiles',
  products: 'Product section',
  promo: 'Discount / promo banner',
  brands: 'Brands',
  reviews: 'Customer reviews',
  newsletter: 'Newsletter sign-up',
}

// ─── ids + factories ─────────────────────────────────────────────────────────

const uid = (prefix: string) =>
  `${prefix}-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 5)}`

export function newHomeTile(): HomeCategoryTile {
  return {
    id: uid('tile'),
    label: '',
    icon: '🏸',
    image: '',
    href: '/shop',
    countLabel: '',
    popular: false,
  }
}

export function emptyProductFilters(): HomeProductFilters {
  return { sport: '', category: '', brand: '', badge: '' }
}

export function newProductsBlock(
  overrides: Partial<HomeProductsBlock> = {},
): HomeProductsBlock {
  return {
    id: uid('products'),
    type: 'products',
    enabled: true,
    title: '',
    source: 'auto',
    filters: emptyProductFilters(),
    sort: 'featured',
    products: [],
    limit: 8,
    onlyInStock: true,
    background: 'white',
    columns: 4,
    showSort: false,
    showViewToggle: false,
    viewAllLabel: '',
    viewAllHref: '',
    ...overrides,
  }
}

export interface ProductPreset {
  key: string
  label: string
  hint: string
  make: () => HomeProductsBlock
}

/** One-click starting points in the dashboard's "Add section" menu. */
export const PRODUCT_PRESETS: ProductPreset[] = [
  {
    key: 'new',
    label: 'New arrivals',
    hint: 'Latest products',
    make: () =>
      newProductsBlock({
        title: 'New Arrivals',
        filters: { ...emptyProductFilters(), badge: 'NEW' },
        sort: 'newest',
        limit: 4,
        background: 'gray',
        viewAllLabel: 'View all new arrivals',
        viewAllHref: '/shop?badge=NEW',
      }),
  },
  {
    key: 'sale',
    label: 'On sale',
    hint: 'Discounted products',
    make: () =>
      newProductsBlock({
        title: 'On Sale',
        filters: { ...emptyProductFilters(), badge: 'SALE' },
        sort: 'discount',
        limit: 4,
        viewAllLabel: 'Shop all sale',
        viewAllHref: '/shop?badge=SALE',
      }),
  },
  {
    key: 'best',
    label: 'Best sellers',
    hint: 'Top products',
    make: () =>
      newProductsBlock({
        title: 'Best Sellers',
        filters: { ...emptyProductFilters(), badge: 'BESTSELLER' },
        limit: 6,
      }),
  },
  {
    key: 'sport',
    label: 'One sport',
    hint: 'e.g. Badminton picks',
    make: () =>
      newProductsBlock({
        title: 'Badminton Picks',
        filters: { ...emptyProductFilters(), sport: 'badminton' },
        limit: 8,
        viewAllLabel: 'Shop all badminton',
        viewAllHref: '/shop?sport=badminton',
      }),
  },
  {
    key: 'manual',
    label: 'Hand-picked',
    hint: 'You choose the products',
    make: () =>
      newProductsBlock({
        title: 'Staff Picks',
        source: 'manual',
      }),
  },
]

export function newPromoBlock(): HomePromoBlock {
  return {
    id: uid('promo'),
    type: 'promo',
    enabled: true,
    linkedToPromoBanner: false,
    eyebrow: 'Limited Time Offer',
    heading: 'UP TO 10% OFF',
    subtext: 'On selected sports equipment',
    code: '',
    ctaText: 'Shop Now →',
    ctaLink: '/shop',
    theme: 'orange',
  }
}

export function newCategoriesBlock(): HomeCategoriesBlock {
  return {
    id: uid('categories'),
    type: 'categories',
    enabled: true,
    eyebrow: 'Browse',
    heading: 'Shop By Category',
    subheading: '',
    ctaLabel: 'All Products',
    ctaHref: '/shop',
    tiles: [],
  }
}

/** The link the shop would use for this filter combination ("View all" helper). */
export function shopHrefForFilters(filters: HomeProductFilters): string {
  const sp = new URLSearchParams()
  if (filters.sport) sp.set('sport', filters.sport)
  if (filters.category) sp.set('category', filters.category)
  if (filters.brand) sp.set('brand', filters.brand)
  if (filters.badge) sp.set('badge', filters.badge)
  const qs = sp.toString()
  return qs ? `/shop?${qs}` : '/shop'
}

// ─── defaults (== the homepage as it was before this feature) ────────────────

export const DEFAULT_TRUST_ITEMS: HomeTrustItem[] = [
  {
    icon: 'truck',
    title: 'Free Shipping',
    desc: `On orders above ${formatCurrency(FREE_SHIPPING_THRESHOLD)}`,
  },
  {
    icon: 'shield',
    title: '100% Authentic',
    desc: 'Genuine products guaranteed',
  },
  {
    icon: 'refresh',
    title: 'Easy Returns',
    desc: '30-days hassle-free returns',
  },
  {
    icon: 'heart',
    title: 'Expert Support',
    desc: 'By sports enthusiasts',
  },
]

const tile = (
  sport: string,
  icon: string,
  label: string,
  image: string,
  count: number,
  popular = false,
): HomeCategoryTile => ({
  id: `tile-${sport}`,
  label,
  icon,
  image,
  href: `/shop?sport=${sport}`,
  countLabel: `${count}+ products`,
  popular,
})

export const DEFAULT_CATEGORY_TILES: HomeCategoryTile[] = [
  tile(
    'badminton',
    '🏸',
    'Badminton',
    'https://images.unsplash.com/photo-1626224583764-f87db24ac4ea?w=600&q=80',
    120,
    true,
  ),
  tile(
    'tennis',
    '🎾',
    'Tennis',
    'https://images.unsplash.com/photo-1622279457486-62dcc4a431d6?w=600&q=80',
    95,
  ),
  tile(
    'padel',
    '🏓',
    'Padel',
    'https://images.pexels.com/photos/33641987/pexels-photo-33641987.jpeg?w=600&auto=compress&cs=tinysrgb',
    48,
  ),
  tile(
    'squash',
    '🥎',
    'Squash',
    'https://images.pexels.com/photos/7648075/pexels-photo-7648075.jpeg?w=600&auto=compress&cs=tinysrgb',
    36,
  ),
  tile(
    'clothing',
    '👕',
    'Clothing',
    'https://images.unsplash.com/photo-1523381210434-271e8be1f52b?w=600&q=80',
    80,
  ),
  tile(
    'shoes',
    '👟',
    'Shoes',
    'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=600&q=80',
    64,
  ),
  tile(
    'bags',
    '🎒',
    'Racket Bags',
    'https://images.unsplash.com/photo-1724352012670-aae65f2bbd84?w=600&q=80',
    28,
  ),
  tile(
    'accessories',
    '🧤',
    'Accessories',
    'https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=600&q=80',
    52,
  ),
]

export const DEFAULT_CATEGORIES_COPY = {
  eyebrow: 'Browse by Sport',
  heading: 'What Do You Play?',
  subheading:
    'Badminton to Padel, Rackets to Shoes — premium gear for every racket sport and every level.',
  ctaLabel: 'All Products',
  ctaHref: '/shop',
}

export const DEFAULT_NEWSLETTER_COPY = {
  eyebrow: 'Stay in the Game',
  heading: 'Get Exclusive Deals',
  subtext: 'Subscribe and get 10% off your first order.',
}

export function buildDefaultHomeLayout(): HomeLayout {
  return {
    version: 1,
    blocks: [
      { id: 'hero', type: 'hero', enabled: true },
      {
        id: 'trust',
        type: 'trust',
        enabled: true,
        items: DEFAULT_TRUST_ITEMS.map((i) => ({ ...i })),
      },
      {
        id: 'categories',
        type: 'categories',
        enabled: true,
        ...DEFAULT_CATEGORIES_COPY,
        tiles: DEFAULT_CATEGORY_TILES.map((t) => ({ ...t })),
      },
      newProductsBlock({
        id: 'products-featured',
        title: 'Featured Products',
        limit: 8,
        background: 'white',
        showSort: true,
        showViewToggle: true,
      }),
      newProductsBlock({
        id: 'products-new',
        title: 'New Arrivals',
        filters: { ...emptyProductFilters(), badge: 'NEW' },
        sort: 'newest',
        limit: 4,
        background: 'gray',
      }),
      newProductsBlock({
        id: 'products-best',
        title: 'Best Sellers',
        filters: { ...emptyProductFilters(), badge: 'BESTSELLER' },
        limit: 6,
        background: 'white',
      }),
      {
        id: 'promo',
        type: 'promo',
        enabled: true,
        linkedToPromoBanner: true,
        eyebrow: '',
        heading: '',
        subtext: '',
        code: '',
        ctaText: '',
        ctaLink: '',
        theme: 'orange',
      },
      { id: 'brands', type: 'brands', enabled: true },
      { id: 'reviews', type: 'reviews', enabled: true },
      {
        id: 'newsletter',
        type: 'newsletter',
        enabled: true,
        ...DEFAULT_NEWSLETTER_COPY,
      },
    ],
  }
}

/**
 * Website-side: fills in every promo block that is linked to the store's Promo
 * Banner with that banner's current text, so the renderer only ever sees
 * concrete values. A linked block also disappears when the Promo Banner itself
 * is switched off (that toggle already existed before this feature).
 */
export function resolveHomeLayout(
  layout: HomeLayout,
  legacy: LegacyPromoBanner,
): HomeLayout {
  return {
    ...layout,
    blocks: layout.blocks.map((b) => {
      if (b.type !== 'promo' || !b.linkedToPromoBanner) return b
      return {
        ...b,
        enabled: b.enabled && legacy.enabled,
        eyebrow: legacy.eyebrow,
        heading: legacy.heading,
        subtext: legacy.subtext,
        code: legacy.code,
        ctaText: legacy.ctaText,
        ctaLink: legacy.ctaLink,
      }
    }),
  }
}

// ─── sanitiser (used when saving AND when reading) ───────────────────────────

const str = (v: unknown, max: number) =>
  typeof v === 'string' ? v.trim().slice(0, max) : ''

const href = (v: unknown) => {
  const s = str(v, 500)
  return s && isValidHref(s) ? s : ''
}

const slug = (v: unknown) =>
  str(v, 80)
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, '')

const oneOf = <T extends string>(
  v: unknown,
  allowed: readonly T[],
  fallback: T,
) =>
  typeof v === 'string' && (allowed as readonly string[]).includes(v)
    ? (v as T)
    : fallback

const BADGES: readonly HomeProductBadge[] = [
  '',
  'NEW',
  'SALE',
  'BESTSELLER',
  'LIMITED',
]
const SORTS: readonly HomeProductSort[] = [
  'featured',
  'newest',
  'price-asc',
  'price-desc',
  'rating',
  'discount',
]
const THEMES: readonly HomePromoTheme[] = ['orange', 'navy', 'light']

function toRecord(v: unknown): Record<string, unknown> | null {
  return v && typeof v === 'object' && !Array.isArray(v)
    ? (v as Record<string, unknown>)
    : null
}

function sanitizeTrust(r: Record<string, unknown>, base: BlockBase) {
  const items: HomeTrustItem[] = []
  for (const raw of Array.isArray(r.items) ? r.items : []) {
    const it = toRecord(raw)
    if (!it) continue
    const title = str(it.title, 40)
    if (!title) continue
    items.push({
      icon: oneOf(it.icon, HOME_TRUST_ICONS, 'check'),
      title,
      desc: str(it.desc, 80),
    })
    if (items.length >= MAX_HOME_TRUST_ITEMS) break
  }
  return { ...base, type: 'trust' as const, items }
}

function sanitizeCategories(r: Record<string, unknown>, base: BlockBase) {
  const tiles: HomeCategoryTile[] = []
  const seen = new Set<string>()
  for (const raw of Array.isArray(r.tiles) ? r.tiles : []) {
    const t = toRecord(raw)
    if (!t) continue
    const label = str(t.label, 40)
    const link = href(t.href)
    if (!label || !link) continue
    let id = str(t.id, 40) || `tile-${tiles.length + 1}`
    while (seen.has(id)) id = `${id}-x`
    seen.add(id)
    tiles.push({
      id,
      label,
      icon: str(t.icon, 8),
      image: href(t.image),
      href: link,
      countLabel: str(t.countLabel, 30),
      popular: t.popular === true,
    })
    if (tiles.length >= MAX_HOME_CATEGORY_TILES) break
  }
  const ctaLabel = str(r.ctaLabel, 30)
  const ctaHref = href(r.ctaHref)
  return {
    ...base,
    type: 'categories' as const,
    eyebrow: str(r.eyebrow, 40),
    heading: str(r.heading, 80),
    subheading: str(r.subheading, 200),
    ctaLabel: ctaHref ? ctaLabel : '',
    ctaHref: ctaLabel ? ctaHref : '',
    tiles,
  }
}

function sanitizeProducts(r: Record<string, unknown>, base: BlockBase) {
  const f = toRecord(r.filters) ?? {}
  const picked: HomePickedProduct[] = []
  const seen = new Set<string>()
  for (const raw of Array.isArray(r.products) ? r.products : []) {
    const p = toRecord(raw)
    const id = p ? str(p.id, 80) : ''
    if (!p || !id || seen.has(id)) continue
    seen.add(id)
    picked.push({
      id,
      title: str(p.title, 120),
      thumbnail: href(p.thumbnail),
    })
    if (picked.length >= MAX_HOME_PRODUCTS_PER_SECTION) break
  }
  const limitRaw = Math.round(Number(r.limit))
  const limit = Number.isFinite(limitRaw)
    ? Math.min(Math.max(limitRaw, 1), MAX_HOME_PRODUCTS_PER_SECTION)
    : 8
  const columnsRaw = Number(r.columns)
  const columns: 2 | 3 | 4 =
    columnsRaw === 2 || columnsRaw === 3 || columnsRaw === 4 ? columnsRaw : 4
  const viewAllLabel = str(r.viewAllLabel, 40)
  const viewAllHref = href(r.viewAllHref)
  return {
    ...base,
    type: 'products' as const,
    title: str(r.title, 60),
    source: oneOf<HomeProductSource>(r.source, ['auto', 'manual'], 'auto'),
    filters: {
      sport: slug(f.sport),
      category: slug(f.category),
      brand: str(f.brand, 60),
      badge: oneOf(f.badge, BADGES, ''),
    },
    sort: oneOf(r.sort, SORTS, 'featured'),
    products: picked,
    limit,
    onlyInStock: r.onlyInStock !== false,
    background: oneOf<'white' | 'gray'>(
      r.background,
      ['white', 'gray'],
      'white',
    ),
    columns,
    showSort: r.showSort === true,
    showViewToggle: r.showViewToggle === true,
    viewAllLabel: viewAllHref ? viewAllLabel : '',
    viewAllHref: viewAllLabel ? viewAllHref : '',
  }
}

function sanitizePromo(r: Record<string, unknown>, base: BlockBase) {
  return {
    ...base,
    type: 'promo' as const,
    linkedToPromoBanner: r.linkedToPromoBanner === true,
    eyebrow: str(r.eyebrow, 60),
    heading: str(r.heading, 80),
    subtext: str(r.subtext, 160),
    code: str(r.code, 30),
    ctaText: str(r.ctaText, 40),
    ctaLink: href(r.ctaLink),
    theme: oneOf(r.theme, THEMES, 'orange'),
  }
}

const SINGLETONS = new Set<HomeBlockType>([
  'hero',
  'trust',
  'brands',
  'reviews',
  'newsletter',
])

/**
 * Returns null when nothing usable is stored (→ caller falls back to the
 * default layout). Unknown block types, duplicate singletons and junk are
 * dropped rather than failing the whole page.
 */
export function sanitizeHomeLayout(input: unknown): HomeLayout | null {
  const root = toRecord(input)
  const list = root && Array.isArray(root.blocks) ? root.blocks : null
  if (!list) return null

  const seenIds = new Set<string>()
  const seenSingletons = new Set<HomeBlockType>()
  const blocks: HomeBlock[] = []

  for (const raw of list.slice(0, MAX_HOME_BLOCKS)) {
    const r = toRecord(raw)
    if (!r) continue
    if (
      typeof r.type !== 'string' ||
      !Object.prototype.hasOwnProperty.call(HOME_BLOCK_LABELS, r.type)
    )
      continue
    const type = r.type as HomeBlockType
    if (SINGLETONS.has(type)) {
      if (seenSingletons.has(type)) continue
      seenSingletons.add(type)
    }
    let id = str(r.id, 40) || `${type}-${blocks.length + 1}`
    while (seenIds.has(id)) id = `${id}-x`
    seenIds.add(id)
    const base: BlockBase = { id, enabled: r.enabled !== false }

    switch (type) {
      case 'hero':
        blocks.push({ ...base, type: 'hero' })
        break
      case 'brands':
        blocks.push({ ...base, type: 'brands' })
        break
      case 'reviews':
        blocks.push({ ...base, type: 'reviews' })
        break
      case 'trust':
        blocks.push(sanitizeTrust(r, base))
        break
      case 'categories':
        blocks.push(sanitizeCategories(r, base))
        break
      case 'products':
        blocks.push(sanitizeProducts(r, base))
        break
      case 'promo':
        blocks.push(sanitizePromo(r, base))
        break
      case 'newsletter':
        blocks.push({
          ...base,
          type: 'newsletter',
          eyebrow: str(r.eyebrow, 40),
          heading: str(r.heading, 80),
          subtext: str(r.subtext, 200),
        })
        break
    }
  }

  return blocks.length > 0 ? { version: 1, blocks } : null
}
