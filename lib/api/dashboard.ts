// lib/api/dashboard.ts
// Dashboard admin API calls — cookie-based auth (no client-side token)

import { getDisplayOrderStatus } from '@/lib/order-status'

// ── Types ─────────────────────────────────────────────────────────────────────

export interface DashboardStats {
  totalRevenue: number
  totalOrders: number
  totalCustomers: number
  totalProducts: number
  revenueChange: number
  ordersChange: number
  customersChange: number
  productsChange: number
  salesData: { date: string; revenue: number; orders: number }[]
  sportBreakdown: { sport: string; orders: number; color: string }[]
}

// ── Helper ────────────────────────────────────────────────────────────────────
// HttpOnly dashboard-token cookie is sent automatically by the browser on
// same-origin requests. Never pass a manual Authorization header here.

function jsonHeaders(): Record<string, string> {
  return { 'Content-Type': 'application/json' }
}

async function parseError(res: Response): Promise<string> {
  const text = await res.text()
  try {
    const json = JSON.parse(text)
    return json.error ?? json.message ?? text ?? res.statusText
  } catch {
    return text || res.statusText
  }
}

async function api<T>(path: string, params?: Record<string, any>): Promise<T> {
  const url = new URL(path, window.location.origin)
  if (params) {
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== '') {
        url.searchParams.set(k, Array.isArray(v) ? v.join(',') : String(v))
      }
    })
  }
  const res = await fetch(url.toString(), { credentials: 'include' })
  if (!res.ok) {
    throw new Error(await parseError(res))
  }
  return res.json()
}

async function mutate(path: string, method: string, body?: any): Promise<any> {
  const res = await fetch(path, {
    method,
    headers: jsonHeaders(),
    credentials: 'include',
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  })
  if (!res.ok) throw new Error(await parseError(res))
  return res.json()
}

// ── Orders ────────────────────────────────────────────────────────────────────

export async function getOrders(params?: {
  limit?: number
  offset?: number
  status?: string[]
}) {
  const data = await api<any>('/api/admin/orders', {
    limit: params?.limit,
    offset: params?.offset,
    status: params?.status,
  })

  return {
    orders: data.orders.map((o: any) => ({
      id: o.id,
      // BUG FIX: the fallback used to be the raw internal Medusa order ID
      // (e.g. "order_01KXCT29KB6MVZEVQS7GBD0RV3") whenever display_id was
      // missing — an internal database identifier that was never meant to
      // be customer/staff-facing. Now that the fields-param regression
      // above is fixed, display_id should be present for every real
      // order; if it's ever still missing, show a plain placeholder
      // instead of leaking the raw ID.
      orderNumber: o.display_id ? `SR-${o.display_id}` : 'SR-—',
      // BUG FIX: when a linked customer record exists but has no
      // first_name/last_name saved (e.g. a phone-only walk-in profile),
      // the old code stopped at `.trim()` and rendered a blank name
      // instead of falling through to the email — the ternary had already
      // committed to the `o.customer` branch. Chain the fallback so a
      // nameless customer still shows their email/"Guest" instead of blank.
      customer: o.customer
        ? `${o.customer.first_name ?? ''} ${o.customer.last_name ?? ''}`.trim() ||
          o.customer.email ||
          o.email ||
          'Guest'
        : (o.email ?? 'Guest'),
      email: o.email ?? '',
      phone: o.shipping_address?.phone ?? '',
      amount: o.total ?? 0,
      // BUG FIX: this used to pass Medusa's raw order.status straight
      // through ("pending" | "completed" | "archived" | "canceled" |
      // "requires_action"). The Orders page tabs expect a Shopify-style
      // lifecycle ("confirmed" | "processing" | "shipped" | "delivered" |
      // "refunded" etc.) which Medusa's `status` field never actually
      // produces — so every order sat at "completed" and the "Confirmed"
      // tab (and every tab after it) always showed 0, no matter how many
      // orders existed. getDisplayOrderStatus() derives the right bucket
      // from status + fulfillment_status + payment_status together.
      status: getDisplayOrderStatus(o),
      paymentStatus: o.payment_status,
      // BUG FIX: in Medusa v2, payments are NOT a direct relation on Order.
      // The admin orders route fetches `*payment_collections.payments`, so
      // payments live under payment_collections[].payments[]. Accessing
      // o.payments?.[0] always returned undefined (→ 'unknown'). Flatten
      // the nested structure to get the actual provider_id.
      paymentMethod: (() => {
        // For POS orders, use the human-readable payment method saved in
        // metadata (e.g. 'cash', 'card', 'upi') — set by the cashier at
        // checkout. For website orders, translate Medusa's provider_id into
        // a readable label. Never show raw strings like 'pp_system_default'.
        const posMeta = o.metadata?.payment_method as string | undefined
        if (posMeta) {
          return (
            posMeta.charAt(0).toUpperCase() + posMeta.slice(1).toLowerCase()
          )
        }
        const providerId: string =
          (o.payment_collections ?? [])
            .flatMap((pc: any) => pc.payments ?? [])
            .find(Boolean)?.provider_id ?? ''
        if (!providerId || providerId === 'pp_system_default') return 'Cash'
        if (providerId.includes('stripe')) return 'Card'
        if (providerId.includes('paypal')) return 'PayPal'
        return providerId.replace(/^pp_/, '').replace(/_/g, ' ')
      })(),
      items: o.items?.length ?? 0,
      // Lets the Orders table badge "🏬 Pickup" orders so staff instantly
      // know NOT to hand this one to a courier — the customer is coming to
      // collect it in person. Set by POS's FulfillmentModal for in-store
      // sales, and now also by the website checkout when "Store Pickup" is
      // selected as the delivery method.
      isPickup: o.metadata?.fulfillment_type === 'pickup',
      pickupContactName: o.metadata?.pickup_contact_name ?? '',
      pickupContactPhone: o.metadata?.pickup_contact_phone ?? '',
      source: (o.metadata?.source === 'pos'
        ? 'pos'
        : o.metadata?.source === 'dashboard'
          ? 'dashboard'
          : 'website') as 'website' | 'pos' | 'dashboard',
      // Staff page needs this to tally each staff member's real
      // orders count / total sales (see app/dashboard/staff/page.tsx).
      cashier: o.metadata?.cashier ?? '',
      date: new Date(o.created_at).toLocaleDateString('en-GB', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      }),
      city: o.shipping_address?.city ?? '',
    })),
    count: data.count,
  }
}

export async function getOrder(id: string) {
  const data = await api<any>(`/api/admin/orders/${id}`)
  return data.order
}

export async function updateOrderStatus(id: string, action: string) {
  return mutate(`/api/admin/orders/${id}`, 'PATCH', { action })
}

// Staff-initiated return — refunds immediately.
export async function processOrderReturn(
  id: string,
  items: { item_id: string; quantity: number }[],
  reason: string,
  note?: string,
) {
  return mutate(`/api/admin/orders/${id}`, 'PATCH', {
    action: 'return',
    items,
    reason,
    note,
  })
}

// Approves a customer-submitted return request — refunds it.
export async function approveOrderReturn(id: string, returnId: string) {
  return mutate(`/api/admin/orders/${id}`, 'PATCH', {
    action: 'approve-return',
    returnId,
  })
}

// Declines a customer-submitted return request — no refund.
export async function rejectOrderReturn(
  id: string,
  returnId: string,
  note?: string,
) {
  return mutate(`/api/admin/orders/${id}`, 'PATCH', {
    action: 'reject-return',
    returnId,
    note,
  })
}

// ── Products ──────────────────────────────────────────────────────────────────

export async function getProducts(params?: {
  limit?: number
  offset?: number
  status?: string[]
  q?: string
}) {
  const data = await api<any>('/api/admin/products', {
    limit: params?.limit,
    offset: params?.offset,
    q: params?.q,
    status: params?.status,
  })

  return {
    products: data.products.map((p: any) => {
      // GBP price — pence → pounds
      const gbpPrice = p.variants?.[0]?.prices?.find(
        (pr: any) => pr.currency_code === 'gbp',
      )?.amount
      const anyPrice = p.variants?.[0]?.prices?.[0]?.amount
      const price = gbpPrice ?? anyPrice ?? 0

      // Stock from location levels
      const stock =
        p.variants?.reduce((sum: number, v: any) => {
          const levels =
            v.inventory_items?.flatMap(
              (ii: any) => ii.inventory?.location_levels ?? [],
            ) ?? []
          return (
            sum +
            levels.reduce(
              (s: number, lvl: any) =>
                s + (lvl.available_quantity ?? lvl.stocked_quantity ?? 0),
              0,
            )
          )
        }, 0) ?? 0

      return {
        id: p.id,
        name: p.title,
        sku: p.variants?.[0]?.sku ?? '',
        category: p.categories?.[0]?.name ?? '',
        brand: p.metadata?.brand ?? '',
        price,
        stock,
        status: p.status,
        image: p.thumbnail ?? null,
        badge: p.metadata?.badge ?? null,
        // Round-tripped by the CSV export/import in app/dashboard/products —
        // same metadata.specs shape scripts/seed-smashuk.ts writes.
        specs: (p.metadata?.specs ?? []) as { label: string; value: string }[],
        imageUrls: (p.images ?? []).map((img: any) => img.url).filter(Boolean),
      }
    }),
    count: data.count,
  }
}

export async function createProduct(data: any) {
  return mutate('/api/admin/products', 'POST', data)
}

// BUG FIX ("Option value X does not exist for option Y" even though the
// value demonstrably exists — confirmed directly in Medusa's own admin
// panel at /app/product-options/:id, values list included it): Medusa's
// "Global Product Options" feature is an explicit PREVIEW release (per
// Medusa's own release notes) — linking a value to a product via
// options/batch and then immediately sending a product update whose
// variants reference that value is a real race: the batch call's HTTP
// response completes before the link is fully committed/visible to the
// variant-options validation that runs on the very next request. A short
// bounded retry absorbs that window without masking a genuine mismatch
// (which would keep failing after the retries too).
function isStaleOptionLinkError(message: string) {
  return /Option value .+ does not exist for option/i.test(message)
}

export async function updateProduct(id: string, data: any) {
  const attempts = 3
  for (let i = 0; i < attempts; i++) {
    try {
      return await mutate(`/api/admin/products/${id}`, 'PATCH', data)
    } catch (err: any) {
      const isLast = i === attempts - 1
      if (isLast || !isStaleOptionLinkError(err?.message ?? '')) throw err
      await new Promise((r) => setTimeout(r, 400 * (i + 1)))
    }
  }
}

// Medusa v2.17 "Global Product Options" — CONFIRMED (2026-08-15, via
// Medusa's own admin UI network traffic, since the old approach below
// 404'd): options are no longer scoped to one product. They're now a
// standalone resource at /admin/product-options, reusable across many
// products, and have to be explicitly LINKED to a product before its
// variants can reference their values. That's a genuinely different flow
// from before — two separate steps:
//
//   1. Make sure the global option (e.g. "Size") has the values this
//      product's variants need — creating the option if it doesn't exist
//      yet, or adding any missing values to it if it does. See
//      upsertOptionValues().
//   2. Link that option (with just the value ids this product actually
//      uses) to the product itself. See linkOptionsToProduct(). Skipping
//      this step is why the old code's "options" 404'd — the dedicated
//      per-product endpoint it was calling doesn't exist any more; a
//      product/option link is now a batch operation.
//
// Both together replace the old (now-removed) syncProductOption().

// Looks up an existing global option by title (case-insensitive). Returns
// its id and current values (each with their own id) so the caller can
// tell which of the values it needs already exist vs. need creating.
//
// BUG FIX ("Option value X does not exist for option Y" despite X clearly
// existing somewhere): several duplicate "Color"/"Size" global options
// can end up existing (e.g. from earlier failed save attempts that hit
// the `!existing` branch below before this dedup logic existed). Title
// search alone just grabs whichever one the API lists first — which may
// not be the option actually linked to THIS product, so the value we
// resolve/create can live on the wrong entity and never match what's
// linked. When the caller knows which option id is already linked to
// this product (from the product's own `options` field), pass it as
// `preferredId` so we operate on that exact entity instead of guessing.
async function findGlobalOption(
  title: string,
  preferredId?: string,
): Promise<{ id: string; values: { id: string; value: string }[] } | null> {
  const data = await api<any>('/api/admin/product-options', {
    limit: 200,
    fields: 'id,title,values.id,values.value',
  })
  const matches = (data.product_options ?? []).filter(
    (o: any) => o.title.toLowerCase() === title.toLowerCase(),
  )
  const found =
    (preferredId && matches.find((o: any) => o.id === preferredId)) ||
    matches[0]
  return found ? { id: found.id, values: found.values ?? [] } : null
}

// Ensures a global option with this title exists and has (at least) the
// given values — creating the option if it's brand new, or adding any
// values it's missing if it already exists elsewhere. Either way, returns
// the option's id plus the value ids for exactly the `values` requested
// (existing + newly-created), ready to hand to linkOptionsToProduct().
//
// Also returns `canonicalValues`: the exact casing each requested value
// actually has in Medusa. Matching against existing values is
// case-insensitive (so typing "black" reuses an existing "Black" instead
// of creating a duplicate) — but a variant's `options` field later has to
// send the EXACT stored string, or Medusa rejects it with "Option value
// X does not exist for option Y". Callers must use `canonicalValues`, not
// the original `values` they passed in, when building that payload.
export async function upsertOptionValues(
  title: string,
  values: string[],
  preferredId?: string,
): Promise<{
  optionId: string
  valueIds: string[]
  canonicalValues: string[]
}> {
  const existing = await findGlobalOption(title, preferredId)

  if (!existing) {
    const created = await mutate('/api/admin/product-options', 'POST', {
      title,
      values,
    })
    const opt = created.product_option
    return {
      optionId: opt.id,
      valueIds: opt.values.map((v: any) => v.id),
      canonicalValues: opt.values.map((v: any) => v.value),
    }
  }

  const byValue = new Map(
    existing.values.map((v) => [v.value.toLowerCase(), v]),
  )
  const missing = values.filter((v) => !byValue.has(v.toLowerCase()))

  if (missing.length > 0) {
    // BUG FIX: Medusa expects the FULL desired values list here, not just
    // the new ones — sending only `missing` would silently drop every
    // value not included in this request.
    const updated = await mutate(
      `/api/admin/product-options/${existing.id}`,
      'POST',
      { title, values: [...existing.values.map((v) => v.value), ...missing] },
    )
    for (const v of updated.product_option.values as {
      id: string
      value: string
    }[]) {
      byValue.set(v.value.toLowerCase(), v)
    }
  }

  const resolved = values.map((v) => byValue.get(v.toLowerCase()))

  return {
    optionId: existing.id,
    valueIds: resolved
      .filter((v): v is { id: string; value: string } => !!v)
      .map((v) => v.id),
    canonicalValues: resolved
      .filter((v): v is { id: string; value: string } => !!v)
      .map((v) => v.value),
  }
}

// Links (or updates the linked value set of) global options on a
// product. `alreadyLinkedOptionIds` should be the ids of options this
// product already has (from GET /admin/products/:id's `options` field) —
// those go through `update` instead of `add`, since re-`add`-ing an
// already-linked option is rejected by Medusa.
export async function linkOptionsToProduct(
  productId: string,
  options: { id: string; value_ids: string[] }[],
  alreadyLinkedOptionIds: Set<string>,
  // BUG FIX ("Product has N option values but there were M provided..."):
  // any option still linked to this product but NOT in `options` (e.g. a
  // leftover single-variant "Default"/"Type" option from before this
  // product had Size/Color variants) has to be unlinked here too. Medusa
  // requires every variant to provide a value for every option still
  // linked to the product — an orphaned option left linked makes every
  // save fail with that count-mismatch error, even though the variants
  // payload itself is correct.
  removeOptionIds: string[] = [],
) {
  const add = options.filter((o) => !alreadyLinkedOptionIds.has(o.id))
  // BUG FIX: unlike `add`, Medusa's options/batch validator requires each
  // `update` item to be keyed `product_option_id`, not `id` — sending `id`
  // (as we did before) fails with "Field 'update, N, product_option_id' is
  // required" even though `value_ids` and everything else is correct.
  const update = options
    .filter((o) => alreadyLinkedOptionIds.has(o.id))
    .map((o) => ({ product_option_id: o.id, value_ids: o.value_ids }))
  if (add.length === 0 && update.length === 0 && removeOptionIds.length === 0)
    return
  return mutate(`/api/admin/products/${productId}/options/batch`, 'POST', {
    add,
    remove: removeOptionIds,
    update,
  })
}

export async function deleteProductVariant(
  productId: string,
  variantId: string,
) {
  return mutate(
    `/api/admin/products/${productId}/variants/${variantId}`,
    'DELETE',
  )
}

export async function deleteProduct(id: string) {
  return mutate(`/api/admin/products/${id}`, 'DELETE')
}

// ── Customers ─────────────────────────────────────────────────────────────────

export async function getCustomers(params?: {
  limit?: number
  offset?: number
  q?: string
}) {
  const data = await api<any>('/api/admin/customers', {
    limit: params?.limit,
    offset: params?.offset,
    q: params?.q,
  })

  return {
    customers: data.customers.map((c: any) => ({
      id: c.id,
      name: `${c.first_name ?? ''} ${c.last_name ?? ''}`.trim() || c.email,
      email: c.email,
      phone: c.phone ?? '',
      city: c.addresses?.[0]?.city ?? '',
      state: c.addresses?.[0]?.province ?? '',
      totalOrders: c.orders?.length ?? 0,
      // c.orders?.[].total never resolves through this relation (Medusa
      // computed field limitation — see app/api/admin/customers/route.ts,
      // which now aggregates it separately from /admin/orders instead).
      totalSpent: c.orders_total_spent ?? 0,
      lastOrder: c.orders?.[0]
        ? new Date(c.orders[0].created_at).toLocaleDateString('en-GB', {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
          })
        : '—',
      status: 'active' as const,
      tags: [],
      joinedAt: new Date(c.created_at).toLocaleDateString('en-GB', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      }),
      avatar:
        `${c.first_name?.[0] ?? ''}${c.last_name?.[0] ?? ''}`.toUpperCase() ||
        'U',
    })),
    count: data.count,
  }
}

// ── Inventory ─────────────────────────────────────────────────────────────────

export async function getInventory(params?: {
  limit?: number
  offset?: number
}) {
  const data = await api<any>('/api/admin/inventory', {
    limit: params?.limit,
    offset: params?.offset,
  })

  return data.products.flatMap((p: any) =>
    (p.variants ?? []).map((v: any) => {
      // Stock from location levels
      const levels =
        v.inventory_items?.flatMap(
          (ii: any) => ii.inventory?.location_levels ?? [],
        ) ?? []
      const stock = levels.reduce(
        (s: number, lvl: any) =>
          s + (lvl.available_quantity ?? lvl.stocked_quantity ?? 0),
        0,
      )
      // BUG FIX: reserved/incoming were hardcoded to 0 below regardless of
      // actual data, so every row showed "0 in orders" even when stock was
      // genuinely reserved. Medusa's location_levels already include
      // reserved_quantity and incoming_quantity per level (returned via the
      // wildcard `*variants.inventory_items.inventory.location_levels`
      // fields param), so sum them the same way stock is summed.
      const reserved = levels.reduce(
        (s: number, lvl: any) => s + (lvl.reserved_quantity ?? 0),
        0,
      )
      const incoming = levels.reduce(
        (s: number, lvl: any) => s + (lvl.incoming_quantity ?? 0),
        0,
      )

      // GBP price
      const gbpPrice = v.prices?.find(
        (pr: any) => pr.currency_code === 'gbp',
      )?.amount
      const anyPrice = v.prices?.[0]?.amount
      const price = gbpPrice ?? anyPrice ?? 0

      return {
        id: v.id,
        name: p.title,
        sku: v.sku ?? '',
        sport: p.categories?.[0]?.name ?? '',
        brand: p.metadata?.brand ?? '',
        category: p.categories?.[0]?.name ?? '',
        icon: '📦',
        stock,
        lowStockThreshold: Number(p.metadata?.low_stock_alert ?? 10),
        reserved,
        incoming,
        price,
        // BUG FIX: was `Number(p.metadata?.cost_price ?? 0)`. No product in
        // Medusa actually has a `cost_price` metadata field set, so this
        // always evaluated to 0 and Inventory Value showed £0.00 for every
        // item. Fall back to the real selling price when no explicit cost
        // price has been entered, so the value column reflects real stock
        // value instead of silently zeroing out.
        costPrice: Number(p.metadata?.cost_price ?? price),
        lastUpdated: new Date(v.updated_at).toLocaleDateString('en-GB'),
      }
    }),
  )
}

// ── Dashboard Stats ───────────────────────────────────────────────────────────

export async function getDashboardStats(
  range?: string,
): Promise<DashboardStats> {
  const data = await api<DashboardStats>(
    '/api/admin/stats',
    range ? { range } : undefined,
  )
  return {
    totalRevenue: data.totalRevenue,
    totalOrders: data.totalOrders,
    totalCustomers: data.totalCustomers,
    totalProducts: data.totalProducts,
    revenueChange: data.revenueChange ?? 0,
    ordersChange: data.ordersChange ?? 0,
    customersChange: data.customersChange ?? 0,
    productsChange: data.productsChange ?? 0,
    salesData: data.salesData ?? [],
    sportBreakdown: data.sportBreakdown ?? [],
  }
}

// ── Discounts ─────────────────────────────────────────────────────────────────

export async function getDiscounts(params?: {
  limit?: number
  offset?: number
}) {
  const data = await api<any>('/api/admin/discounts', {
    limit: params?.limit,
    offset: params?.offset,
  })

  return {
    discounts: data.promotions.map((d: any) => {
      const quantityRule = d.rules?.find((r: any) => r.attribute === 'quantity')
      // Same shape the create/edit form uses to build one: automatic +
      // percentage + a quantity>=N rule attached directly.
      const isQuantityDiscount =
        d.application_method?.type === 'percentage' &&
        !!d.is_automatic &&
        !!quantityRule

      return {
        id: d.id,
        code: d.code,
        type: isQuantityDiscount
          ? 'buy_x_get_y'
          : (d.application_method?.type ?? 'percentage'),
        value: d.application_method?.value ?? 0,
        minQuantity: quantityRule?.values?.[0]?.value ?? null,
        minOrderAmount:
          d.rules?.find((r: any) => r.attribute === 'subtotal')?.values?.[0] ??
          0,
        maxUses: d.usage_limit ?? null,
        usedCount: d.usage_count ?? 0,
        startsAt: d.starts_at
          ? new Date(d.starts_at).toISOString().split('T')[0]
          : '',
        expiresAt: d.ends_at
          ? new Date(d.ends_at).toISOString().split('T')[0]
          : null,
        isActive: d.status === 'active',
        description: d.campaign?.description ?? '',
      }
    }),
    count: data.count,
  }
}

export async function createDiscount(data: any) {
  return mutate('/api/admin/discounts', 'POST', data)
}

export async function updateDiscount(id: string, data: any) {
  return mutate(`/api/admin/discounts/${id}`, 'PATCH', data)
}

export async function deleteDiscount(id: string) {
  return mutate(`/api/admin/discounts/${id}`, 'DELETE')
}

// ── Categories ────────────────────────────────────────────────────────────────

export async function getCategories(params?: {
  limit?: number
  offset?: number
}) {
  const data = await api<any>('/api/admin/categories', {
    limit: params?.limit ?? 100,
    offset: params?.offset ?? 0,
  })

  return {
    categories: data.product_categories ?? [],
    count: data.count ?? 0,
  }
}

export async function getAnalytics(range: string = 'last30') {
  const data = await api<any>('/api/admin/analytics', { range })
  return data
}
