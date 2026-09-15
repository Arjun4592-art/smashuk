import type { NextConfig } from 'next'
import path from 'path'

const EXTRA_IMAGE_HOSTS = (process.env.NEXT_PUBLIC_IMAGE_HOSTS ?? 'cdn.shopify.com')
  .split(',')
  .map((h) => h.trim())
  .filter(Boolean)

const medusaHost = (() => {
  try {
    return new URL(process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL ?? '').hostname
  } catch {
    return null
  }
})()

const imageHosts = [...new Set([...EXTRA_IMAGE_HOSTS, ...(medusaHost ? [medusaHost] : [])])]

const nextConfig: NextConfig = {
  serverExternalPackages: ['isomorphic-dompurify', 'jsdom'],
  images: {
    // next/image was previously unconfigured, so every product shot was served
    // as the full-size original. remotePatterns is what unlocks resizing +
    // AVIF/WebP + srcset for these hosts.
    remotePatterns: imageHosts.map((hostname) => ({
      protocol: 'https' as const,
      hostname,
    })),
    // Next 16 narrowed the default to [75] and coerces `quality` to the nearest
    // configured value; stating it explicitly avoids the un-configured-qualities
    // error if anyone passes a different number later.
    qualities: [75],
    formats: ['image/avif', 'image/webp'],
    minimumCacheTTL: 60 * 60 * 24 * 30,
  },
  turbopack: {
    root: path.join(__dirname),
  },
  async redirects() {
    return [
      // Old Shopify product URLs (/products/{handle}) → new /shop/{handle}.
      // Handles must match — if any got renamed during migration these
      // need explicit source/destination pairs added above the wildcard.
      {
        source: '/products/:handle',
        destination: '/shop/:handle',
        permanent: true,
      },
      // Old Shopify blog URLs (/blogs/{blog}/{article}) → new /blog/{slug}
      {
        source: '/blogs/:blog/:article',
        destination: '/blog/:article',
        permanent: true,
      },
      // Shopify's "all products" collection has no direct equivalent
      {
        source: '/collections/all',
        destination: '/shop',
        permanent: true,
      },
      {
        source: '/pages/manchester-store-page',
        destination: '/local-store',
        permanent: true,
      },
      {
        source: '/pages/manchester-padel-store',
        destination: '/local-store/padel-store',
        permanent: true,
      },
      {
        source: '/pages/tennis-stringing-page',
        destination: '/local-store/stringing/tennis',
        permanent: true,
      },
      {
        source: '/pages/badminton-stringing-services',
        destination: '/local-store/stringing/badminton',
        permanent: true,
      },
      {
        source: '/pages/squash-stringing-service',
        destination: '/local-store/stringing/squash',
        permanent: true,
      },
      {
        source: '/pages/tennis-store-page',
        destination: '/shop?sport=tennis',
        permanent: true,
      },
      {
        source: '/pages/badminton-store-page',
        destination: '/shop?sport=badminton',
        permanent: true,
      },
      {
        source: '/pages/badminton-racket-guide',
        destination: '/blog/badminton-racket-guide',
        permanent: true,
      },
      {
        source: '/pages/terms-and-conditions',
        destination: '/terms',
        permanent: true,
      },
      {
        source: '/pages/delivery-information',
        destination: '/shipping',
        permanent: true,
      },
      {
        source: '/pages/refund-and-return-policy',
        destination: '/returns',
        permanent: true,
      },
    ]
  },
}

export default nextConfig