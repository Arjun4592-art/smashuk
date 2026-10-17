import { NextResponse } from 'next/server'
import { isHiddenFromStorefront } from '@/lib/storefront-hidden'

import { SITE_URL, SITE_NAME } from '@/lib/constants'
import { getStoreChannelProductIds, googleOfferId } from '@/lib/google-merchant'

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
  '*variants.calculated_price,id,title,description,handle,thumbnail,*images,*variants,*variants.prices,+variants.inventory_quantity,+variants.manage_inventory,+metadata,*categories'

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
  // In-store-only stringing services must never appear in a public feed.
  return products.filter((p) => !isHiddenFromStorefront(p))
}

// A GTIN with a bad check digit gets the whole offer disapproved in Merchant
// Center. Only send it when it is structurally valid (GTIN-8/12/13/14).
function validGtin(raw: unknown): string | undefined {
  const digits = String(raw ?? '').replace(/[\s-]/g, '')
  if (!/^\d+$/.test(digits) || ![8, 12, 13, 14].includes(digits.length)) {
    return undefined
  }
  const body = digits.slice(0, -1)
  const check = Number(digits.slice(-1))
  let sum = 0
  for (let i = 0; i < body.length; i++) {
    const d = Number(body[body.length - 1 - i])
    sum += i % 2 === 0 ? d * 3 : d
  }
  return (10 - (sum % 10)) % 10 === check ? digits : undefined
}

// Products NOT sold in the physical store must opt out of the local marketing
// methods, otherwise Merchant Center reports them as "Missing local inventory
// data". `storeProductIds` is null when the Store channel couldn't be read; in
// that case nothing is excluded (fail safe).
function buildItemXml(
  product: any,
  variant: any,
  storeProductIds: Set<string> | null,
): string {
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
    variant.manage_inventory === false || (variant.inventory_quantity ?? 0) > 0
      ? 'in stock'
      : 'out of stock'
  const imageUrls: string[] = (product.images ?? [])
    .map((i: any) => i?.url)
    .filter(Boolean)
  const image = imageUrls[0] ?? product.thumbnail ?? ''
  const extraImages = imageUrls.slice(1, 11)
  // Variants of one product must share item_group_id, otherwise Google treats
  // every size/colour as a separate product. Keeps the legacy Shopify group
  // id where it was backfilled (same scheme as googleOfferId).
  const shopifyProductId = variant.metadata?.shopify_product_id
  const itemGroupId = shopifyProductId
    ? `shopify_GB_${shopifyProductId}`
    : product.id
  // Optional per-product override. Must be an exact Google taxonomy value
  // (id or full path), e.g. set metadata.google_product_category in Medusa.
  const googleCategory = product.metadata?.google_product_category
  const link = `${SITE_URL}/shop/${product.handle}`
  const brand = product.metadata?.brand || SITE_NAME
  const gtin = validGtin(variant.ean) ?? validGtin(variant.barcode)
  const mpn = variant.sku || undefined
  const title =
    variant.title && variant.title !== 'Default'
      ? `${product.title} - ${variant.title}`
      : product.title

  const parts = [
    '<item>',
    `<g:id>${xmlEscape(googleOfferId(variant))}</g:id>`,
    `<title>${xmlEscape(title)}</title>`,
    `<description>${xmlEscape(decodeHtmlEntities((product.description ?? '').replace(/<[^>]*>/g, '')).slice(0, 5000))}</description>`,
    `<link>${xmlEscape(link)}</link>`,
    image ? `<g:image_link>${xmlEscape(image)}</g:image_link>` : '',
    ...extraImages.map(
      (u) => `<g:additional_image_link>${xmlEscape(u)}</g:additional_image_link>`,
    ),
    `<g:item_group_id>${xmlEscape(String(itemGroupId))}</g:item_group_id>`,
    googleCategory
      ? `<g:google_product_category>${xmlEscape(String(googleCategory))}</g:google_product_category>`
      : '',
    `<g:availability>${availability}</g:availability>`,
    `<g:price>${regularAmount.toFixed(2)} ${currency}</g:price>`,
    isOnSale
      ? `<g:sale_price>${currentAmount.toFixed(2)} ${currency}</g:sale_price>`
      : '',
    `<g:brand>${xmlEscape(brand)}</g:brand>`,
    `<g:condition>new</g:condition>`,
    gtin ? `<g:gtin>${xmlEscape(gtin)}</g:gtin>` : '',
    mpn ? `<g:mpn>${xmlEscape(mpn)}</g:mpn>` : '',
    // Only declare "no identifiers" when there really is neither a GTIN nor an
    // MPN; it used to be sent together with an MPN, which contradicts itself.
    !gtin && !mpn ? `<g:identifier_exists>no</g:identifier_exists>` : '',
    storeProductIds && !storeProductIds.has(product.id)
      ? '<g:excluded_destination>free_local_listings</g:excluded_destination>\n<g:excluded_destination>local_inventory_ads</g:excluded_destination>'
      : '',
    product.categories?.length
      ? `<g:product_type>${xmlEscape(product.categories.map((c: any) => c.name).join(' > '))}</g:product_type>`
      : '',
    '</item>',
  ]
  return parts.filter(Boolean).join('\n')
}

export async function GET() {
  const [products, storeProductIds] = await Promise.all([
    fetchAllProducts(),
    getStoreChannelProductIds(),
  ])
  const items: string[] = []
  for (const product of products) {
    for (const variant of product.variants ?? []) {
      items.push(buildItemXml(product, variant, storeProductIds))
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