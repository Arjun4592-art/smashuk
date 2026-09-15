import type { NextConfig } from 'next'
import path from 'path'

const nextConfig: NextConfig = {
  serverExternalPackages: ['isomorphic-dompurify', 'jsdom'],
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
      // Old Shopify static "Pages" (About, Store, etc.) were never migrated
      // by script — rebuilt manually under new routes, or folded into
      // existing collection/blog pages. One entry per old /pages/{handle}
      // URL still found in Google's index as of Sep 2026 — add more here
      // if Search Console turns up further stragglers.
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