/**
 * scripts/add-store-pickup-option.ts
 *
 * Adds a free "Store Pickup" shipping option to Medusa, alongside the
 * existing Royal Mail options from scripts/seed-smashuk.ts. Needed for the
 * new checkout "Delivery Method" picker (app/(website)/checkout/page.tsx)
 * and the POS "Ship to them" toggle to have a pickup option to show/detect
 * — both look for a shipping option whose name matches /pickup|store|collect/i.
 *
 * Run: npx ts-node --esm scripts/add-store-pickup-option.ts
 *
 * Safe to re-run — skips if a matching option already exists.
 */

import * as dotenv from 'dotenv'
import * as path from 'path'
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })

const MEDUSA_URL = process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL ?? 'http://localhost:9000'
const ADMIN_EMAIL = process.env.MEDUSA_ADMIN_EMAIL
const ADMIN_PASSWORD = process.env.MEDUSA_ADMIN_PASSWORD

if (!ADMIN_EMAIL || !ADMIN_PASSWORD) {
  console.error(
    '❌ Set MEDUSA_ADMIN_EMAIL and MEDUSA_ADMIN_PASSWORD in .env.local before running this script.',
  )
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
  if (!res.ok) throw new Error(`GET ${path} failed (${res.status})`)
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
    throw new Error(`POST ${path} failed (${res.status}): ${err.slice(0, 200)}`)
  }
  return res.json()
}

async function main() {
  const token = await getToken()
  console.log('✅ Authenticated as admin\n')

  const { shipping_options: existingOptions } = await medusaGet(
    token,
    '/admin/shipping-options?limit=50',
  )
  const existingPickup = (existingOptions ?? []).find((o: any) =>
    /pickup|store|collect/i.test(o.name ?? ''),
  )
  if (existingPickup) {
    // An earlier run of this script created "Store Pickup (Free)" with the
    // wrong rule attribute ('enabled' instead of 'enabled_in_store'), which
    // left it Admin-only (invisible to the cart). Delete it here so it gets
    // recreated below with the corrected rule, instead of silently
    // skipping and leaving the broken one in place forever.
    console.log(`↩️  Found existing "${existingPickup.name}" — removing so it can be recreated correctly...`)
    const delRes = await fetch(`${MEDUSA_URL}/admin/shipping-options/${existingPickup.id}`, {
      method: 'DELETE',
      headers: headers(token),
    })
    if (!delRes.ok) {
      console.error(`❌ Could not delete existing "${existingPickup.name}" (HTTP ${delRes.status}) — please delete it manually in Admin → Locations & Shipping first, then re-run.`)
      process.exit(1)
    }
    console.log('✅ Removed old option\n')
  }

  const { fulfillment_providers } = await medusaGet(
    token,
    '/admin/fulfillment-providers',
  ).catch(() => ({ fulfillment_providers: [] }))
  const providers = fulfillment_providers ?? []

  const location = await medusaGet(token, '/admin/stock-locations?limit=1')
    .then((d) => d.stock_locations?.[0])
    .catch(() => null)
  if (!location) {
    console.error('❌ No stock location found — set one up in Medusa Admin first.')
    process.exit(1)
  }

  // NOTE: `/admin/stock-locations/:id/fulfillment-sets` is NOT a real Medusa
  // v2 admin route — it 404s, which the old code silently swallowed via
  // `.catch(() => null)`, always printing "No fulfillment set found" even
  // when the location's fulfillment sets were visible and fully configured
  // in Admin → Settings → Locations & Shipping. The correct way to get them
  // is to request the `fulfillment_sets` relation on the location itself.
  const locationWithSets = await medusaGet(
    token,
    `/admin/stock-locations/${location.id}?fields=*fulfillment_sets,*fulfillment_sets.service_zones`,
  ).catch(() => null)
  const fulfillmentSets = locationWithSets?.stock_location?.fulfillment_sets ?? []

  if (fulfillmentSets.length === 0) {
    console.error('❌ No fulfillment set found for that location — configure it in Medusa Admin first.')
    process.exit(1)
  }

  // A location can have BOTH a "Pickup" set and a "Shipping" set (as seen in
  // Admin → Locations & Shipping). Picking fulfillment_sets[0] blindly could
  // grab either one. We specifically want the Pickup set — that's where a
  // free in-store collection option belongs, and it's what the POS/checkout
  // pickup-detection regex (/pickup|store|collect/i) is meant to find.
  const fulfillmentSet =
    fulfillmentSets.find((fs: any) => fs.type === 'pickup') ??
    fulfillmentSets.find((fs: any) => /pickup/i.test(fs.name ?? '')) ??
    fulfillmentSets[0]

  const serviceZone = fulfillmentSet.service_zones?.[0]
  if (!serviceZone) {
    console.error(
      `❌ The "${fulfillmentSet.name}" fulfillment set has no service zone yet — add one in Admin → Locations & Shipping → ${fulfillmentSet.name} first (e.g. covering the UK).`,
    )
    process.exit(1)
  }

  // Guessing the shipping profile by name/type ("default") isn't reliable —
  // the real fix is to copy the exact shipping_profile_id from a shipping
  // option that's ALREADY working (e.g. "Standard Shipping"), since that's
  // proof-positive it matches what the products are attached to. Fetch full
  // option detail (list endpoint doesn't include shipping_profile_id).
  const workingOption = (existingOptions ?? []).find(
    (o: any) => !/pickup|store|collect/i.test(o.name ?? ''),
  )
  let shippingProfileId: string | undefined
  let profileSourceLabel = ''

  if (workingOption) {
    const { shipping_option } = await medusaGet(
      token,
      `/admin/shipping-options/${workingOption.id}?fields=*shipping_profile`,
    ).catch(() => ({ shipping_option: null }))
    shippingProfileId =
      shipping_option?.shipping_profile_id ?? shipping_option?.shipping_profile?.id
    profileSourceLabel = `copied from existing option "${workingOption.name}"`
  }

  if (!shippingProfileId) {
    // Fallback: no working option to copy from — pick the "default" one.
    const { shipping_profiles: shippingProfiles } = await medusaGet(
      token,
      '/admin/shipping-profiles?limit=50',
    ).catch(() => ({ shipping_profiles: [] }))
    const defaultProfile =
      (shippingProfiles ?? []).find((p: any) => p.type === 'default') ??
      (shippingProfiles ?? []).find((p: any) => /default/i.test(p.name ?? '')) ??
      (shippingProfiles ?? [])[0]
    shippingProfileId = defaultProfile?.id
    profileSourceLabel = `fallback guess "${defaultProfile?.name}"`
  }

  if (!shippingProfileId) {
    console.error('❌ No shipping profile found — set one up in Admin → Locations & Shipping → Shipping Profiles first.')
    process.exit(1)
  }
  console.log(`ℹ️  Using shipping profile: ${shippingProfileId} (${profileSourceLabel})`)

  // NOTE: `POST /admin/fulfillment-sets/:id/service-zones/:id/shipping-options`
  // is NOT a real Medusa v2 route (it 404s). Shipping options are created
  // directly via `POST /admin/shipping-options`, with the service zone and
  // shipping profile passed in the body instead of the URL.
  await medusaPost(token, '/admin/shipping-options', {
    name: 'Store Pickup (Free)',
    service_zone_id: serviceZone.id,
    shipping_profile_id: shippingProfileId,
    provider_id: providers[0]?.id ?? 'manual_manual',
    price_type: 'flat',
    type: {
      label: 'Store Pickup',
      description: 'Collect your order in-store, free of charge.',
      code: 'store_pickup',
    },
    data: { name: 'Store Pickup (Free)' },
    // 'enabled_in_store' (not 'enabled') is the real Medusa v2 rule
    // attribute that exposes an option to the Store API/checkout — without
    // it the option is created but stays Admin-only (shows the "Admin"
    // badge in the dashboard), which is exactly why the cart couldn't find
    // any shipping method.
    rules: [{ operator: 'eq', attribute: 'enabled_in_store', value: 'true' }],
    prices: [{ currency_code: 'gbp', amount: 0, rules: [] }],
  })
  console.log(`✅ Created: Store Pickup (Free) — £0.00 (in "${fulfillmentSet.name}" → "${serviceZone.name}")`)
  console.log('\nThe website checkout and POS "Ship to them" toggle will now pick this up automatically.')
}

main().catch((err) => {
  console.error('❌', err.message)
  process.exit(1)
})
