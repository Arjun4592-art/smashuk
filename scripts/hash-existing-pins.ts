// scripts/hash-existing-pins.ts
//
// ONE-TIME MIGRATION for the "PINs stored in plain text" fix.
//
// Before this fix, metadata.pin held the staff member's raw 6-digit PIN,
// readable by anyone who could call GET /api/admin/staff (including a POS
// manager session). PINs are now hashed with bcrypt (see
// lib/api/pin-hash.ts) going forward, and /api/auth/pos-pin will
// transparently upgrade any remaining plain-text PIN the next time that
// person logs in — so running this script isn't strictly required. But if
// you'd rather not wait for everyone to log in again (e.g. before handing
// the dashboard off, or before a security review), this hashes every
// remaining plain-text PIN in one pass.
//
// Usage:
//   MEDUSA_ADMIN_EMAIL=you@yourstore.com MEDUSA_ADMIN_PASSWORD=yourpassword \
//   npx ts-node --esm scripts/hash-existing-pins.ts
//
// (Reads NEXT_PUBLIC_MEDUSA_BACKEND_URL from .env.local, defaults to
// http://localhost:9000. Reads MEDUSA_ADMIN_EMAIL / MEDUSA_ADMIN_PASSWORD
// from .env.local too if not passed inline.)

import { readFileSync, existsSync } from 'fs'
import { resolve } from 'path'
import bcrypt from 'bcryptjs'

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

function isBcryptHash(value: string): boolean {
  return /^\$2[aby]\$\d{2}\$/.test(value)
}

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

  console.log('Fetching all admin users ...')
  const usersRes = await fetch(`${MEDUSA_URL}/admin/users?limit=1000`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  const usersData = await usersRes.json()
  if (!usersRes.ok) {
    console.error('Failed to list users:', usersData)
    process.exit(1)
  }

  const users: any[] = usersData.users ?? []
  console.log(`Found ${users.length} user(s). Checking metadata.pin ...\n`)

  let hashedCount = 0

  for (const u of users) {
    const meta = u.metadata ?? {}
    const pin = meta.pin
    if (!pin || isBcryptHash(String(pin))) continue

    const hashed = await bcrypt.hash(String(pin), 10)
    const res = await fetch(`${MEDUSA_URL}/admin/users/${u.id}`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ metadata: { pin: hashed } }),
    })
    if (res.ok) {
      hashedCount++
      console.log(`  ✓ hashed PIN for ${u.email}`)
    } else {
      console.error(`  ✗ failed for ${u.email}:`, await res.json().catch(() => ({})))
    }
  }

  console.log(`\nDone. Hashed ${hashedCount} plain-text PIN(s).`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
