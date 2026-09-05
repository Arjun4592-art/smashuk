import { getDisplayOrderStatus } from '@/lib/order-status'
export interface DashboardStats {
  totalRevenue: number
  totalOrders: number
  totalCustomers: number
  totalProducts: number
  revenueChange: number
  ordersChange: number
  customersChange: number
  productsChange: number
  salesData: {
    date: string
    revenue: number
    orders: number
  }[]
  sportBreakdown: {
    sport: string
    orders: number
    color: string
  }[]
}
function jsonHeaders(): Record<string, string> {
  return {
    'Content-Type': 'application/json',
  }
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
  const res = await fetch(url.toString(), {
    credentials: 'include',
  })
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
    ...(body !== undefined
      ? {
          body: JSON.stringify(body),
        }
      : {}),
  })
  if (!res.ok) throw new Error(await parseError(res))
  return res.json()
}
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
      orderNumber: o.display_id ? `SR-${o.display_id}` : 'SR-—',
      customer: o.customer
        ? `${o.customer.first_name ?? ''} ${o.customer.last_name ?? ''}`.trim() ||
          o.customer.email ||
          o.email ||
          'Guest'
        : (o.email ?? 'Guest'),
      email: o.email ?? '',
      phone: o.shipping_address?.phone ?? '',
      amount: o.total ?? 0,
      status: getDisplayOrderStatus(o),
      paymentStatus: o.payment_status,
      paymentMethod: (() => {
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
      isPickup: o.metadata?.fulfillment_type === 'pickup',
      pickupContactName: o.metadata?.pickup_contact_name ?? '',
      pickupContactPhone: o.metadata?.pickup_contact_phone ?? '',
      source: (o.metadata?.source === 'pos'
        ? 'pos'
        : o.metadata?.source === 'dashboard'
          ? 'dashboard'
          : 'website') as 'website' | 'pos' | 'dashboard',
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
  return mutate(`/api/admin/orders/${id}`, 'PATCH', {
    action,
  })
}
export async function processOrderReturn(
  id: string,
  items: {
    item_id: string
    quantity: number
  }[],
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
export async function approveOrderReturn(id: string, returnId: string) {
  return mutate(`/api/admin/orders/${id}`, 'PATCH', {
    action: 'approve-return',
    returnId,
  })
}
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
      const gbpPrice = p.variants?.[0]?.prices?.find(
        (pr: any) => pr.currency_code === 'gbp',
      )?.amount
      const anyPrice = p.variants?.[0]?.prices?.[0]?.amount
      const price = gbpPrice ?? anyPrice ?? 0
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
        specs: (p.metadata?.specs ?? []) as {
          label: string
          value: string
        }[],
        imageUrls: (p.images ?? []).map((img: any) => img.url).filter(Boolean),
      }
    }),
    count: data.count,
  }
}
export async function createProduct(data: any) {
  return mutate('/api/admin/products', 'POST', data)
}
function isStaleOptionLinkError(message: string) {
  return /Option value .+ does not exist for option/i.test(message)
}
export async function updateProduct(id: string, data: any) {
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
async function findGlobalOption(
  title: string,
  preferredId?: string,
): Promise<{
  id: string
  values: {
    id: string
    value: string
  }[]
} | null> {
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
  return {
    id: opt.id,
    values: opt.values ?? [],
  }
}
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
  const byValue = new Map<
    string,
    {
      id: string
      value: string
    }
  >(existing.values.map((v) => [v.value.toLowerCase(), v]))
  const missing = values.filter((v) => !byValue.has(v.toLowerCase()))
  if (missing.length > 0) {
    const updated = await mutate(
      `/api/admin/product-options/${existing.id}`,
      'POST',
      {
        title,
        values: [...existing.values.map((v) => v.value), ...missing],
      },
    )
    for (const v of updated.product_option.values as {
      id: string
      value: string
    }[]) {
      byValue.set(v.value.toLowerCase(), v)
    }
  }
  const resolved = values.map((v) => byValue.get(v.toLowerCase()))
  const missingAfterUpsert = values.filter((v, i) => !resolved[i])
  if (missingAfterUpsert.length > 0) {
    throw new Error(
      `Failed to resolve option value(s) [${missingAfterUpsert.join(', ')}] for option "${title}" after upsert.`,
    )
  }
  const resolvedSafe = resolved as {
    id: string
    value: string
  }[]
  return {
    optionId: existing.id,
    valueIds: resolvedSafe.map((v) => v.id),
    canonicalValues: resolvedSafe.map((v) => v.value),
  }
}
export async function linkOptionsToProduct(
  productId: string,
  options: {
    id: string
    value_ids: string[]
  }[],
  alreadyLinkedOptionIds: Set<string>,
  removeOptionIds: string[] = [],
) {
  const add = options.filter((o) => !alreadyLinkedOptionIds.has(o.id))
  // Medusa's options/batch validator requires each `update` item to be
  // keyed `product_option_id`, not `id` — sending `id` fails with
  // "Field 'update, N, product_option_id' is required".
  const update = options
    .filter((o) => alreadyLinkedOptionIds.has(o.id))
    .map((o) => ({
      product_option_id: o.id,
      value_ids: o.value_ids,
    }))
  if (add.length === 0 && update.length === 0 && removeOptionIds.length === 0)
    return
  return mutate(`/api/admin/products/${productId}/options/batch`, 'POST', {
    add,
    remove: removeOptionIds,
    update,
  })
}
export async function upsertProductTags(values: string[]): Promise<
  {
    id: string
  }[]
> {
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
    const created = await mutate('/api/admin/product-tags', 'POST', {
      value,
    })
    const newId = created?.product_tag?.id
    if (newId) {
      ids.push(newId)
      byValue.set(value.toLowerCase(), newId)
    }
  }
  return ids.map((id) => ({
    id,
  }))
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
  existingOption?: {
    id: string
    values: {
      id: string
      value: string
    }[]
  },
): Promise<{
  optionId: string
  canonicalValues: string[]
  staleOptionId?: string
}> {
  if (!existingOption) {
    const created = await mutate(
      `/api/admin/products/${productId}/options`,
      'POST',
      {
        title,
        values,
      },
    )
    const opt = created.product_option
    const byValue = new Map<string, string>(
      (opt.values ?? []).map((v: any) => [v.value.toLowerCase(), v.value]),
    )
    return {
      optionId: opt.id,
      canonicalValues: values.map((v) => byValue.get(v.toLowerCase()) ?? v),
    }
  }
  const byValue = new Map<string, string>(
    existingOption.values.map((v) => [v.value.toLowerCase(), v.value]),
  )
  const missing = values.filter((v) => !byValue.has(v.toLowerCase()))
  if (missing.length > 0) {
    const allValues = [...existingOption.values.map((v) => v.value), ...missing]
    try {
      const updated = await mutate(
        `/api/admin/products/${productId}/options/${existingOption.id}`,
        'POST',
        {
          title,
          values: allValues,
        },
      )
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
      if (/already exists|conflict|duplicate/i.test(err?.message ?? '')) {
        const created = await mutate(
          `/api/admin/products/${productId}/options`,
          'POST',
          {
            title,
            values,
          },
        )
        const opt = created.product_option
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
  return {
    optionId: existingOption.id,
    canonicalValues: values.map((v) => byValue.get(v.toLowerCase()) ?? v),
  }
}
export async function deleteProduct(id: string) {
  return mutate(`/api/admin/products/${id}`, 'DELETE')
}
export async function duplicateProduct(id: string) {
  return mutate(`/api/admin/products/${id}/duplicate`, 'POST')
}
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
      const levels =
        v.inventory_items?.flatMap(
          (ii: any) => ii.inventory?.location_levels ?? [],
        ) ?? []
      const stock = levels.reduce(
        (s: number, lvl: any) =>
          s + (lvl.available_quantity ?? lvl.stocked_quantity ?? 0),
        0,
      )
      const reserved = levels.reduce(
        (s: number, lvl: any) => s + (lvl.reserved_quantity ?? 0),
        0,
      )
      const incoming = levels.reduce(
        (s: number, lvl: any) => s + (lvl.incoming_quantity ?? 0),
        0,
      )
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
        costPrice: Number(p.metadata?.cost_price ?? price),
        lastUpdated: new Date(v.updated_at).toLocaleDateString('en-GB'),
      }
    }),
  )
}
export async function getDashboardStats(
  range?: string,
): Promise<DashboardStats> {
  const data = await api<DashboardStats>(
    '/api/admin/stats',
    range
      ? {
          range,
        }
      : undefined,
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
  const data = await api<any>('/api/admin/analytics', {
    range,
  })
  return data
}
