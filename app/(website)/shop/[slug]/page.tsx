import { notFound } from 'next/navigation'
import { getProduct, getProducts, normalizeProduct } from '@/lib/api/store'
import ProductDetailClient from './ProductDetailClient'
import type { Metadata } from 'next'
import { SITE_NAME, SITE_URL } from '@/lib/constants'
import { generateProductSchema, safeJsonLd } from '@/lib/seo'

interface Props {
  params: Promise<{ slug: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const raw = await getProduct(slug)
  if (!raw) return { title: 'Product Not Found' }

  const product = normalizeProduct(raw)

  return {
    title: `${product.name} | ${SITE_NAME}`,
    description: product.description,
    openGraph: {
      title: product.name,
      description: product.description,
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

  return (
    <>
      <script
        type='application/ld+json'
        dangerouslySetInnerHTML={{
          __html: safeJsonLd(generateProductSchema(product)),
        }}
      />
      <ProductDetailClient product={product} related={related} />
    </>
  )
}
