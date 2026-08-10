import type { Product } from '@/types'

// ── Shared field selection — used by BOTH the client-side proxy route
// (app/api/store/products/route.ts) AND the direct server-side fetch below.
// Previously these two paths had separately-written `fields` params that
// drifted out of sync — the client path got fixed but the server-rendered
// product detail page kept hitting Medusa with no `fields` param at all,
// which is why the shop listing showed correct prices/stock but the
// product detail page showed £0.00 / Out of Stock / no description for the
// exact same product.
// BUG FIX: this list never included `metadata`, so `p.metadata` (where
// specs, brand, sport, badge etc. all live) came back as `undefined` from
// Medusa's Store API — extractSpecs() below was correct all along, it just
// never got any metadata to read. Added `+metadata` so specs actually show
// up on the storefront.
export const STORE_PRODUCT_FIELDS =
  '+description,+metadata,*variants,*variants.prices,*variants.calculated_price,*variants.inventory_quantity,*categories,*images,*tags'

// ── Normalize ─────────────────────────────────────────────────────────────────
export function normalizeProduct(p: any): Product {
  const variant = p.variants?.[0]

  // Price: calculated_price (with region) → fallback to the lowest GBP
  // price on the variant → any price.
  // BUG FIX: some products were seeded with TWO gbp price entries on the
  // same variant (selling price + compare-at price both tagged 'gbp'),
  // which made `.find(currency_code === 'gbp')` pick whichever happened to
  // come back first from Medusa — sometimes the higher, pre-discount
  // amount, so the storefront displayed the wrong (higher) price as if it
  // were current. Using the *lowest* gbp amount as the real selling price
  // is safe because a selling price is never higher than its own
  // compare-at price.
  const calcAmount = variant?.calculated_price?.calculated_amount
  const gbpPrices = (variant?.prices ?? [])
    .filter((pr: any) => pr.currency_code === 'gbp')
    .map((pr: any) => pr.amount)
  const gbpPrice = gbpPrices.length ? Math.min(...gbpPrices) : undefined
  const anyPrice = variant?.prices?.[0]?.amount
  const rawPrice = calcAmount ?? gbpPrice ?? anyPrice ?? 0

  // Compare-at / original price. Two conventions exist in this codebase:
  // the dashboard (app/dashboard/products/{new,[id]}/page.tsx) writes
  // `metadata.compare_at_price` as a plain pounds number, while the seed
  // script (scripts/seed-smashuk.ts) writes `metadata.originalPrice` in
  // pence. Check both, converting units correctly for each, and fall back
  // to a second (higher) gbp price entry left over on legacy seeded
  // variants that predate the seed-script fix above.
  const metaCompareAt = p.metadata?.compare_at_price
    ? Number(p.metadata.compare_at_price)
    : undefined
  const metaOriginal = p.metadata?.originalPrice
    ? Number(p.metadata.originalPrice) / 100
    : undefined
  const legacySecondGbpPrice =
    gbpPrices.length > 1 ? Math.max(...gbpPrices) : undefined
  const originalPrice = metaCompareAt ?? metaOriginal ?? legacySecondGbpPrice

  return {
    id: p.id,
    name: p.title ?? '',
    slug: p.handle ?? p.id,
    description: p.description ?? '',
    brand: p.metadata?.brand ?? '',
    sport: p.metadata?.sport ?? p.categories?.[0]?.handle ?? '',
    category: p.categories?.[0]?.handle ?? '',
    categoryId: p.categories?.[0]?.id ?? '',
    price: rawPrice,
    originalPrice,
    images:
      p.images?.map((img: any) => img.url) ??
      (p.thumbnail ? [p.thumbnail] : ['/placeholder.png']),
    stock:
      p.variants?.reduce(
        (sum: number, v: any) => sum + (v.inventory_quantity ?? 0),
        0,
      ) ?? 0,
    sku: variant?.sku ?? '',
    rating: Number(p.metadata?.rating ?? 0),
    reviewCount: Number(p.metadata?.reviewCount ?? 0),
    badge: p.metadata?.badge ?? null,
    inStock:
      p.variants?.some((v: any) => (v.inventory_quantity ?? 0) > 0) ?? false,
    tags: p.tags?.map((t: any) => t.value) ?? [],
    createdAt: p.created_at,
    updatedAt: p.updated_at,
    specs: extractSpecs(p.metadata),
    stringUpgradeAvailable: p.metadata?.string_upgrade_available === true,
    variants: p.variants ?? [],
  }
}

// ── Badge fallbacks ───────────────────────────────────────────────────────
// Almost no seeded/admin-created product actually has `metadata.badge` set
// (the dashboard field exists but is optional and usually left blank), so
// relying on an exact `badge === 'NEW'` / `badge === 'SALE'` match makes the
// "New Arrivals" and "Sale" nav links / sidebar filters show "0 products
// found" even though the storefront clearly has new and discounted stock.
// These helpers give every badge a sensible data-driven fallback so the
// filters work out of the box, while an explicit metadata.badge value (set
// in the dashboard) always still wins/applies on top.
export const NEW_ARRIVAL_WINDOW_DAYS = 30

export function isOnSale(p: Product): boolean {
  if (p.badge?.trim().toUpperCase() === 'SALE') return true
  return !!p.originalPrice && p.originalPrice > p.price
}

export function isNewArrival(p: Product): boolean {
  if (p.badge?.trim().toUpperCase() === 'NEW') return true
  if (!p.createdAt) return false
  const createdMs = new Date(p.createdAt).getTime()
  if (Number.isNaN(createdMs)) return false
  const ageDays = (Date.now() - createdMs) / (1000 * 60 * 60 * 24)
  return ageDays <= NEW_ARRIVAL_WINDOW_DAYS
}

export function isBestSeller(p: Product): boolean {
  if (p.badge?.trim().toUpperCase() === 'BESTSELLER') return true
  // Fallback: well-rated products with a meaningful number of reviews.
  return p.reviewCount >= 5 && p.rating >= 4
}

export function matchesBadgeFilter(p: Product, badge: string): boolean {
  const b = badge.trim().toUpperCase()
  if (b === 'SALE') return isOnSale(p)
  if (b === 'NEW') return isNewArrival(p)
  if (b === 'BESTSELLER') return isBestSeller(p)
  return p.badge?.trim().toUpperCase() === b
}

// Known "system" metadata keys — everything else on a product's metadata
// is treated as a spec (label/value pair) when there's no explicit
// `metadata.specs` array. This exists because the smashuk.co seed script
// (app/api/admin/seed/route.ts) writes specs as flat top-level metadata
// keys (e.g. metadata.player_level, metadata.balance, metadata.strung)
// instead of the metadata.specs array the storefront expects — so without
// this fallback, every seeded product's Specifications tab is empty even
// though the real spec data is sitting right there in metadata.
const SYSTEM_METADATA_KEYS = new Set([
  'brand',
  'sport',
  'badge',
  'tags',
  'specs',
  'string_upgrade_available',
  'sale_price',
  'regular_price',
  'compare_at_price',
  'cost_price',
  'low_stock_alert',
  'taxable',
  'originalPrice',
  'rating',
  'reviewCount',
  'metaTitle',
  'metaDescription',
  'metaKeywords',
  'posRole',
  'pin',
  'shift',
  'isActive',
  'totalSales',
  'totalOrders',
  'phone',
  'role',
  'stripe_customer_id',
])

function prettifyLabel(key: string): string {
  return key
    .replace(/_/g, ' ')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/\b\w/g, (c) => c.toUpperCase())
}

function extractSpecs(metadata: any): { label: string; value: string }[] {
  if (!metadata) return []

  if (Array.isArray(metadata.specs) && metadata.specs.length > 0) {
    return metadata.specs
  }

  // Fallback: any non-system metadata key becomes a spec row
  return Object.entries(metadata)
    .filter(
      ([key, value]) =>
        !SYSTEM_METADATA_KEYS.has(key) &&
        value !== undefined &&
        value !== null &&
        value !== '',
    )
    .map(([key, value]) => ({
      label: prettifyLabel(key),
      value:
        typeof value === 'boolean' ? (value ? 'Yes' : 'No') : String(value),
    }))
}

let cachedRegionId: string | null | undefined

async function getServerRegionId(): Promise<string | null> {
  if (cachedRegionId !== undefined) return cachedRegionId
  try {
    const base =
      process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL ?? 'http://localhost:9000'
    const res = await fetch(`${base}/store/regions?limit=1`, {
      headers: {
        'x-publishable-api-key':
          process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY ?? '',
      },
      next: { revalidate: 300 },
    })
    if (!res.ok) {
      cachedRegionId = null
      return null
    }
    const data = await res.json()
    // BUG FIX: `data` is untyped JSON, so `data.regions?.[0]?.id ?? null` was
    // being read back as `string | null | undefined` and failing `next build`
    // (TS2322) against this function's `Promise<string | null>` return type.
    // Pin the value to a real `string | null` before caching/returning it.
    const regionId: string | null = data.regions?.[0]?.id ?? null
    cachedRegionId = regionId
    return regionId
  } catch {
    cachedRegionId = null
    return null
  }
}

function buildProductUrl(
  params: Record<string, string | undefined>,
  regionId?: string | null,
) {
  // Server-side (SSR pages): direct to Medusa
  // Client-side (React hooks): via our Next.js API proxy
  const isServer = typeof window === 'undefined'
  const base = isServer
    ? `${process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL ?? 'http://localhost:9000'}/store/products`
    : '/api/store/products'

  const sp = new URLSearchParams()
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== '') sp.set(k, v)
  })

  // The client proxy route (app/api/store/products/route.ts) already adds
  // its own `fields` + `region_id`. When going server-side directly to
  // Medusa, we must add the same ones here ourselves.
  if (isServer) {
    sp.set('fields', STORE_PRODUCT_FIELDS)
    if (regionId) sp.set('region_id', regionId)
  }

  return `${base}?${sp.toString()}`
}

async function fetchProducts(params: Record<string, string | undefined>) {
  const isServer = typeof window === 'undefined'
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }

  if (isServer) {
    // Server-side needs publishable key header
    headers['x-publishable-api-key'] =
      process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY ?? ''
  }

  const regionId = isServer ? await getServerRegionId() : null

  const res = await fetch(buildProductUrl(params, regionId), {
    headers,
    ...(isServer ? { next: { revalidate: 60 } } : {}),
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.error ?? `HTTP ${res.status}`)
  }

  return res.json()
}

export async function getProducts(params?: {
  limit?: number
  offset?: number
  q?: string
  category_id?: string[]
}): Promise<{ products: any[]; count: number }> {
  // BUG FIX: this had no return type annotation, so it inherited `any` from
  // `res.json()` inside fetchProducts(). That `any` silently propagated all
  // the way into ShopClient.tsx / SearchBar.tsx / shop/[slug]/page.tsx,
  // making every `.filter((p) => ...)` / `.map((p) => ...)` callback on the
  // product list implicitly-`any` (TS7006) and failing `next build` under
  // strict mode. Pinning `products` to `any[]` here (the raw, un-normalized
  // Medusa shape — callers run `normalizeProduct()` on each item) stops the
  // leak without needing to introduce a full raw-product type right now.
  const data = await fetchProducts({
    limit: String(params?.limit ?? 20),
    offset: String(params?.offset ?? 0),
    q: params?.q,
    category_id: params?.category_id?.join(','),
  })
  return { products: data.products ?? [], count: data.count ?? 0 }
}

export async function getProduct(handle: string) {
  const data = await fetchProducts({ handle, limit: '1' })
  return data.products?.[0] ?? null
}

// Used by the wishlist store to turn the id list synced from Medusa
// customer.metadata.wishlist back into full product data for display.
export async function getProductsByIds(ids: string[]): Promise<any[]> {
  if (ids.length === 0) return []
  const data = await fetchProducts({
    id: ids.join(','),
    limit: String(ids.length),
  })
  return data.products ?? []
}

// ── Reviews (homepage testimonial slider — real data via Medusa store
// metadata, see app/api/store/reviews) ─────────────────────────────────────
export async function getSiteReviews(): Promise<
  import('@/types').SiteReview[]
> {
  const res = await fetch('/api/store/reviews')
  if (!res.ok) return []
  const data = await res.json()
  return data.reviews ?? []
}

// ── Brand/product stats (BrandsBar, Hero — real aggregation from Medusa
// product catalog, see app/api/store/brands) ────────────────────────────────
export interface BrandStats {
  brands: { name: string; count: number }[]
  brandCount: number
  productCount: number
  avgRating: number | null
  bySport: Record<string, { productCount: number; brandCount: number }>
}
export async function getBrandStats(): Promise<BrandStats> {
  const res = await fetch('/api/store/brands')
  if (!res.ok) {
    return {
      brands: [],
      brandCount: 0,
      productCount: 0,
      avgRating: null,
      bySport: {},
    }
  }
  return res.json()
}

// ── Cart (via server proxy — no CORS, works with cookie auth) ─────────────────

export async function createCart() {
  const res = await fetch('/api/store/cart', {
    method: 'POST',
    credentials: 'include',
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error ?? 'Failed to create cart')
  return data.cart
}

export async function addToCart(
  cartId: string,
  variantId: string,
  quantity = 1,
  metadata?: Record<string, any>,
) {
  const res = await fetch('/api/store/cart/items', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ cartId, variant_id: variantId, quantity, metadata }),
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error ?? 'Failed to add item')
  return data.cart
}

export async function getCart(cartId: string) {
  const res = await fetch(`/api/store/cart?id=${cartId}`, {
    credentials: 'include',
  })
  const data = await res.json()
  return data.cart ?? null
}

export async function removeFromCart(cartId: string, lineItemId: string) {
  await fetch('/api/store/cart/items', {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ cartId, lineItemId }),
  })
}

export async function updateCartItem(
  cartId: string,
  lineItemId: string,
  quantity: number,
) {
  const res = await fetch('/api/store/cart/items', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ cartId, lineItemId, quantity }),
  })
  const data = await res.json()
  return data.cart
}

// ── Orders ────────────────────────────────────────────────────────────────────
export async function getCustomerOrders() {
  const res = await fetch('/api/store/orders', { credentials: 'include' })
  const data = await res.json().catch(() => ({}))
  return data.orders ?? []
}

export async function getCustomerOrder(id: string) {
  const res = await fetch(`/api/store/orders?id=${id}`, {
    credentials: 'include',
  })
  const data = await res.json().catch(() => ({}))
  return data.order ?? null
}

export async function requestReturn(
  orderId: string,
  items: { item_id: string; quantity: number }[],
  reason: string,
  note?: string,
) {
  const res = await fetch(`/api/store/orders/${orderId}/return-request`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ items, reason, note }),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.error ?? 'Failed to submit return request')
  return data
}

// ── Checkout ──────────────────────────────────────────────────────────────────
// BUG FIX: this used to swallow every failure (never checked res.ok), so a
// failed step — e.g. "add-shipping" 400ing because the shipping option has
// no price configured in Medusa — was silently ignored and the checkout
// flow kept going anyway, only to fail several steps later at `complete`
// with a confusing, unrelated "Cannot complete a cart with no items"
// error. Throwing here surfaces the REAL error immediately, at the step
// that actually failed.
async function checkoutAction(
  action: string,
  cartId: string,
  extra?: Record<string, any>,
) {
  const res = await fetch('/api/store/checkout', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ action, cartId, ...extra }),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    throw new Error(
      data?.error ?? data?.message ?? `Checkout step "${action}" failed`,
    )
  }
  return data
}

export async function addShippingAddress(
  cartId: string,
  address: {
    first_name: string
    last_name: string
    address_1: string
    address_2?: string
    city: string
    province: string
    postal_code: string
    country_code: string
    phone?: string
  },
  // Optional separate billing address — defaults to mirroring the shipping
  // address (e.g. for pickup orders, where "billing = shipping" is the
  // sensible default and the checkout UI doesn't ask for a separate one).
  billingAddress?: {
    first_name: string
    last_name: string
    address_1: string
    address_2?: string
    city: string
    province: string
    postal_code: string
    country_code: string
    phone?: string
  },
  // BUG FIX: this used to only send shipping_address/billing_address to
  // Medusa — the customer's email (already collected and validated as
  // required in the checkout form) was silently dropped, never reaching
  // the cart. Medusa's `POST /store/carts/:id` accepts `email` directly,
  // so orders ended up in Medusa Admin with no Customer attached at all
  // ("-" in the Customer column) even though the email was right there in
  // the form the whole time.
  email?: string,
) {
  const res = await fetch('/api/store/cart', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({
      cartId,
      shipping_address: address,
      billing_address: billingAddress ?? address,
      ...(email ? { email } : {}),
    }),
  })
  const data = await res.json()
  // BUG FIX: previously didn't check res.ok, so a failed address save
  // (e.g. cartId pointing at an expired/completed cart) was ignored and
  // checkout carried on regardless — surfacing a real error here instead.
  if (!res.ok) {
    throw new Error(
      data?.error ?? data?.message ?? 'Failed to save shipping address',
    )
  }
  return data.cart
}

export async function listShippingOptions(cartId: string) {
  const data = await checkoutAction('shipping-options', cartId)
  return data.shipping_options ?? []
}

export async function addShippingMethod(
  cartId: string,
  shippingOptionId: string,
) {
  const data = await checkoutAction('add-shipping', cartId, {
    option_id: shippingOptionId,
  })
  return data.cart
}

export async function initiatePayment(cartId: string) {
  const data = await checkoutAction('payment-session', cartId)
  return data.payment_collection
}

export async function placeOrder(cartId: string) {
  const data = await checkoutAction('complete', cartId)
  return data.order ?? data.cart
}

export function formatPrice(amount: number, currencyCode = 'gbp') {
  return new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency: currencyCode.toUpperCase(),
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount)
}

// ── Customer Addresses ───────────────────────────────────────────────────────
import type { CustomerAddress } from '@/types'

export async function getAddresses(): Promise<CustomerAddress[]> {
  const res = await fetch('/api/store/addresses', { credentials: 'include' })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data?.error ?? 'Failed to load addresses')
  return data.addresses ?? []
}

export async function addAddress(address: Omit<CustomerAddress, 'id'>) {
  const res = await fetch('/api/store/addresses', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(address),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data?.error ?? 'Failed to add address')
  return data.customer ?? data
}

export async function updateAddress(
  addressId: string,
  address: Partial<CustomerAddress>,
) {
  const res = await fetch('/api/store/addresses', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ addressId, ...address }),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data?.error ?? 'Failed to update address')
  return data.customer ?? data
}

export async function deleteAddress(addressId: string) {
  const res = await fetch(`/api/store/addresses?addressId=${addressId}`, {
    method: 'DELETE',
    credentials: 'include',
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data?.error ?? 'Failed to delete address')
  return data
}

// ── Change Password ──────────────────────────────────────────────────────────
export async function changePassword(oldPassword: string, newPassword: string) {
  const res = await fetch('/api/auth/change-password', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({
      old_password: oldPassword,
      new_password: newPassword,
    }),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data?.error ?? 'Failed to change password')
  return data
}

// ── Update Profile ────────────────────────────────────────────────────────────
export async function updateProfile(fields: {
  first_name?: string
  last_name?: string
  phone?: string
}) {
  const res = await fetch('/api/auth/customer-profile', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(fields),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data?.error ?? 'Failed to update profile')
  return data
}

// ── Wishlist (Medusa customer.metadata) ─────────────────────────────────────
// Previously the wishlist only lived in localStorage (store/wishlistStore.ts),
// so it didn't survive across devices/browsers or a cleared cache. These
// helpers persist it on the logged-in customer's record in Medusa instead.
export async function getWishlist(): Promise<string[]> {
  const res = await fetch('/api/auth/customer-wishlist', {
    credentials: 'include',
  })
  if (!res.ok) {
    if (res.status === 401) return [] // not logged in — nothing to sync yet
    throw new Error('Failed to load wishlist')
  }
  const data = await res.json()
  return Array.isArray(data?.productIds) ? data.productIds : []
}

export async function saveWishlist(productIds: string[]) {
  const res = await fetch('/api/auth/customer-wishlist', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ productIds }),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data?.error ?? 'Failed to save wishlist')
  return data
}
