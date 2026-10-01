import 'server-only'
import { cookies } from 'next/headers'
import { SURFACE_COOKIES } from '@/lib/api/auth-cookie'

const MEDUSA_URL =
  process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL ?? 'http://localhost:9000'

const PAGE_SIZE = 100
const CONCURRENCY = 2

const REFRESH_MS = 15 * 60 * 1000
const STALE_MS = 3 * 60 * 60 * 1000

const MIN_REBUILD_GAP_MS = 5 * 60 * 1000
const REQUEST_TIMEOUT_MS = 30 * 1000

export const LIST_FIELDS =
  'id,title,handle,status,thumbnail,metadata,images.url,categories.name,variants.id,variants.title,variants.sku,variants.barcode,variants.ean,variants.prices.amount,variants.prices.currency_code,variants.inventory_items.inventory.location_levels.stocked_quantity,variants.inventory_items.inventory.location_levels.available_quantity'
export const LIST_FIELDS_LEGACY =
  'id,title,handle,status,thumbnail,metadata,*images,*categories,*variants,variants.id,variants.title,variants.sku,variants.barcode,variants.ean,*variants.prices,*variants.inventory_items,*variants.inventory_items.inventory.location_levels'

// The edit page used to ask Medusa for all of this in ONE request. Joining
// prices x options x images in a single query makes Medusa's SQL explode and the
// request hangs (and can run the backend out of heap). Each piece below is fast
// on its own, so getEditorData loads them separately and merges by variant id.
//
// IMPORTANT: every field list must START with a plain field (`id,`). A list
// that begins with `+` or `*` makes Medusa add its DEFAULT product fields
// (variants, prices, options, tags, images...) on top, which is the heavy query
// we are avoiding. The form only reads title/description/status/metadata from
// the product itself, so that is all the base request asks for.
const PRODUCT_BASE_FIELDS =
  'id,title,description,status,metadata,*categories,*images'
const PRODUCT_VARIANT_FIELDS =
  'id,*variants,+variants.metadata,*variants.prices'
const PRODUCT_VARIANT_OPTION_FIELDS =
  'id,*variants.options,*variants.options.option'
const PRODUCT_VARIANT_IMAGE_FIELDS = 'id,*variants.images'

const PRODUCT_OPTIONS_FIELDS = 'id,*options,*options.values'
const PRODUCT_CHANNELS_FIELDS = 'id,*sales_channels'
// The edit form only reads tag.value, so don't pull whole tag rows.
const PRODUCT_TAGS_FIELDS = 'id,tags.id,tags.value'
const TAGS_TIMEOUT_MS = 8 * 1000

const PRODUCT_INVENTORY_FIELDS =
  'id,variants.id,variants.inventory_items.inventory.location_levels.stocked_quantity,variants.inventory_items.inventory.location_levels.reserved_quantity'
const INVENTORY_TIMEOUT_MS = 20 * 1000

export class AdminAuthError extends Error {
  constructor(message = 'Not authenticated') {
    super(message)
    this.name = 'AdminAuthError'
  }
}

export interface AdminListItem {
  id: string
  name: string
  handle: string
  sku: string
  category: string
  brand: string
  sport: string
  price: number
  stock: number
  status: string
  image: string | null
  badge: string | null
  specs: { label: string; value: string }[]
  imageUrls: string[]

  _search?: string
}

export interface AdminListResult {
  products: Omit<AdminListItem, '_search'>[]
  count: number

  counts: Record<'All' | 'Active' | 'Draft' | 'Archived', number>
}

export const STATUS_TABS = {
  All: undefined,
  Active: ['published'],
  Draft: ['draft'],

  Archived: ['rejected'],
} as const

export async function getDashboardAuth(): Promise<string | null> {
  const store = await cookies()
  const token = store.get(SURFACE_COOKIES.dashboard.tokenCookie)?.value
  return token ? `Bearer ${token}` : null
}

async function medusaGet(
  path: string,
  authorization: string,
  timeoutMs: number = REQUEST_TIMEOUT_MS,
) {
  let res: Response
  try {
    res = await fetch(`${MEDUSA_URL}${path}`, {
      headers: { Authorization: authorization },
      cache: 'no-store',
      signal: AbortSignal.timeout(timeoutMs),
    })
  } catch (err: any) {
    if (err?.name === 'TimeoutError' || err?.name === 'AbortError') {
      throw new Error(
        `Medusa backend did not respond within ${timeoutMs / 1000}s (${path.split('?')[0]}). It is slow, overloaded or crashed - check the backend terminal.`,
      )
    }
    throw new Error(
      `Cannot reach Medusa at ${MEDUSA_URL} (${err?.cause?.code ?? err?.message}). Is the backend running?`,
    )
  }
  const text = await res.text()
  let data: any = {}
  try {
    data = text ? JSON.parse(text) : {}
  } catch {
    data = { message: text.slice(0, 200) }
  }
  if (res.status === 401) throw new AdminAuthError()
  if (!res.ok) {
    throw new Error(
      data?.message ??
        data?.error ??
        `Medusa request failed (${res.status}) ${path.split('?')[0]}`,
    )
  }
  return data
}

export function mapAdminListItem(p: any): AdminListItem {
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

  const item: AdminListItem = {
    id: p.id,
    name: p.title ?? '',
    handle: p.handle ?? '',
    sku: p.variants?.[0]?.sku ?? '',
    category: p.categories?.[0]?.name ?? '',
    brand: p.metadata?.brand ?? '',
    sport: p.metadata?.sport ?? '',
    price,
    stock,
    status: p.status,
    image: p.thumbnail ?? null,
    badge: p.metadata?.badge ?? null,
    specs: (p.metadata?.specs ?? []) as { label: string; value: string }[],
    imageUrls: (p.images ?? []).map((img: any) => img.url).filter(Boolean),
  }
  const variantBits = (p.variants ?? []).flatMap((v: any) => [
    v.sku,
    v.barcode,
    v.ean,
    v.title,
  ])
  item._search = [
    item.name,
    item.handle,
    item.id,
    item.brand,
    item.sport,
    item.category,
    ...variantBits,
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase()
  return item
}

function stripSearch(item: AdminListItem): AdminListResult['products'][0] {
  const { _search, ...rest } = item
  return rest
}

type SnapshotState = {
  items: AdminListItem[] | null
  snapshotAt: number
  inFlight: Promise<void> | null

  generation: number
  builtGeneration: number

  failedAt: number
}

const globalKey = '__smashAdminProductsState'
const g = globalThis as unknown as Record<string, SnapshotState | undefined>
const state: SnapshotState = (g[globalKey] ??= {
  items: null,
  snapshotAt: 0,
  inFlight: null,
  generation: 0,
  builtGeneration: 0,
  failedAt: 0,
})

async function fetchListPage(
  authorization: string,
  offset: number,
  limit: number,
) {
  const params = new URLSearchParams({
    limit: String(limit),
    offset: String(offset),
    order: '-created_at',
    fields: LIST_FIELDS,
  })
  const data = await medusaGet(`/admin/products?${params}`, authorization)
  return {
    products: (data.products ?? []) as any[],
    count: (data.count ?? 0) as number,
  }
}

async function rebuild(authorization: string): Promise<void> {
  const startedGeneration = state.generation
  try {
    const first = await fetchListPage(authorization, 0, PAGE_SIZE)
    const raw = [...first.products]
    const offsets: number[] = []
    for (let o = PAGE_SIZE; o < first.count; o += PAGE_SIZE) offsets.push(o)
    for (let i = 0; i < offsets.length; i += CONCURRENCY) {
      const batch = offsets.slice(i, i + CONCURRENCY)
      const results = await Promise.all(
        batch.map((o) => fetchListPage(authorization, o, PAGE_SIZE)),
      )
      for (const r of results) raw.push(...r.products)
    }
    state.items = raw.map(mapAdminListItem)
    state.snapshotAt = Date.now()
    state.builtGeneration = startedGeneration
    state.failedAt = 0
  } catch (err) {
    state.failedAt = Date.now()
    console.error('[admin-products] snapshot rebuild failed:', err)
  } finally {
    state.inFlight = null
  }
}

const REBUILD_RETRY_GAP_MS = 60 * 1000

function kickRebuild(authorization: string) {
  if (state.failedAt && Date.now() - state.failedAt < REBUILD_RETRY_GAP_MS)
    return state.inFlight
  if (!state.inFlight) state.inFlight = rebuild(authorization)
  return state.inFlight
}

function readSnapshot(authorization: string): AdminListItem[] | null {
  if (!state.items) {
    void kickRebuild(authorization)
    return null
  }
  const age = Date.now() - state.snapshotAt
  const dirty = state.builtGeneration !== state.generation
  if ((dirty && age >= MIN_REBUILD_GAP_MS) || age >= REFRESH_MS)
    void kickRebuild(authorization)

  if (age >= STALE_MS) return null
  return state.items
}

export function getAdminSnapshotItems(
  authorization: string,
): AdminListItem[] | null {
  return readSnapshot(authorization)
}

export function markAdminProductsStale() {
  state.generation += 1
}

export async function upsertAdminProduct(id: string, authorization: string) {
  if (!state.items) return
  try {
    const data = await medusaGet(
      `/admin/products/${id}?${new URLSearchParams({ fields: LIST_FIELDS })}`,
      authorization,
    )
    if (!data.product) return
    const next = mapAdminListItem(data.product)
    const idx = state.items.findIndex((i) => i.id === id)
    if (idx >= 0) {
      const copy = state.items.slice()
      copy[idx] = next
      state.items = copy
    } else {
      state.items = [next, ...state.items]
    }
  } catch (err) {
    console.warn('[admin-products] upsert failed, will refresh instead:', err)
    markAdminProductsStale()
  }
}

export function removeAdminProduct(id: string) {
  if (!state.items) return
  state.items = state.items.filter((i) => i.id !== id)
}

export interface ListParams {
  limit?: number
  offset?: number
  q?: string
  status?: string[]
}

function matchesQuery(item: AdminListItem, tokens: string[]) {
  if (tokens.length === 0) return true
  const hay = item._search ?? ''
  return tokens.every((t) => hay.includes(t))
}

function listFromSnapshot(
  items: AdminListItem[],
  params: ListParams,
): AdminListResult {
  const tokens = (params.q ?? '').toLowerCase().split(/\s+/).filter(Boolean)
  const searched = tokens.length
    ? items.filter((i) => matchesQuery(i, tokens))
    : items
  const counts = {
    All: searched.length,
    Active: 0,
    Draft: 0,
    Archived: 0,
  }
  for (const i of searched) {
    if (i.status === 'published') counts.Active++
    else if (i.status === 'draft') counts.Draft++
    else if (i.status === 'rejected') counts.Archived++
  }
  const filtered =
    params.status && params.status.length
      ? searched.filter((i) => params.status!.includes(i.status))
      : searched
  const offset = Math.max(0, params.offset ?? 0)
  const limit = Math.min(500, Math.max(1, params.limit ?? 20))
  return {
    products: filtered.slice(offset, offset + limit).map(stripSearch),
    count: filtered.length,
    counts,
  }
}

async function countOnly(
  authorization: string,
  q: string | undefined,
  status: readonly string[] | undefined,
) {
  const params = new URLSearchParams({ limit: '1', fields: 'id' })
  if (q) params.set('q', q)

  for (const st of status ?? []) params.append('status[]', st)
  const data = await medusaGet(`/admin/products?${params}`, authorization)
  return (data.count ?? 0) as number
}

async function listFromMedusa(
  authorization: string,
  params: ListParams,
): Promise<AdminListResult> {
  const qs = new URLSearchParams({
    limit: String(params.limit ?? 20),
    offset: String(params.offset ?? 0),
    order: '-created_at',
    fields: LIST_FIELDS,
  })
  if (params.q) qs.set('q', params.q)
  for (const st of params.status ?? []) qs.append('status[]', st)

  if (params.q) {
    const page = await medusaGet(`/admin/products?${qs}`, authorization)
    const total = (page.count ?? 0) as number
    const name = (Object.entries(STATUS_TABS).find(
      ([, st]) => (st?.join(',') ?? '') === (params.status?.join(',') ?? ''),
    )?.[0] ?? 'All') as keyof AdminListResult['counts']
    return {
      products: (page.products ?? []).map((p: any) =>
        stripSearch(mapAdminListItem(p)),
      ),
      count: total,
      counts: { [name]: total } as AdminListResult['counts'],
    }
  }
  const tabs = Object.entries(STATUS_TABS) as [
    keyof typeof STATUS_TABS,
    readonly string[] | undefined,
  ][]
  const [page, ...tabCounts] = await Promise.all([
    medusaGet(`/admin/products?${qs}`, authorization),
    ...tabs.map(([, st]) =>
      countOnly(authorization, params.q, st).catch(() => 0),
    ),
  ])
  const counts = Object.fromEntries(
    tabs.map(([name], i) => [name, tabCounts[i]]),
  ) as AdminListResult['counts']
  return {
    products: (page.products ?? []).map((p: any) =>
      stripSearch(mapAdminListItem(p)),
    ),
    count: page.count ?? 0,
    counts,
  }
}

export async function getAdminProductList(
  authorization: string,
  params: ListParams,
): Promise<AdminListResult> {
  const snap = readSnapshot(authorization)
  if (snap) return listFromSnapshot(snap, params)
  return listFromMedusa(authorization, params)
}

const BRAND_SPORT_TTL_MS = 30 * 60 * 1000
const bsKey = '__smashBrandSportCache'
const bsg = globalThis as unknown as Record<
  string,
  { at: number; brands: string[]; sports: string[] } | undefined
>

async function getBrandSportOptions(authorization: string) {
  const items = state.items
  const brands = new Set<string>()
  const sports = new Set<string>()
  if (items) {
    for (const i of items) {
      if (typeof i.brand === 'string' && i.brand.trim())
        brands.add(i.brand.trim())
      if (typeof i.sport === 'string' && i.sport.trim())
        sports.add(i.sport.trim())
    }
  } else {
    const cached = bsg[bsKey]
    if (cached && Date.now() - cached.at < BRAND_SPORT_TTL_MS) {
      return { brands: cached.brands, sports: cached.sports }
    }

    const limit = 200
    let offset = 0
    let total = Infinity
    while (offset < total) {
      const r = await medusaGet(
        `/admin/products?limit=${limit}&offset=${offset}&fields=id,metadata`,
        authorization,
      )
      total = r.count ?? 0
      for (const p of r.products ?? []) {
        const b = p.metadata?.brand
        const s = p.metadata?.sport
        if (typeof b === 'string' && b.trim()) brands.add(b.trim())
        if (typeof s === 'string' && s.trim()) sports.add(s.trim())
      }
      offset += limit
    }
  }
  const out = {
    brands: [...brands].sort((a, b) => a.localeCompare(b)),
    sports: [...sports].sort((a, b) => a.localeCompare(b)),
  }
  bsg[bsKey] = { at: Date.now(), ...out }
  return out
}

export interface EditorData {
  product: any
  categories: {
    id: string
    name: string
    handle: string
    label: string
  }[]
  globalOptions: { id: string; title: string; values: string[] }[]

  productOptionValues: Record<string, string[]>
  brands: string[]
  sports: string[]
}

async function loadCategories(authorization: string) {
  const fields = 'id,name,handle,parent_category_id'
  const raw: any[] = []
  const limit = 100
  const first = await medusaGet(
    `/admin/product-categories?limit=${limit}&offset=0&fields=${fields}`,
    authorization,
  )
  raw.push(...(first.product_categories ?? []))
  const total = first.count ?? raw.length
  const offsets: number[] = []
  for (let o = limit; o < Math.min(total, 1000); o += limit) offsets.push(o)
  const rest = await Promise.all(
    offsets.map((o) =>
      medusaGet(
        `/admin/product-categories?limit=${limit}&offset=${o}&fields=${fields}`,
        authorization,
      ),
    ),
  )
  for (const r of rest) raw.push(...(r.product_categories ?? []))

  const nameById = new Map<string, string>(raw.map((c) => [c.id, c.name]))
  const cap = (t: string) => t.charAt(0).toUpperCase() + t.slice(1)
  return raw
    .map((c) => {
      const parentName = c.parent_category_id
        ? nameById.get(c.parent_category_id)
        : undefined
      const sportFromHandle = /^stringing-(.+)$/.exec(c.handle ?? '')?.[1]
      return {
        id: c.id as string,
        name: c.name as string,
        handle: (c.handle ?? '') as string,
        label: parentName
          ? `${parentName} › ${c.name}`
          : sportFromHandle
            ? `${cap(sportFromHandle)} › ${c.name}`
            : (c.name as string),
      }
    })
    .sort((a, b) => a.label.localeCompare(b.label))
}

async function loadOptionValues(
  authorization: string,
  optionIds: string[],
): Promise<Record<string, string[]>> {
  const out: Record<string, string[]> = {}
  if (optionIds.length === 0) return out

  try {
    const data = await medusaGet(
      '/admin/product-options?limit=200&fields=id,title,values.id,values.value',
      authorization,
    )
    const list = (data.product_options ?? []) as any[]
    if (list.length > 0 && list.every((o) => Array.isArray(o.values))) {
      for (const o of list) out[o.id] = o.values.map((v: any) => v.value)
    }
  } catch (err) {
    if (err instanceof AdminAuthError) throw err
  }

  const missing = optionIds.filter((id) => !(id in out))
  const LIMIT = 6
  for (let i = 0; i < missing.length; i += LIMIT) {
    await Promise.all(
      missing.slice(i, i + LIMIT).map(async (id) => {
        try {
          const data = await medusaGet(
            `/admin/product-options/${id}?fields=id,title,values.id,values.value`,
            authorization,
          )
          out[id] = (data.product_option?.values ?? []).map((v: any) => v.value)
        } catch (err) {
          console.warn('[admin-products] option values failed:', id, err)
          out[id] = []
        }
      }),
    )
  }
  return out
}

export async function getEditorData(
  authorization: string,
  productId: string,
): Promise<EditorData> {
  const productPart = async (label: string, fields: string) => {
    const startedAt = Date.now()
    try {
      return await medusaGet(
        `/admin/products/${productId}?fields=${encodeURIComponent(fields)}`,
        authorization,
      )
    } catch (err: any) {
      if (err instanceof AdminAuthError) throw err
      throw new Error(`Loading product ${label} failed: ${err?.message}`)
    } finally {
      const ms = Date.now() - startedAt
      if (ms > 1500) console.warn(`[admin-products] ${label} took ${ms}ms`)
    }
  }
  const baseProductPromise = productPart('base', PRODUCT_BASE_FIELDS)
  const variantsPromise = productPart('variants', PRODUCT_VARIANT_FIELDS)
  const variantOptionsPromise = productPart(
    'variant options',
    PRODUCT_VARIANT_OPTION_FIELDS,
  )
  const variantImagesPromise = productPart(
    'variant images',
    PRODUCT_VARIANT_IMAGE_FIELDS,
  )
  const optionsPromise = productPart('options', PRODUCT_OPTIONS_FIELDS)
  const channelsPromise = productPart('sales channels', PRODUCT_CHANNELS_FIELDS)
  // Tags are not worth blocking the whole page for: give them a short timeout
  // and, if they fail, flag it so the form leaves tags untouched on save.
  const tagsStartedAt = Date.now()
  const tagsPromise = medusaGet(
    `/admin/products/${productId}?fields=${encodeURIComponent(PRODUCT_TAGS_FIELDS)}`,
    authorization,
    TAGS_TIMEOUT_MS,
  )
    .then((res) => {
      const ms = Date.now() - tagsStartedAt
      if (ms > 1500) console.warn(`[admin-products] tags took ${ms}ms`)
      return res
    })
    .catch((err) => {
      if (err instanceof AdminAuthError) throw err
      console.error('[admin-products] tags failed:', err?.message)
      return null
    })

  const inventoryPromise = medusaGet(
    `/admin/products/${productId}?fields=${PRODUCT_INVENTORY_FIELDS}`,
    authorization,
    INVENTORY_TIMEOUT_MS,
  ).catch((err) => {
    if (err instanceof AdminAuthError) throw err
    console.error('[admin-products] inventory levels failed:', err?.message)
    return null
  })

  const [
    categories,
    optionList,
    brandSport,
    invRes,
    optionsRes,
    channelsRes,
    tagsRes,
    productRes,
    variantsRes,
    variantOptionsRes,
    variantImagesRes,
  ] = await Promise.all([
    loadCategories(authorization).catch((err) => {
      if (err instanceof AdminAuthError) throw err
      console.error('[admin-products] categories failed:', err)
      return []
    }),
    medusaGet(
      '/admin/product-options?limit=200&fields=id,title',
      authorization,
    ).catch((err) => {
      if (err instanceof AdminAuthError) throw err
      console.error('[admin-products] options failed:', err)
      return { product_options: [] }
    }),
    getBrandSportOptions(authorization).catch((err) => {
      if (err instanceof AdminAuthError) throw err
      console.error('[admin-products] brand/sport failed:', err)
      return { brands: [] as string[], sports: [] as string[] }
    }),
    inventoryPromise,
    optionsPromise,
    channelsPromise,
    tagsPromise,
    baseProductPromise,
    variantsPromise,
    variantOptionsPromise,
    variantImagesPromise,
  ])

  const product = productRes.product
  if (!product) throw new Error('Product not found')

  const optionsByVariant = new Map<string, any[]>(
    (variantOptionsRes.product?.variants ?? []).map((v: any) => [
      v.id,
      v.options ?? [],
    ]),
  )
  const imagesByVariant = new Map<string, any[]>(
    (variantImagesRes.product?.variants ?? []).map((v: any) => [
      v.id,
      v.images ?? [],
    ]),
  )
  product.variants = (variantsRes.product?.variants ?? []).map((v: any) => ({
    ...v,
    options: optionsByVariant.get(v.id) ?? [],
    images: imagesByVariant.get(v.id) ?? [],
  }))

  product.options = optionsRes.product?.options ?? []
  product.sales_channels = channelsRes.product?.sales_channels ?? []
  product.tags = tagsRes?.product?.tags ?? []
  if (!tagsRes) product.tags_load_failed = true

  if (product.variants) {
    const invById = new Map<string, any>(
      (invRes?.product?.variants ?? []).map((v: any) => [v.id, v]),
    )
    product.variants = product.variants.map((v: any) => {
      const iv = invById.get(v.id)
      if (!iv) return v
      const levels = iv.inventory_items?.[0]?.inventory?.location_levels ?? []
      const inventory_quantity = levels.reduce(
        (sum: number, l: any) =>
          sum + ((l.stocked_quantity ?? 0) - (l.reserved_quantity ?? 0)),
        0,
      )
      return { ...v, inventory_quantity }
    })
  }

  const globalList = (optionList.product_options ?? []) as {
    id: string
    title: string
  }[]
  const productOptionIds: string[] = (product.options ?? []).map(
    (o: any) => o.id,
  )

  const distinctIds = Array.from(
    new Set([...globalList.map((o) => o.id), ...productOptionIds]),
  )
  const valuesById = await loadOptionValues(authorization, distinctIds)

  return {
    product,
    categories,
    globalOptions: globalList.map((o) => ({
      id: o.id,
      title: o.title,
      values: valuesById[o.id] ?? [],
    })),
    productOptionValues: Object.fromEntries(
      productOptionIds.map((id) => [id, valuesById[id] ?? []]),
    ),
    brands: brandSport.brands,
    sports: brandSport.sports,
  }
}
