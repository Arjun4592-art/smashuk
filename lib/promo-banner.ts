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
const CACHE_MS = 5 * 60 * 1000

export async function getPromoBanner(): Promise<PromoBannerConfig> {
  if (cached && Date.now() - cachedAt < CACHE_MS) {
    return cached
  }
  try {
    const res = await medusaServiceFetch(
      '/admin/stores?limit=1&fields=id,metadata',
    )
    if (!res.ok) throw new Error(`Medusa stores error: ${res.status}`)
    const { stores } = await res.json()
    const saved = stores?.[0]?.metadata?.promoBanner
    const config: PromoBannerConfig = saved
      ? { ...DEFAULT_PROMO_BANNER, ...saved }
      : DEFAULT_PROMO_BANNER
    cached = config
    cachedAt = Date.now()
    return config
  } catch (err) {
    console.error('[promo-banner] Falling back to default:', err)
    return DEFAULT_PROMO_BANNER
  }
}

export function invalidatePromoBannerCache() {
  cached = null
  cachedAt = 0
}
