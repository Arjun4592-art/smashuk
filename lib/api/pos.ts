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
function extractVariantSize(variant: any): string | undefined {
  const options = variant?.options
  if (!Array.isArray(options)) return undefined
  const sizeOpt = options.find((o: any) =>
    SIZE_LIKE_OPTION_TITLE.test(o?.option?.title ?? ''),
  )
  if (sizeOpt?.value) return normalizeSizeLabel(String(sizeOpt.value))
  return undefined
}
// Same lookup as extractVariantSize, but also returns which option
// (Size / Size (UK) / Weight / Grip Size...) the value came from, so the
// POS filter can group values by their actual option type instead of
// dumping UK shoe sizes, badminton racket weights and grip sizes into one
// flat mixed list.
function extractSizeOptionTitle(variant: any): string | undefined {
  const options = variant?.options
  if (!Array.isArray(options)) return undefined
  const sizeOpt = options.find((o: any) =>
    SIZE_LIKE_OPTION_TITLE.test(o?.option?.title ?? ''),
  )
  const title = sizeOpt?.option?.title
  return title ? String(title).trim() : undefined
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
function mapProductToPOSVariants(
  p: any,
  stockPlaceholder?: number,
): POSProduct[] {
  const variants = Array.isArray(p.variants) ? p.variants : []
  return variants
    .map((variant: any): POSProduct | null => {
      if (!variant?.id) return null
      const price = extractPrice(variant, p.metadata)
      const stock = stockPlaceholder ?? extractStock(variant)
      return {
        id: p.id,
        name: p.title ?? 'Unknown Product',
        brand: p.metadata?.brand ?? 'Unknown',
        sku: variant?.sku ?? `${p.id}-${variant.id}`,
        price,
        stock,
        stockPending: stockPlaceholder !== undefined,
        category: p.categories?.[0]?.name ?? 'Uncategorized',
        image: p.thumbnail ?? p.images?.[0]?.url ?? undefined,
        description: p.description ?? undefined,
        channel: (p.metadata?.channel as any) ?? 'both',
        variantId: variant.id,
        medusaVariantId: variant.id,
        size: extractVariantSize(variant),
        sizeOptionTitle: extractSizeOptionTitle(variant),
      }
    })
    .filter((v: POSProduct | null): v is POSProduct => v !== null)
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
  tax: number
  total: number
  paymentMethod: string
  note: string
  cashier: string
  completedAt: string
  returned: boolean
  isPickup: boolean
  fulfillmentStatus: string
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
