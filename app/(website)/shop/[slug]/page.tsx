import { notFound } from 'next/navigation'
import {
  getProduct,
  getProducts,
  getProductsByIds,
  normalizeProduct,
} from '@/lib/api/store'
import ProductDetailClient from './ProductDetailClient'
import type { Metadata } from 'next'
import { SITE_NAME, SITE_URL } from '@/lib/constants'
import { generateProductSchema, safeJsonLd } from '@/lib/seo'
import { stripHtml } from '@/lib/utils'
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
    }
  const product = normalizeProduct(raw)
  const plainDescription = stripHtml(product.description ?? '')
  // Admin-set overrides from the dashboard's SEO tab (raw.metadata, not the
  // normalized product — normalizeProduct doesn't carry these fields).
  const seo = raw.metadata ?? {}
  const title = seo.metaTitle || `${product.name} | ${SITE_NAME}`
  const description = seo.metaDescription || plainDescription
  const ogImage = seo.ogImage || product.images[0]
  return {
    title,
    description,
    keywords: seo.metaKeywords || undefined,
    alternates: seo.canonical
      ? {
          canonical: seo.canonical,
        }
      : undefined,
    robots: seo.noIndex
      ? {
          index: false,
          follow: false,
        }
      : undefined,
    openGraph: {
      title: seo.metaTitle || product.name,
      description,
      images: [
        {
          url: ogImage,
          width: 800,
          height: 800,
        },
      ],
      url: `${SITE_URL}/shop/${product.slug}`,
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
  if (!raw) notFound()
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
      <ProductDetailClient
        product={product}
        related={related}
        crossSellProducts={crossSellProducts}
      />
    </>
  )
}
