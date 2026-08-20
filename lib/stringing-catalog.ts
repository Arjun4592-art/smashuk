// lib/stringing-catalog.ts
//
// SERVER-ONLY. Manages the manually-editable catalog of individual strings
// (company/brand + model, per racket sport) that show as "Available" or
// "Currently unavailable" on the public stringing booking form.
//
// This is DIFFERENT from the 3 "Stringing Service" Medusa products created
// by /api/admin/services/seed-stringing (those are the bookable/payable
// SKUs — Badminton £16, Tennis £22, Squash £22). This catalog is just the
// list of specific strings customers can pick from when booking one of
// those services — e.g. "Yonex — BG 65", "Ashaway — Zymax 69" — each
// toggleable on/off depending on real stock, without needing a separate
// Medusa product per string.
//
// Storage: same pattern as lib/store-contact.ts — persisted in Medusa's
// store.metadata (genuine Postgres column via Medusa), key
// `stringing_catalog`. No separate DB table needed.
//
// Seed data: on first read, if the store has no catalog saved yet, we seed
// it from the existing static brand/model lists in lib/stringing-options.ts
// (all marked available: true) so nothing that's already listed on the
// /local-store/stringing/{sport} guide pages disappears from day one.

import 'server-only'
import { medusaServiceFetch } from '@/lib/api/medusa-service-token'
import {
  BADMINTON_STRING_BRANDS,
  TENNIS_STRING_BRANDS,
  SQUASH_BRANDS,
} from '@/lib/stringing-options'
// Types live in a separate, non-server-only file so client components can
// import the shape without ever pulling in this server-only module — see
// lib/stringing-catalog-types.ts for why.
import type { StringCatalogItem } from '@/lib/stringing-catalog-types'
export type { StringCatalogItem } from '@/lib/stringing-catalog-types'

function slugify(...parts: string[]) {
  return parts
    .join('-')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
}

// Flatten the existing static guide-page data into the seed catalog.
// Squash's source data (SQUASH_BRANDS) only lists brand names, not
// individual models — seeded as one generic entry per brand.
function buildSeedCatalog(): StringCatalogItem[] {
  const items: StringCatalogItem[] = []

  for (const b of BADMINTON_STRING_BRANDS) {
    for (const model of b.items ?? []) {
      items.push({
        id: slugify('badminton', b.brand, model),
        sport: 'badminton',
        brand: b.brand,
        name: model,
        available: true,
      })
    }
  }

  for (const b of TENNIS_STRING_BRANDS) {
    const models = b.groups ? b.groups.flatMap((g) => g.items) : (b.items ?? [])
    for (const model of models) {
      items.push({
        id: slugify('tennis', b.brand, model),
        sport: 'tennis',
        brand: b.brand,
        name: model,
        available: true,
      })
    }
  }

  for (const brand of SQUASH_BRANDS) {
    items.push({
      id: slugify('squash', brand, 'general'),
      sport: 'squash',
      brand,
      name: 'General stock',
      available: true,
    })
  }

  return items
}

// Cache for a few minutes — read on every stringing booking-form mount.
let cached: StringCatalogItem[] | null = null
let cachedAt = 0
const CACHE_MS = 2 * 60 * 1000

function invalidateCache() {
  cached = null
  cachedAt = 0
}

export async function getStringingCatalog(): Promise<StringCatalogItem[]> {
  if (cached && Date.now() - cachedAt < CACHE_MS) {
    return cached
  }

  try {
    const res = await medusaServiceFetch(
      '/admin/stores?limit=1&fields=id,metadata',
    )
    if (!res.ok) throw new Error(`Medusa stores error: ${res.status}`)

    const { stores } = await res.json()
    const store = stores?.[0]
    const saved: StringCatalogItem[] | undefined =
      store?.metadata?.stringing_catalog

    const result =
      Array.isArray(saved) && saved.length ? saved : buildSeedCatalog()

    cached = result
    cachedAt = Date.now()
    return result
  } catch (err) {
    console.error('[stringing-catalog] Falling back to seed data:', err)
    // Don't cache the failure — retry next request instead of being stuck.
    return buildSeedCatalog()
  }
}

export async function saveStringingCatalog(
  items: StringCatalogItem[],
  authorization: string,
): Promise<void> {
  const MEDUSA_URL =
    process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL ?? 'http://localhost:9000'

  const storesRes = await fetch(
    `${MEDUSA_URL}/admin/stores?limit=1&fields=id,metadata`,
    { headers: { Authorization: authorization } },
  )
  if (!storesRes.ok) throw new Error('Failed to load store')
  const { stores } = await storesRes.json()
  const store = stores?.[0]
  if (!store) throw new Error('No store found')

  const res = await fetch(`${MEDUSA_URL}/admin/stores/${store.id}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: authorization,
    },
    body: JSON.stringify({
      metadata: { ...store.metadata, stringing_catalog: items },
    }),
  })
  if (!res.ok) {
    const data = await res.json().catch(() => ({}))
    throw new Error(data.message ?? 'Failed to save stringing catalog')
  }

  invalidateCache()
}
