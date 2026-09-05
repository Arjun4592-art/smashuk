import 'server-only'
import { medusaServiceFetch } from '@/lib/api/medusa-service-token'
export const DEFAULT_SEO: Record<string, any> = {
  home: {
    metaTitle: 'Smash Racket Pro — Premium Sports Equipment UK',
    metaDescription:
      'Shop premium sports equipment for badminton, squash, tennis, padel and more. Free UK delivery over £50.',
    metaKeywords:
      'sports equipment uk, badminton rackets, squash rackets, sports shop uk, smash racket pro',
    ogImage: '',
    canonical: 'https://smashpro.co.uk',
    noIndex: false,
  },
  shop: {
    metaTitle: 'Buy Sports Equipment Online — Smash Racket Pro UK',
    metaDescription:
      'Browse premium sports products across all categories. Best prices with free delivery over £50.',
    metaKeywords:
      'buy sports online uk, sports equipment shop, smash racket pro',
    ogImage: '',
    canonical: 'https://smashpro.co.uk/shop',
    noIndex: false,
  },
  collections: {
    metaTitle: 'Shop All Collections — Smash Racket Pro',
    metaDescription:
      'Browse every badminton, tennis, padel and clothing collection at Smash Racket Pro — rackets, shoes, bags, balls and accessories by brand, sport and category.',
    metaKeywords:
      'sports collections uk, badminton collections, tennis collections, smash racket pro',
    ogImage: '',
    canonical: 'https://smashpro.co.uk/collections',
    noIndex: false,
  },
  about: {
    metaTitle: 'About Us — Smash Racket Pro UK',
    metaDescription:
      'Smash Racket Pro is your trusted UK sports equipment store. We stock premium gear for all racket sports.',
    metaKeywords: 'smash racket pro about, uk sports store',
    ogImage: '',
    canonical: 'https://smashpro.co.uk/about',
    noIndex: false,
  },
  contact: {
    metaTitle: 'Contact Us — Smash Racket Pro UK',
    metaDescription:
      'Get in touch with Smash Racket Pro for orders, returns, and enquiries.',
    metaKeywords: 'smash racket pro contact, sports equipment enquiry',
    ogImage: '',
    canonical: 'https://smashpro.co.uk/contact',
    noIndex: false,
  },
  'local-store': {
    metaTitle:
      'Manchester Racket Store — Restringing, Demo & Advice | Smash Racket Pro',
    metaDescription:
      'Visit our Manchester racket specialist store for badminton, tennis, squash and padel. Same/next-day racket restringing, free expert advice from club-level players, and a racket demo service so you can try before you buy.',
    metaKeywords:
      'manchester racket shop, racket restringing manchester, badminton restring manchester, tennis racket restring, racket stringing service uk, racket demo service, badminton shop manchester, tennis shop manchester, padel shop manchester, squash shop manchester, racket sports store near me, string a racket manchester, hulme high street sports shop',
    ogImage: '',
    canonical: 'https://smashpro.co.uk/local-store',
    noIndex: false,
  },
}
let cached: Record<string, any> | null = null
let cachedAt = 0
const CACHE_MS = 5 * 60 * 1000
export async function readSeoConfig(): Promise<Record<string, any>> {
  if (cached && Date.now() - cachedAt < CACHE_MS) {
    return cached
  }
  try {
    const res = await medusaServiceFetch(
      '/admin/stores?limit=1&fields=id,metadata',
    )
    if (!res.ok) throw new Error(`Medusa stores error: ${res.status}`)
    const { stores } = await res.json()
    const config = stores?.[0]?.metadata?.seoConfig ?? DEFAULT_SEO
    cached = config
    cachedAt = Date.now()
    return config
  } catch (err) {
    console.error('[seo-config] Falling back to defaults:', err)
    return DEFAULT_SEO
  }
}
export function invalidateSeoConfigCache() {
  cached = null
  cachedAt = 0
}
