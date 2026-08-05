// lib/api/pos.ts
// ─────────────────────────────────────────────────────────────────────────────
// All POS API calls live here.
// Products → /api/pos/products (server-side JWT auth — token never reaches the client)
// Customers → /api/admin/customers (authorization header forward)
// Orders → /api/pos/orders (server-side JWT auth)
// Region → /api/pos/region (server-side JWT auth)
// ─────────────────────────────────────────────────────────────────────────────

// ── Types ────────────────────────────────────────────────────────────────────

export interface POSProduct {
  id: string
  name: string
  brand: string
  sku: string
  price: number // In pounds (not pence)
  stock: number
  category: string
  image?: string
  description?: string
  channel: 'both' | 'online_only' | 'pos_only'
  variantId: string
  medusaVariantId: string
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
  items: { variant_id: string; quantity: number }[]
  customer_id?: string
  customer_email?: string
  customer_name?: string
  customer_phone?: string
  payment_method: string
  note?: string
  cashier: string
  region_id: string
  stripe_payment_intent_id?: string
  // Pence amount the PaymentIntent above should have actually charged —
  // the server re-verifies this against Stripe itself before treating the
  // order as paid (see app/api/pos/orders/route.ts).
  stripe_payment_amount?: number
  // Buy-in-store, ship-to-customer: defaults to 'pickup' (the customer takes
  // the items with them right now — original/only behaviour). When 'ship',
  // shipping_address + shipping_option_id are required and the order gets a
  // real (non-pickup) shipping method instead of the default £0 pickup one.
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
  // Gift card redeemed against this sale (validated client-side first via
  // validateGiftCard). The server re-applies it to the real Medusa cart —
  // see app/api/pos/orders/route.ts — so the actual amount deducted always
  // comes from Medusa's own credit_lines, never from whatever the client sent.
  gift_card_code?: string
}

// ── Helper — extract price (Medusa v2 format) ────────────────────────────────

function extractPrice(variant: any, productMetadata: any): number {
  // 1. Look for GBP in the variant's prices array
  const gbpPrice = variant?.prices?.find(
    (pr: any) => pr.currency_code === 'gbp',
  )?.amount

  if (gbpPrice != null && gbpPrice > 0) {
    return Math.round(gbpPrice * 100) / 100
  }

  // 2. Fall back to whichever price comes first
  const anyPrice = variant?.prices?.[0]?.amount
  if (anyPrice != null && anyPrice > 0) {
    return Math.round(anyPrice * 100) / 100
  }

  // 3. Fall back to sale_price or regular_price from metadata
  const metaSale = parseFloat(productMetadata?.sale_price ?? '0')
  if (metaSale > 0) return metaSale

  const metaRegular = parseFloat(productMetadata?.regular_price ?? '0')
  if (metaRegular > 0) return metaRegular

  return 0
}

// ── Helper — extract stock (Medusa v2 inventory format) ─────────────────────

function extractStock(variant: any): number {
  // 1. stocked_quantity via inventory_items → inventory → location_levels
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

    // No location_levels — use stocked_quantity directly
    const stocked = invItem?.inventory?.stocked_quantity
    if (stocked != null) return stocked
  }

  // 2. Direct inventory_quantity (legacy format — fallback)
  return variant?.inventory_quantity ?? 0
}

// ── Helper — Medusa product → POS format ─────────────────────────────────────

function mapProductToPOS(p: any): POSProduct | null {
  // Take the first variant (POS shows one variant per product)
  const variant = p.variants?.[0]
  if (!variant) return null // no variant — skip

  const price = extractPrice(variant, p.metadata)
  const stock = extractStock(variant)

  // Out-of-stock products are never shown on the POS terminal — matches
  // the website's inStock filtering (ShopClient.tsx / HomePageProducts.tsx).
  // A cashier can't sell what isn't on the shelf, and letting them add it
  // to the cart just produces a failed checkout later.
  if (stock <= 0) return null

  return {
    id: p.id,
    name: p.title ?? 'Unknown Product',
    brand: p.metadata?.brand ?? 'Unknown',
    sku: variant?.sku ?? `${p.id}-${variant.id}`,
    price,
    stock,
    category: p.categories?.[0]?.name ?? 'Uncategorized',
    image: p.thumbnail ?? p.images?.[0]?.url ?? undefined,
    description: p.description ?? undefined,
    channel: (p.metadata?.channel as any) ?? 'both',
    variantId: variant.id,
    medusaVariantId: variant.id,
  }
}

// ── Products ──────────────────────────────────────────────────────────────────

export async function fetchPOSProducts(): Promise<POSProduct[]> {
  try {
    const res = await fetch('/api/pos/products', {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    })

    if (!res.ok) {
      const errorData = await res
        .json()
        .catch(() => ({ error: 'Unknown error' }))
      console.error('[POS] API Error Response:', errorData)
      throw new Error(
        errorData.error || `HTTP ${res.status}: Products fetch failed`,
      )
    }

    const data = await res.json()

    if (!data.products || !Array.isArray(data.products)) {
      console.warn('[POS] Invalid products response:', data)
      return []
    }

    const mapped = (data.products as any[])
      .map(mapProductToPOS)
      .filter((p: POSProduct | null): p is POSProduct => p !== null)

    console.log(`[POS] ${mapped.length} products mapped successfully`)
    return mapped
  } catch (err: unknown) {
    console.error('[POS] fetchPOSProducts Error:', err)
    throw new Error(
      err instanceof Error ? err.message : 'Failed to fetch products',
    )
  }
}

// ── Customers ─────────────────────────────────────────────────────────────────
// Cookie-based auth — browser automatically sends pos-auth cookie on same-origin requests.
// No manual token header needed.

export async function fetchPOSCustomers(
  search?: string,
): Promise<POSCustomer[]> {
  try {
    const url = new URL('/api/admin/customers', window.location.origin)
    url.searchParams.set('limit', '50')
    if (search) url.searchParams.set('q', search)

    const res = await fetch(url.toString(), { credentials: 'include' })

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
      // c.orders?.[].total never resolves (Medusa computed field doesn't
      // come through this relation — see app/api/admin/customers/route.ts),
      // so use the pre-aggregated total from there instead. Also convert
      // pence → pounds, which the old c.orders.reduce(...) never did either.
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
      headers: { 'Content-Type': 'application/json' },
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

// ── Orders ────────────────────────────────────────────────────────────────────

export async function createPOSOrder(
  payload: CreatePOSOrderPayload,
): Promise<any> {
  try {
    const res = await fetch('/api/pos/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })

    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      throw new Error(err.error ?? err.message ?? 'Order create failed')
    }

    return (await res.json()).order
  } catch (err: unknown) {
    console.error('[POS] createPOSOrder Error:', err)
    throw new Error(
      err instanceof Error ? err.message : 'Failed to create order',
    )
  }
}

// ── Order history (real Medusa data — replaces the local-only
// `completedOrders` list in store/posStore.ts) ─────────────────────────────

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
  customer: { name: string; phone?: string } | null
  subtotal: number
  discountTotal: number
  tax: number
  total: number
  paymentMethod: string
  note: string
  cashier: string
  completedAt: string
  returned: boolean
  // Set when this is a Store Pickup order (POS sale rung up as pickup, or
  // a website order with "Store Pickup" selected at checkout) — lets the
  // Orders list badge it and show it to every staff member regardless of
  // who's logged in, not just the cashier who happens to match.
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
  items: { item_id: string; quantity: number }[],
): Promise<{ refund_amount: number }> {
  try {
    const res = await fetch(`/api/pos/orders/${medusaOrderId}`, {
      method: 'PATCH',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reason, items }),
    })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) {
      throw new Error(data.error ?? 'Failed to process return')
    }
    return { refund_amount: data.refund_amount ?? 0 }
  } catch (err: unknown) {
    console.error('[POS] markPOSOrderReturned Error:', err)
    throw new Error(
      err instanceof Error ? err.message : 'Failed to process return',
    )
  }
}

// ── Region ────────────────────────────────────────────────────────────────────

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

// ── Coupons ───────────────────────────────────────────────────────────────────

export interface CouponValidationResult {
  valid: boolean
  code?: string
  type?: 'percentage' | 'fixed'
  value?: number
}

// Validates a coupon against real Medusa promotions (replaces the old
// hardcoded VALID_COUPONS list in DiscountModal).
export async function validateCoupon(
  code: string,
): Promise<CouponValidationResult> {
  try {
    const res = await fetch(
      `/api/pos/coupons/validate?code=${encodeURIComponent(code)}`,
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

// ── Gift cards ────────────────────────────────────────────────────────────────

export interface GiftCardValidationResult {
  valid: boolean
  code?: string
  balance?: number
  currency_code?: string
  reason?: 'already_redeemed' | 'expired'
}

// Validates a gift card code against real Medusa gift cards (loyalty
// plugin) and returns its remaining balance — does NOT redeem it yet, that
// only happens server-side when the order is actually created.
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

// ── Receipt (email) ──────────────────────────────────────────────────────────
// Replaces the old `alert('Email receipt coming soon!')` stub on the POS
// receipt screen. Sends the same data already shown on-screen/printed —
// Medusa remains the source of truth for the actual order; this is just a
// courtesy copy for the customer's inbox, same trust model as Print.

export interface EmailReceiptPayload {
  orderId: string
  email: string
  items: { id: string; name: string; price: number; quantity: number }[]
  subtotal: number
  discountAmount: number
  tax: number
  total: number
  payMethod: string
  splitPayments?: { method: string; amount: number }[] | null
  cashier: string
}

export async function emailPOSReceipt(
  payload: EmailReceiptPayload,
): Promise<{ sent: boolean }> {
  try {
    const res = await fetch('/api/pos/receipt/email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(payload),
    })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) {
      throw new Error(data.error ?? 'Failed to email receipt')
    }
    return { sent: data.sent !== false }
  } catch (err: unknown) {
    console.error('[POS] emailPOSReceipt Error:', err)
    throw new Error(
      err instanceof Error ? err.message : 'Failed to email receipt',
    )
  }
}
