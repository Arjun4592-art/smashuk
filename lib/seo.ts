// lib/seo.ts
//
// Har page type ke liye generateMetadata() helpers.
// Use with the Next.js App Router.
//
// Usage:
//   Product page  → generateProductMetadata(id)
//   Category page → generateCategoryMetadata(handle)
//   Static page   → generateStaticMetadata('home' | 'shop' | ...)
//   JSON-LD       → generateProductSchema(product)

import type { Metadata } from 'next'
import { SITE_NAME, SITE_URL } from '@/lib/constants'
import { readSeoConfig, DEFAULT_SEO } from '@/lib/seo-config'
import { stripHtml } from '@/lib/utils'

export { stripHtml }

// ── Shared helper ─────────────────────────────────────────────────────────────

function buildMetadata(seo: {
  metaTitle?: string
  metaDescription?: string
  metaKeywords?: string
  ogImage?: string
  canonical?: string
  noIndex?: boolean
  fallbackTitle?: string
  fallbackDescription?: string
  fallbackCanonical?: string
}): Metadata {
  const title = seo.metaTitle || seo.fallbackTitle || SITE_NAME
  const description = seo.metaDescription || seo.fallbackDescription || ''
  const canonical = seo.canonical || seo.fallbackCanonical || SITE_URL

  return {
    title,
    description,
    keywords: seo.metaKeywords || undefined,
    alternates: { canonical },
    robots: seo.noIndex ? 'noindex, nofollow' : 'index, follow',
    openGraph: {
      title,
      description,
      url: canonical,
      siteName: SITE_NAME,
      images: seo.ogImage
        ? [{ url: seo.ogImage, width: 1200, height: 630 }]
        : [],
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: seo.ogImage ? [seo.ogImage] : [],
    },
  }
}

// ── Product page (Medusa) ─────────────────────────────────────────────────────

export async function generateProductMetadata(
  productId: string,
): Promise<Metadata> {
  try {
    const res = await fetch(`${SITE_URL}/api/admin/products/${productId}`, {
      next: { revalidate: 3600 },
    })
    if (!res.ok) throw new Error('Product not found')

    const data = await res.json()
    const product = data.product ?? data
    const seo = product.metadata ?? {}

    return buildMetadata({
      metaTitle: seo.metaTitle,
      metaDescription: seo.metaDescription,
      metaKeywords: seo.metaKeywords,
      ogImage: seo.ogImage || product.thumbnail,
      canonical: seo.canonical,
      noIndex: seo.noIndex,
      fallbackTitle: `${product.title} — ${SITE_NAME}`,
      fallbackDescription: stripHtml(product.description ?? ''),
      fallbackCanonical: `${SITE_URL}/shop/product/${productId}`,
    })
  } catch (err) {
    console.error('[SEO] product metadata error:', err)
    return { title: SITE_NAME }
  }
}

// ── Category page ─────────────────────────────────────────────────────────────

export async function generateCategoryMetadata(
  handle: string,
): Promise<Metadata> {
  try {
    const res = await fetch(`${SITE_URL}/api/admin/categories`, {
      next: { revalidate: 3600 },
    })
    if (!res.ok) throw new Error('Categories fetch failed')

    const data = await res.json()
    const categories = data.product_categories ?? data.categories ?? []
    const category = categories.find(
      (c: any) =>
        c.handle === handle || c.name.toLowerCase() === handle.toLowerCase(),
    )
    if (!category) throw new Error('Category not found')

    const seo = category.metadata ?? {}

    return buildMetadata({
      metaTitle: seo.metaTitle,
      metaDescription: seo.metaDescription,
      metaKeywords: seo.metaKeywords,
      ogImage: seo.ogImage,
      canonical: seo.canonical,
      noIndex: seo.noIndex,
      fallbackTitle: `${category.name} Equipment & Gear — ${SITE_NAME}`,
      fallbackDescription:
        category.description ??
        `Shop premium ${category.name} equipment at ${SITE_NAME}.`,
      fallbackCanonical: `${SITE_URL}/shop/${handle}`,
    })
  } catch (err) {
    console.error('[SEO] category metadata error:', err)
    return { title: SITE_NAME }
  }
}

// ── Static pages ──────────────────────────────────────────────────────────────

export async function generateStaticMetadata(
  page: 'home' | 'shop' | string,
): Promise<Metadata> {
  try {
    const config = await readSeoConfig()
    const seo = config[page] ?? DEFAULT_SEO[page] ?? {}

    const fallbacks: Record<
      string,
      { title: string; description: string; canonical: string }
    > = {
      home: {
        title: `${SITE_NAME} — Premium Racket Sports Equipment UK`,
        description:
          'Shop premium badminton, tennis, padel and squash equipment with fast UK-wide delivery.',
        canonical: SITE_URL,
      },
      shop: {
        title: `Buy Racket Sports Equipment Online — ${SITE_NAME}`,
        description:
          'Browse rackets, shoes and accessories for badminton, tennis, padel and squash. Best prices guaranteed.',
        canonical: `${SITE_URL}/shop`,
      },
      'local-store': {
        title: `Manchester Racket Store — Restringing, Demo & Advice | ${SITE_NAME}`,
        description:
          'Visit our Manchester racket specialist store for badminton, tennis, squash and padel — racket restringing, expert advice from club-level players, and a demo service to try before you buy.',
        canonical: `${SITE_URL}/local-store`,
      },
    }

    const fb = fallbacks[page] ?? {
      title: SITE_NAME,
      description: '',
      canonical: `${SITE_URL}/${page}`,
    }

    return buildMetadata({
      ...seo,
      fallbackTitle: fb.title,
      fallbackDescription: fb.description,
      fallbackCanonical: fb.canonical,
    })
  } catch (err) {
    console.error('[SEO] static metadata error:', err)
    return { title: SITE_NAME }
  }
}

// ── JSON-LD Product Schema ────────────────────────────────────────────────────
//
// Use in app/(website)/shop/[slug]/page.tsx:
//
//   <script
//     type='application/ld+json'
//     dangerouslySetInnerHTML={{ __html: JSON.stringify(generateProductSchema(product)) }}
//   />

export function generateProductSchema(product: any) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.name,
    description: stripHtml(product.description ?? '', 5000),
    image: product.images ?? [],
    sku: product.sku ?? '',
    brand: {
      '@type': 'Brand',
      name: product.brand ?? SITE_NAME,
    },
    offers: {
      '@type': 'Offer',
      url: `${SITE_URL}/shop/${product.slug ?? product.id}`,
      priceCurrency: 'GBP',
      price: product.price,
      availability: product.inStock
        ? 'https://schema.org/InStock'
        : 'https://schema.org/OutOfStock',
      seller: {
        '@type': 'Organization',
        name: SITE_NAME,
      },
    },
    ...(product.rating && product.reviewCount
      ? {
          aggregateRating: {
            '@type': 'AggregateRating',
            ratingValue: product.rating,
            reviewCount: product.reviewCount,
            bestRating: 5,
            worstRating: 1,
          },
        }
      : {}),
  }
}

// BlogPosting schema for /blog/[slug] pages — fully auto-generated from
// the post's own fields (title, excerpt/SEO description, cover image,
// published date, category). No manual JSON entry needed in the
// dashboard, so there's no way for a malformed schema to break the page.
export function generateBlogPostSchema(post: {
  title: string
  excerpt: string
  seoDescription?: string
  coverImage: string
  publishedAt: string
  category: string
  slug: string
}) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline: post.title,
    description: post.seoDescription || post.excerpt,
    image: post.coverImage ? [post.coverImage] : [],
    datePublished: post.publishedAt,
    dateModified: post.publishedAt,
    author: {
      '@type': 'Organization',
      name: SITE_NAME,
    },
    publisher: {
      '@type': 'Organization',
      name: SITE_NAME,
      logo: {
        '@type': 'ImageObject',
        url: `${SITE_URL}/favicon.ico`,
      },
    },
    mainEntityOfPage: {
      '@type': 'WebPage',
      '@id': `${SITE_URL}/blog/${post.slug}`,
    },
    articleSection: post.category,
  }
}

// SECURITY: JSON.stringify() does NOT escape "</script" inside string
// values. Product name/description (and similar free-text admin fields)
// end up in JSON-LD via dangerouslySetInnerHTML — if either ever contains
// "</script>...<script>...", it closes our schema tag early and the rest
// renders as live HTML/JS for every visitor of that page (stored XSS).
// Always run schema objects through this before injecting them.
export function safeJsonLd(data: unknown) {
  return JSON.stringify(data)
    .replace(/</g, '\\u003c')
    .replace(/>/g, '\\u003e')
    .replace(/&/g, '\\u0026')
}
