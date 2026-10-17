import type { MetadataRoute } from 'next'
import { SITE_URL } from '@/lib/constants'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        // Trailing-slash-only rules ('/checkout/') left '/checkout', '/orders'
        // etc. crawlable. '$' variants cover the bare paths exactly without
        // catching unrelated prefixes.
        disallow: [
          '/dashboard/',
          '/dashboard$',
          '/pos/',
          '/pos$',
          '/api/',
          '/checkout',
          '/cart',
          '/orders',
          '/profile',
          '/wishlist',
          '/track',
          '/login',
          '/register',
          '/maintenance',
        ],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
  }
}
