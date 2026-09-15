import 'server-only'
import { medusaServiceFetch } from '@/lib/api/medusa-service-token'

export interface PromoBannerConfig {
  enabled: boolean
  eyebrow: string
  heading: string
  subtext: string
  code: string
  discountLabel: string
  ctaText: string
  ctaLink: string
}

export const DEFAULT_PROMO_BANNER: PromoBannerConfig = {
  enabled: true,
  eyebrow: 'Limited Time Offer',
  heading: 'UP TO 10% OFF',
  subtext: 'On selected sports equipment',
  code: 'SMASH10',
  discountLabel: '10% off',
  ctaText: 'Shop Sale Now →',
  ctaLink: '/shop?badge=SALE',
}

let cached: PromoBannerConfig | null = null
let cachedAt = 0
let inFlight: Promise<void> | null = null
const FRESH_MS = 5 * 60 * 1000
// How long a stale entry may still be served while a refresh runs behind it.
const STALE_MS = 60 * 60 * 1000
// Hard ceiling on how long a page render may ever wait on this.
const FIRST_FETCH_TIMEOUT_MS = 1500

async function refresh(): Promise<void> {
  try {
    const res = await medusaServiceFetch(
      '/admin/stores?limit=1&fields=id,metadata',
    )
    if (!res.ok) throw new Error(`Medusa stores error: ${res.status}`)
    const { stores } = await res.json()
    const saved = stores?.[0]?.metadata?.promoBanner
    cached = saved ? { ...DEFAULT_PROMO_BANNER, ...saved } : DEFAULT_PROMO_BANNER
    cachedAt = Date.now()
  } catch (err) {
    console.error('[promo-banner] refresh failed:', err)
    // Push cachedAt forward so a hard-down Medusa doesn't make every single
    // render retry the admin login.
    if (!cached) {
      cached = DEFAULT_PROMO_BANNER
      cachedAt = Date.now()
    }
  } finally {
    inFlight = null
  }
}

function kickRefresh(): Promise<void> {
  if (!inFlight) inFlight = refresh()
  return inFlight
}

// PERF: this runs in app/(website)/layout.tsx, so it sits in front of EVERY
// render in the website group — including every `?_rsc=` prefetch the router
// fires for /cart, /shop, product links and so on. medusaServiceFetch is an
// *admin* call: on a cold process it first POSTs /auth/user/emailpass (a bcrypt
// password verify on the Medusa side, a few hundred ms on its own) and only
// then hits /admin/stores. The old module-level cache helped a warm process,
// but every cold instance — and on serverless that's most of them — paid the
// full login + fetch synchronously before a single byte of HTML went out.
//
// Now: fresh -> return immediately. Stale -> return the stale value and
// refresh in the background. Cold -> wait, but only up to
// FIRST_FETCH_TIMEOUT_MS, then fall back to the default banner rather than
// holding the whole page hostage. A promo banner is not worth a blocked render.
export async function getPromoBanner(): Promise<PromoBannerConfig> {
  const age = Date.now() - cachedAt
  if (cached && age < FRESH_MS) return cached
  if (cached && age < STALE_MS) {
    void kickRefresh()
    return cached
  }
  const pending = kickRefresh()
  await Promise.race([
    pending,
    new Promise((resolve) => setTimeout(resolve, FIRST_FETCH_TIMEOUT_MS)),
  ])
  return cached ?? DEFAULT_PROMO_BANNER
}

export function invalidatePromoBannerCache() {
  cached = null
  cachedAt = 0
  inFlight = null
}
