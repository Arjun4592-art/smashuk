/**
 * scripts/fix-pickup-shipping-profiles.ts
 *
 * Root-cause fix for: "The cart items require shipping profiles that are
 * not satisfied by the current shipping methods" on POS "Take from store"
 * (pickup) sales.
 *
 * WHY THIS HAPPENS (Medusa v2):
 * Every product is linked to exactly one Shipping Profile. A shipping
 * option is ALSO linked to exactly one Shipping Profile. At checkout,
 * Medusa requires every product in the cart to have at least one shipping
 * method in the cart whose profile matches the product's profile — if not,
 * checkout fails with exactly this error.
 *
 * scripts/add-store-pickup-option.ts previously guessed which profile to
 * use (first shipping profile, then "copy from Standard Shipping option").
 * Both guesses can be wrong if products were imported (e.g. via
 * scripts/import-shopify-csv.ts) onto a DIFFERENT profile than the one
 * Standard/Express Shipping uses, or onto several different profiles.
 *
 * This script stops guessing: it reads the actual shipping_profile_id of
 * EVERY product, and creates one free "Store Pickup" shipping option per
 * distinct profile actually in use — so no product can ever be left
 * without a matching pickup option.
 *
 * Run: npx ts-node --esm scripts/fix-pickup-shipping-profiles.ts
 * Safe to re-run — removes and recreates its own pickup options each time.
 */

import * as dotenv from 'dotenv'
import * as path from 'path'
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })

const MEDUSA_URL = process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL ?? 'http://localhost:9000'
const ADMIN_EMAIL = process.env.MEDUSA_ADMIN_EMAIL
const ADMIN_PASSWORD = process.env.MEDUSA_ADMIN_PASSWORD

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

function headers(token: string) {
  return { Authorization: `Bearer ${token}` }
}

async function medusaGet(token: string, path: string) {
  const res = await fetch(`${MEDUSA_URL}${path}`, { headers: headers(token) })
  if (!res.ok) throw new Error(`GET ${path} failed (${res.status}): ${await res.text()}`)
  return res.json()
}

async function medusaPost(token: string, path: string, body: any) {
  const res = await fetch(`${MEDUSA_URL}${path}`, {
    method: 'POST',
    headers: { ...headers(token), 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    const err = await res.text()
    throw new Error(`POST ${path} failed (${res.status}): ${err.slice(0, 300)}`)
  }
  return res.json()
}

async function medusaDelete(token: string, path: string) {
  const res = await fetch(`${MEDUSA_URL}${path}`, { method: 'DELETE', headers: headers(token) })
  return res.ok
}

async function main() {
  const token = await getToken()
  console.log('✅ Authenticated as admin\n')

  // ── 1) Read every product's ACTUAL shipping profile (no guessing) ──────────
  console.log('🔎 Scanning products for their real shipping profiles...')
  const allProducts: any[] = []
  let offset = 0
  const limit = 100
  while (true) {
    const { products, count } = await medusaGet(
      token,
      `/admin/products?limit=${limit}&offset=${offset}&fields=id,title,+shipping_profile.id,+shipping_profile.name`,
    )
    allProducts.push(...products)
    offset += limit
    if (offset >= count || products.length === 0) break
  }

  const profileUsage = new Map<string, { name: string; count: number }>()
  let noProfileCount = 0
  for (const p of allProducts) {
    const profile = p.shipping_profile
    if (!profile?.id) {
      noProfileCount++
      continue
    }
    const entry = profileUsage.get(profile.id) ?? { name: profile.name, count: 0 }
    entry.count++
    profileUsage.set(profile.id, entry)
  }

  console.log(`   Found ${allProducts.length} products total.`)
  if (noProfileCount > 0) {
    console.log(`   ⚠️  ${noProfileCount} product(s) have NO shipping profile at all — Medusa treats these as not requiring shipping, so pickup isn't the issue for them.`)
  }
  for (const [id, info] of profileUsage) {
    console.log(`   • "${info.name}" (${id}) — ${info.count} product(s)`)
  }
  if (profileUsage.size === 0) {
    console.log('\n✅ No products are linked to any shipping profile — nothing to fix here. The 400 error must have a different cause; check the server terminal for the exact Medusa error on your next sale attempt.')
    return
  }

  // ── 2) Find the Pickup service zone (same logic as add-store-pickup-option.ts) ──
  const location = await medusaGet(token, '/admin/stock-locations?limit=1')
    .then((d) => d.stock_locations?.[0])
    .catch(() => null)
  if (!location) {
    console.error('❌ No stock location found — set one up in Medusa Admin first.')
    process.exit(1)
  }

  const locationWithSets = await medusaGet(
    token,
    `/admin/stock-locations/${location.id}?fields=*fulfillment_sets,*fulfillment_sets.service_zones`,
  ).catch(() => null)
  const fulfillmentSets = locationWithSets?.stock_location?.fulfillment_sets ?? []
  const fulfillmentSet =
    fulfillmentSets.find((fs: any) => fs.type === 'pickup') ??
    fulfillmentSets.find((fs: any) => /pickup/i.test(fs.name ?? '')) ??
    fulfillmentSets[0]
  if (!fulfillmentSet) {
    console.error('❌ No fulfillment set found for that location — configure Pickup in Admin → Locations & Shipping first.')
    process.exit(1)
  }
  const serviceZone = fulfillmentSet.service_zones?.[0]
  if (!serviceZone) {
    console.error(`❌ The "${fulfillmentSet.name}" fulfillment set has no service zone yet — add one covering the UK first.`)
    process.exit(1)
  }

  const { fulfillment_providers } = await medusaGet(token, '/admin/fulfillment-providers').catch(
    () => ({ fulfillment_providers: [] }),
  )
  const providerId = (fulfillment_providers ?? [])[0]?.id ?? 'manual_manual'

  // ── 3) Remove any pickup options this script (or the older one) created ────
  const { shipping_options: existingOptions } = await medusaGet(token, '/admin/shipping-options?limit=100')
  const oldPickupOptions = (existingOptions ?? []).filter((o: any) => /^store pickup/i.test(o.name ?? ''))
  for (const opt of oldPickupOptions) {
    console.log(`↩️  Removing old "${opt.name}"...`)
    await medusaDelete(token, `/admin/shipping-options/${opt.id}`)
  }
  if (oldPickupOptions.length > 0) console.log('')

  // ── 4) Create one free pickup option PER profile actually used by products ─
  console.log('🛠  Creating pickup options...')
  for (const [profileId, info] of profileUsage) {
    const name =
      profileUsage.size === 1 ? 'Store Pickup (Free)' : `Store Pickup (Free) - ${info.name}`
    await medusaPost(token, '/admin/shipping-options', {
      name,
      service_zone_id: serviceZone.id,
      shipping_profile_id: profileId,
      provider_id: providerId,
      price_type: 'flat',
      type: {
        label: 'Store Pickup',
        description: 'Collect your order in-store, free of charge.',
        code: `store_pickup_${profileId}`,
      },
      data: { name },
      // The real Medusa v2 rule attribute that exposes an option to the
      // Store API/checkout — 'enabled' (used by an earlier version of this
      // fix) is not a real attribute and silently leaves the option
      // Admin-only.
      rules: [{ operator: 'eq', attribute: 'enabled_in_store', value: 'true' }],
      prices: [{ currency_code: 'gbp', amount: 0, rules: [] }],
    })
    console.log(`   ✅ "${name}" — covers ${info.count} product(s)`)
  }

  console.log(
    `\n✅ Done. Every product's shipping profile now has a matching free pickup option in "${fulfillmentSet.name}" → "${serviceZone.name}".`,
  )
  console.log('Try a POS "Take from store" sale again.')
}

main().catch((err) => {
  console.error('❌', err.message)
  process.exit(1)
})
