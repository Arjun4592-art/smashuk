import * as dotenv from 'dotenv'
import * as path from 'path'
// Which env file to load — defaults to .env.local, but pass a different one
// (e.g. .env.production) via the ENV_FILE variable, so this can be pointed
// at production without hand-editing .env.local:
//   PowerShell:  $env:ENV_FILE=".env.production"; npx tsx scripts/backfill-shopify-ids.ts
//   bash/zsh:    ENV_FILE=.env.production npx tsx scripts/backfill-shopify-ids.ts
const ENV_FILE = process.env.ENV_FILE || '.env.local'
dotenv.config({ path: path.resolve(process.cwd(), ENV_FILE), override: true })
console.log(`   (using env file: ${ENV_FILE})`)

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
  title?: string | null
  options?: { value: string }[]
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
      `${MEDUSA_URL}/admin/products?limit=${limit}&offset=${offset}&fields=id,title,variants.id,variants.sku,variants.metadata,variants.title,variants.options.value`,
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
  title?: string | null
  option1?: string | null
  option2?: string | null
  option3?: string | null
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

  // Shopify itself sometimes reuses one SKU across several variants — e.g.
  // every size of a shirt sharing the same SKU (or, worse, a copy-paste
  // typo reusing a SKU across two entirely different products). Matching
  // blindly on SKU alone would risk linking the wrong physical
  // variant/product — e.g. tying a Medusa "L / Black" variant to Shopify's
  // "XS / Black" listing. So every SKU keeps ALL of its Shopify candidates
  // here; disambiguation by size/colour options happens per-Medusa-variant
  // below, and anything still ambiguous after that is skipped rather than
  // guessed.
  const shopifyBySku = new Map<
    string,
    { productId: number; variantId: number; options: Set<string> }[]
  >()
  function optionSet(
    o1?: string | null,
    o2?: string | null,
    o3?: string | null,
  ): Set<string> {
    return new Set(
      [o1, o2, o3]
        .filter((x): x is string => !!x)
        .map((x) => x.trim().toLowerCase()),
    )
  }
  for (const p of shopifyProducts) {
    for (const v of p.variants ?? []) {
      if (!v.sku) continue
      const list = shopifyBySku.get(v.sku) ?? []
      list.push({
        productId: p.id,
        variantId: v.id,
        options: optionSet(v.option1, v.option2, v.option3),
      })
      shopifyBySku.set(v.sku, list)
    }
  }
  const duplicateSkuCount = [...shopifyBySku.values()].filter(
    (l) => l.length > 1,
  ).length
  if (duplicateSkuCount > 0) {
    console.warn(
      `⚠️  ${duplicateSkuCount} SKU(s) are reused across multiple Shopify variants — will disambiguate by size/colour options per match, skipping any that stay ambiguous.\n`,
    )
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
  const ambiguous: {
    productTitle: string
    variantTitle: string
    sku: string
  }[] = []

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
      const candidates = shopifyBySku.get(v.sku)
      if (!candidates || candidates.length === 0) {
        noMatch++
        continue
      }
      let match = candidates[0]
      if (candidates.length > 1) {
        const mset = optionSet(
          ...((v.options ?? []).map((o) => o.value) as [
            string?,
            string?,
            string?,
          ]),
        )
        const exact = candidates.filter((c) => {
          if (c.options.size !== mset.size) return false
          for (const x of c.options) if (!mset.has(x)) return false
          return true
        })
        if (exact.length === 1) {
          match = exact[0]
        } else {
          ambiguous.push({
            productTitle: p.title,
            variantTitle: v.title ?? '',
            sku: v.sku,
          })
          continue
        }
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
  console.log(
    `   Ambiguous (duplicate SKU, options didn't disambiguate — skipped): ${ambiguous.length}`,
  )
  console.log(`   To be tagged: ${updates.length}`)
  if (ambiguous.length > 0) {
    console.log(`\n   Ambiguous — review manually, none of these were touched:`)
    ambiguous
      .slice(0, 20)
      .forEach((a) =>
        console.log(
          `   - ${a.productTitle} → variant "${a.variantTitle}" (SKU ${a.sku})`,
        ),
      )
    if (ambiguous.length > 20)
      console.log(`   ...and ${ambiguous.length - 20} more`)
    console.log('')
  }

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
  for (const [i, u] of updates.entries()) {
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
    if ((i + 1) % 50 === 0 || i === updates.length - 1) {
      console.log(`   ...${i + 1}/${updates.length} processed`)
    }
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
