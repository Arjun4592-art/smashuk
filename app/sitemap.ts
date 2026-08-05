import type { MetadataRoute } from 'next'
import { SITE_URL, SPORTS } from '@/lib/constants'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticPages = [
    { url: SITE_URL, priority: 1.0, changeFrequency: 'daily' as const },
    {
      url: `${SITE_URL}/shop`,
      priority: 0.9,
      changeFrequency: 'daily' as const,
    },
    {
      url: `${SITE_URL}/about`,
      priority: 0.6,
      changeFrequency: 'monthly' as const,
    },
  ]

  const sportPages = SPORTS.map((sport) => ({
    url: `${SITE_URL}/shop/${sport.slug}`,
    priority: 0.8,
    changeFrequency: 'weekly' as const,
  }))

  // Dynamic product pages
  let productPages: MetadataRoute.Sitemap = []
  try {
    const res = await fetch(`${SITE_URL}/api/admin/products?limit=500`, {
      next: { revalidate: 3600 },
    })
    if (res.ok) {
      const data = await res.json()
      productPages = (data.products ?? []).map((p: any) => ({
        url: `${SITE_URL}/shop/product/${p.id}`,
        lastModified: new Date(p.updated_at ?? Date.now()),
        changeFrequency: 'weekly' as const,
        priority: 0.7,
      }))
    }
  } catch {
    // If product fetch fails, generate the sitemap without products
  }

  return [
    ...staticPages.map((p) => ({
      url: p.url,
      lastModified: new Date(),
      changeFrequency: p.changeFrequency,
      priority: p.priority,
    })),
    ...sportPages.map((p) => ({
      url: p.url,
      lastModified: new Date(),
      changeFrequency: p.changeFrequency,
      priority: p.priority,
    })),
    ...productPages,
  ]
}
