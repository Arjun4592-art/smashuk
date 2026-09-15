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
      // Catch-all for every other old Shopify /collections/{handle} URL.
      // The new site has no per-collection pages (filtering now happens via
      // /shop?sport=&category= query params), so there's no exact 1:1
      // mapping. Sending these to /shop (rather than leaving them as 404s)
      // preserves link equity and avoids sending Google-indexed / bookmarked
      // links to a dead page. Must come AFTER the more specific
      // '/collections/all' rule above, since Next matches redirects in order.
      {
        source: '/collections/:handle',
        destination: '/shop',
        permanent: true,
      },
    ]
  },
}

export default nextConfig