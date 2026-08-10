/**
 * scripts/diagnose-shipping-price.ts
 *
 * Prints exactly why Medusa says a shipping option "does not have a
 * price" for the store's default region — checks the option's price
 * rows, the region's currency, and the service zone's geo_zones side by
 * side so the mismatch is obvious instead of guessing.
 *
 * Run: npx tsx scripts/diagnose-shipping-price.ts
 */

import * as dotenv from 'dotenv'
import * as path from 'path'
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })

const MEDUSA_URL = process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL ?? 'http://localhost:9000'
const ADMIN_EMAIL = process.env.MEDUSA_ADMIN_EMAIL
const ADMIN_PASSWORD = process.env.MEDUSA_ADMIN_PASSWORD

if (!ADMIN_EMAIL || !ADMIN_PASSWORD) {
  console.error('❌ Set MEDUSA_ADMIN_EMAIL and MEDUSA_ADMIN_PASSWORD in .env.local first.')
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

async function medusaGet(token: string, p: string) {
  const res = await fetch(`${MEDUSA_URL}${p}`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!res.ok) throw new Error(`GET ${p} failed (${res.status}): ${await res.text()}`)
  return res.json()
}

async function main() {
  const token = await getToken()
  console.log('✅ Authenticated as admin\n')

  // 1. Regions — what currency does the store actually expect?
  const { regions } = await medusaGet(token, '/admin/regions?limit=10')
  console.log('🌍 Regions:')
  for (const r of regions ?? []) {
    console.log(`   - ${r.name} (id: ${r.id}) — currency: ${r.currency_code} — countries: ${(r.countries ?? []).map((c: any) => c.iso_2).join(', ')}`)
  }

  // 2. All shipping options with full price + service zone detail
  const { shipping_options } = await medusaGet(
    token,
    '/admin/shipping-options?limit=50&fields=*prices,*service_zone,*service_zone.geo_zones,*rules',
  )

  console.log('\n🚚 Shipping options:')
  for (const opt of shipping_options ?? []) {
    console.log(`\n   ▶ "${opt.name}" (id: ${opt.id})`)
    console.log(`     price_type: ${opt.price_type}`)
    console.log(`     rules: ${JSON.stringify(opt.rules?.map((r: any) => `${r.attribute} ${r.operator} ${r.value}`))}`)
    console.log(`     service_zone: ${opt.service_zone?.name ?? 'NONE'}`)
    console.log(`     geo_zones: ${(opt.service_zone?.geo_zones ?? []).map((g: any) => `${g.type}:${g.country_code ?? g.province_code ?? 'n/a'}`).join(', ') || 'NONE'}`)
    if (!opt.prices || opt.prices.length === 0) {
      console.log('     ❌ NO PRICE ROWS AT ALL — this is why it 400s on add-shipping.')
    } else {
      for (const pr of opt.prices) {
        console.log(`     price: ${pr.currency_code} ${pr.amount} — rules: ${JSON.stringify(pr.rules ?? [])}`)
      }
      const regionCurrencies = new Set((regions ?? []).map((r: any) => r.currency_code))
      const matchesAnyRegionCurrency = opt.prices.some((pr: any) => regionCurrencies.has(pr.currency_code))
      if (!matchesAnyRegionCurrency) {
        console.log(`     ❌ MISMATCH — none of this option's price currencies match any region's currency (${[...regionCurrencies].join(', ')}). Medusa will say "does not have a price" for carts in those regions.`)
      }
    }
  }

  console.log('\nDone. Look for ❌ lines above — that tells you exactly which option/region combo is missing a matching price.')
}

main().catch((err) => {
  console.error('❌', err.message)
  process.exit(1)
})
