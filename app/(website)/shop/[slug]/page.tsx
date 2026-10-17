import { redirect } from 'next/navigation'
import {
  getProduct,
  getProducts,
  getProductsByIds,
  normalizeProduct,
} from '@/lib/api/store'
import ProductDetailClient from './ProductDetailClient'
import type { Metadata } from 'next'
import { SITE_NAME, SITE_URL, SITE_LOCALE } from '@/lib/constants'
import {
  generateProductSchema,
  generateBreadcrumbSchema,
  safeJsonLd,
  brandedTitle,
  metaDescriptionFrom,
  pickOgImage,
} from '@/lib/seo'
export const revalidate = 3600
interface Props {
  params: Promise<{
    slug: string
  }>
}
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const raw = await getProduct(slug)
  if (!raw)
    return {
      title: 'Product Not Found',
      robots: { index: false, follow: false },
    }
  const product = normalizeProduct(raw)
  // Admin-set overrides from the dashboard's SEO tab (raw.metadata, not the
  // normalized product — normalizeProduct doesn't carry these fields).
  const seo = raw.metadata ?? {}
  const title = brandedTitle(seo.metaTitle || product.name)
  // Meta descriptions are plain text, ~155 chars. The product description can
  // be thousands of characters of HTML, so never use it raw.
  const description = seo.metaDescription
    ? metaDescriptionFrom(seo.metaDescription, 300)
    : metaDescriptionFrom(product.description)
  const url = `${SITE_URL}/shop/${product.slug}`
  const canonical = seo.canonical || url
  // product.images falls back to '/placeholder.png' (a file that doesn't
  // exist) when a product has no photos — pickOgImage skips it and falls
  // back to the site-wide brand card instead of emitting a broken og:image.
  const image = pickOgImage(seo.ogImage, ...product.images)
  return {
    title: { absolute: title },
    description,
    keywords: seo.metaKeywords || undefined,
    alternates: { canonical },
    robots: seo.noIndex
      ? {
          index: false,
          follow: false,
        }
      : undefined,
    openGraph: {
      type: 'website',
      title,
      description,
      siteName: SITE_NAME,
      locale: SITE_LOCALE,
      images: [{ url: image, alt: product.name }],
      url: canonical,
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [image],
    },
  }
}
export default async function ProductPage({ params }: Props) {
  const { slug } = await params
  const productPromise = getProduct(slug)
  const relatedPromise = getProducts({
    limit: 12,
    light: true,
  })
  const [raw, { products: relatedRaw }] = await Promise.all([
    productPromise,
    relatedPromise,
  ])
  // Deleted / renamed / mistyped product link: send the visitor to the sale
  // page instead of a dead-end 404. (getProduct only returns null when Medusa
  // answered with no match; backend errors throw and never end up here.)
  if (!raw) redirect('/shop?badge=SALE')
  const product = normalizeProduct(raw)
  const related = relatedRaw
    .map(normalizeProduct)
    .filter((p) => p.id !== product.id && p.inStock)
    .slice(0, 4)
  const crossSellIds = (product.crossSells ?? []).map((c) => c.productId)
  const crossSellRaw =
    crossSellIds.length > 0 ? await getProductsByIds(crossSellIds) : []
  const crossSellProducts = crossSellRaw
    .map(normalizeProduct)
    .filter((p) => p.id !== product.id)
    .map((p) => ({
      ...p,
      crossSellDiscountPct:
        product.crossSells?.find((c) => c.productId === p.id)?.discountPct ?? 0,
    }))
  return (
    <>
      <script
        type='application/ld+json'
        dangerouslySetInnerHTML={{
          __html: safeJsonLd(generateProductSchema(product)),
        }}
      />
      <script
        type='application/ld+json'
        dangerouslySetInnerHTML={{
          __html: safeJsonLd(
            generateBreadcrumbSchema([
              { name: 'Home', path: '/' },
              { name: 'Shop', path: '/shop' },
              { name: product.name, path: `/shop/${product.slug}` },
            ]),
          ),
        }}
      />
      <ProductDetailClient
        product={product}
        related={related}
        crossSellProducts={crossSellProducts}
      />
    </>
  )
}
