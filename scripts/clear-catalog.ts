/**
 * scripts/clear-catalog.ts
 *
 * Deletes ALL products and ALL product categories from Medusa. Run this
 * before scripts/seed-smashuk.ts so the re-seed starts from a clean slate
 * instead of leaving old/duplicate products and categories behind.
 *
 * Run: npx ts-node --esm scripts/clear-catalog.ts
 *
 * ⚠️  DESTRUCTIVE — this deletes every product and category in the store.
 * It will ask for confirmation before doing anything.
 */

import * as dotenv from 'dotenv'
import * as path from 'path'
import * as readline from 'readline'
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

async function medusaDelete(token: string, path: string) {
  const res = await fetch(`${MEDUSA_URL}${path}`, {
    method: 'DELETE',
    headers: headers(token),
  })
  if (!res.ok) {
    const err = await res.text()
    throw new Error(`DELETE ${path} failed (${res.status}): ${err.slice(0, 200)}`)
  }
}

function confirm(question: string): Promise<boolean> {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout })
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close()
      resolve(answer.trim().toLowerCase() === 'yes')
    })
  })
}

async function main() {
  const token = await getToken()
  console.log('✅ Authenticated as admin\n')

  const { count: productCount } = await medusaGet(token, '/admin/products?limit=1')
  const { count: categoryCount } = await medusaGet(token, '/admin/product-categories?limit=1')

  console.log(`Found ${productCount} products and ${categoryCount} categories.`)
  const ok = await confirm(
    `\n⚠️  This will PERMANENTLY DELETE all ${productCount} products and ${categoryCount} categories. Type "yes" to continue: `,
  )
  if (!ok) {
    console.log('Cancelled — nothing was deleted.')
    return
  }

  // 1) Delete all products (paginated, 100 at a time)
  console.log('\n🗑️  Deleting products...')
  let deleted = 0
  while (true) {
    const { products } = await medusaGet(token, '/admin/products?limit=100&fields=id')
    if (!products || products.length === 0) break
    for (const p of products) {
      await medusaDelete(token, `/admin/products/${p.id}`)
      deleted++
      if (deleted % 20 === 0) console.log(`  ...${deleted} deleted`)
    }
  }
  console.log(`✅ Deleted ${deleted} products`)

  // 2) Delete all categories (children first — Medusa rejects deleting a
  // category that still has children, so sort deepest-first)
  console.log('\n🗑️  Deleting categories...')
  const { product_categories: categories } = await medusaGet(
    token,
    '/admin/product-categories?limit=200&fields=id,parent_category_id',
  )
  const sorted = [...(categories ?? [])].sort((a, b) =>
    a.parent_category_id ? -1 : b.parent_category_id ? 1 : 0,
  )
  let catDeleted = 0
  for (const c of sorted) {
    try {
      await medusaDelete(token, `/admin/product-categories/${c.id}`)
      catDeleted++
    } catch (err: any) {
      console.warn(`  ⚠️  Could not delete category ${c.id}: ${err.message}`)
    }
  }
  console.log(`✅ Deleted ${catDeleted} categories`)

  console.log('\n✨ Catalog cleared. Now run: npx ts-node --esm scripts/seed-smashuk.ts')
}

main().catch((err) => {
  console.error('❌', err.message)
  process.exit(1)
})
