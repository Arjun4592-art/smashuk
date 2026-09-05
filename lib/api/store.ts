import type { Product } from '@/types'
export const STORE_PRODUCT_FIELDS =
  '+description,+metadata,*variants,*variants.prices,*variants.calculated_price,*variants.inventory_quantity,*variants.options,*variants.images,*options,*options.values,*categories,*images,*tags'
export const STORE_PRODUCT_LISTING_FIELDS =
  '+description,+metadata,*variants.prices,*variants.inventory_quantity,*categories,*images,*tags'
// Medusa doesn't guarantee category array order, and a product is normally
// linked to BOTH its sport's top-level category ("Badminton") and a specific
// sub-category ("Badminton Rackets"). Blindly taking categories[0] can land
// on the generic top-level one, which then fails every "includes('racket')"
// / "includes('shoe')" style check downstream and silently falls back to a
// much broader (and much noisier) filter set. Prefer the more specific,
// non-top-level category instead.
const SPORT_CATEGORY_SLUGS = new Set([
  'badminton',
  'tennis',
  'padel',
  'squash',
  'clothing',
])
function pickCategory(categories: any[] | undefined): {
  handle: string
  id: string
} {
  if (!categories || categories.length === 0) return { handle: '', id: '' }
  const specificOnes = categories.filter(
    (c) => c?.handle && !SPORT_CATEGORY_SLUGS.has(c.handle),
  )
  // Some products end up linked to more than one specific sub-category — a
  // known data issue where re-detecting a product's category leaves a stale
  // "Rackets" link attached alongside the real, more specific one (e.g. a
  // shoe that's also still tagged "Squash Rackets" from an earlier import
  // pass). "Rackets" is the least-informative default sub-category, so if
  // something more specific is also present, trust that one instead of
  // whichever happens to come first in Medusa's unordered array.
  const preferred =
    specificOnes.find((c) => !/rackets?$/i.test(c.handle ?? '')) ??
    specificOnes[0]
  const chosen = preferred ?? categories[0]
  return { handle: chosen?.handle ?? '', id: chosen?.id ?? '' }
}
export function normalizeProduct(p: any): Product {
  const variant = p.variants?.[0]
  const category = pickCategory(p.categories)
  const calcAmount = variant?.calculated_price?.calculated_amount
  const gbpPrices = (variant?.prices ?? [])
    .filter((pr: any) => pr.currency_code === 'gbp')
    .map((pr: any) => pr.amount)
  const gbpPrice = gbpPrices.length ? Math.min(...gbpPrices) : undefined
  const anyPrice = variant?.prices?.[0]?.amount
  const rawPrice = calcAmount ?? gbpPrice ?? anyPrice ?? 0
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
    sport: p.metadata?.sport ?? category.handle ?? '',
    category: category.handle,
    categoryId: category.id,
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
    stringUpgradeType:
      p.metadata?.string_upgrade_type === 'paid' ? 'paid' : 'free',
    variants: p.variants ?? [],
    options: p.options ?? [],
    tierPricing: Array.isArray(p.metadata?.tier_pricing)
      ? p.metadata.tier_pricing
      : [],
    crossSells: Array.isArray(p.metadata?.cross_sells)
      ? p.metadata.cross_sells
      : [],
  }
}
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
  return p.reviewCount >= 5 && p.rating >= 4
}
export function matchesBadgeFilter(p: Product, badge: string): boolean {
  const b = badge.trim().toUpperCase()
  if (b === 'SALE') return isOnSale(p)
  if (b === 'NEW') return isNewArrival(p)
  if (b === 'BESTSELLER') return isBestSeller(p)
  return p.badge?.trim().toUpperCase() === b
}
const SYSTEM_METADATA_KEYS = new Set([
  'brand',
  'sport',
  'badge',
  'tags',
  'specs',
  'specifications',
  'string_upgrade_available',
  'string_upgrade_type',
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
  'ogImage',
  'tier_pricing',
  'cross_sells',
  'service_type',
  'service_sport',
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
function extractSpecs(metadata: any): {
  label: string
  value: string
}[] {
  if (!metadata) return []
  if (Array.isArray(metadata.specs) && metadata.specs.length > 0) {
    return metadata.specs
  }
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
      next: {
        revalidate: 300,
      },
    })
    if (!res.ok) {
      cachedRegionId = null
      return null
    }
    const data = await res.json()
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
  light?: boolean,
) {
  const isServer = typeof window === 'undefined'
  const base = isServer
    ? `${process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL ?? 'http://localhost:9000'}/store/products`
    : '/api/store/products'
  const sp = new URLSearchParams()
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== '') sp.set(k, v)
  })
  if (isServer) {
    sp.set(
      'fields',
      light ? STORE_PRODUCT_LISTING_FIELDS : STORE_PRODUCT_FIELDS,
    )
    if (regionId) sp.set('region_id', regionId)
  } else if (light) {
    sp.set('light', '1')
  }
  return `${base}?${sp.toString()}`
}
async function fetchProducts(
  params: Record<string, string | undefined>,
  light?: boolean,
) {
  const isServer = typeof window === 'undefined'
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  }
  if (isServer) {
    headers['x-publishable-api-key'] =
      process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY ?? ''
  }
  const regionId = isServer ? await getServerRegionId() : null
  const url = buildProductUrl(params, regionId, light)
  const label = `[fetchProducts] ${params.handle ?? params.id ?? params.q ?? 'list'} offset=${params.offset ?? '0'} limit=${params.limit ?? '?'} light=${!!light}`
  const t0 = Date.now()
  const res = await fetch(url, {
    headers,
    ...(isServer
      ? {
          next: {
            revalidate: 60,
          },
        }
      : {}),
  })
  if (!res.ok) {
    console.warn(
      `${label} FAILED after ${Date.now() - t0}ms — HTTP ${res.status}`,
    )
    const err = await res.json().catch(() => ({}))
    throw new Error(err.error ?? `HTTP ${res.status}`)
  }
  const json = await res.json()
  const elapsed = Date.now() - t0
  if (elapsed > 1000) {
    console.warn(`${label} — ${elapsed}ms (SLOW)`)
  } else {
  }
  return json
}
export async function getProducts(params?: {
  limit?: number
  offset?: number
  q?: string
  category_id?: string[]
  category_handle?: string
  light?: boolean
}): Promise<{
  products: any[]
  count: number
}> {
  const data = await fetchProducts(
    {
      limit: String(params?.limit ?? 20),
      offset: String(params?.offset ?? 0),
      q: params?.q,
      category_id: params?.category_id?.join(','),
      category_handle: params?.category_handle,
    },
    params?.light,
  )
  return {
    products: data.products ?? [],
    count: data.count ?? 0,
  }
}
export async function getProduct(handle: string) {
  const data = await fetchProducts({
    handle,
    limit: '1',
  })
  return data.products?.[0] ?? null
}
const PRODUCTS_PAGE_SIZE = 100
export async function getAllProducts(params?: {
  q?: string
  category_id?: string[]
  category_handle?: string
}): Promise<{
  products: any[]
  count: number
}> {
  const { count } = await getProducts({
    ...params,
    limit: 1,
    offset: 0,
    light: true,
  })
  if (count === 0)
    return {
      products: [],
      count: 0,
    }
  const offsets: number[] = []
  for (let o = 0; o < count; o += PRODUCTS_PAGE_SIZE) {
    offsets.push(o)
  }
  const CONCURRENCY = 5
  const pages: {
    products: any[]
    count: number
  }[] = []
  for (let i = 0; i < offsets.length; i += CONCURRENCY) {
    const batch = offsets.slice(i, i + CONCURRENCY)
    const batchResults = await Promise.all(
      batch.map((offset) =>
        getProducts({
          ...params,
          limit: PRODUCTS_PAGE_SIZE,
          offset,
          light: true,
        }),
      ),
    )
    pages.push(...batchResults)
  }
  const products = ([] as any[]).concat(...pages.map((p) => p.products))
  return {
    products,
    count,
  }
}
const FIRST_BATCH_SIZE = 96
export async function getAllProductsProgressive(
  params:
    | {
        q?: string
        category_id?: string[]
        category_handle?: string
      }
    | undefined,
  handlers: {
    onFirstBatch: (result: { products: any[]; count: number }) => void
    onMore: (moreProducts: any[]) => void
    onDone?: () => void
  },
  signal?: {
    cancelled: boolean
  },
): Promise<void> {
  const first = await getProducts({
    ...params,
    limit: FIRST_BATCH_SIZE,
    offset: 0,
    light: true,
  })
  if (signal?.cancelled) return
  handlers.onFirstBatch(first)
  if (first.count <= first.products.length) {
    handlers.onDone?.()
    return
  }
  const offsets: number[] = []
  for (let o = FIRST_BATCH_SIZE; o < first.count; o += PRODUCTS_PAGE_SIZE) {
    offsets.push(o)
  }
  const CONCURRENCY = 5
  for (let i = 0; i < offsets.length; i += CONCURRENCY) {
    if (signal?.cancelled) return
    const batch = offsets.slice(i, i + CONCURRENCY)
    const batchResults = await Promise.all(
      batch.map((offset) =>
        getProducts({
          ...params,
          limit: PRODUCTS_PAGE_SIZE,
          offset,
          light: true,
        }),
      ),
    )
    if (signal?.cancelled) return
    handlers.onMore(
      ([] as any[]).concat(...batchResults.map((p) => p.products)),
    )
  }
  handlers.onDone?.()
}
export async function getProductsByIds(ids: string[]): Promise<any[]> {
  if (ids.length === 0) return []
  const data = await fetchProducts({
    id: ids.join(','),
    limit: String(ids.length),
  })
  return data.products ?? []
}
export async function getSiteReviews(): Promise<
  import('@/types').SiteReview[]
> {
  const res = await fetch('/api/store/reviews')
  if (!res.ok) return []
  const data = await res.json()
  return data.reviews ?? []
}
export interface BrandStats {
  brands: {
    name: string
    count: number
  }[]
  brandCount: number
  productCount: number
  avgRating: number | null
  bySport: Record<
    string,
    {
      productCount: number
      brandCount: number
    }
  >
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
export async function createCart() {
  const res = await fetch('/api/store/cart', {
    method: 'POST',
    credentials: 'include',
  })
  const data = await res.json()
  if (!res.ok)
    throw new Error(data.message ?? data.error ?? 'Failed to create cart')
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
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include',
    body: JSON.stringify({
      cartId,
      variant_id: variantId,
      quantity,
      metadata,
    }),
  })
  const data = await res.json()
  if (!res.ok)
    throw new Error(data.message ?? data.error ?? 'Failed to add item')
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
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include',
    body: JSON.stringify({
      cartId,
      lineItemId,
    }),
  })
}
export async function updateCartItem(
  cartId: string,
  lineItemId: string,
  quantity: number,
) {
  const res = await fetch('/api/store/cart/items', {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include',
    body: JSON.stringify({
      cartId,
      lineItemId,
      quantity,
    }),
  })
  const data = await res.json()
  return data.cart
}
export async function getCustomerOrders() {
  const res = await fetch('/api/store/orders', {
    credentials: 'include',
  })
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
  items: {
    item_id: string
    quantity: number
  }[],
  reason: string,
  note?: string,
) {
  const res = await fetch(`/api/store/orders/${orderId}/return-request`, {
    method: 'POST',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      items,
      reason,
      note,
    }),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok)
    throw new Error(
      data.message ?? data.error ?? 'Failed to submit return request',
    )
  return data
}
async function checkoutAction(
  action: string,
  cartId: string,
  extra?: Record<string, any>,
) {
  const res = await fetch('/api/store/checkout', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include',
    body: JSON.stringify({
      action,
      cartId,
      ...extra,
    }),
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
  email?: string,
) {
  const res = await fetch('/api/store/cart', {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include',
    body: JSON.stringify({
      cartId,
      shipping_address: address,
      billing_address: billingAddress ?? address,
      ...(email
        ? {
            email,
          }
        : {}),
    }),
  })
  const data = await res.json()
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
import type { CustomerAddress } from '@/types'
export async function getAddresses(): Promise<CustomerAddress[]> {
  const res = await fetch('/api/store/addresses', {
    credentials: 'include',
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data?.error ?? 'Failed to load addresses')
  return data.addresses ?? []
}
export async function addAddress(address: Omit<CustomerAddress, 'id'>) {
  const res = await fetch('/api/store/addresses', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
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
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include',
    body: JSON.stringify({
      addressId,
      ...address,
    }),
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
export async function changePassword(oldPassword: string, newPassword: string) {
  const res = await fetch('/api/auth/change-password', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
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
export async function updateProfile(fields: {
  first_name?: string
  last_name?: string
  phone?: string
}) {
  const res = await fetch('/api/auth/customer-profile', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include',
    body: JSON.stringify(fields),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data?.error ?? 'Failed to update profile')
  return data
}
export async function getWishlist(): Promise<string[]> {
  const res = await fetch('/api/auth/customer-wishlist', {
    credentials: 'include',
  })
  if (!res.ok) {
    if (res.status === 401) return []
    throw new Error('Failed to load wishlist')
  }
  const data = await res.json()
  return Array.isArray(data?.productIds) ? data.productIds : []
}
export async function saveWishlist(productIds: string[]) {
  const res = await fetch('/api/auth/customer-wishlist', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include',
    body: JSON.stringify({
      productIds,
    }),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data?.error ?? 'Failed to save wishlist')
  return data
}
