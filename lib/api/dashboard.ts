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
  // BUG FIX: bumped from 3 → 6 attempts. 3 retries (~1.2s total) wasn't
  // enough for Medusa's Global Product Options link to become visible to
  // the variant-options validator after options/batch completes — seen
  // failing all 3 attempts on a normal "add new Size value + new variant"
  // save. 6 attempts with 400ms×(i+1) backoff = ~6.3s worst case, which
  // comfortably clears the race window. A genuinely wrong value would
  // still fail after all 6 retries and surface normally.
  const attempts = 6
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
  // BUG FIX ("Option value 2.5 does not exist for option Size (UK)" even
  // though 2.5 is a completely normal, already-existing value): the LIST
  // endpoint (`/admin/product-options`) truncates each option's nested
  // `values` relation to Medusa's default page size — confirmed by this
  // consistently reproducing on "Size (UK)" (21 values), "Color" (48) and
  // "Size" (66), all options comfortably past that default limit, and
  // never on small option sets. Whichever values fall past that cutoff
  // (alphabetically/creation-order — "2.5" sorts early but ids aren't
  // guaranteed to) look "missing" to upsertOptionValues even though they
  // already exist, so it tries to (re)create them — landing a duplicate
  // value or a value_id the variant payload doesn't actually match,
  // which is exactly the 400 Medusa returns.
  //
  // The list endpoint applies this truncation because it's returning many
  // parent records at once and caps every nested collection to keep the
  // payload bounded. Retrieving a SINGLE option by id doesn't have that
  // "many parents" problem, so its nested `values` comes back complete.
  // Fix: use the list endpoint only to resolve title -> id (cheap, and we
  // don't need `values` from it at all), then always follow up with a
  // single-resource fetch by id to get the FULL, untruncated value list.
  let id = preferredId

  if (!id) {
    const data = await api<any>('/api/admin/product-options', {
      limit: 200,
      fields: 'id,title',
    })
    const matches = (data.product_options ?? []).filter(
      (o: any) => o.title.toLowerCase() === title.toLowerCase(),
    )
    id = matches[0]?.id
  }

  if (!id) return null

  const single = await api<any>(`/api/admin/product-options/${id}`, {
    fields: 'id,title,values.id,values.value',
  })
  const opt = single.product_option
  if (!opt) return null
  return { id: opt.id, values: opt.values ?? [] }
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

  // FIX: without an explicit tuple type, `[v.value.toLowerCase(), v]` is
  // widened to a plain array (not a 2-tuple), so `new Map(...)` can't
  // correctly infer the key/value generic — `.get()` then returns a type
  // TS can't reconcile with `string`. Annotating the callback's return as
  // a tuple fixes inference for every `.get()` call below.
  const byValue = new Map<string, { id: string; value: string }>(
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

  // BUG FIX ("Option value 2 does not exist for option Size (UK)" / any
  // wrong value being sent on save): this used to be
  // `resolved.filter(Boolean).map(...)`. For options with lots of values
  // (Size (UK) has 21, Color has 48, Size has 66), Medusa's list endpoint
  // returns nested `values` truncated to its default page size, so
  // `existing.values` above can be missing values that genuinely already
  // exist further down the list. When that happened, `resolved` ended up
  // with an `undefined` hole for that entry — and `.filter()` silently
  // DROPPED it, shifting every value after it one slot to the left.
  // Callers (see syncOptionsForVariants in both product pages) index into
  // `canonicalValues` positionally, matched against the same `values`
  // array passed in here — so that shift meant a variant asking for e.g.
  // "9.5" (position 5) was handed back whatever canonical value ended up
  // at position 5 after the drop (e.g. "2"), which Medusa then rejected
  // because that variant never actually requested "2". `canonicalValues`
  // and `valueIds` MUST stay the same length and order as `values` — no
  // filtering — or this positional mismatch reappears any time a value
  // fails to resolve for any reason.
  const missingAfterUpsert = values.filter((v, i) => !resolved[i])
  if (missingAfterUpsert.length > 0) {
    // Genuinely couldn't resolve some value even after creating it — fail
    // loudly instead of silently shifting the rest of the array.
    throw new Error(
      `Failed to resolve option value(s) [${missingAfterUpsert.join(', ')}] for option "${title}" after upsert.`,
    )
  }

  const resolvedSafe = resolved as { id: string; value: string }[]

  return {
    optionId: existing.id,
    // One id per requested value, same order — see note above.
    valueIds: resolvedSafe.map((v) => v.id),
    canonicalValues: resolvedSafe.map((v) => v.value),
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

// BUG FIX ("Invalid request: Field 'tags, 0, id' is required" on both Add
// Product and Edit Product): resolves free-typed tag text (e.g. from the
// comma-separated Tags field) into real Medusa product-tag ids — reusing
// any tag that already exists (case-insensitive) and creating the rest —
// so the product payload can send `tags: [{ id }]`, which is the only
// shape Medusa's product create/update endpoints accept. Mirrors
// upsertOptionValues()'s create-or-reuse pattern for global options.
export async function upsertProductTags(
  values: string[],
): Promise<{ id: string }[]> {
  const wanted = Array.from(
    new Set(values.map((v) => v.trim()).filter(Boolean)),
  )
  if (wanted.length === 0) return []

  const data = await api<any>('/api/admin/product-tags', {
    limit: 1000,
    fields: 'id,value',
  })
  const byValue = new Map<string, string>(
    (data.product_tags ?? []).map((t: any) => [t.value.toLowerCase(), t.id]),
  )

  const ids: string[] = []
  for (const value of wanted) {
    const existingId = byValue.get(value.toLowerCase())
    if (existingId) {
      ids.push(existingId)
      continue
    }
    const created = await mutate('/api/admin/product-tags', 'POST', { value })
    const newId = created?.product_tag?.id
    if (newId) {
      ids.push(newId)
      byValue.set(value.toLowerCase(), newId)
    }
  }

  return ids.map((id) => ({ id }))
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

// Deletes a GLOBAL option outright (not a per-product unlink — see
// linkOptionsToProduct's `remove` for that). Used by the product-create
// flow's safety net (app/dashboard/products/new/page.tsx) to clean up an
// accidental duplicate global option: if Medusa's create-product endpoint
// ever creates a brand-new option instead of reusing the one resolved by
// upsertOptionValues (despite being given its id), that stray option is
// unlinked from the product and then deleted here so it never shows up
// as a second "Size"/"Color" entry in the Options list. Best-effort —
// callers should not let a failure here block a successful product save.
export async function deleteGlobalOption(optionId: string) {
  return mutate(`/api/admin/product-options/${optionId}`, 'DELETE')
}

export async function deleteProductOption(productId: string, optionId: string) {
  return mutate(
    `/api/admin/products/${productId}/options/${optionId}`,
    'DELETE',
  )
}

export async function upsertProductOption(
  productId: string,
  title: string,
  values: string[],
  existingOption?: { id: string; values: { id: string; value: string }[] },
): Promise<{
  optionId: string
  canonicalValues: string[]
  staleOptionId?: string
}> {
  if (!existingOption) {
    // No existing option — create a brand-new one scoped to this product
    const created = await mutate(
      `/api/admin/products/${productId}/options`,
      'POST',
      { title, values },
    )
    const opt = created.product_option
    // FIX: `opt.values` is `any`, so TS can't infer the Map's generics
    // from the callback alone (inference from `any` falls back to `{}`).
    // Declaring the generic explicitly — `new Map<string, string>(...)` —
    // forces the correct key/value types.
    const byValue = new Map<string, string>(
      (opt.values ?? []).map((v: any) => [v.value.toLowerCase(), v.value]),
    )
    return {
      optionId: opt.id,
      canonicalValues: values.map((v) => byValue.get(v.toLowerCase()) ?? v),
    }
  }

  // Existing option — diff to find which values are missing
  // FIX: this is the exact line the build error pointed at
  // (dashboard.ts:533) — explicit generic avoids the {} fallback.
  const byValue = new Map<string, string>(
    existingOption.values.map((v) => [v.value.toLowerCase(), v.value]),
  )
  const missing = values.filter((v) => !byValue.has(v.toLowerCase()))

  if (missing.length > 0) {
    // Send the full desired list (existing + new) — Medusa replaces the
    // value set entirely, so omitting existing values would drop them.
    const allValues = [...existingOption.values.map((v) => v.value), ...missing]
    try {
      const updated = await mutate(
        `/api/admin/products/${productId}/options/${existingOption.id}`,
        'POST',
        { title, values: allValues },
      )
      // FIX: explicit generic — see note above.
      const updatedByValue = new Map<string, string>(
        (updated.product_option?.values ?? []).map((v: any) => [
          v.value.toLowerCase(),
          v.value,
        ]),
      )
      return {
        optionId: existingOption.id,
        canonicalValues: values.map(
          (v) => updatedByValue.get(v.toLowerCase()) ?? v,
        ),
      }
    } catch (err: any) {
      // Soft-delete conflict: Medusa can reject adding a value that was
      // previously soft-deleted on this option. Replace the whole option
      // with a fresh one and queue the old id for deferred deletion.
      if (/already exists|conflict|duplicate/i.test(err?.message ?? '')) {
        const created = await mutate(
          `/api/admin/products/${productId}/options`,
          'POST',
          { title, values },
        )
        const opt = created.product_option
        // FIX: explicit generic — see note above.
        const freshByValue = new Map<string, string>(
          (opt.values ?? []).map((v: any) => [v.value.toLowerCase(), v.value]),
        )
        return {
          optionId: opt.id,
          canonicalValues: values.map(
            (v) => freshByValue.get(v.toLowerCase()) ?? v,
          ),
          staleOptionId: existingOption.id,
        }
      }
      throw err
    }
  }

  // All values already exist — return canonical casings, no API call needed
  return {
    optionId: existingOption.id,
    canonicalValues: values.map((v) => byValue.get(v.toLowerCase()) ?? v),
  }
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
  q?: string
}) {
  const data = await api<any>('/api/admin/inventory', {
    limit: params?.limit,
    offset: params?.offset,
    q: params?.q,
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
