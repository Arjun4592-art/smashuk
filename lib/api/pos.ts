import {
  saveIndexSnapshot,
  loadIndexSnapshot,
  saveDetailEntries,
  loadDetailEntries,
} from '@/lib/pos/offline-cache'

export interface POSProduct {
  id: string
  name: string
  brand: string
  sku: string
  price: number
  stock: number
  /**
   * True only in the brief window between the fast phase rendering this
   * product and fetchPOSStockUpdates/mergePOSStock resolving with its real
   * count. `stock` holds an optimistic placeholder while this is true — UI
   * that shows an exact number (Products tab) should show a neutral
   * "checking" state instead of that placeholder number; UI that just
   * gates "can this be added" (billing) doesn't need to check this at all,
   * since POS already allows selling regardless of stock.
   */
  stockPending?: boolean
  category: string
  image?: string
  description?: string
  channel: 'both' | 'online_only' | 'pos_only'
  variantId: string
  medusaVariantId: string
  size?: string
  sizeOptionTitle?: string
}
export interface POSCustomer {
  id: string
  name: string
  email?: string
  phone?: string
  totalOrders: number
  totalSpent: number
  marketingOptIn: boolean
}
export interface CreatePOSOrderPayload {
  items: {
    variant_id: string
    quantity: number
    product_id?: string
  }[]
  customer_id?: string
  customer_email?: string
  customer_name?: string
  customer_phone?: string
  payment_method: string
  note?: string
  cashier: string
  region_id: string
  stripe_payment_intent_id?: string
  stripe_payment_amount?: number
  fulfillment_type?: 'pickup' | 'ship'
  /** Only used when fulfillment_type is 'ship'. Defaults to standard. */
  shipping_speed?: 'standard' | 'express'
  shipping_address?: {
    first_name: string
    last_name: string
    address_1: string
    address_2?: string
    city: string
    province?: string
    postal_code: string
    country_code: string
    phone?: string
  }
  shipping_option_id?: string
  gift_card_code?: string
  /** Coupon code applied at POS — validated and applied against the real
   * Medusa cart during order creation, same as website checkout. */
  coupon_code?: string
  /** Manual (%/£) discount amount in pounds, already resolved by the POS UI.
   * Applied to the real Medusa cart as a one-off order-level discount so the
   * synced order total matches what the customer was actually charged. */
  manual_discount_amount?: number
  /** Cash+card split breakdown, so a reprinted receipt (dashboard or POS)
   * can show the same "Cash £x / Card £y" lines as the original. */
  split_payments?: {
    method: 'cash' | 'card'
    amount: number
  }[]
}
function extractPrice(variant: any, productMetadata: any): number {
  const gbpPrice = variant?.prices?.find(
    (pr: any) => pr.currency_code === 'gbp',
  )?.amount
  if (gbpPrice != null && gbpPrice > 0) {
    return Math.round(gbpPrice * 100) / 100
  }
  const anyPrice = variant?.prices?.[0]?.amount
  if (anyPrice != null && anyPrice > 0) {
    return Math.round(anyPrice * 100) / 100
  }
  const metaSale = parseFloat(productMetadata?.sale_price ?? '0')
  if (metaSale > 0) return metaSale
  const metaRegular = parseFloat(productMetadata?.regular_price ?? '0')
  if (metaRegular > 0) return metaRegular
  return 0
}
function extractStock(variant: any): number {
  const invItem = variant?.inventory_items?.[0]
  if (invItem) {
    const levels = invItem?.inventory?.location_levels
    if (Array.isArray(levels) && levels.length > 0) {
      return levels.reduce(
        (sum: number, l: any) =>
          sum + (l.available_quantity ?? l.stocked_quantity ?? 0),
        0,
      )
    }
    const stocked = invItem?.inventory?.stocked_quantity
    if (stocked != null) return stocked
  }
  return variant?.inventory_quantity ?? 0
}
// Variant size (or grip/weight — whatever the product's distinguishing
// dimension is) comes from the variant's own option values, e.g.
// variant.options: [{ option: { title: 'Size (UK)' }, value: '8' }].
// Only an option whose title actually describes a size-like dimension
// counts — NOT just "whatever the one option happens to be". Gift cards
// have a single option called "Denomination" (£10, £25...), overgrips and
// strings have single options like "Colour" or a gauge number — treating
// those as "the size" was dumping prices and stray numbers into the size
// filter. So we only match titles that look like Size / Size (UK) / Weight
// / Grip Size — the known vocabulary this catalog actually uses for sizing
// (see the comment in lib/api/store.ts listing the real Shopify options:
// Size, Grip Size, Size (UK), Weight, Colour, ...).
const SIZE_LIKE_OPTION_TITLE = /size|weight|grip/i
// Catalog data isn't consistently formatted — the same weight/size can be
// entered as "4U (80-84g)" on one product and "4U(80-84g)" (no space before
// the bracket) on another, most likely from CSV imports done at different
// times. Left as-is, those become two separate filter chips for what a
// customer would consider the same size. Normalize whitespace so they
// collapse into one.
function normalizeSizeLabel(raw: string): string {
  return raw.trim().replace(/\s+/g, ' ').replace(/\s*\(/g, ' (')
}
/**
 * A variant can carry MORE THAN ONE size-like dimension at once — e.g. a
 * racket variant distinguished by both Weight ("4U") AND Grip Size ("G4")
 * as two separate options on the same variant. The previous version used
 * `.find()` (first match only), so a variant with two such dimensions was
 * only ever discoverable under whichever one happened to come first in
 * Medusa's array — the other silently never matched any filter.
 * `.filter()` returns all of them; mapProductToPOSVariants below turns
 * each into its own POSProduct card (same variant/SKU, since POSProduct's
 * shape only holds one size label at a time) so every dimension is
 * filterable.
 */
function extractSizeDimensions(
  variant: any,
): { title: string; value: string }[] {
  const options = variant?.options
  if (!Array.isArray(options)) return []
  return options
    .filter((o: any) => SIZE_LIKE_OPTION_TITLE.test(o?.option?.title ?? ''))
    .filter((o: any) => o?.value)
    .map((o: any) => ({
      title: String(o.option.title).trim(),
      value: normalizeSizeLabel(String(o.value)),
    }))
}
// One product can have several variants (e.g. one per shoe size) — each
// becomes its own sellable POS card so staff can quick-filter and add the
// exact size a customer wants, instead of only ever seeing/selling the
// first variant Medusa happens to return.
// Placeholder stock used only during the fast phase, where the response
// carries no inventory data at all (FAST_FIELDS deliberately excludes the
// inventory join — see app/api/pos/products/route.ts). Optimistic on
// purpose: POS already lets staff sell an item Medusa shows as genuinely
// out of stock (see ensureBackorderAllowed in app/api/pos/orders/route.ts),
// so a brief "looks available" beats a brief, WRONG "out of stock" that
// could stop a cashier ringing up something actually sitting on the shelf.
// Real numbers land a moment later via fetchPOSStockUpdates + mergePOSStock.
const STOCK_PENDING_PLACEHOLDER = 9999
// Ported from lib/api/store.ts's pickCategory (the storefront's fix for a
// known Medusa data issue — see app/api/pos/index/route.ts for the full
// explanation). Products can be linked to both a generic "Rackets"
// category and their real, specific one (e.g. "Badminton Rackets"), and
// Medusa doesn't guarantee array order, so picking categories[0] blindly
// put a chunk of racket products under the wrong bucket.
const SPORT_CATEGORY_SLUGS = new Set([
  'badminton',
  'tennis',
  'padel',
  'squash',
  'clothing',
])
function pickCategoryName(categories: any[] | undefined): string {
  if (!categories || categories.length === 0) return 'Uncategorized'
  const specificOnes = categories.filter(
    (c: any) => c?.handle && !SPORT_CATEGORY_SLUGS.has(c.handle),
  )
  const preferred =
    specificOnes.find((c: any) => !/rackets?$/i.test(c.handle ?? '')) ??
    specificOnes[0]
  const chosen = preferred ?? categories[0]
  return chosen?.name ?? 'Uncategorized'
}
function mapProductToPOSVariants(
  p: any,
  stockPlaceholder?: number,
): POSProduct[] {
  const variants = Array.isArray(p.variants) ? p.variants : []
  return variants.flatMap((variant: any): POSProduct[] => {
    if (!variant?.id) return []
    const price = extractPrice(variant, p.metadata)
    const stock = stockPlaceholder ?? extractStock(variant)
    const base = {
      id: p.id,
      name: p.title ?? 'Unknown Product',
      brand: p.metadata?.brand ?? 'Unknown',
      sku: variant?.sku ?? `${p.id}-${variant.id}`,
      price,
      stock,
      stockPending: stockPlaceholder !== undefined,
      category: pickCategoryName(p.categories),
      image: p.thumbnail ?? p.images?.[0]?.url ?? undefined,
      description: p.description ?? undefined,
      channel: (p.metadata?.channel as any) ?? 'both',
      variantId: variant.id,
      medusaVariantId: variant.id,
    }
    const dims = extractSizeDimensions(variant)
    // No size-like option at all — one plain card, same as before.
    if (dims.length === 0) {
      return [{ ...base, size: undefined, sizeOptionTitle: undefined }]
    }
    // One card PER dimension so each is independently filterable/findable
    // (e.g. the same racket variant shows once under "Weight" and once
    // under "Grip Size") — same underlying variant/SKU either way, so
    // adding either card to a sale sells the exact same real item.
    return dims.map((d) => ({
      ...base,
      size: d.value,
      sizeOptionTitle: d.title,
    }))
  })
}
async function fetchPosProductsPage(qs: string): Promise<{ products: any[] }> {
  const res = await fetch(`/api/pos/products${qs}`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
  })
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({
      error: 'Unknown error',
    }))
    console.error('[POS] API Error Response:', errorData)
    throw new Error(
      errorData.error || `HTTP ${res.status}: Products fetch failed`,
    )
  }
  const data = await res.json()
  if (!data.products || !Array.isArray(data.products)) {
    console.warn('[POS] Invalid products response:', data)
    return { products: [] }
  }
  return data
}
/**
 * PERF — the register-usable data. No inventory join, so this is the fast
 * ~55s-of-cost-free half of what used to be one combined request. Stock on
 * the returned items is a placeholder (see mapProductToPOSVariants) —
 * call fetchPOSStockUpdates right after and merge with mergePOSStock.
 */
export async function fetchPOSProductsFast(
  force = false,
): Promise<POSProduct[]> {
  try {
    const data = await fetchPosProductsPage(
      `?phase=fast${force ? '&force=1' : ''}`,
    )
    return (data.products as any[]).flatMap((p) =>
      mapProductToPOSVariants(p, STOCK_PENDING_PLACEHOLDER),
    )
  } catch (err: unknown) {
    console.error('[POS] fetchPOSProductsFast Error:', err)
    throw new Error(
      err instanceof Error ? err.message : 'Failed to fetch products',
    )
  }
}
/**
 * PERF — the slow half: real stock, via the deep inventory join. Returns a
 * lookup by variant id rather than full products, since that's all the
 * caller needs to merge into what fetchPOSProductsFast already rendered.
 */
export async function fetchPOSStockUpdates(
  force = false,
): Promise<Map<string, number>> {
  const data = await fetchPosProductsPage(
    `?phase=stock${force ? '&force=1' : ''}`,
  )
  const stockByVariantId = new Map<string, number>()
  for (const p of data.products as any[]) {
    for (const variant of p.variants ?? []) {
      if (variant?.id) stockByVariantId.set(variant.id, extractStock(variant))
    }
  }
  return stockByVariantId
}
/** Applies a fetchPOSStockUpdates() result onto an existing POSProduct list. */
export function mergePOSStock(
  products: POSProduct[],
  stockByVariantId: Map<string, number>,
): POSProduct[] {
  return products.map((p) => {
    const stock = stockByVariantId.get(p.variantId)
    return stock === undefined ? p : { ...p, stock, stockPending: false }
  })
}
/**
 * @deprecated Combined fast+stock in one request — this is the original,
 * slow, single-phase load. Kept only in case something still needs one
 * complete response in a single call. New code should use
 * fetchPOSProductsFast + fetchPOSStockUpdates so the register can render
 * before stock is known.
 */
export async function fetchPOSProducts(force = false): Promise<POSProduct[]> {
  try {
    const data = await fetchPosProductsPage(force ? '?force=1' : '')
    return (data.products as any[]).flatMap(mapProductToPOSVariants)
  } catch (err: unknown) {
    console.error('[POS] fetchPOSProducts Error:', err)
    throw new Error(
      err instanceof Error ? err.message : 'Failed to fetch products',
    )
  }
}
export async function fetchPOSCustomers(
  search?: string,
): Promise<POSCustomer[]> {
  try {
    const url = new URL('/api/admin/customers', window.location.origin)
    url.searchParams.set('limit', '50')
    if (search) url.searchParams.set('q', search)
    const res = await fetch(url.toString(), {
      credentials: 'include',
    })
    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      throw new Error(err.error ?? err.message ?? 'Customers fetch failed')
    }
    const data = await res.json()
    return (data.customers ?? []).map((c: any) => ({
      id: c.id,
      name:
        `${c.first_name ?? ''} ${c.last_name ?? ''}`.trim() ||
        c.email ||
        'Unknown',
      email: c.email ?? undefined,
      phone: c.phone ?? undefined,
      totalOrders: c.orders?.length ?? 0,
      totalSpent: c.orders_total_spent ?? 0,
      marketingOptIn: c.has_account ?? false,
    }))
  } catch (err: unknown) {
    console.error('[POS] fetchPOSCustomers Error:', err)
    throw new Error(
      err instanceof Error ? err.message : 'Failed to fetch customers',
    )
  }
}
export async function createPOSCustomer(customerData: {
  first_name: string
  last_name?: string
  email?: string
  phone?: string
}): Promise<any> {
  try {
    const res = await fetch('/api/admin/customers', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify(customerData),
    })
    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      throw new Error(err.error ?? err.message ?? 'Customer create failed')
    }
    return (await res.json()).customer
  } catch (err: unknown) {
    console.error('[POS] createPOSCustomer Error:', err)
    throw new Error(
      err instanceof Error ? err.message : 'Failed to create customer',
    )
  }
}
export async function createPOSOrder(
  payload: CreatePOSOrderPayload,
): Promise<{ order: any; trackingToken?: string }> {
  try {
    const res = await fetch('/api/pos/orders', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    })
    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      throw new Error(err.error ?? err.message ?? 'Order create failed')
    }
    const data = await res.json()
    return { order: data.order, trackingToken: data.trackingToken }
  } catch (err: unknown) {
    console.error('[POS] createPOSOrder Error:', err)
    throw new Error(
      err instanceof Error ? err.message : 'Failed to create order',
    )
  }
}
export interface PosOrderLineItem {
  product: {
    id: string
    lineItemId: string
    name: string
    brand: string
    price: number
    variantTitle?: string | null
  }
  quantity: number
}
export interface PosOrderRecord {
  id: string
  medusaOrderId: string
  items: PosOrderLineItem[]
  customer: {
    name: string
    phone?: string
    email?: string
  } | null
  subtotal: number
  discountTotal: number
  shippingTotal: number
  giftCardTotal: number
  giftCardCode: string | null
  tax: number
  total: number
  paymentMethod: string
  note: string
  cashier: string
  completedAt: string
  returned: boolean
  isPickup: boolean
  fulfillmentStatus: string
  // Same signed token a brand-new sale gets back from createPOSOrder — lets
  // a reprinted receipt's QR / tracking link work like the original.
  trackingToken: string
  splitPayments:
    | {
        method: 'cash' | 'card'
        amount: number
      }[]
    | null
  shippingAddress: {
    name: string
    address1: string
    address2: string
    city: string
    postalCode: string
  } | null
}
// Full order detail for the POS terminal's order view/receipt page — same
// data shape as the dashboard's getOrder(), but reachable from a plain POS
// PIN session (see app/api/pos/orders/[id]/route.ts GET).
export async function fetchPOSOrder(id: string): Promise<any> {
  const res = await fetch(`/api/pos/orders/${encodeURIComponent(id)}`, {
    credentials: 'include',
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    throw new Error(data.error ?? 'Failed to load order')
  }
  return data.order
}
export async function fetchPOSOrderHistory(
  limit = 150,
): Promise<PosOrderRecord[]> {
  try {
    const res = await fetch(`/api/pos/orders?limit=${limit}`, {
      credentials: 'include',
    })
    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      throw new Error(err.error ?? 'Failed to load order history')
    }
    const data = await res.json()
    return data.orders ?? []
  } catch (err: unknown) {
    console.error('[POS] fetchPOSOrderHistory Error:', err)
    throw new Error(
      err instanceof Error ? err.message : 'Failed to load order history',
    )
  }
}
export async function markPOSOrderReturned(
  medusaOrderId: string,
  reason: string,
  items: {
    item_id: string
    quantity: number
  }[],
  refundAmount?: number,
): Promise<{
  refund_amount: number
}> {
  try {
    const res = await fetch(`/api/pos/orders/${medusaOrderId}`, {
      method: 'PATCH',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        reason,
        items,
        ...(refundAmount !== undefined ? { refundAmount } : {}),
      }),
    })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) {
      throw new Error(data.error ?? 'Failed to process return')
    }
    return {
      refund_amount: data.refund_amount ?? 0,
    }
  } catch (err: unknown) {
    console.error('[POS] markPOSOrderReturned Error:', err)
    throw new Error(
      err instanceof Error ? err.message : 'Failed to process return',
    )
  }
}
export async function fetchDefaultRegion(): Promise<string | null> {
  try {
    const res = await fetch('/api/pos/region')
    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      throw new Error(err.error ?? err.message ?? 'Region fetch failed')
    }
    const data = await res.json()
    return data.regionId ?? null
  } catch (err: unknown) {
    console.error('[POS] fetchDefaultRegion Error:', err)
    throw new Error(
      err instanceof Error ? err.message : 'Failed to fetch region',
    )
  }
}
export interface CouponValidationResult {
  valid: boolean
  code?: string
  type?: 'percentage' | 'fixed'
  value?: number
  reason?:
    'not_started' | 'expired' | 'min_amount' | 'min_quantity' | 'customer_group'
}
export interface CouponValidationContext {
  /** Cart subtotal in pounds (not pence) — matches how POS stores prices. */
  subtotal?: number
  /** Total item quantity in the cart. */
  quantity?: number
  /** Medusa customer id attached to the sale, if any. */
  customerId?: string
}
export async function validateCoupon(
  code: string,
  context: CouponValidationContext = {},
): Promise<CouponValidationResult> {
  try {
    const searchParams = new URLSearchParams({ code })
    if (context.subtotal != null)
      searchParams.set('subtotal', String(context.subtotal))
    if (context.quantity != null)
      searchParams.set('quantity', String(context.quantity))
    if (context.customerId) searchParams.set('customerId', context.customerId)
    const res = await fetch(
      `/api/pos/coupons/validate?${searchParams.toString()}`,
    )
    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      throw new Error(err.error ?? 'Coupon validation failed')
    }
    return await res.json()
  } catch (err: unknown) {
    console.error('[POS] validateCoupon Error:', err)
    throw new Error(
      err instanceof Error ? err.message : 'Failed to validate coupon',
    )
  }
}
export interface GiftCardValidationResult {
  valid: boolean
  code?: string
  balance?: number
  currency_code?: string
  reason?: 'already_redeemed' | 'expired'
}
export async function validateGiftCard(
  code: string,
): Promise<GiftCardValidationResult> {
  try {
    const res = await fetch(
      `/api/pos/gift-cards/validate?code=${encodeURIComponent(code)}`,
    )
    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      throw new Error(err.error ?? 'Gift card validation failed')
    }
    return await res.json()
  } catch (err: unknown) {
    console.error('[POS] validateGiftCard Error:', err)
    throw new Error(
      err instanceof Error ? err.message : 'Failed to validate gift card',
    )
  }
}
export interface EmailReceiptPayload {
  orderId: string
  email: string
  items: {
    id: string
    name: string
    price: number
    quantity: number
  }[]
  subtotal: number
  discountAmount: number
  tax: number
  total: number
  payMethod: string
  splitPayments?:
    | {
        method: string
        amount: number
      }[]
    | null
  cashier: string
}
export async function emailPOSReceipt(payload: EmailReceiptPayload): Promise<{
  sent: boolean
}> {
  try {
    const res = await fetch('/api/pos/receipt/email', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify(payload),
    })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) {
      throw new Error(data.error ?? 'Failed to email receipt')
    }
    return {
      sent: data.sent !== false,
    }
  } catch (err: unknown) {
    console.error('[POS] emailPOSReceipt Error:', err)
    throw new Error(
      err instanceof Error ? err.message : 'Failed to email receipt',
    )
  }
}
// ──────────────────────────────────────────────────────────────────────
// Search-index architecture for the billing screen (see
// app/api/pos/index/route.ts for the full reasoning — short version:
// Medusa's admin q= search doesn't cover variant SKU, which barcode
// scanning depends on, so search/scan/category/size filtering all run
// over this tiny index client-side instead of relying on that).
// ──────────────────────────────────────────────────────────────────────
export interface POSSizeDimension {
  title: string
  value: string
}
export interface POSIndexEntry {
  productId: string
  variantId: string
  sku: string
  /** EAN / barcode — scanned codes match against these before SKU. */
  ean?: string
  barcode?: string
  name: string
  brand: string
  category: string
  /** Every size-like dimension this variant has — usually one, sometimes more. */
  sizes: POSSizeDimension[]
}
export interface POSDetailEntry {
  productId: string
  variantId: string
  price: number
  stock: number
  image?: string
  channel: 'both' | 'online_only' | 'pos_only'
}
/** The full name/sku/category/size index — small, cacheable, fetched once. */
export interface POSIndexResult {
  entries: POSIndexEntry[]
  /** True when this came from the local offline cache, not a live fetch. */
  fromCache: boolean
  /** ms-epoch the cached copy was last successfully refreshed, if offline. */
  cachedAt: number | null
}
/**
 * The name/sku/category/size index — small, cacheable, fetched once.
 *
 * On success, silently mirrors the result into IndexedDB. On failure (the
 * shop's own connection is down, not just Medusa being slow — a genuinely
 * unreachable /api/pos/index request), falls back to that mirror instead of
 * leaving the billing screen with nothing to search. The caller (billing
 * page) uses `fromCache`/`cachedAt` to show a clear "you're offline, this
 * may be a few minutes old" banner — this must never be silent, since
 * staff need to know they might be looking at a stale catalogue.
 */
export async function fetchPOSIndex(): Promise<POSIndexResult> {
  try {
    const res = await fetch('/api/pos/index', { method: 'GET' })
    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}))
      throw new Error(
        errorData.error || `HTTP ${res.status}: Index fetch failed`,
      )
    }
    const data = await res.json()
    const entries: POSIndexEntry[] = Array.isArray(data.entries)
      ? data.entries
      : []
    void saveIndexSnapshot(entries)
    return { entries, fromCache: false, cachedAt: null }
  } catch (err) {
    const cached = await loadIndexSnapshot()
    if (cached && cached.entries.length > 0) {
      console.error(
        '[POS] Index fetch failed, using offline cache from',
        new Date(cached.savedAt ?? 0).toISOString(),
        err,
      )
      return {
        entries: cached.entries as POSIndexEntry[],
        fromCache: true,
        cachedAt: cached.savedAt,
      }
    }
    throw err
  }
}
export interface POSDetailsResult {
  byVariantId: Map<string, POSDetailEntry>
  fromCache: boolean
  cachedAt: number | null
}
/**
 * Live price + stock for a SPECIFIC, narrow set of product ids — whatever
 * the current search/category/size filter over the index actually matched.
 * Never call this with the whole catalogue's ids; it exists specifically
 * because that's expensive and this isn't, for a small id list.
 *
 * On success, mirrors each result into IndexedDB (keyed by variant, with a
 * timestamp). On failure, falls back to whatever's cached for the
 * requested variants — which may be incomplete (a variant never
 * successfully fetched before simply won't be in the result, same as
 * "still loading" to every caller, so it correctly stays in the neutral
 * pending state rather than showing a fabricated price). `fromCache` /
 * `cachedAt` tell the caller to show an offline banner — this must never
 * be silent, since a stale PRICE (unlike stock, which is already advisory
 * everywhere in this app) could genuinely be wrong.
 */
export async function fetchPOSDetails(
  productIds: string[],
): Promise<POSDetailsResult> {
  if (productIds.length === 0) {
    return { byVariantId: new Map(), fromCache: false, cachedAt: null }
  }
  const unique = Array.from(new Set(productIds))
  try {
    const res = await fetch(
      `/api/pos/details?ids=${unique.map(encodeURIComponent).join(',')}`,
    )
    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}))
      throw new Error(
        errorData.error || `HTTP ${res.status}: Details fetch failed`,
      )
    }
    const data = await res.json()
    const byVariantId = new Map<string, POSDetailEntry>()
    const toCache: Record<string, POSDetailEntry> = {}
    for (const entry of (data.entries ?? []) as POSDetailEntry[]) {
      byVariantId.set(entry.variantId, entry)
      toCache[entry.variantId] = entry
    }
    void saveDetailEntries(toCache)
    return { byVariantId, fromCache: false, cachedAt: null }
  } catch (err) {
    console.error('[POS] Details fetch failed, trying offline cache:', err)
    // We don't have the variant ids up front (only product ids), so pull
    // whatever's cached under EACH requested product id's variants isn't
    // possible without the index — instead, the cache is keyed by variant
    // id directly (see saveDetailEntries above), so ask for exactly the
    // variant ids the caller actually needs. Callers of fetchPOSDetails
    // only have product ids at this point, so this cache lookup is done
    // per-variant by the caller instead — see fetchPOSDetailsForVariants
    // below, which billing/page.tsx uses for the cache-aware path.
    throw err
  }
}
/**
 * Same as fetchPOSDetails, but keyed by variant id (not product id) so a
 * failed network call can fall back to exactly the cached variants it
 * needs. Use this from UI code; fetchPOSDetails stays as the thinner
 * product-id-based primitive other callers may still want.
 */
export async function fetchPOSDetailsForVariants(
  productIds: string[],
  variantIds: string[],
): Promise<POSDetailsResult> {
  try {
    return await fetchPOSDetails(productIds)
  } catch (err) {
    const cached = await loadDetailEntries(variantIds)
    if (cached.size === 0) throw err
    const byVariantId = new Map<string, POSDetailEntry>()
    let oldestSavedAt: number | null = null
    for (const [variantId, { detail, savedAt }] of cached) {
      byVariantId.set(variantId, detail as POSDetailEntry)
      if (oldestSavedAt === null || savedAt < oldestSavedAt) {
        oldestSavedAt = savedAt
      }
    }
    return { byVariantId, fromCache: true, cachedAt: oldestSavedAt }
  }
}
