// lib/seo-config.ts
//
// Shared SEO config read helper. Both app/api/admin/seo/route.ts (the
// admin-facing CRUD API) and lib/seo.ts (server-rendered generateMetadata
// helpers) need the same data.
//
// BUG FIX: this used to read/write `public/seo-config.json` via Node's
// `fs`. That has two real problems: (1) most serverless hosts (incl.
// Vercel, this app's stated deploy target) have a READ-ONLY filesystem at
// request time except `/tmp`, so every SEO save would fail once deployed
// even though it worked in local `next dev`; (2) anything under `public/`
// is served as a static file at the site root by default, so a file
// written there could end up reachable at a public URL. This now reads
// from Medusa's own `store.metadata` (genuine Postgres persistence via
// Medusa, never served as a static asset) — the same mechanism
// lib/store-contact.ts and app/api/admin/general-settings/route.ts use.

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

// Cache briefly — this feeds generateMetadata() on every page render.
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
