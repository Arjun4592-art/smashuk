/**
 * scripts/fix-delivery-shipping-prices.ts
 *
 * Fixes the "Home Delivery shows FREE under £80" bug, AND recreates
 * "Royal Mail" and/or "Free Shipping" shipping options entirely if either
 * is missing (confirmed via Medusa Admin screenshot: the Europe zone
 * showed "0 shipping options" — Royal Mail had been deleted outright at
 * some point, not just its conditional price rows).
 *
 * Background — why this script exists at all:
 * "Royal Mail" originally had a CONDITIONAL price in Medusa Admin (£0 if
 * cart item total >= £80, £4.99 otherwise). That's the right idea, but
 * Medusa's STORE API (what the website checkout actually calls) doesn't
 * evaluate that conditional rule correctly — calculated_price came back
 * as 0 even on a £44.99 cart, confirmed via a live debug dump in
 * app/(website)/checkout/page.tsx. Medusa-side issue, not fixable from
 * the frontend.
 *
 * The checkout code now picks between TWO separately, FLATLY priced
 * options itself based on the cart's real subtotal (>= £80 -> "Free
 * Shipping", else -> "Royal Mail"). This script makes Medusa match that:
 *   1. If "Royal Mail" exists: strips any conditional price rules, sets
 *      a single flat £4.99 GBP price.
 *      If missing entirely: creates it from scratch.
 *   2. Same for "Free Shipping" at a flat £0.00.
 *   3. Both use the shipping_profile_id actually used by real products
 *      (read directly off products, not guessed) and the "Royal Mail"
 *      fulfillment provider.
 *   4. Newly created options get the `enabled_in_store` rule — without
 *      it an option is created Admin-only and never shows up in the
 *      store/checkout.
 *
 * Safe to re-run.
 *
 * Run: npx tsx scripts/fix-delivery-shipping-prices.ts
 */

import * as dotenv from 'dotenv'
import * as path from 'path'
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })

const MEDUSA_URL =
  process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL ?? 'http://localhost:9000'
const ADMIN_EMAIL = process.env.MEDUSA_ADMIN_EMAIL
const ADMIN_PASSWORD = process.env.MEDUSA_ADMIN_PASSWORD

const STANDARD_SHIPPING_GBP = 4.99
const FREE_SHIPPING_GBP = 0

async function getToken(): Promise<string> {
  const res = await fetch(`${MEDUSA_URL}/auth/user/emailpass`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD }),
  })
  const data = await res.json()
  if (!res.ok || !data.token)
    throw new Error('Auth failed: ' + (data.message ?? res.status))
  return data.token as string
}

function headers(token: string) {
  return { Authorization: `Bearer ${token}` }
}

async function medusaGet(token: string, p: string) {
  const res = await fetch(`${MEDUSA_URL}${p}`, { headers: headers(token) })
  if (!res.ok)
    throw new Error(`GET ${p} failed (${res.status}): ${await res.text()}`)
  return res.json()
}

async function medusaPost(token: string, p: string, body: any) {
  const res = await fetch(`${MEDUSA_URL}${p}`, {
    method: 'POST',
    headers: { ...headers(token), 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    throw new Error(
      `POST ${p} failed (${res.status}): ${(await res.text()).slice(0, 300)}`,
    )
  }
  return res.json()
}

const isPickup = (name: string) => /pickup|store|collect/i.test(name ?? '')
const isFree = (name: string) => /free/i.test(name ?? '')

async function findMajorityShippingProfileId(token: string): Promise<string> {
  console.log('Scanning products for their real shipping profile...')
  const allProducts: any[] = []
  let offset = 0
  const limit = 100
  while (true) {
    const { products, count } = await medusaGet(
      token,
      `/admin/products?limit=${limit}&offset=${offset}&fields=id,+shipping_profile.id,+shipping_profile.name`,
    )
    allProducts.push(...(products ?? []))
    offset += limit
    if (offset >= (count ?? 0) || (products ?? []).length === 0) break
  }

  const usage = new Map<string, { name: string; count: number }>()
  for (const p of allProducts) {
    const profile = p.shipping_profile
    if (!profile?.id) continue
    const entry = usage.get(profile.id) ?? { name: profile.name, count: 0 }
    entry.count++
    usage.set(profile.id, entry)
  }

  if (usage.size === 0) {
    throw new Error(
      `No product has a shipping_profile assigned (scanned ${allProducts.length} products) - ` +
        'assign a shipping profile to at least one product in Medusa Admin first.',
    )
  }

  const [bestId, best] = [...usage.entries()].sort(
    (a, b) => b[1].count - a[1].count,
  )[0]
  console.log(
    `   Using "${best.name}" (${bestId}) - used by ${best.count}/${allProducts.length} product(s).\n`,
  )
  return bestId
}

async function findShippingServiceZoneId(token: string): Promise<string> {
  const location = await medusaGet(
    token,
    '/admin/stock-locations?limit=1',
  ).then((d) => d.stock_locations?.[0])
  if (!location)
    throw new Error(
      'No stock location found - set one up in Medusa Admin first.',
    )

  const locationWithSets = await medusaGet(
    token,
    `/admin/stock-locations/${location.id}?fields=*fulfillment_sets,*fulfillment_sets.service_zones`,
  )
  const fulfillmentSets =
    locationWithSets?.stock_location?.fulfillment_sets ?? []
  if (fulfillmentSets.length === 0) {
    throw new Error(
      `No fulfillment set found for "${location.name}" - configure Locations & Shipping in Medusa Admin first.`,
    )
  }

  const shippingSet =
    fulfillmentSets.find((fs: any) => fs.type === 'shipping') ??
    fulfillmentSets.find((fs: any) => !/pickup/i.test(fs.name ?? '')) ??
    fulfillmentSets[0]

  const serviceZone = shippingSet.service_zones?.[0]
  if (!serviceZone) {
    throw new Error(
      `The "${shippingSet.name}" fulfillment set has no service zone yet - add one in Admin -> ` +
        `Locations & Shipping -> ${shippingSet.name} first (e.g. covering the UK).`,
    )
  }
  console.log(
    `Using service zone "${serviceZone.name}" from fulfillment set "${shippingSet.name}".\n`,
  )
  return serviceZone.id
}

async function findRoyalMailProviderId(token: string): Promise<string> {
  const { fulfillment_providers } = await medusaGet(
    token,
    '/admin/fulfillment-providers',
  ).catch(() => ({ fulfillment_providers: [] }))
  const providers = fulfillment_providers ?? []
  // BUG FIX: this used to match with /royal ?mail/i, which only catches
  // "royalmail" or "royal mail" (space). Medusa's real provider ids follow
  // the fp_{identifier}_{id} pattern, so the actual Royal Mail provider id
  // is "fp_royal-mail_royal-mail" (HYPHEN, not space) - the old regex never
  // matched it and silently fell back to providers[0], which is Medusa's
  // built-in Manual provider (registered first in medusa-config.ts). Every
  // "Royal Mail" shipping option this script ever created was therefore
  // wired to Manual fulfillment - orders were marked "Fulfilled" locally
  // but nothing was ever sent to Royal Mail's Click & Drop API/dashboard.
  const royalMailProvider = providers.find((p: any) =>
    /royal[-_ ]?mail/i.test(p.id ?? ''),
  )
  if (!royalMailProvider) {
    // No more silent providers[0] fallback - that's exactly what caused the
    // bug above. Fail loudly instead so a missing/renamed provider can
    // never again get silently wired to the wrong one.
    throw new Error(
      'No fulfillment provider matching "royal-mail" is registered on the backend.\n' +
        'Found these instead: ' +
        (providers.map((p: any) => p.id).join(', ') || '(none)') +
        '\nCheck that the royal-mail module is added to medusa-config.ts and the backend has ' +
        'been restarted, or run scripts/fix-royal-mail-provider.ts to diagnose an existing store.',
    )
  }
  return royalMailProvider.id
}

async function ensureOption(
  token: string,
  opts: {
    existing: any | undefined
    name: string
    amountGbp: number
    serviceZoneId: string
    shippingProfileId: string
    providerId: string
    code: string
  },
) {
  const {
    existing,
    name,
    amountGbp,
    serviceZoneId,
    shippingProfileId,
    providerId,
    code,
  } = opts
  if (existing) {
    console.log(
      `Found existing "${existing.name}" (id: ${existing.id}) - resetting its price...`,
    )
    await medusaPost(token, `/admin/shipping-options/${existing.id}`, {
      prices: [{ currency_code: 'gbp', amount: amountGbp, rules: [] }],
    })
    console.log(
      `"${existing.name}" set to a flat £${amountGbp.toFixed(2)} - no conditions.\n`,
    )
    return existing
  }

  console.log(`"${name}" doesn't exist - creating it...`)
  const created = await medusaPost(token, '/admin/shipping-options', {
    name,
    service_zone_id: serviceZoneId,
    shipping_profile_id: shippingProfileId,
    provider_id: providerId,
    price_type: 'flat',
    type: { label: name, description: `${name} delivery.`, code },
    data: { name },
    rules: [{ operator: 'eq', attribute: 'enabled_in_store', value: 'true' }],
    prices: [{ currency_code: 'gbp', amount: amountGbp, rules: [] }],
  })
  const option = created.shipping_option ?? created
  console.log(
    `Created "${name}" - flat £${amountGbp.toFixed(2)} (id: ${option.id}).\n`,
  )
  return option
}

async function main() {
  const token = await getToken()
  console.log('Authenticated as admin\n')

  const { shipping_options } = await medusaGet(
    token,
    '/admin/shipping-options?limit=50&fields=*prices,*rules',
  )
  const options = shipping_options ?? []

  console.log(`Medusa returned ${options.length} shipping option(s) total:`)
  for (const o of options) console.log(`   - "${o.name}" (id: ${o.id})`)
  console.log('')

  const existingRoyalMail = options.find(
    (o: any) => !isPickup(o.name) && !isFree(o.name),
  )
  const existingFreeShipping = options.find(
    (o: any) => !isPickup(o.name) && isFree(o.name),
  )

  let shippingProfileId: string | undefined
  let serviceZoneId: string | undefined
  let providerId: string | undefined
  if (!existingRoyalMail || !existingFreeShipping) {
    shippingProfileId = await findMajorityShippingProfileId(token)
    serviceZoneId = await findShippingServiceZoneId(token)
    providerId = await findRoyalMailProviderId(token)
  }

  await ensureOption(token, {
    existing: existingRoyalMail,
    name: 'Royal Mail',
    amountGbp: STANDARD_SHIPPING_GBP,
    serviceZoneId: serviceZoneId!,
    shippingProfileId: shippingProfileId!,
    providerId: providerId!,
    code: 'royal_mail',
  })

  await ensureOption(token, {
    existing: existingFreeShipping,
    name: 'Free Shipping',
    amountGbp: FREE_SHIPPING_GBP,
    serviceZoneId: serviceZoneId!,
    shippingProfileId: shippingProfileId!,
    providerId: providerId!,
    code: 'free_shipping',
  })

  const { shipping_options: verify } = await medusaGet(
    token,
    '/admin/shipping-options?limit=50&fields=*prices',
  )
  console.log('Final state:')
  for (const o of verify ?? []) {
    if (isPickup(o.name)) continue
    const priceLines = (o.prices ?? [])
      .filter((p: any) => p.currency_code === 'gbp')
      .map((p: any) => `£${p.amount} (rules: ${JSON.stringify(p.rules ?? [])})`)
      .join(', ')
    console.log(`   - ${o.name}: ${priceLines || 'NO GBP PRICE'}`)
  }

  console.log(
    '\nDone. Checkout will now pick "Free Shipping" when the cart subtotal is >= £80 and "Royal Mail" otherwise - computed in app/(website)/checkout/page.tsx, not by Medusa.',
  )
}

if (!ADMIN_EMAIL || !ADMIN_PASSWORD) {
  console.error(
    'Set MEDUSA_ADMIN_EMAIL and MEDUSA_ADMIN_PASSWORD in .env.local first.',
  )
  process.exitCode = 1
} else {
  main().catch((err) => {
    console.error('Error:', err.message)
    process.exitCode = 1
  })
}
