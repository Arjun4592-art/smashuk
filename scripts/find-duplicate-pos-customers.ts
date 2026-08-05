// scripts/find-duplicate-pos-customers.ts
//
// DIAGNOSTIC for the "select customer #3, get customer #4's data" /
// "duplicate walk-in customers" confusion on Customers pages.
//
// This is NOT a bug in the current POS checkout code — it's leftover DATA:
// before the customer-linking fix in app/api/pos/orders/route.ts, walk-in
// sales for the same real person could create more than one Medusa
// Customer record (one with a partial synthetic email, one with the real
// one), each accumulating its own separate order history. Since then, all
// new sales for a given customer consistently reuse their one real
// customer_id — but the old duplicate rows are still sitting in the
// database and nothing retroactively merges them.
//
// This script can't safely auto-merge them itself: Medusa v2 doesn't allow
// directly re-pointing an existing order's customer_id (order reassignment
// requires a customer-approved "transfer ownership" request), so a blind
// automated merge risks silently failing to move some orders while
// deleting the customer they belonged to. Instead, this prints every
// group of customers that looks like the same person (matched by phone
// number, or by a "pos-<id>@smashuk.in" / "walkin@smashuk.in" synthetic
// email) so you can review and merge them by hand in Medusa admin
// (Settings → ... → merge, or manually reassign orders then delete the
// emptied duplicate).
//
// Usage:
//   MEDUSA_ADMIN_EMAIL=you@yourstore.com MEDUSA_ADMIN_PASSWORD=yourpassword \
//   npx ts-node --esm scripts/find-duplicate-pos-customers.ts

import { readFileSync, existsSync } from 'fs'
import { resolve } from 'path'

// process.cwd() instead of __dirname — this script runs with `--esm`
// (per the Usage comment above), where __dirname doesn't exist. Run this
// script from the project root, same as documented.
function loadEnvLocal() {
  const envPath = resolve(process.cwd(), '.env.local')
  if (!existsSync(envPath)) return
  const lines = readFileSync(envPath, 'utf-8').split('\n')
  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const eq = trimmed.indexOf('=')
    if (eq === -1) continue
    const key = trimmed.slice(0, eq).trim()
    const value = trimmed.slice(eq + 1).trim()
    if (!(key in process.env)) process.env[key] = value
  }
}
loadEnvLocal()

const MEDUSA_URL = process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL ?? 'http://localhost:9000'
const OWNER_EMAIL = process.env.MEDUSA_ADMIN_EMAIL
const OWNER_PASSWORD = process.env.MEDUSA_ADMIN_PASSWORD

async function main() {
  if (!OWNER_EMAIL || !OWNER_PASSWORD) {
    console.error('Set MEDUSA_ADMIN_EMAIL and MEDUSA_ADMIN_PASSWORD (in .env.local or inline) before running.')
    process.exit(1)
  }

  console.log(`Logging in as ${OWNER_EMAIL} against ${MEDUSA_URL} ...`)
  const loginRes = await fetch(`${MEDUSA_URL}/auth/user/emailpass`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: OWNER_EMAIL, password: OWNER_PASSWORD }),
  })
  const loginData = await loginRes.json()
  if (!loginRes.ok || !loginData.token) {
    console.error('Login failed:', loginData)
    process.exit(1)
  }
  const token = loginData.token as string
  const authHeader = { Authorization: `Bearer ${token}` }

  console.log('Fetching customers...')
  const custRes = await fetch(
    `${MEDUSA_URL}/admin/customers?limit=1000&fields=id,email,first_name,last_name,phone,created_at`,
    { headers: authHeader },
  )
  const custData = await custRes.json()
  const customers = custData.customers ?? []

  console.log('Fetching orders (to count per customer)...')
  const ordersRes = await fetch(
    `${MEDUSA_URL}/admin/orders?limit=1000&fields=customer_id,total,display_id`,
    { headers: authHeader },
  )
  const ordersData = await ordersRes.json()
  const orderCountByCustomer = new Map<string, { count: number; total: number }>()
  for (const o of ordersData.orders ?? []) {
    if (!o.customer_id) continue
    const existing = orderCountByCustomer.get(o.customer_id) ?? { count: 0, total: 0 }
    existing.count += 1
    existing.total += o.total ?? 0
    orderCountByCustomer.set(o.customer_id, existing)
  }

  // Group by phone number first (most reliable — a walk-in's phone number
  // stays the same even across a synthetic-email duplicate), then flag any
  // customer whose email looks synthetic (pos-*/walkin@) as worth a look
  // even without a phone match.
  const byPhone = new Map<string, any[]>()
  const synthetic: any[] = []

  for (const c of customers) {
    const phone = (c.phone ?? '').replace(/\D/g, '')
    if (phone) {
      const list = byPhone.get(phone) ?? []
      list.push(c)
      byPhone.set(phone, list)
    }
    if (/^pos-|^walkin@/i.test(c.email ?? '')) {
      synthetic.push(c)
    }
  }

  console.log('\n=== Groups sharing the same phone number (likely duplicates) ===\n')
  let foundGroup = false
  for (const [phone, group] of byPhone) {
    if (group.length < 2) continue
    foundGroup = true
    console.log(`Phone ${phone}:`)
    for (const c of group) {
      const stats = orderCountByCustomer.get(c.id) ?? { count: 0, total: 0 }
      console.log(
        `  - ${c.id}  ${c.first_name ?? ''} ${c.last_name ?? ''}  <${c.email}>  ` +
          `${stats.count} orders, £${stats.total.toFixed(2)}, created ${c.created_at}`,
      )
    }
    console.log('')
  }
  if (!foundGroup) console.log('  (none found)\n')

  console.log('=== Customers with a synthetic pos-/walkin@ email ===\n')
  for (const c of synthetic) {
    const stats = orderCountByCustomer.get(c.id) ?? { count: 0, total: 0 }
    console.log(
      `  - ${c.id}  ${c.first_name ?? ''} ${c.last_name ?? ''}  <${c.email}>  ` +
        `${stats.count} orders, £${stats.total.toFixed(2)}`,
    )
  }

  console.log(
    '\nTo merge a duplicate: in Medusa admin, move any real orders you want kept ' +
      'onto the customer record you want to keep (Order → Edit → Customer), then ' +
      'delete the emptied duplicate customer record. New POS sales will not create ' +
      'further duplicates — every sale now reuses the one existing customer_id.',
  )
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
