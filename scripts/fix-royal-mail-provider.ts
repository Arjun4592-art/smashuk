/**
 * scripts/fix-royal-mail-provider.ts
 *
 * ROOT CAUSE of "order confirm karne par Royal Mail ke Click & Drop
 * dashboard par kuch nahi jaata":
 *
 * The backend registers the Royal Mail Click & Drop fulfillment provider
 * in medusa-config.ts like this:
 *
 *   { resolve: './src/modules/royal-mail', id: 'royal-mail', ... }
 *
 * ...and the provider service class has `static identifier = "royal-mail"`.
 * Medusa computes the REAL, stored fulfillment-provider id as:
 *
 *   fp_{identifier}_{id}  ->  fp_royal-mail_royal-mail
 *
 * scripts/seed-smashuk.ts (which created the storefront's "Royal Mail"
 * shipping option) tried to auto-detect this provider with the regex
 * /royal ?mail/i — which matches "royalmail" or "royal mail" (space) but
 * NOT "royal-mail" (hyphen). So the match always failed and the script
 * silently fell back to `providers[0]` — almost certainly Medusa's
 * built-in Manual provider (fp_manual_manual, registered first in
 * medusa-config.ts).
 *
 * Net effect: the "Royal Mail" shipping option in your database has been
 * wired to the MANUAL fulfillment provider this whole time. Marking an
 * order "Fulfilled" flips its status locally and does nothing else — it
 * never calls Royal Mail's Click & Drop API, so nothing ever appears on
 * their dashboard. No error, because Manual "succeeds" trivially.
 *
 * This script:
 *   1. Lists every registered fulfillment provider and finds the real
 *      Royal Mail one (fixed regex) and the Manual one.
 *   2. Lists every non-pickup shipping option and shows which provider
 *      each is actually wired to right now.
 *   3. For any delivery option wrongly wired to Manual (or anything that
 *      isn't the Royal Mail provider), attempts to fix it in place via
 *      POST /admin/shipping-options/:id { provider_id }.
 *   4. If Medusa rejects changing provider_id on an existing option, falls
 *      back to delete + recreate with the same name/price/zone/profile but
 *      the correct provider_id.
 *
 * Run (read-only, no changes):
 *   npx tsx scripts/fix-royal-mail-provider.ts
 * Run (apply the fix):
 *   npx tsx scripts/fix-royal-mail-provider.ts --apply
 *
 * Safe to re-run.
 */

import * as dotenv from 'dotenv'
import * as path from 'path'
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })

const MEDUSA_URL =
  process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL ?? 'http://localhost:9000'
const ADMIN_EMAIL = process.env.MEDUSA_ADMIN_EMAIL
const ADMIN_PASSWORD = process.env.MEDUSA_ADMIN_PASSWORD
const APPLY = process.argv.includes('--apply')

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
  const text = await res.text()
  const data = text ? JSON.parse(text) : {}
  if (!res.ok)
    throw new Error(
      data.message ?? `POST ${p} failed (${res.status}): ${text.slice(0, 300)}`,
    )
  return data
}

async function medusaDelete(token: string, p: string) {
  const res = await fetch(`${MEDUSA_URL}${p}`, {
    method: 'DELETE',
    headers: headers(token),
  })
  if (!res.ok)
    throw new Error(`DELETE ${p} failed (${res.status}): ${await res.text()}`)
  return res.json().catch(() => ({}))
}

// FIXED regex — matches "royal-mail", "royal_mail", "royal mail", "royalmail"
// (the original /royal ?mail/i missed the hyphenated real provider id).
const isRoyalMail = (id: string) => /royal[-_ ]?mail/i.test(id ?? '')
const isManual = (id: string) => /manual/i.test(id ?? '')
const isPickupName = (name: string) => /pickup|store|collect/i.test(name ?? '')

async function main() {
  const token = await getToken()
  console.log(
    `Authenticated as admin. Mode: ${APPLY ? 'APPLY (will make changes)' : 'DRY RUN (read-only — pass --apply to fix)'}\n`,
  )

  // 1) Providers
  const { fulfillment_providers } = await medusaGet(
    token,
    '/admin/fulfillment-providers',
  )
  const providers: { id: string }[] = fulfillment_providers ?? []
  console.log(`Registered fulfillment providers (${providers.length}):`)
  for (const p of providers) console.log(`   - ${p.id}`)
  console.log('')

  const royalMail = providers.find((p) => isRoyalMail(p.id))
  const manual = providers.find((p) => isManual(p.id))

  if (!royalMail) {
    console.error(
      '❌ No fulfillment provider matching "royal-mail" is registered on this backend.\n' +
        "   This means the backend either hasn't deployed the royal-mail module/medusa-config.ts\n" +
        "   change yet, or hasn't been restarted since it was added. Fix that first — this script\n" +
        "   can't wire anything to a provider that doesn't exist yet.",
    )
    process.exitCode = 1
    return
  }
  console.log(`✅ Real Royal Mail provider id: ${royalMail.id}`)
  if (manual)
    console.log(`   Manual provider id (for comparison): ${manual.id}`)
  console.log('')

  // 2) Shipping options
  const { shipping_options } = await medusaGet(
    token,
    '/admin/shipping-options?limit=200&fields=id,name,provider_id,service_zone_id,shipping_profile_id,price_type,*type,*prices,*rules',
  )
  const options: any[] = shipping_options ?? []

  const deliveryOptions = options.filter((o) => {
    const enabledInStorePickupRule = (o.rules ?? []).some(
      (r: any) => r.attribute === 'enabled_in_store' && r.value === 'true',
    )
    return !isPickupName(o.name) && !enabledInStorePickupRule
  })

  if (deliveryOptions.length === 0) {
    console.log(
      'No non-pickup delivery shipping options found — nothing to check.',
    )
    return
  }

  console.log(
    `Delivery shipping options (${deliveryOptions.length}) and their current provider:\n`,
  )
  const broken: any[] = []
  for (const o of deliveryOptions) {
    const ok = o.provider_id === royalMail.id
    console.log(
      `   ${ok ? '✅' : '❌'} "${o.name}" (id: ${o.id}) -> provider_id: ${o.provider_id}${ok ? '' : '  <-- WRONG, should be ' + royalMail.id}`,
    )
    if (!ok) broken.push(o)
  }
  console.log('')

  if (broken.length === 0) {
    console.log(
      'Nothing to fix — every delivery option is already wired to the Royal Mail provider.',
    )
    console.log(
      "If orders still aren't reaching Click & Drop, the remaining suspects are:",
    )
    console.log(
      '  1. ROYAL_MAIL_CLICK_DROP_API_KEY unset/wrong in the backend .env',
    )
    console.log(
      "  2. The shipping option's `data.service_code` — service.ts currently defaults to",
    )
    console.log(
      '     "TPN48" as a PLACEHOLDER (marked "PENDING client confirmation" in the code).',
    )
    console.log(
      "     If that's not a real Click & Drop service code, Royal Mail will reject the call —",
    )
    console.log(
      '     check the Medusa backend server logs when you click "Mark as Fulfilled".',
    )
    return
  }

  console.log(
    `Found ${broken.length} delivery option(s) wired to the wrong provider.\n`,
  )

  if (!APPLY) {
    console.log('Dry run only — re-run with --apply to fix the above.')
    return
  }

  for (const o of broken) {
    console.log(`Fixing "${o.name}"...`)
    try {
      // Medusa v2 allows updating provider_id on an existing shipping
      // option via the same POST-as-update endpoint used elsewhere in
      // this codebase (see app/api/admin/shipping-options/[id]/route.ts).
      await medusaPost(token, `/admin/shipping-options/${o.id}`, {
        provider_id: royalMail.id,
      })
      console.log(`   ✅ Updated in place — provider_id is now ${royalMail.id}`)
    } catch (updateErr: any) {
      console.warn(
        `   ⚠ In-place update rejected by Medusa (${updateErr.message}).`,
      )
      console.log(
        '   Falling back to delete + recreate with the same name/price/zone/profile...',
      )
      const gbpPrice = (o.prices ?? []).find(
        (p: any) => p.currency_code === 'gbp',
      )
      try {
        await medusaDelete(token, `/admin/shipping-options/${o.id}`)
        const recreated = await medusaPost(token, '/admin/shipping-options', {
          name: o.name,
          service_zone_id: o.service_zone_id,
          shipping_profile_id: o.shipping_profile_id,
          provider_id: royalMail.id,
          price_type: o.price_type ?? 'flat',
          type: {
            label: o.name,
            description: `${o.name} delivery.`,
            code: o.type?.code ?? 'royal_mail',
          },
          data: { name: o.name },
          rules: o.rules ?? [],
          prices: gbpPrice
            ? [{ currency_code: 'gbp', amount: gbpPrice.amount, rules: [] }]
            : [],
        })
        console.log(
          `   ✅ Recreated as id ${recreated.shipping_option?.id ?? '(unknown)'} with provider_id ${royalMail.id}`,
        )
      } catch (recreateErr: any) {
        console.error(`   ❌ Recreate also failed: ${recreateErr.message}`)
        console.error(
          "      You'll need to fix this one by hand in Medusa Admin -> Settings -> Locations & Shipping.",
        )
      }
    }
  }

  console.log(
    '\nDone. Re-run without --apply any time to verify current state.',
  )
  console.log('Reminder — still check before going live:')
  console.log(
    '  - ROYAL_MAIL_CLICK_DROP_API_KEY is set in the BACKEND .env (not the frontend)',
  )
  console.log(
    '  - The real Click & Drop service code(s) — TPN48/TPN24 in the code are placeholders',
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
