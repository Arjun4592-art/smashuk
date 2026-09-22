import 'server-only'
import { medusaServiceFetch } from '@/lib/api/medusa-service-token'
import {
  DEFAULT_HERO_SLIDES,
  sanitizeHeroSlides,
  type HeroSlide,
} from '@/lib/hero-slides-shared'

// Home page hero slides, kept in the Medusa store metadata (same place as the
// promo banner) and edited from Dashboard → Marketing → Home Slider.
//
// The homepage HTML is cached (ISR) and re-rendered when the dashboard calls
// revalidatePath('/'). That re-render must see the slides that were JUST
// saved, so this deliberately does NOT do "serve stale, refresh in the
// background" — that would bake the old slides into the freshly regenerated
// page. The in-memory copy only lives a few seconds (module state isn't
// reliably shared between the API route and the page bundle, so the cache
// invalidation on save can't be relied on), and a render waits for the real
// answer unless Medusa is genuinely unreachable.

let cached: HeroSlide[] | null = null
let cachedAt = 0
let inFlight: Promise<void> | null = null
const FRESH_MS = 10 * 1000
const WAIT_MS = 8 * 1000

async function refresh(): Promise<void> {
  try {
    const res = await medusaServiceFetch(
      '/admin/stores?limit=1&fields=id,metadata',
    )
    if (!res.ok) throw new Error(`Medusa stores error: ${res.status}`)
    const { stores } = await res.json()
    const saved = sanitizeHeroSlides(stores?.[0]?.metadata?.heroSlides)
    // Nothing saved (or everything switched off): keep the built-in slides so
    // the homepage never ends up with an empty hero.
    cached = saved.some((s) => s.enabled) ? saved : DEFAULT_HERO_SLIDES
    cachedAt = Date.now()
  } catch (err) {
    console.error('[hero-slides] refresh failed:', err)
    if (!cached) cached = DEFAULT_HERO_SLIDES
    cachedAt = Date.now()
  } finally {
    inFlight = null
  }
}

function kickRefresh(): Promise<void> {
  if (!inFlight) inFlight = refresh()
  return inFlight
}

export async function getHeroSlides(): Promise<HeroSlide[]> {
  if (cached && Date.now() - cachedAt < FRESH_MS) return cached
  const pending = kickRefresh()
  await Promise.race([
    pending,
    new Promise((resolve) => setTimeout(resolve, WAIT_MS)),
  ])
  return cached ?? DEFAULT_HERO_SLIDES
}

export function invalidateHeroSlidesCache() {
  cached = null
  cachedAt = 0
  inFlight = null
}
