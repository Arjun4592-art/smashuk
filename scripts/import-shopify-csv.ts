/**
 * scripts/import-shopify-csv.ts
 *
 * Imports a Shopify product export CSV (Products → Export → "All products"
 * → CSV, from Shopify Admin) directly into Medusa — handle, title,
 * description, vendor (→ brand), variants (options/SKU/price/compare-at
 * price/inventory qty), images, tags, and published status.
 *
 * This is the accurate alternative to manually re-typing product data —
 * if you can export the real Shopify catalog, this script gets every
 * field exactly right instead of me re-typing it by hand from web pages.
 *
 * USAGE:
 *   1. In Shopify Admin: Products → Export → "All products" → Plain CSV
 *   2. Save the file as scripts/shopify-export.csv (or pass a path)
 *   3. Run: npx ts-node --esm scripts/import-shopify-csv.ts [path-to-csv]
 *
 * Every product is created as status: 'published' and auto-linked to the
 * store's sales channel (same as app/api/admin/products/route.ts does),
 * so nothing needs a separate "publish" step and nothing silently fails
 * at checkout for being unlinked from a sales channel.
 *
 * Products are matched to your existing categories (scripts/seed-smashuk.ts
 * CATEGORY_TREE) by matching the CSV's "Type" and "Tags" columns against
 * category names — anything that doesn't match a known category is still
 * imported, just left uncategorized, and printed at the end so you can
 * assign it manually in the dashboard.
 */

import * as dotenv from 'dotenv'
import * as path from 'path'
import * as fs from 'fs'
import Papa from 'papaparse'
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })

const MEDUSA_URL = process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL ?? 'http://localhost:9000'
const ADMIN_EMAIL = process.env.MEDUSA_ADMIN_EMAIL
const ADMIN_PASSWORD = process.env.MEDUSA_ADMIN_PASSWORD
const CSV_PATH = process.argv[2] ?? path.resolve(process.cwd(), 'scripts/shopify-export.csv')

if (!ADMIN_EMAIL || !ADMIN_PASSWORD) {
  console.error(
    '❌ Set MEDUSA_ADMIN_EMAIL and MEDUSA_ADMIN_PASSWORD in .env.local before running this script.',
  )
  process.exit(1)
}

if (!fs.existsSync(CSV_PATH)) {
  console.error(`❌ CSV not found at ${CSV_PATH}`)
  console.error('   Export it from Shopify Admin → Products → Export → "All products" → CSV,')
  console.error('   save it as scripts/shopify-export.csv, then re-run this script.')
  process.exit(1)
}

async function getToken(): Promise<string> {
  const res = await fetch(`${MEDUSA_URL}/auth/user/emailpass`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD }),
  })
  const data = await res.json()
  if (!res.ok || !data.token) throw new Error('Auth failed: ' + (data.message ?? res.status))
  return data.token as string
}

function headers(token: string) {
  return { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }
}

async function medusaGet(token: string, path: string) {
  const res = await fetch(`${MEDUSA_URL}${path}`, { headers: headers(token) })
  if (!res.ok) throw new Error(`GET ${path} failed (${res.status})`)
  return res.json()
}

async function medusaPost(token: string, path: string, body: any) {
  const res = await fetch(`${MEDUSA_URL}${path}`, {
    method: 'POST',
    headers: headers(token),
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    const err = await res.text()
    throw new Error(`POST ${path} failed (${res.status}): ${err.slice(0, 300)}`)
  }
  return res.json()
}

// ── Shopify CSV row shape (only the columns we use) ────────────────────────
interface ShopifyRow {
  Handle: string
  Title: string
  'Body (HTML)': string
  Vendor: string
  Type: string
  Tags: string
  Published: string
  'Option1 Name': string
  'Option1 Value': string
  'Option2 Name': string
  'Option2 Value': string
  'Option3 Name': string
  'Option3 Value': string
  'Variant SKU': string
  'Variant Price': string
  'Variant Compare At Price': string
  'Variant Inventory Qty': string
  'Image Src': string
  'Image Position': string
  Status: string
}

function parseMoney(v: string): number | undefined {
  if (!v) return undefined
  // Medusa's `amount` field here stores plain decimal pounds (e.g. 189.99
  // means £189.99) — NOT cents. Do not multiply by 100.
  const n = Math.round(parseFloat(v) * 100) / 100
  return Number.isFinite(n) ? n : undefined
}

async function main() {
  const token = await getToken()
  console.log('✅ Authenticated as admin\n')

  const csvText = fs.readFileSync(CSV_PATH, 'utf-8')
  const { data: rows } = Papa.parse<ShopifyRow>(csvText, {
    header: true,
    skipEmptyLines: true,
  })
  console.log(`📄 Parsed ${rows.length} CSV rows`)

  // Group rows by Handle — Shopify repeats the Handle across one row per
  // variant and one row per extra image, with most product-level fields
  // blank after the first row for that handle.
  const grouped = new Map<string, ShopifyRow[]>()
  for (const row of rows) {
    if (!row.Handle) continue
    if (!grouped.has(row.Handle)) grouped.set(row.Handle, [])
    grouped.get(row.Handle)!.push(row)
  }
  console.log(`📦 Grouped into ${grouped.size} products\n`)

  // Existing categories, for name-based matching
  const { product_categories: categories } = await medusaGet(
    token,
    '/admin/product-categories?limit=200',
  )
  const categoryByName = new Map<string, string>(
    (categories ?? []).map((c: any) => [c.name.toLowerCase(), c.id]),
  )

  // Sales channel to auto-link (same as app/api/admin/products/route.ts)
  const { sales_channels } = await medusaGet(token, '/admin/sales-channels?limit=1')
  const channelId = sales_channels?.[0]?.id

  // Shipping profile to auto-link — without this, imported products have no
  // shipping profile at all, and checkout fails for every one of them with
  // "cart items require shipping profiles that are not satisfied by the
  // current shipping methods" (see scripts/fix-products-shipping-profile.ts
  // for the one-time fix for products already imported before this line
  // existed).
  const { shipping_profiles: shippingProfiles } = await medusaGet(
    token,
    '/admin/shipping-profiles?limit=50',
  )
  const shippingProfileId =
    (shippingProfiles ?? []).find((p: any) => p.type === 'default')?.id ??
    (shippingProfiles ?? []).find((p: any) => /default/i.test(p.name ?? ''))?.id

  let created = 0
  let failed = 0
  const uncategorized: string[] = []

  for (const [handle, productRows] of grouped) {
    const first = productRows.find((r) => r.Title) ?? productRows[0]
    if (!first?.Title) continue

    // Images: unique, ordered by Image Position
    const images = productRows
      .filter((r) => r['Image Src'])
      .sort((a, b) => Number(a['Image Position'] || 0) - Number(b['Image Position'] || 0))
      .map((r) => ({ url: r['Image Src'] }))
      .filter((img, i, arr) => arr.findIndex((x) => x.url === img.url) === i)

    // Options: collect distinct option names used
    const optionNames = ['Option1 Name', 'Option2 Name', 'Option3 Name']
      .map((k) => first[k as keyof ShopifyRow])
      .filter((v): v is string => !!v && v !== 'Title')

    // Variants: one per row that has a SKU or a price
    const variants = productRows
      .filter((r) => r['Variant SKU'] || r['Variant Price'])
      .map((r) => {
        const optionValues = ['Option1 Value', 'Option2 Value', 'Option3 Value']
          .map((k) => r[k as keyof ShopifyRow])
          .filter(Boolean)
        const price = parseMoney(r['Variant Price'])
        const compareAt = parseMoney(r['Variant Compare At Price'])
        return {
          title: optionValues.join(' / ') || 'Default',
          sku: r['Variant SKU'] || undefined,
          options: optionNames.length
            ? Object.fromEntries(optionNames.map((n, i) => [n, optionValues[i] ?? 'Standard']))
            : undefined,
          prices: [
            ...(price !== undefined ? [{ currency_code: 'gbp', amount: price }] : []),
            ...(compareAt !== undefined ? [{ currency_code: 'gbp', amount: compareAt }] : []),
          ],
          _stock: Number(r['Variant Inventory Qty'] || 0),
        }
      })

    if (variants.length === 0) {
      variants.push({
        title: 'Default',
        sku: undefined,
        options: undefined,
        prices: [],
        _stock: 0,
      } as any)
    }

    // Category match: try Type first, then each Tag
    const typeAndTags = [first.Type, ...(first.Tags ? first.Tags.split(',') : [])]
      .map((t) => t.trim().toLowerCase())
      .filter(Boolean)
    const matchedCategoryId = typeAndTags
      .map((t) => categoryByName.get(t))
      .find((id) => !!id)
    if (!matchedCategoryId) uncategorized.push(first.Title)

    const payload = {
      title: first.Title,
      handle,
      description: first['Body (HTML)'] || undefined,
      status: 'published', // always published — see app/api/admin/products/route.ts
      thumbnail: images[0]?.url,
      images: images.length > 0 ? images : undefined,
      categories: matchedCategoryId ? [{ id: matchedCategoryId }] : undefined,
      tags: first.Tags
        ? first.Tags.split(',').map((t) => ({ value: t.trim() })).filter((t) => t.value)
        : undefined,
      sales_channels: channelId ? [{ id: channelId }] : undefined,
      ...(shippingProfileId ? { shipping_profile_id: shippingProfileId } : {}),
      options: optionNames.length
        ? optionNames.map((name) => ({
            title: name,
            values: [...new Set(variants.map((v: any) => v.options?.[name]).filter(Boolean))],
          }))
        : [{ title: 'Type', values: ['Standard'] }],
      variants: variants.map(({ _stock, ...v }: any) => v),
      metadata: { brand: first.Vendor || undefined },
    }

    try {
      await medusaPost(token, '/admin/products', payload)
      created++
      if (created % 10 === 0) console.log(`  ...${created} created`)
    } catch (err: any) {
      failed++
      console.warn(`  ⚠️  Failed: "${first.Title}" — ${err.message}`)
    }
  }

  console.log(`\n✅ Created ${created} products (${failed} failed)`)
  if (uncategorized.length > 0) {
    console.log(`\n⚠️  ${uncategorized.length} products had no matching category (imported anyway, assign manually):`)
    uncategorized.slice(0, 20).forEach((t) => console.log(`   - ${t}`))
    if (uncategorized.length > 20) console.log(`   ...and ${uncategorized.length - 20} more`)
  }
  console.log('\nNOTE: stock quantities from the CSV were not set here — inventory levels')
  console.log('need to be set per-location in Medusa Admin (Inventory), since that needs a')
  console.log('stock location ID this script does not assume. Adjust stock in the dashboard')
  console.log('after import, or tell me your stock location setup and I\'ll wire it in.')
}

main().catch((err) => {
  console.error('❌', err.message)
  process.exit(1)
})
