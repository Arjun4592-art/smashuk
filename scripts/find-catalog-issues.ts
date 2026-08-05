/**
 * scripts/find-catalog-issues.ts
 *
 * READ-ONLY diagnostic. Fixes nothing, changes nothing — just reports.
 *
 * Explains why the POS Analytics → "Top Selling Products" table showed
 * confusing results:
 *   - "Yonex ArcSaber 11 Pro Badminton Racket" listed TWICE with different
 *     sold/revenue numbers.
 *   - "Medusa T-Shirt" (a leftover Medusa seed/demo product) showing 21 sold
 *     for only £2.10 total revenue (~10p/unit).
 *
 * The Analytics aggregation code (app/pos/terminal/analytics/page.tsx) groups
 * by Medusa product id, which is correct — the confusing output is a data
 * problem, not a code bug: two separate Medusa products share the same
 * title (most likely from the Shopify CSV import running more than once, or
 * a product being re-created after a failed import), and the store still has
 * Medusa's default seed products (like "Medusa T-Shirt") mixed in with the
 * real catalog.
 *
 * This script lists:
 *   1. Every group of products that share the same title (case-insensitive)
 *      — the duplicates causing split Top Selling Products rows.
 *   2. Every variant priced under £1 — the likely source of the "10p"
 *      revenue line.
 *
 * Nothing is deleted or modified. Once you know which product id to keep,
 * delete/unpublish the other one from Products.
 *
 * USAGE:
 *   MEDUSA_ADMIN_EMAIL=you@yourstore.com MEDUSA_ADMIN_PASSWORD=yourpassword \
 *   npx ts-node --esm scripts/find-catalog-issues.ts
 *
 * (Reads NEXT_PUBLIC_MEDUSA_BACKEND_URL / MEDUSA_ADMIN_EMAIL /
 * MEDUSA_ADMIN_PASSWORD from .env.local if not passed inline.)
 */

import * as dotenv from 'dotenv'
import * as path from 'path'
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })

const MEDUSA_URL = process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL ?? 'http://localhost:9000'
const ADMIN_EMAIL = process.env.MEDUSA_ADMIN_EMAIL
const ADMIN_PASSWORD = process.env.MEDUSA_ADMIN_PASSWORD

if (!ADMIN_EMAIL || !ADMIN_PASSWORD) {
  console.error('Set MEDUSA_ADMIN_EMAIL and MEDUSA_ADMIN_PASSWORD in .env.local before running this script.')
  process.exit(1)
}

async function getToken(): Promise<string> {
  const res = await fetch(`${MEDUSA_URL}/auth/user/emailpass`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD }),
  })
  if (!res.ok) throw new Error(`Login failed: ${res.status} ${await res.text()}`)
  const data = await res.json()
  return data.token
}

async function main() {
  console.log(`Connecting to ${MEDUSA_URL} ...`)
  const token = await getToken()

  const res = await fetch(
    `${MEDUSA_URL}/admin/products?limit=1000&fields=id,title,status,created_at,*variants,*variants.prices`,
    { headers: { Authorization: `Bearer ${token}` } },
  )
  if (!res.ok) throw new Error(`Fetch products failed: ${res.status} ${await res.text()}`)
  const data = await res.json()
  const products: any[] = data.products ?? []
  console.log(`Fetched ${products.length} products.\n`)

  // ── 1. Duplicate titles ──────────────────────────────────────────────
  const byTitle = new Map<string, any[]>()
  for (const p of products) {
    const key = (p.title ?? '').trim().toLowerCase()
    if (!key) continue
    if (!byTitle.has(key)) byTitle.set(key, [])
    byTitle.get(key)!.push(p)
  }
  const duplicates = [...byTitle.values()].filter((group) => group.length > 1)

  console.log(`── Duplicate product titles: ${duplicates.length} group(s) ──`)
  if (duplicates.length === 0) {
    console.log('  None found.\n')
  } else {
    for (const group of duplicates) {
      console.log(`  "${group[0].title}" — ${group.length} products:`)
      for (const p of group) {
        const price = p.variants?.[0]?.prices?.find((pr: any) => pr.currency_code === 'gbp')?.amount
        console.log(
          `    id=${p.id}  status=${p.status}  price=${price != null ? `£${price.toFixed(2)}` : 'n/a'}  created=${p.created_at}`,
        )
      }
      console.log('')
    }
  }

  // ── 2. Suspiciously cheap variants (< £1) ────────────────────────────
  console.log(`── Variants priced under £1 ──`)
  let cheapCount = 0
  for (const p of products) {
    for (const v of p.variants ?? []) {
      const gbp = v.prices?.find((pr: any) => pr.currency_code === 'gbp')?.amount
      if (gbp != null && gbp > 0 && gbp < 1) {
        cheapCount++
        console.log(
          `  "${p.title}" (product id=${p.id}, variant id=${v.id}, sku=${v.sku ?? 'n/a'}) — £${gbp.toFixed(2)}`,
        )
      }
    }
  }
  if (cheapCount === 0) console.log('  None found.')

  console.log('\nNothing was changed. Review the ids above and delete/unpublish/re-price in the dashboard as needed.')
}

main().catch((err) => {
  console.error('Script failed:', err.message)
  process.exit(1)
})
