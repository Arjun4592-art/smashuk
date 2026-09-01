export interface POSProduct {
  id: string
  name: string
  brand: string
  sku: string
  price: number
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
  items: {
    variant_id: string
    quantity: number
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
function mapProductToPOS(p: any): POSProduct | null {
  const variant = p.variants?.[0]
  if (!variant) return null
  const price = extractPrice(variant, p.metadata)
  const stock = extractStock(variant)
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
export async function fetchPOSProducts(): Promise<POSProduct[]> {
  try {
    const res = await fetch('/api/pos/products', {
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
      return []
    }
    const mapped = (data.products as any[])
      .map(mapProductToPOS)
      .filter((p: POSProduct | null): p is POSProduct => p !== null)
    return mapped
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
): Promise<any> {
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
    return (await res.json()).order
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
}
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
