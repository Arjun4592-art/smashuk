/**
 * scripts/fix-variant-prices.ts
 *
 * ONE-TIME DATA FIX for prices that were saved 100x too high.
 *
 * ROOT CAUSE:
 * scripts/import-shopify-csv.ts's parseMoney() did `parseFloat(v) * 100`,
 * treating Medusa's `amount` field as if it stored cents. This Medusa v2
 * instance actually stores `amount` as a plain decimal (e.g. 189.99 means
 * £189.99), so every price imported from the Shopify CSV ended up 100x too
 * high (e.g. £189.99 saved as 18999 -> displayed as £18,999.00 in Admin).
 *
 * parseMoney() has been fixed to stop multiplying by 100 (see
 * scripts/import-shopify-csv.ts) — that only prevents the bug for FUTURE
 * imports. This script repairs variants that are ALREADY wrong in the DB.
 *
 * WHAT THIS SCRIPT DOES:
 * 1) Fetches every product + variant + GBP price from Medusa Admin API.
 * 2) Flags any GBP price >= PRICE_THRESHOLD (default £1,000) as "likely
 *    100x too high" and divides it by 100.
 * 3) By default runs in DRY RUN mode — only prints what it WOULD change.
 * 4) Pass --apply to actually update the flagged variants.
 *
 * The £1,000 threshold is deliberately conservative: it should catch things
 * like a £189.99 racket saved as £18,999, without touching genuinely
 * expensive items that were entered correctly. Review the dry-run output
 * before applying — adjust PRICE_THRESHOLD below if it misses/over-catches
 * anything in your catalog.
 *
 * USAGE:
 *   npx tsx scripts/fix-variant-prices.ts              # dry run (safe)
 *   npx tsx scripts/fix-variant-prices.ts --apply       # actually fixes
 *
 * (Reads NEXT_PUBLIC_MEDUSA_BACKEND_URL / MEDUSA_ADMIN_EMAIL /
 * MEDUSA_ADMIN_PASSWORD from .env.local)
 */

import * as dotenv from 'dotenv'
import * as path from 'path'
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })

const MEDUSA_URL = process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL ?? 'http://localhost:9000'
const ADMIN_EMAIL = process.env.MEDUSA_ADMIN_EMAIL
const ADMIN_PASSWORD = process.env.MEDUSA_ADMIN_PASSWORD

// Any GBP price at or above this is treated as "likely x100 too high".
const PRICE_THRESHOLD = 1000

const APPLY = process.argv.includes('--apply')

if (!ADMIN_EMAIL || !ADMIN_PASSWORD) {
  console.error('❌ Set MEDUSA_ADMIN_EMAIL and MEDUSA_ADMIN_PASSWORD in .env.local before running this script.')
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

function gbp(amount: number) {
  return `£${amount.toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

async function main() {
  console.log(`Connecting to ${MEDUSA_URL} ...`)
  console.log(APPLY ? '⚠️  APPLY MODE — prices will be updated.\n' : 'ℹ️  DRY RUN — no changes will be made (pass --apply to fix).\n')

  const token = await getToken()

  const res = await fetch(
    `${MEDUSA_URL}/admin/products?limit=1000&fields=id,title,status,*variants,*variants.prices`,
    { headers: { Authorization: `Bearer ${token}` } },
  )
  if (!res.ok) throw new Error(`Fetch products failed: ${res.status} ${await res.text()}`)
  const data = await res.json()
  const products: any[] = data.products ?? []
  console.log(`Fetched ${products.length} products.\n`)

  type Fix = {
    productTitle: string
    productId: string
    variantId: string
    variantTitle: string
    sku: string | null
    priceId: string
    oldAmount: number
    newAmount: number
  }

  const fixes: Fix[] = []

  for (const p of products) {
    for (const v of p.variants ?? []) {
      for (const pr of v.prices ?? []) {
        if (pr.currency_code !== 'gbp') continue
        if (typeof pr.amount === 'number' && pr.amount >= PRICE_THRESHOLD) {
          fixes.push({
            productTitle: p.title,
            productId: p.id,
            variantId: v.id,
            variantTitle: v.title,
            sku: v.sku ?? null,
            priceId: pr.id,
            oldAmount: pr.amount,
            newAmount: Math.round((pr.amount / 100) * 100) / 100,
          })
        }
      }
    }
  }

  if (fixes.length === 0) {
    console.log('✅ No variants found at/above the threshold. Nothing to fix.')
    return
  }

  console.log(`Found ${fixes.length} variant price(s) likely 100x too high:\n`)
  for (const f of fixes) {
    console.log(
      `  "${f.productTitle}" — ${f.variantTitle} (sku=${f.sku ?? 'n/a'})\n` +
        `     ${gbp(f.oldAmount)}  ->  ${gbp(f.newAmount)}\n`,
    )
  }

  if (!APPLY) {
    console.log('Dry run only — nothing changed. Re-run with --apply to update these prices.')
    return
  }

  console.log('Applying fixes...\n')
  let okCount = 0
  let failCount = 0

  for (const f of fixes) {
    const updateRes = await fetch(`${MEDUSA_URL}/admin/products/${f.productId}/variants/${f.variantId}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        prices: [{ id: f.priceId, currency_code: 'gbp', amount: f.newAmount }],
      }),
    })

    if (updateRes.ok) {
      okCount++
      console.log(`  ✅ ${f.productTitle} (${f.sku ?? f.variantId}) -> ${gbp(f.newAmount)}`)
    } else {
      failCount++
      console.log(`  ❌ ${f.productTitle} (${f.sku ?? f.variantId}) failed: ${updateRes.status} ${await updateRes.text()}`)
    }
  }

  console.log(`\nDone. ${okCount} fixed, ${failCount} failed.`)
}

main().catch((err) => {
  console.error('Script failed:', err.message)
  process.exit(1)
})
