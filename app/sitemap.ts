import type { MetadataRoute } from 'next'
import { SITE_URL } from '@/lib/constants'
import { getAllCollectionHandles } from '@/lib/collections-data'
import { discoverStaticPages } from '@/lib/discover-pages'
import { getBlogPosts } from '@/lib/blog-posts'

// Priority/frequency per top-level static path. Anything not listed here
// (e.g. deeper local-store sub-pages) falls back to the DEFAULT_* values.
const PATH_OVERRIDES: Record<
  string,
  {
    priority: number
    changeFrequency: MetadataRoute.Sitemap[number]['changeFrequency']
  }
> = {
  '/': { priority: 1.0, changeFrequency: 'daily' },
  '/shop': { priority: 0.9, changeFrequency: 'daily' },
  '/collections': { priority: 0.8, changeFrequency: 'daily' },
  '/blog': { priority: 0.7, changeFrequency: 'daily' },
  '/local-store': { priority: 0.7, changeFrequency: 'weekly' },
}
const DEFAULT_PRIORITY = 0.5
const DEFAULT_FREQUENCY: MetadataRoute.Sitemap[number]['changeFrequency'] =
  'monthly'

const PRODUCT_PAGE_SIZE = 100
const MAX_PRODUCT_PAGES = 50 // safety cap: 5,000 products

// Pulls every product via the public store API (paginated — a single
// capped fetch silently dropped everything past the cap for larger
// catalogues) and links to the real product route `/shop/{handle}`
// (the old `/shop/product/{id}` path doesn't exist and 404s).
async function getAllProductPages(): Promise<MetadataRoute.Sitemap> {
  const pages: MetadataRoute.Sitemap = []
  let offset = 0
  for (let page = 0; page < MAX_PRODUCT_PAGES; page++) {
    try {
      const res = await fetch(
        `${SITE_URL}/api/store/products?limit=${PRODUCT_PAGE_SIZE}&offset=${offset}&light=1`,
        { next: { revalidate: 3600 } },
      )
      if (!res.ok) break
      const data = await res.json()
      const products = data.products ?? []
      for (const p of products) {
        if (!p.handle) continue
        pages.push({
          url: `${SITE_URL}/shop/${p.handle}`,
          lastModified: new Date(p.updated_at ?? Date.now()),
          changeFrequency: 'weekly',
          priority: 0.7,
        })
      }
      const total = data.count ?? products.length
      offset += PRODUCT_PAGE_SIZE
      if (offset >= total || products.length === 0) break
    } catch (err) {
      console.error('[sitemap] product fetch failed:', err)
      break
    }
  }
  return pages
}

async function getBlogPages(): Promise<MetadataRoute.Sitemap> {
  try {
    const posts = await getBlogPosts()
    return posts.map((post) => ({
      url: `${SITE_URL}/blog/${post.slug}`,
      lastModified: new Date(post.publishedAt ?? Date.now()),
      changeFrequency: 'monthly',
      priority: 0.6,
    }))
  } catch (err) {
    console.error('[sitemap] blog post fetch failed:', err)
    return []
  }
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  // Every real static route under app/(website), auto-discovered from the
  // filesystem — the same source the SEO dashboard uses. This guarantees
  // the sitemap never references a page that doesn't exist (e.g. the old
  // hardcoded `/about` entry, which 404s because there's no about page)
  // and never misses one that does (blog category pages, every local-store
  // sub-page, legal pages, etc. were previously left out entirely).
  const staticPages: MetadataRoute.Sitemap = discoverStaticPages().map((p) => {
    const override = PATH_OVERRIDES[p.path]
    return {
      url: p.path === '/' ? SITE_URL : `${SITE_URL}${p.path}`,
      lastModified: new Date(),
      changeFrequency: override?.changeFrequency ?? DEFAULT_FREQUENCY,
      priority: override?.priority ?? DEFAULT_PRIORITY,
    }
  })

  const collectionPages: MetadataRoute.Sitemap = getAllCollectionHandles().map(
    (handle) => ({
      url: `${SITE_URL}/collections/${handle}`,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 0.75,
    }),
  )

  const [productPages, blogPages] = await Promise.all([
    getAllProductPages(),
    getBlogPages(),
  ])

  return [...staticPages, ...collectionPages, ...blogPages, ...productPages]
}
