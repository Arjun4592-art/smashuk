// scripts/fix-staff-dashboard-leak.ts
//
// ONE-TIME CLEANUP for the "staff got dashboard access" bug.
//
// Before the fix, the Add/Edit Staff form (POS permission dropdown) also
// wrote metadata.role = 'admin' for anyone marked "Admin / Owner" for POS
// purposes. metadata.role is exactly what /api/auth/admin-login checks to
// grant full dashboard access — so those staff accounts could log into
// /dashboard/login too, not just /pos.
//
// This script finds every Medusa admin user, and for anyone whose
// metadata.role === 'admin' but who is NOT your real owner email, it removes
// that flag (keeping their POS-only metadata.posRole untouched). Run this
// once after deploying the code fix.
//
// Usage:
//   MEDUSA_ADMIN_EMAIL=you@yourstore.com MEDUSA_ADMIN_PASSWORD=yourpassword \
//   npx ts-node --esm scripts/fix-staff-dashboard-leak.ts
//
// (Reads NEXT_PUBLIC_MEDUSA_BACKEND_URL from .env.local, defaults to
// http://localhost:9000. Reads MEDUSA_ADMIN_EMAIL / MEDUSA_ADMIN_PASSWORD
// from .env.local too if not passed inline.)

import { readFileSync, existsSync } from 'fs'
import { resolve } from 'path'

// Minimal .env.local loader (no dotenv dependency needed).
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
  console.log(`Found ${users.length} admin user(s). Checking metadata.role ...\n`)

  let fixedCount = 0

  for (const u of users) {
    const meta = u.metadata ?? {}
    const isRealOwner = u.email?.toLowerCase() === OWNER_EMAIL.toLowerCase()
    const hasDashboardFlag = meta.role === 'admin' || meta.role === 'owner'

    if (hasDashboardFlag && !isRealOwner) {
      console.log(`FIXING  ${u.email}  (was metadata.role="${meta.role}") -> removing dashboard access`)

      const { role, ...restMeta } = meta // strip role, keep posRole/pin/etc as-is

      const patchRes = await fetch(`${MEDUSA_URL}/admin/users/${u.id}`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ metadata: { ...restMeta, role: null } }),
      })

      if (!patchRes.ok) {
        console.error(`  -> FAILED to patch ${u.email}:`, await patchRes.text())
      } else {
        fixedCount++
      }
    } else if (isRealOwner) {
      console.log(`SKIP    ${u.email}  (this is the configured owner account)`)
    } else {
      console.log(`OK      ${u.email}  (no dashboard access flag)`)
    }
  }

  console.log(`\nDone. Removed dashboard access from ${fixedCount} staff account(s).`)
  console.log('Their POS access (metadata.posRole) was left untouched.')
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
