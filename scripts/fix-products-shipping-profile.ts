/**
 * scripts/fix-products-shipping-profile.ts
 *
 * PERMANENT root-cause fix for: "The cart items require shipping profiles
 * that are not satisfied by the current shipping methods" on POS "Take
 * from store" (and potentially website) checkout.
 *
 * WHAT scripts/fix-pickup-shipping-profiles.ts FOUND:
 * None of the 110 products in this store are linked to ANY shipping
 * profile at all. Medusa v2 requires this link for a variant with managed
 * inventory to be sellable with a shipping method attached to it — with no
 * profile, there's nothing for any shipping option to match, so checkout
 * always fails with this error, regardless of which shipping option is
 * used. scripts/seed-smashuk.ts and scripts/import-shopify-csv.ts never set
 * shipping_profile_id when creating products, which is how this happened.
 *
 * WHAT THIS SCRIPT DOES:
 * 1) Finds (or creates) ONE canonical "Default Shipping Profile".
 * 2) Links every product that currently has no shipping profile to it.
 * 3) Creates exactly ONE free "Store Pickup" shipping option on that same
 *    profile, in the location's Pickup service zone.
 *
 * This is deliberately a single canonical profile (not one per product) —
 * simpler to reason about, and it's what "Standard Shipping"/"Express
 * Shipping" should also eventually be checked against for online orders.
 *
 * Run: npx ts-node --esm scripts/fix-products-shipping-profile.ts
 * Safe to re-run — only touches products that still have no profile, and
 * recreates its own pickup option each time.
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

  // ── 1) Find the canonical shipping profile ──────────────────────────────────
  // Prefer copying the profile from an existing REAL shipping option
  // (Standard/Express Shipping) over guessing by name/type — this guarantees
  // products end up on the exact same profile the website's shipping
  // options already use, so linking products here can't break online
  // checkout. Only fall back to name/type guessing (or creating a new
  // profile) if no such option exists yet.
  const { shipping_options: allExistingOptions } = await medusaGet(token, '/admin/shipping-options?limit=100')
  const workingOption = (allExistingOptions ?? []).find(
    (o: any) => !/^store pickup/i.test(o.name ?? ''),
  )

  let defaultProfile: any
  if (workingOption) {
    const { shipping_option } = await medusaGet(
      token,
      `/admin/shipping-options/${workingOption.id}?fields=*shipping_profile`,
    ).catch(() => ({ shipping_option: null }))
    if (shipping_option?.shipping_profile) {
      defaultProfile = shipping_option.shipping_profile
      console.log(`ℹ️  Copying profile from existing "${workingOption.name}" — this keeps your Standard/Express Shipping working untouched.\n`)
    }
  }

  if (!defaultProfile) {
    const { shipping_profiles: profiles } = await medusaGet(token, '/admin/shipping-profiles?limit=50')
    defaultProfile =
      (profiles ?? []).find((p: any) => p.type === 'default') ??
      (profiles ?? []).find((p: any) => /default/i.test(p.name ?? ''))

    if (!defaultProfile) {
      console.log('ℹ️  No default shipping profile found — creating one...')
      const created = await medusaPost(token, '/admin/shipping-profiles', {
        name: 'Default Shipping Profile',
        type: 'default',
      })
      defaultProfile = created.shipping_profile
    }
  }
  console.log(`ℹ️  Using canonical profile: "${defaultProfile.name}" (${defaultProfile.id})\n`)

  // ── 2) Link every product that has no profile yet ───────────────────────────
  console.log('🔎 Scanning products...')
  const allProducts: any[] = []
  let offset = 0
  const limit = 100
  while (true) {
    const { products, count } = await medusaGet(
      token,
      `/admin/products?limit=${limit}&offset=${offset}&fields=id,title,+shipping_profile.id`,
    )
    allProducts.push(...products)
    offset += limit
    if (offset >= count || products.length === 0) break
  }

  const unlinked = allProducts.filter((p) => !p.shipping_profile?.id)
  console.log(`   ${allProducts.length} products total, ${unlinked.length} need linking.\n`)

  if (unlinked.length > 0) {
    console.log(`🛠  Linking ${unlinked.length} products to "${defaultProfile.name}"...`)
    let done = 0
    for (const p of unlinked) {
      await medusaPost(token, `/admin/products/${p.id}`, {
        shipping_profile_id: defaultProfile.id,
      })
      done++
      if (done % 20 === 0 || done === unlinked.length) {
        console.log(`   ...${done}/${unlinked.length}`)
      }
    }
    console.log('✅ All products linked.\n')
  } else {
    console.log('✅ All products already linked — nothing to do here.\n')
  }

  // ── 3) Create (or recreate) exactly ONE pickup option on this profile ──────
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

  const { shipping_options: existingOptions } = await medusaGet(token, '/admin/shipping-options?limit=100')
  const oldPickupOptions = (existingOptions ?? []).filter((o: any) => /^store pickup/i.test(o.name ?? ''))
  for (const opt of oldPickupOptions) {
    console.log(`↩️  Removing old "${opt.name}"...`)
    await medusaDelete(token, `/admin/shipping-options/${opt.id}`)
  }

  await medusaPost(token, '/admin/shipping-options', {
    name: 'Store Pickup (Free)',
    service_zone_id: serviceZone.id,
    shipping_profile_id: defaultProfile.id,
    provider_id: providerId,
    price_type: 'flat',
    type: {
      label: 'Store Pickup',
      description: 'Collect your order in-store, free of charge.',
      code: 'store_pickup',
    },
    data: { name: 'Store Pickup (Free)' },
    rules: [{ operator: 'eq', attribute: 'enabled_in_store', value: 'true' }],
    prices: [{ currency_code: 'gbp', amount: 0, rules: [] }],
  })

  console.log(
    `\n✅ Done. All products are on "${defaultProfile.name}", and "Store Pickup (Free)" is created on the same profile in "${fulfillmentSet.name}" → "${serviceZone.name}".`,
  )
  console.log('Try a POS "Take from store" sale again — and this will keep working for any future product created on this profile.')
}

main().catch((err) => {
  console.error('❌', err.message)
  process.exit(1)
})
