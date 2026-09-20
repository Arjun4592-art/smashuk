import 'server-only'
import type { Product } from '@/types'
import { STORE_PRODUCT_LISTING_FIELDS, normalizeProduct } from '@/lib/api/store'
import { safeJson } from '@/lib/api/safe-json'

const MEDUSA_URL =
  process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL ?? 'http://localhost:9000'
const PUBLISHABLE_KEY = process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY ?? ''
const STORE_HEADERS = {
  'Content-Type': 'application/json',
  'x-publishable-api-key': PUBLISHABLE_KEY,
}

const PAGE_SIZE = 100
const CONCURRENCY = 5

/**
 * The full normalised catalogue, held on the server.
 *
 * Previously every visitor's browser fetched the entire catalogue and filtered
 * it in JavaScript. Now it is built once per REFRESH_MS on the server and
 * shared by everyone; the browser receives one page of results plus facets.
 *
 * CACHING (read before changing):
 *   - This module-level snapshot is the ONLY server-side cache layer. The page
 *     fetches below use `cache: 'no-store'` on purpose. They used to carry
 *     `next: { revalidate: 300 }` as well, but Next's Data Cache is
 *     stale-while-revalidate too, so a rebuild could re-read an already-stale
 *     copy and stamp it as "fresh" for another REFRESH_MS. Two stacked caches
 *     made a dashboard change take 5-15 minutes to appear on the shop.
 *   - The state lives on `globalThis`, so every route handler / dev-mode
 *     module reload sees the SAME snapshot. A plain module variable can be
 *     duplicated per bundle, which would make invalidateCatalog() clear one
 *     copy while /api/store/catalog keeps serving another.
 *   - invalidateCatalog() is called by the admin product / inventory routes
 *     after every write. It bumps `generation`; getCatalog() refuses to serve a
 *     snapshot built for an older generation, so the very next shop request
 *     after an admin change gets fresh data (it waits for the rebuild instead
 *     of being handed the stale copy).
 *   - Changes that do NOT go through our admin routes (a customer checkout
 *     reducing stock, edits made directly in Medusa admin) are picked up by
 *     the normal REFRESH_MS timer.
 */
const REFRESH_MS = 2 * 60 * 1000
const STALE_MS = 30 * 60 * 1000

type CatalogState = {
  regionId: string | null
  snapshot: Product[] | null
  snapshotAt: number
  inFlight: Promise<void> | null
  /** Bumped by invalidateCatalog(). */
  generation: number
  /** The generation the current snapshot was built for. */
  builtGeneration: number
}

const globalKey = '__smashCatalogState'
const g = globalThis as unknown as Record<string, CatalogState | undefined>
const state: CatalogState = (g[globalKey] ??= {
  regionId: null,
  snapshot: null,
  snapshotAt: 0,
  inFlight: null,
  generation: 0,
  builtGeneration: 0,
})

async function fetchPage(offset: number, limit: number) {
  const params = new URLSearchParams({
    limit: String(limit),
    offset: String(offset),
    fields: STORE_PRODUCT_LISTING_FIELDS,
  })
  if (state.regionId) params.set('region_id', state.regionId)
  const res = await fetch(`${MEDUSA_URL}/store/products?${params}`, {
    headers: STORE_HEADERS,
    // See CACHING note above: the snapshot is the cache, don't stack another.
    cache: 'no-store',
  })
  if (!res.ok) throw new Error(`Medusa products error: ${res.status}`)
  const data = await safeJson(res, 'lib/catalog/source.ts')
  return {
    products: (data.products ?? []) as any[],
    count: (data.count ?? 0) as number,
  }
}

async function ensureRegion() {
  if (state.regionId) return
  try {
    const res = await fetch(`${MEDUSA_URL}/store/regions?limit=1`, {
      headers: STORE_HEADERS,
      next: { revalidate: 300 },
    })
    if (!res.ok) return
    const data = await safeJson(res, 'lib/catalog/source.ts')
    state.regionId = data.regions?.[0]?.id ?? null
  } catch {
    state.regionId = null
  }
}

async function rebuild(): Promise<void> {
  // Remember which generation this build started under. If invalidateCatalog()
  // runs while we're fetching, the result is already out of date and
  // getCatalog() will run another build.
  const startedGeneration = state.generation
  try {
    await ensureRegion()
    const first = await fetchPage(0, PAGE_SIZE)
    const raw = [...first.products]
    const offsets: number[] = []
    for (let o = PAGE_SIZE; o < first.count; o += PAGE_SIZE) offsets.push(o)
    for (let i = 0; i < offsets.length; i += CONCURRENCY) {
      const batch = offsets.slice(i, i + CONCURRENCY)
      const results = await Promise.all(
        batch.map((offset) => fetchPage(offset, PAGE_SIZE)),
      )
      for (const r of results) raw.push(...r.products)
    }
    state.snapshot = raw.map(normalizeProduct)
    state.snapshotAt = Date.now()
    state.builtGeneration = startedGeneration
  } catch (err) {
    console.error('[catalog] rebuild failed:', err)
    // Leave the previous snapshot in place if there is one — serving slightly
    // stale products beats serving an empty shop because Medusa blipped.
    if (!state.snapshot) throw err
  } finally {
    state.inFlight = null
  }
}

function kickRebuild(): Promise<void> {
  if (!state.inFlight) state.inFlight = rebuild()
  return state.inFlight
}

export async function getCatalog(): Promise<Product[]> {
  const age = Date.now() - state.snapshotAt
  const dirty = state.builtGeneration !== state.generation
  if (state.snapshot && !dirty && age < REFRESH_MS) return state.snapshot
  if (state.snapshot && !dirty && age < STALE_MS) {
    // Stale but usable: answer now, refresh behind the response. No shopper
    // should ever be the one who waits for a routine catalogue rebuild.
    void kickRebuild().catch(() => {})
    return state.snapshot
  }
  // Either there is no snapshot, it is too old, or an admin change has
  // invalidated it. Wait for a build made AFTER the invalidation. The loop
  // covers a build that was already in flight when the invalidation landed.
  for (let attempt = 0; attempt < 3; attempt++) {
    await kickRebuild()
    if (state.builtGeneration === state.generation) break
  }
  return state.snapshot ?? []
}

/**
 * Call after any write that changes what the shop should show (product
 * create / edit / delete, stock changes). Marks the snapshot as out of date
 * and starts rebuilding straight away, so by the time the admin opens the
 * website the fresh catalogue is usually already built.
 */
export function invalidateCatalog() {
  state.generation += 1
  void kickRebuild().catch(() => {})
}
