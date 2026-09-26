import { NextResponse } from 'next/server'
import { SITE_URL, SITE_NAME } from '@/lib/constants'

const MEDUSA_URL =
  process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL ?? 'http://localhost:9000'
const PUBLISHABLE_KEY = process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY ?? ''
const STORE_HEADERS = {
  'Content-Type': 'application/json',
  'x-publishable-api-key': PUBLISHABLE_KEY,
}
const PAGE_SIZE = 100
const MAX_PAGES = 50 // safety cap: 5,000 products, matches app/sitemap.ts

const FEED_FIELDS =
  'id,title,description,handle,thumbnail,*images,*variants,*variants.prices,*variants.calculated_price,+metadata,*categories'

function decodeHtmlEntities(value: string): string {
  return value
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#0*39;|&apos;/g, "'")
    .replace(/&nbsp;/g, ' ')
}

function xmlEscape(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

async function getFirstRegionId(): Promise<string | null> {
  try {
    const res = await fetch(`${MEDUSA_URL}/store/regions?limit=1`, {
      headers: STORE_HEADERS,
      next: { revalidate: 300 },
    })
    if (!res.ok) return null
    const data = await res.json()
    return data.regions?.[0]?.id ?? null
  } catch {
    return null
  }
}

async function fetchAllProducts(): Promise<any[]> {
  const regionId = await getFirstRegionId()
  const products: any[] = []
  let offset = 0
  for (let page = 0; page < MAX_PAGES; page++) {
    const params = new URLSearchParams({
      limit: String(PAGE_SIZE),
      offset: String(offset),
      fields: FEED_FIELDS,
    })
    if (regionId) params.set('region_id', regionId)
    const res = await fetch(`${MEDUSA_URL}/store/products?${params}`, {
      headers: STORE_HEADERS,
      next: { revalidate: 3600 },
    })
    if (!res.ok) break
    const data = await res.json()
    const batch = data.products ?? []
    products.push(...batch)
    if (batch.length < PAGE_SIZE) break
    offset += PAGE_SIZE
  }
  return products
}

// Keeps the original Shopify offer ID where we backfilled it (see
// scripts/backfill-shopify-ids.ts), so Merchant Center treats this as the
// same listing instead of a brand-new one.
function offerId(variant: any): string {
  const shopifyProductId = variant.metadata?.shopify_product_id
  const shopifyVariantId = variant.metadata?.shopify_variant_id
  if (shopifyProductId && shopifyVariantId) {
    return `shopify_GB_${shopifyProductId}_${shopifyVariantId}`
  }
  return variant.sku || variant.id
}

function buildItemXml(product: any, variant: any): string {
  const gbpPrices = (variant.prices ?? []).filter(
    (pr: any) => pr.currency_code === 'gbp',
  )
  const currentAmount =
    variant.calculated_price?.calculated_amount ??
    gbpPrices[0]?.amount ??
    variant.prices?.[0]?.amount ??
    0
  const metaCompareAt = product.metadata?.compare_at_price
    ? Number(product.metadata.compare_at_price)
    : undefined
  const metaOriginal = product.metadata?.originalPrice
    ? Number(product.metadata.originalPrice) / 100
    : undefined
  const originalAmount = metaCompareAt ?? metaOriginal
  const isOnSale =
    typeof originalAmount === 'number' && originalAmount > currentAmount
  const regularAmount = isOnSale ? originalAmount : currentAmount
  const currency = (gbpPrices[0]?.currency_code ?? 'gbp').toUpperCase()

  const availability =
    (variant.inventory_quantity ?? 0) > 0 ? 'in stock' : 'out of stock'
  const image = product.images?.[0]?.url ?? product.thumbnail ?? ''
  const link = `${SITE_URL}/shop/${product.handle}`
  const brand = product.metadata?.brand || SITE_NAME
  const gtin = variant.ean || variant.barcode || undefined
  const title =
    variant.title && variant.title !== 'Default'
      ? `${product.title} - ${variant.title}`
      : product.title

  const parts = [
    '<item>',
    `<g:id>${xmlEscape(offerId(variant))}</g:id>`,
    `<title>${xmlEscape(title)}</title>`,
    `<description>${xmlEscape(decodeHtmlEntities((product.description ?? '').replace(/<[^>]*>/g, '')).slice(0, 5000))}</description>`,
    `<link>${xmlEscape(link)}</link>`,
    `<g:image_link>${xmlEscape(image)}</g:image_link>`,
    `<g:availability>${availability}</g:availability>`,
    `<g:price>${regularAmount.toFixed(2)} ${currency}</g:price>`,
    isOnSale
      ? `<g:sale_price>${currentAmount.toFixed(2)} ${currency}</g:sale_price>`
      : '',
    `<g:brand>${xmlEscape(brand)}</g:brand>`,
    `<g:condition>new</g:condition>`,
    gtin
      ? `<g:gtin>${xmlEscape(gtin)}</g:gtin>`
      : `<g:identifier_exists>no</g:identifier_exists>`,
    variant.sku ? `<g:mpn>${xmlEscape(variant.sku)}</g:mpn>` : '',
    product.categories?.length
      ? `<g:product_type>${xmlEscape(product.categories.map((c: any) => c.name).join(' > '))}</g:product_type>`
      : '',
    '</item>',
  ]
  return parts.filter(Boolean).join('\n')
}

export async function GET() {
  const products = await fetchAllProducts()
  const items: string[] = []
  for (const product of products) {
    for (const variant of product.variants ?? []) {
      items.push(buildItemXml(product, variant))
    }
  }

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss xmlns:g="http://base.google.com/ns/1.0" version="2.0">
<channel>
<title>${xmlEscape(SITE_NAME)} Product Feed</title>
<link>${xmlEscape(SITE_URL)}</link>
<description>Google Shopping product feed for ${xmlEscape(SITE_NAME)}</description>
${items.join('\n')}
</channel>
</rss>`

  return new NextResponse(xml, {
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 'public, max-age=3600',
    },
  })
}
