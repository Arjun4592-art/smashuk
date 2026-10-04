import 'server-only'
import { medusaServiceFetch } from '@/lib/api/medusa-service-token'
import {
  getDefaultMegaMenuConfig,
  sanitizeMegaMenuConfig,
  type MegaMenuConfig,
} from '@/lib/mega-menu-config'

// Why this lives on globalThis: Next compiles route handlers (the dashboard
// "save" API) and page/layout renders into separate module graphs, so a plain
// module-level variable is NOT shared between them. Clearing a module-level
// cache from the save route never reached the cache the website layout reads,
// and the old menu kept showing. globalThis is shared across both.
interface MenuStore {
  cached: MegaMenuConfig | null
  cachedAt: number
  inFlight: Promise<void> | null
  gen: number
}
const g = globalThis as unknown as { __megaMenuStore?: MenuStore }
const store: MenuStore = (g.__megaMenuStore ??= {
  cached: null,
  cachedAt: 0,
  inFlight: null,
  gen: 0,
})

const FRESH_MS = 30 * 1000
const RETRY_AFTER_ERROR_MS = 10 * 1000
const FETCH_TIMEOUT_MS = 2500

export function parseSavedMegaMenu(saved: unknown): MegaMenuConfig {
  const defaults = getDefaultMegaMenuConfig()
  if (!saved || typeof saved !== 'object') return defaults
  const cleaned = sanitizeMegaMenuConfig(saved)
  // An empty saved menu would blank the whole header, so fall back per part.
  return {
    menus: cleaned.menus.length > 0 ? cleaned.menus : defaults.menus,
    navLinks: Array.isArray((saved as any).navLinks)
      ? cleaned.navLinks
      : defaults.navLinks,
  }
}

async function refresh(): Promise<void> {
  const gen = store.gen
  try {
    const res = await medusaServiceFetch(
      '/admin/stores?limit=1&fields=id,metadata',
    )
    if (!res.ok) throw new Error(`Medusa stores error: ${res.status}`)
    const { stores } = await res.json()
    // A save happened while this request was running: its result is already
    // out of date, so drop it and let the next render fetch again.
    if (gen !== store.gen) return
    store.cached = parseSavedMegaMenu(stores?.[0]?.metadata?.megaMenu)
    store.cachedAt = Date.now()
  } catch (err) {
    console.error('[mega-menu] refresh failed:', err)
    if (gen !== store.gen) return
    // Keep the last good menu (or the defaults) and retry shortly.
    if (!store.cached) store.cached = getDefaultMegaMenuConfig()
    store.cachedAt = Date.now() - FRESH_MS + RETRY_AFTER_ERROR_MS
  } finally {
    if (gen === store.gen) store.inFlight = null
  }
}

export async function getMegaMenuConfig(): Promise<MegaMenuConfig> {
  if (store.cached && Date.now() - store.cachedAt < FRESH_MS)
    return store.cached
  if (!store.inFlight) store.inFlight = refresh()
  // Wait for fresh data (never serve a stale menu into a statically cached
  // page), but cap the wait so a slow Medusa can't hold the page hostage.
  await Promise.race([
    store.inFlight,
    new Promise((resolve) => setTimeout(resolve, FETCH_TIMEOUT_MS)),
  ])
  return store.cached ?? getDefaultMegaMenuConfig()
}

export function invalidateMegaMenuCache() {
  store.gen += 1
  store.cached = null
  store.cachedAt = 0
  store.inFlight = null
}
