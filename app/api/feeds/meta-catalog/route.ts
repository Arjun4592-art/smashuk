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
const MAX_PAGES = 50

// Same field-projection gotcha as STORE_PRODUCT_FIELDS in lib/api/store.ts:
// Medusa's inventory-availability resolver needs `manage_inventory` present
// in the projection (even though nothing here reads it directly) for
// `inventory_quantity` to resolve at all, and `*variants.calculated_price`
// must be the FIRST field when combined with inventory fields in the same
// list. Without `+variants.inventory_quantity,+variants.manage_inventory`
// here, every variant's inventory_quantity comes back null/0 — which is
// exactly why this feed showed EVERY product as "out of stock" in Meta
// Commerce Manager.
const FEED_FIELDS =
  '*variants.calculated_price,id,title,description,handle,thumbnail,*images,*variants,*variants.prices,+variants.inventory_quantity,+variants.manage_inventory,+metadata,*categories'

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

function decodeHtmlEntities(value: string): string {
  return value
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#0*39;|&apos;/g, "'")
    .replace(/&nbsp;/g, ' ')
}

function csvEscape(value: string): string {
  const needsQuoting = /[",\n]/.test(value)
  const escaped = value.replace(/"/g, '""')
  return needsQuoting ? `"${escaped}"` : escaped
}

// Same ID convention as the Google Shopping feed — keeps offer IDs in sync
// with the backfilled Shopify IDs, so Meta reads this as the same listing.
function offerId(variant: any): string {
  const shopifyProductId = variant.metadata?.shopify_product_id
  const shopifyVariantId = variant.metadata?.shopify_variant_id
  if (shopifyProductId && shopifyVariantId) {
    return `shopify_GB_${shopifyProductId}_${shopifyVariantId}`
  }
  return variant.sku || variant.id
}

const HEADERS = [
  'id',
  'title',
  'description',
  'availability',
  'condition',
  'price',
  'sale_price',
  'link',
  'image_link',
  'brand',
  'quantity_to_sell_on_facebook',
  'gtin',
  'mpn',
  'identifier_exists',
  'product_type',
]

export async function GET() {
  const products = await fetchAllProducts()
  const rows: string[] = [HEADERS.join(',')]

  for (const product of products) {
    for (const variant of product.variants ?? []) {
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
        variant.manage_inventory === false ||
        (variant.inventory_quantity ?? 0) > 0
          ? 'in stock'
          : 'out of stock'
      const image = product.images?.[0]?.url ?? product.thumbnail ?? ''
      const link = `${SITE_URL}/shop/${product.handle}`
      const brand = product.metadata?.brand || SITE_NAME
      const title =
        variant.title && variant.title !== 'Default'
          ? `${product.title} - ${variant.title}`
          : product.title
      const gtin = variant.ean || variant.barcode || ''
      const mpn = variant.sku || ''
      const identifierExists = gtin ? 'yes' : 'no'
      const productType = product.categories?.length
        ? product.categories.map((c: any) => c.name).join(' > ')
        : ''

      const row = [
        offerId(variant),
        title,
        decodeHtmlEntities(
          (product.description ?? '').replace(/<[^>]*>/g, ''),
        ).slice(0, 5000),
        availability,
        'new',
        `${regularAmount.toFixed(2)} ${currency}`,
        isOnSale ? `${currentAmount.toFixed(2)} ${currency}` : '',
        link,
        image,
        brand,
        String(variant.inventory_quantity ?? 0),
        gtin,
        mpn,
        identifierExists,
        productType,
      ].map((v) => csvEscape(String(v)))

      rows.push(row.join(','))
    }
  }

  return new NextResponse(rows.join('\n'), {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Cache-Control': 'public, max-age=3600',
    },
  })
}
