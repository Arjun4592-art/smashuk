import 'server-only'
import type { Product } from '@/types'
import {
  STORE_PRODUCT_LISTING_FIELDS,
  normalizeProduct,
} from '@/lib/api/store'
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
 * This is the piece that changes the shape of the problem. Previously every
 * visitor's browser fetched the entire catalogue — roughly 17 sequential-ish
 * round trips of 100 products each — and then filtered it in JavaScript. That
 * cost was paid per visitor, per page load, on whatever device and connection
 * they happened to have.
 *
 * Now it is paid once per REFRESH_MS, on the server, and shared by everyone.
 * The browser receives one page of results and a small facet object.
 *
 * Two layers of caching sit under this:
 *   - the module-level snapshot below (fast path, per process)
 *   - Next's Data Cache on the individual page fetches (`revalidate: 300`),
 *     which is what makes a cold process cheap to warm rather than a full
 *     catalogue scan against Medusa
 * and the /api/store/catalog route adds `s-maxage` on top so the CDN absorbs
 * most repeat traffic before any of this runs at all.
 */
const REFRESH_MS = 5 * 60 * 1000
const STALE_MS = 60 * 60 * 1000

let regionId: string | null = null
let snapshot: Product[] | null = null
let snapshotAt = 0
let inFlight: Promise<void> | null = null

async function fetchPage(offset: number, limit: number) {
  const params = new URLSearchParams({
    limit: String(limit),
    offset: String(offset),
    fields: STORE_PRODUCT_LISTING_FIELDS,
  })
  if (regionId) params.set('region_id', regionId)
  const res = await fetch(`${MEDUSA_URL}/store/products?${params}`, {
    headers: STORE_HEADERS,
    next: { revalidate: 300 },
  })
  if (!res.ok) throw new Error(`Medusa products error: ${res.status}`)
  const data = await safeJson(res, 'lib/catalog/source.ts')
  return {
    products: (data.products ?? []) as any[],
    count: (data.count ?? 0) as number,
  }
}

async function ensureRegion() {
  if (regionId) return
  try {
    const res = await fetch(`${MEDUSA_URL}/store/regions?limit=1`, {
      headers: STORE_HEADERS,
      next: { revalidate: 300 },
    })
    if (!res.ok) return
    const data = await safeJson(res, 'lib/catalog/source.ts')
    regionId = data.regions?.[0]?.id ?? null
  } catch {
    regionId = null
  }
}

async function rebuild(): Promise<void> {
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
    snapshot = raw.map(normalizeProduct)
    snapshotAt = Date.now()
  } catch (err) {
    console.error('[catalog] rebuild failed:', err)
    // Leave the previous snapshot in place if there is one — serving slightly
    // stale products beats serving an empty shop because Medusa blipped.
    if (!snapshot) throw err
  } finally {
    inFlight = null
  }
}

function kickRebuild(): Promise<void> {
  if (!inFlight) inFlight = rebuild()
  return inFlight
}

export async function getCatalog(): Promise<Product[]> {
  const age = Date.now() - snapshotAt
  if (snapshot && age < REFRESH_MS) return snapshot
  if (snapshot && age < STALE_MS) {
    // Stale but usable: answer now, refresh behind the response. No shopper
    // should ever be the one who waits for a catalogue rebuild.
    void kickRebuild().catch(() => {})
    return snapshot
  }
  await kickRebuild()
  return snapshot ?? []
}

export function invalidateCatalog() {
  snapshot = null
  snapshotAt = 0
  inFlight = null
}
