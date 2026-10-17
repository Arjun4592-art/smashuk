import type { Metadata } from 'next'
import {
  SITE_NAME,
  SITE_URL,
  SITE_LOGO,
  SITE_OG_IMAGE,
  SITE_LOCALE,
  SPORTS,
  CONTACT_EMAIL,
  CONTACT_PHONE,
  FREE_SHIPPING_THRESHOLD,
} from '@/lib/constants'
import { readSeoConfig, DEFAULT_SEO } from '@/lib/seo-config'
import { stripHtml } from '@/lib/utils'
import { getCollectionConfig } from '@/lib/collections-data'
export { stripHtml }

// ─── helpers ────────────────────────────────────────────────────────────────

const escapeRegExp = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
const TRAILING_BRAND_RE = new RegExp(
  `\\s*[|—–-]\\s*${escapeRegExp(SITE_NAME)}\\s*$`,
  'i',
)

export function brandedTitle(raw?: string | null): string {
  let t = (raw ?? '').trim()
  if (!t) return SITE_NAME
  // "X | Brand | Brand" -> "X | Brand"
  while (
    TRAILING_BRAND_RE.test(t) &&
    TRAILING_BRAND_RE.test(t.replace(TRAILING_BRAND_RE, ''))
  ) {
    t = t.replace(TRAILING_BRAND_RE, '')
  }
  if (t.toLowerCase().includes(SITE_NAME.toLowerCase())) return t
  return `${t} | ${SITE_NAME}`
}

export function absoluteUrl(pathOrUrl: string): string {
  if (!pathOrUrl) return SITE_URL
  if (/^https?:\/\//i.test(pathOrUrl)) return pathOrUrl
  return `${SITE_URL.replace(/\/+$/, '')}/${pathOrUrl.replace(/^\/+/, '')}`
}

export function intlPhone(phone?: string | null): string | undefined {
  const p = (phone ?? '').trim()
  if (!p) return undefined
  if (p.startsWith('+')) return p
  if (p.startsWith('0')) return `+44 ${p.slice(1)}`
  return p
}

export function metaDescriptionFrom(text?: string | null, max = 155): string {
  return stripHtml(text ?? '', max)
}

const isPlaceholderImage = (src?: string) =>
  !src || /(^|\/)placeholder\.(png|jpg|svg)$/i.test(src)

/** Pick the first real image; fall back to the site-wide OG card. */
export function pickOgImage(...candidates: Array<string | undefined | null>) {
  const real = candidates.find((c) => c && !isPlaceholderImage(c))
  return absoluteUrl(real || SITE_OG_IMAGE)
}

/** Metadata for pages that must never be indexed (cart, checkout, account…). */
export function noIndexMetadata(title: string): Metadata {
  return {
    title,
    robots: {
      index: false,
      follow: false,
      googleBot: { index: false, follow: false },
    },
  }
}

// ─── metadata builders ──────────────────────────────────────────────────────

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
  const title = brandedTitle(seo.metaTitle || seo.fallbackTitle || SITE_NAME)
  const description = seo.metaDescription || seo.fallbackDescription || ''
  const canonical = seo.canonical || seo.fallbackCanonical || SITE_URL
  const image = pickOgImage(seo.ogImage)
  return {
    title: { absolute: title },
    description,
    keywords: seo.metaKeywords || undefined,
    alternates: {
      canonical,
    },
    robots: seo.noIndex
      ? { index: false, follow: false }
      : { index: true, follow: true },
    openGraph: {
      title,
      description,
      url: canonical,
      siteName: SITE_NAME,
      locale: SITE_LOCALE,
      images: [{ url: image, width: 1200, height: 630, alt: SITE_NAME }],
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [image],
    },
  }
}

export async function generateCollectionMetadata(
  handle: string,
): Promise<Metadata> {
  const collection = getCollectionConfig(handle)
  if (!collection) {
    return {
      title: SITE_NAME,
      robots: { index: false, follow: false },
    }
  }
  const config = await readSeoConfig()
  const saved = config[`collection:${handle}`] ?? {}
  return buildMetadata({
    metaTitle: saved.metaTitle || collection.metaTitle,
    metaDescription: saved.metaDescription || collection.metaDescription,
    metaKeywords: saved.metaKeywords || collection.metaKeywords,
    ogImage: saved.ogImage,
    canonical: saved.canonical || `${SITE_URL}/collections/${handle}`,
    noIndex: saved.noIndex,
    fallbackTitle: `${collection.h1} — ${SITE_NAME}`,
    fallbackDescription: metaDescriptionFrom(collection.intro),
    fallbackCanonical: `${SITE_URL}/collections/${handle}`,
  })
}

export async function generateStaticMetadata(
  page: 'home' | 'shop' | string,
): Promise<Metadata> {
  try {
    const config = await readSeoConfig()
    const seo = config[page] ?? DEFAULT_SEO[page] ?? {}
    const fallbacks: Record<
      string,
      {
        title: string
        description: string
        canonical: string
      }
    > = {
      home: {
        title: `${SITE_NAME} — Premium Racket Sports Equipment UK`,
        description: `Shop premium badminton, tennis, padel and squash equipment with fast UK delivery. Free delivery over £${FREE_SHIPPING_THRESHOLD}.`,
        canonical: SITE_URL,
      },
      shop: {
        title: `Buy Racket Sports Equipment Online — ${SITE_NAME}`,
        description:
          'Browse rackets, shoes and accessories for badminton, tennis, padel and squash. Best prices guaranteed.',
        canonical: `${SITE_URL}/shop`,
      },
      contact: {
        title: `Contact Us — ${SITE_NAME} UK`,
        description:
          'Get in touch with Smash Racket Pro for orders, returns, stringing and enquiries.',
        canonical: `${SITE_URL}/contact`,
      },
      collections: {
        title: `Shop All Collections — ${SITE_NAME}`,
        description:
          'Browse every badminton, tennis, padel and clothing collection — rackets, shoes, bags, balls and accessories by brand, sport and category.',
        canonical: `${SITE_URL}/collections`,
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
    return {
      title: SITE_NAME,
    }
  }
}

type SearchParams = { [key: string]: string | string[] | undefined }

const BADGE_LABELS: Record<string, string> = {
  NEW: 'New Arrivals',
  SALE: 'Sale',
  BESTSELLER: 'Best Sellers',
}


export async function generateShopMetadata(
  searchParams: SearchParams = {},
): Promise<Metadata> {
  const first = (v: string | string[] | undefined) =>
    Array.isArray(v) ? v[0] : v
  const base = await generateStaticMetadata('shop')
  const q = first(searchParams.q)?.trim()
  const sportSlug = first(searchParams.sport)
  const badge = first(searchParams.badge)?.toUpperCase()
  const sport = SPORTS.find((s) => s.slug === sportSlug)

  
  if (q) {
    return {
      ...base,
      title: { absolute: brandedTitle(`Search results for “${q.slice(0, 60)}”`) },
      alternates: { canonical: `${SITE_URL}/shop` },
      robots: { index: false, follow: true },
    }
  }

  let heading: string | undefined
  let canonicalQuery = ''
  if (sport) {
    heading = `${sport.label} Equipment & Gear`
    canonicalQuery = `?sport=${sport.slug}`
  } else if (badge && BADGE_LABELS[badge]) {
    heading = BADGE_LABELS[badge]
    canonicalQuery = `?badge=${badge}`
  }
  if (!heading) return base

  const canonical = `${SITE_URL}/shop${canonicalQuery}`
  const title = brandedTitle(
    sport ? `${heading} — Buy Online UK` : `${heading} — Racket Sports Gear`,
  )
  const description = sport
    ? `Shop ${sport.label.toLowerCase()} equipment online at ${SITE_NAME} — top brands, expert advice and free UK delivery over £${FREE_SHIPPING_THRESHOLD}.`
    : `Browse ${heading.toLowerCase()} at ${SITE_NAME} — badminton, tennis, padel and squash gear with free UK delivery over £${FREE_SHIPPING_THRESHOLD}.`
  const image = pickOgImage()
  return {
    ...base,
    title: { absolute: title },
    description,
    alternates: { canonical },
    robots: { index: true, follow: true },
    openGraph: {
      title,
      description,
      url: canonical,
      siteName: SITE_NAME,
      locale: SITE_LOCALE,
      images: [{ url: image, width: 1200, height: 630, alt: SITE_NAME }],
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [image],
    },
  }
}

// ─── structured data (JSON-LD) ──────────────────────────────────────────────

export function generateProductSchema(product: any) {
  const images: string[] = (product.images ?? [])
    .filter((i: string) => !isPlaceholderImage(i))
    .map((i: string) => absoluteUrl(i))
  const description = stripHtml(product.description ?? '', 5000)
  const price = Number(product.price)
  const url = `${SITE_URL}/shop/${product.slug ?? product.id}`
  return {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.name,
    url,
    ...(description ? { description } : {}),
    ...(images.length ? { image: images } : {}),
    ...(product.sku ? { sku: product.sku } : {}),
    ...(product.brand
      ? { brand: { '@type': 'Brand', name: product.brand } }
      : {}),
    ...(Number.isFinite(price) && price > 0
      ? {
          offers: {
            '@type': 'Offer',
            url,
            priceCurrency: 'GBP',
            price: price.toFixed(2),
            itemCondition: 'https://schema.org/NewCondition',
            availability: product.inStock
              ? 'https://schema.org/InStock'
              : 'https://schema.org/OutOfStock',
            seller: {
              '@type': 'Organization',
              name: SITE_NAME,
            },
          },
        }
      : {}),
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

export function generateBlogPostSchema(post: {
  title: string
  excerpt: string
  seoDescription?: string
  coverImage: string
  publishedAt: string
  category: string
  slug: string
  author?: string
}) {
  const postUrl = `${SITE_URL}/blog/${post.slug}`
  return {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline: post.title,
    description: post.seoDescription || post.excerpt,
    image: post.coverImage ? [absoluteUrl(post.coverImage)] : [],
    datePublished: post.publishedAt,
    // The CMS only exposes publishedAt; keep dateModified in step with it
    // rather than inventing a value.
    dateModified: post.publishedAt,
    author: post.author
      ? {
          '@type': 'Person',
          name: post.author,
        }
      : {
          '@type': 'Organization',
          name: SITE_NAME,
        },
    publisher: {
      '@type': 'Organization',
      name: SITE_NAME,
      logo: {
        '@type': 'ImageObject',
        url: absoluteUrl(SITE_LOGO),
      },
    },
    mainEntityOfPage: {
      '@type': 'WebPage',
      '@id': postUrl,
    },
    url: postUrl,
    articleSection: post.category,
  }
}

export function generateOrganizationSchema() {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    '@id': `${SITE_URL}/#organization`,
    name: SITE_NAME,
    url: SITE_URL,
    logo: absoluteUrl(SITE_LOGO),
    email: CONTACT_EMAIL,
    telephone: intlPhone(CONTACT_PHONE),
  }
}

export function generateWebsiteSchema() {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    '@id': `${SITE_URL}/#website`,
    name: SITE_NAME,
    url: SITE_URL,
    inLanguage: 'en-GB',
    publisher: { '@id': `${SITE_URL}/#organization` },
    potentialAction: {
      '@type': 'SearchAction',
      target: {
        '@type': 'EntryPoint',
        urlTemplate: `${SITE_URL}/shop?q={search_term_string}`,
      },
      'query-input': 'required name=search_term_string',
    },
  }
}

/**
 * Physical store. Pass the live store contact (lib/store-contact) so the
 * schema always matches what the page shows; falls back to lib/constants.
 */
export function generateLocalBusinessSchema(contact?: {
  phone?: string
  email?: string
  line1?: string
  city?: string
  region?: string
  postcode?: string
}) {
  return {
    '@context': 'https://schema.org',
    '@type': 'SportingGoodsStore',
    '@id': `${SITE_URL}/local-store#store`,
    name: SITE_NAME,
    url: `${SITE_URL}/local-store`,
    image: absoluteUrl(SITE_OG_IMAGE),
    logo: absoluteUrl(SITE_LOGO),
    telephone: intlPhone(contact?.phone || CONTACT_PHONE),
    email: contact?.email || CONTACT_EMAIL,
    address: {
      '@type': 'PostalAddress',
      streetAddress: contact?.line1 || '112A Hulme High Street',
      addressLocality: contact?.city || 'Manchester',
      addressRegion: contact?.region || 'Greater Manchester',
      postalCode: contact?.postcode || 'M15 5JP',
      addressCountry: 'GB',
    },
    parentOrganization: { '@id': `${SITE_URL}/#organization` },
  }
}

export function generateBreadcrumbSchema(
  items: Array<{ name: string; path: string }>,
) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: item.name,
      item: absoluteUrl(item.path),
    })),
  }
}

export function safeJsonLd(data: unknown) {
  return JSON.stringify(data)
    .replace(/</g, '\\u003c')
    .replace(/>/g, '\\u003e')
    .replace(/&/g, '\\u0026')
}
