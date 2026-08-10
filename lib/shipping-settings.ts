// lib/shipping-settings.ts
//
// SERVER-ONLY. Reads the store's real Free Shipping Threshold from
// Medusa (store.metadata.shippingSettings.freeShippingThreshold — the same
// field the dashboard's Settings > Shipping page reads and writes via
// /api/admin/shipping-settings) so public-facing pages (cart, checkout)
// show whatever the store owner actually configured.
//
// BUG FIX: the cart and checkout pages used to import a hardcoded
// FREE_SHIPPING_THRESHOLD constant directly. The dashboard's "Free
// Shipping Threshold" field saved fine and showed a success toast, but
// had zero effect on the live site — it was reading/writing a completely
// different value than the one actually used at checkout. This file is
// the missing link between the two.
//
// Falls back to the FREE_SHIPPING_THRESHOLD constant if the store hasn't
// explicitly set one yet, so the site never breaks or shows £0.

import 'server-only'
import { medusaServiceFetch } from '@/lib/api/medusa-service-token'
import { FREE_SHIPPING_THRESHOLD } from '@/lib/constants'

// Cache for a few minutes — this is called on cart/checkout renders, and
// the threshold changes rarely.
let cached: number | null = null
let cachedAt = 0
const CACHE_MS = 5 * 60 * 1000

export async function getPublicFreeShippingThreshold(): Promise<number> {
  if (cached !== null && Date.now() - cachedAt < CACHE_MS) {
    return cached
  }

  try {
    const res = await medusaServiceFetch(
      '/admin/stores?limit=1&fields=id,metadata',
    )
    if (!res.ok) throw new Error(`Medusa stores error: ${res.status}`)

    const { stores } = await res.json()
    const raw = stores?.[0]?.metadata?.shippingSettings?.freeShippingThreshold
    const parsed = raw !== undefined ? Number(raw) : NaN
    const result = Number.isFinite(parsed) ? parsed : FREE_SHIPPING_THRESHOLD

    cached = result
    cachedAt = Date.now()
    return result
  } catch (err) {
    console.error('[shipping-settings] Falling back to default threshold:', err)
    // Don't cache the failure — retry on the next request instead of
    // being stuck on the fallback for CACHE_MS if it was just transient.
    return FREE_SHIPPING_THRESHOLD
  }
}
