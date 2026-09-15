import * as dotenv from 'dotenv'
import * as path from 'path'
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })

const MEDUSA_URL =
  process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL ?? 'http://localhost:9000'
const ADMIN_EMAIL = process.env.MEDUSA_ADMIN_EMAIL
const ADMIN_PASSWORD = process.env.MEDUSA_ADMIN_PASSWORD
const SHOPIFY_SHOP = process.env.SHOPIFY_SHOP
const SHOPIFY_TOKEN = process.env.SHOPIFY_ACCESS_TOKEN
const SHOPIFY_API_VERSION = '2024-10'
const APPLY = process.argv.includes('--apply')

if (!ADMIN_EMAIL || !ADMIN_PASSWORD) {
  console.error(
    '❌ Set MEDUSA_ADMIN_EMAIL and MEDUSA_ADMIN_PASSWORD in .env.local before running this script.',
  )
  process.exit(1)
}
if (!SHOPIFY_SHOP || !SHOPIFY_TOKEN) {
  console.error(
    '❌ Set SHOPIFY_SHOP and SHOPIFY_ACCESS_TOKEN in .env.local before running this script.',
  )
  process.exit(1)
}

// ---------------------------------------------------------------------------
// WHY THIS SCRIPT EXISTS
//
// Google Merchant Center and the Meta product catalogue both index products
// by the ID Shopify originally assigned. Moving the storefront to Medusa
// gives every product/variant a brand-new Medusa ID (prod_xxx / variant_xxx),
// which breaks that link — both platforms would treat the "same" product as
// a brand-new listing with no history, and Shopping/PMax/Catalog-Sales
// campaigns built around the old IDs would have to relearn from scratch.
//
// This script re-fetches the original Shopify product + variant IDs via the
// Shopify Admin API, matches them to their Medusa counterpart by SKU (SKU
// was preserved during the CSV migration — see import-shopify-csv.ts), and
// stores the old IDs on the Medusa variant's metadata as
// `shopify_product_id` / `shopify_variant_id`. The Google Shopping and Meta
// catalogue feed routes (see app/api/feeds/*) read these to keep the same
// offer ID.
//
// Run:
//   npx tsx scripts/backfill-shopify-ids.ts             (dry run — report only)
//   npx tsx scripts/backfill-shopify-ids.ts --apply      (writes metadata)
// ---------------------------------------------------------------------------

async function getMedusaToken(): Promise<string> {
  const res = await fetch(`${MEDUSA_URL}/auth/user/emailpass`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD }),
  })
  const data = await res.json()
  if (!res.ok || !data.token)
    throw new Error('Medusa auth failed: ' + (data.message ?? res.status))
  return data.token as string
}

function medusaHeaders(token: string) {
  return {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  }
}

interface MedusaVariant {
  id: string
  sku: string | null
  metadata: Record<string, any> | null
}
interface MedusaProduct {
  id: string
  title: string
  variants: MedusaVariant[]
}

async function fetchAllMedusaProducts(token: string): Promise<MedusaProduct[]> {
  const products: MedusaProduct[] = []
  const limit = 100
  let offset = 0
  while (true) {
    const res = await fetch(
      `${MEDUSA_URL}/admin/products?limit=${limit}&offset=${offset}&fields=id,title,variants.id,variants.sku,variants.metadata`,
      { headers: medusaHeaders(token) },
    )
    if (!res.ok)
      throw new Error(
        `GET /admin/products failed (${res.status}): ${await res.text()}`,
      )
    const data = await res.json()
    const batch: MedusaProduct[] = data.products ?? []
    products.push(...batch)
    if (batch.length < limit) break
    offset += limit
  }
  return products
}

interface ShopifyVariant {
  id: number
  sku: string | null
}
interface ShopifyProduct {
  id: number
  variants: ShopifyVariant[]
}

async function fetchAllShopifyProducts(): Promise<ShopifyProduct[]> {
  const products: ShopifyProduct[] = []
  let url: string | null =
    `https://${SHOPIFY_SHOP}/admin/api/${SHOPIFY_API_VERSION}/products.json?limit=250&fields=id,variants`
  while (url) {
    const res: Response = await fetch(url, {
      headers: { 'X-Shopify-Access-Token': SHOPIFY_TOKEN as string },
    })
    if (!res.ok)
      throw new Error(`Shopify GET failed (${res.status}): ${await res.text()}`)
    const data = await res.json()
    products.push(...(data.products ?? []))
    // Shopify paginates via the Link response header, not offset/page params.
    const linkHeader = res.headers.get('link') ?? res.headers.get('Link')
    const nextMatch = linkHeader?.match(/<([^>]+)>;\s*rel="next"/)
    url = nextMatch ? nextMatch[1] : null
  }
  return products
}

async function main() {
  console.log(
    `🔎 ${APPLY ? 'LIVE RUN — writing metadata' : 'DRY RUN — no changes will be made (pass --apply to write)'}`,
  )

  const [medusaToken, shopifyProducts] = await Promise.all([
    getMedusaToken(),
    fetchAllShopifyProducts(),
  ])
  const medusaProducts = await fetchAllMedusaProducts(medusaToken)

  const shopifyBySku = new Map<
    string,
    { productId: number; variantId: number }
  >()
  for (const p of shopifyProducts) {
    for (const v of p.variants ?? []) {
      if (!v.sku) continue
      if (shopifyBySku.has(v.sku)) {
        console.warn(
          `⚠️  Duplicate Shopify SKU "${v.sku}" — keeping first match.`,
        )
        continue
      }
      shopifyBySku.set(v.sku, { productId: p.id, variantId: v.id })
    }
  }

  type Update = {
    productId: string
    productTitle: string
    variantId: string
    sku: string
    shopifyProductId: number
    shopifyVariantId: number
    existingMetadata: Record<string, any>
  }
  const updates: Update[] = []
  let alreadyTagged = 0
  let noMatch = 0

  for (const p of medusaProducts) {
    for (const v of p.variants ?? []) {
      if (!v.sku) {
        noMatch++
        continue
      }
      if (v.metadata?.shopify_variant_id) {
        alreadyTagged++
        continue
      }
      const match = shopifyBySku.get(v.sku)
      if (!match) {
        noMatch++
        continue
      }
      updates.push({
        productId: p.id,
        productTitle: p.title,
        variantId: v.id,
        sku: v.sku,
        shopifyProductId: match.productId,
        shopifyVariantId: match.variantId,
        existingMetadata: v.metadata ?? {},
      })
    }
  }

  const totalVariants = medusaProducts.reduce(
    (n, p) => n + (p.variants?.length ?? 0),
    0,
  )
  console.log(`   Medusa variants checked: ${totalVariants}`)
  console.log(`   Already tagged: ${alreadyTagged}`)
  console.log(`   No SKU / no Shopify match: ${noMatch}`)
  console.log(`   To be tagged: ${updates.length}`)

  if (!APPLY || updates.length === 0) {
    updates
      .slice(0, 20)
      .forEach((u) =>
        console.log(
          `   - ${u.productTitle} (SKU ${u.sku}) → shopify_product_id=${u.shopifyProductId} shopify_variant_id=${u.shopifyVariantId}`,
        ),
      )
    if (updates.length > 20)
      console.log(`   ...and ${updates.length - 20} more`)
    return
  }

  let ok = 0
  let failed = 0
  for (const u of updates) {
    const res = await fetch(
      `${MEDUSA_URL}/admin/products/${u.productId}/variants/${u.variantId}`,
      {
        method: 'POST',
        headers: medusaHeaders(medusaToken),
        body: JSON.stringify({
          metadata: {
            ...u.existingMetadata,
            shopify_product_id: String(u.shopifyProductId),
            shopify_variant_id: String(u.shopifyVariantId),
          },
        }),
      },
    )
    if (res.ok) ok++
    else {
      failed++
      console.error(
        `   ❌ Failed for SKU ${u.sku}: ${res.status} ${await res.text()}`,
      )
    }
  }
  console.log(`✅ Tagged ${ok} variants. Failed: ${failed}.`)
}

main().catch((err) => {
  console.error('Script failed:', err.message)
  process.exit(1)
})
