import { notFound } from 'next/navigation'
import { getProduct, getProducts, getProductsByIds, normalizeProduct } from '@/lib/api/store'
import ProductDetailClient from './ProductDetailClient'
import type { Metadata } from 'next'
import { SITE_NAME, SITE_URL } from '@/lib/constants'
import { generateProductSchema, safeJsonLd } from '@/lib/seo'
import { stripHtml } from '@/lib/utils'

interface Props {
  params: Promise<{ slug: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const raw = await getProduct(slug)
  if (!raw) return { title: 'Product Not Found' }

  const product = normalizeProduct(raw)

  const plainDescription = stripHtml(product.description ?? '')

  return {
    title: `${product.name} | ${SITE_NAME}`,
    description: plainDescription,
    openGraph: {
      title: product.name,
      description: plainDescription,
      images: [{ url: product.images[0], width: 800, height: 800 }],
      url: `${SITE_URL}/shop/${product.slug}`,
    },
  }
}

export default async function ProductPage({ params }: Props) {
  const { slug } = await params

  const raw = await getProduct(slug)
  if (!raw) notFound()

  const product = normalizeProduct(raw)

  // Related products — same sport/category. Never show out-of-stock items.
  const { products: relatedRaw } = await getProducts({ limit: 12 })
  const related = relatedRaw
    .map(normalizeProduct)
    .filter((p) => p.id !== product.id && p.inStock)
    .slice(0, 4)

  // "People also buy" — curated cross-sells set from the dashboard's
  // Cross-sell tab (metadata.cross_sells), resolved from ids to full
  // product objects here so the client component just has to render them.
  // Distinct from `related` above, which is a generic same-page fallback
  // list, not something the merchant picked.
  const crossSellIds = (product.crossSells ?? []).map((c) => c.productId)
  const crossSellRaw =
    crossSellIds.length > 0 ? await getProductsByIds(crossSellIds) : []
  const crossSellProducts = crossSellRaw
    .map(normalizeProduct)
    .filter((p) => p.id !== product.id)
    .map((p) => ({
      ...p,
      // Carry the merchant-configured discount % onto the resolved
      // product so the UI can show "10% off when bought together"
      // without a second lookup back into product.crossSells.
      crossSellDiscountPct:
        product.crossSells?.find((c) => c.productId === p.id)?.discountPct ??
        0,
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
