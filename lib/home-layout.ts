import 'server-only'
import { medusaServiceFetch } from '@/lib/api/medusa-service-token'
import { DEFAULT_PROMO_BANNER } from '@/lib/promo-banner'
import {
  buildDefaultHomeLayout,
  resolveHomeLayout,
  sanitizeHomeLayout,
  type HomeLayout,
  type LegacyPromoBanner,
} from '@/lib/home-layout-shared'

let cached: HomeLayout | null = null
let cachedAt = 0
let inFlight: Promise<void> | null = null
const FRESH_MS = 10 * 1000
const WAIT_MS = 8 * 1000

function legacyPromoFrom(raw: unknown): LegacyPromoBanner {
  const merged = {
    ...DEFAULT_PROMO_BANNER,
    ...(raw && typeof raw === 'object' ? (raw as object) : {}),
  }
  return {
    enabled: merged.enabled !== false,
    eyebrow: merged.eyebrow ?? '',
    heading: merged.heading ?? '',
    subtext: merged.subtext ?? '',
    code: merged.code ?? '',
    ctaText: merged.ctaText ?? '',
    ctaLink: merged.ctaLink ?? '',
  }
}

function fallbackLayout(): HomeLayout {
  return resolveHomeLayout(
    buildDefaultHomeLayout(),
    legacyPromoFrom(DEFAULT_PROMO_BANNER),
  )
}

async function refresh(): Promise<void> {
  try {
    const res = await medusaServiceFetch(
      '/admin/stores?limit=1&fields=id,metadata',
    )
    if (!res.ok) throw new Error(`Medusa stores error: ${res.status}`)
    const { stores } = await res.json()
    const metadata = stores?.[0]?.metadata
    const saved = sanitizeHomeLayout(metadata?.homeLayout)
    // Nothing saved, or nothing switched on: keep the built-in layout so the
    // homepage can never end up blank.
    const layout =
      saved && saved.blocks.some((b) => b.enabled)
        ? saved
        : buildDefaultHomeLayout()
    cached = resolveHomeLayout(layout, legacyPromoFrom(metadata?.promoBanner))
    cachedAt = Date.now()
  } catch (err) {
    console.error('[home-layout] refresh failed:', err)
    if (!cached) cached = fallbackLayout()
    cachedAt = Date.now()
  } finally {
    inFlight = null
  }
}

function kickRefresh(): Promise<void> {
  if (!inFlight) inFlight = refresh()
  return inFlight
}

export async function getHomeLayout(): Promise<HomeLayout> {
  if (cached && Date.now() - cachedAt < FRESH_MS) return cached
  const pending = kickRefresh()
  await Promise.race([
    pending,
    new Promise((resolve) => setTimeout(resolve, WAIT_MS)),
  ])
  return cached ?? fallbackLayout()
}

export function invalidateHomeLayoutCache() {
  cached = null
  cachedAt = 0
  inFlight = null
}
