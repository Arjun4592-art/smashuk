/**
 * scripts/grant-dashboard-admin.ts
 *
 * Sets metadata.role = 'admin' on a Medusa admin user, which is the ONLY
 * thing app/api/auth/admin-login/route.ts checks to allow dashboard login.
 *
 * Why this is needed: staff accounts (created via the dashboard's Add/Edit
 * Staff form) are ALSO real Medusa admin users under the hood — that's how
 * POS PIN login works — so the dashboard login route needs a way to tell
 * "the actual owner" apart from "a staff member who happens to also be a
 * Medusa admin user". metadata.role='admin' is that marker. It used to also
 * accept metadata.posRole==='owner' as a fallback, but that was a privilege-
 * escalation hole (any POS Manager could set posRole='owner' on themselves)
 * and was removed — so any account that was relying on that fallback,
 * including possibly your own, needs this run once.
 *
 * Run: npx tsx scripts/grant-dashboard-admin.ts you@example.com
 * (defaults to MEDUSA_ADMIN_EMAIL from .env.local if no argument given)
 */

import * as dotenv from 'dotenv'
import * as path from 'path'
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })

const MEDUSA_URL =
  process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL ?? 'http://localhost:9000'
const ADMIN_EMAIL = process.env.MEDUSA_ADMIN_EMAIL
const ADMIN_PASSWORD = process.env.MEDUSA_ADMIN_PASSWORD
const TARGET_EMAIL = process.argv[2] ?? ADMIN_EMAIL

if (!ADMIN_EMAIL || !ADMIN_PASSWORD) {
  console.error(
    '❌ Set MEDUSA_ADMIN_EMAIL and MEDUSA_ADMIN_PASSWORD in .env.local before running this script.',
  )
  process.exitCode = 1
}

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

async function main() {
  if (!TARGET_EMAIL) {
    console.error(
      '❌ No target email — pass one as an argument or set MEDUSA_ADMIN_EMAIL.',
    )
    process.exitCode = 1
    return
  }

  const token = await getToken()
  console.log('✅ Authenticated\n')

  const headers = {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  }

  const { users } = await fetch(
    `${MEDUSA_URL}/admin/users?email=${encodeURIComponent(TARGET_EMAIL)}`,
    { headers },
  ).then((r) => r.json())

  const user = users?.[0]
  if (!user) {
    console.error(`❌ No Medusa admin user found with email ${TARGET_EMAIL}`)
    console.error(
      '   (This must be an existing Medusa admin user — create one first with',
    )
    console.error(
      "   `npx medusa user -e ... -p ...` if it doesn't exist yet.)",
    )
    process.exitCode = 1
    return
  }

  const res = await fetch(`${MEDUSA_URL}/admin/users/${user.id}`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      metadata: { ...(user.metadata ?? {}), role: 'admin' },
    }),
  })

  if (!res.ok) {
    const err = await res.text()
    console.error(`❌ Failed to update user: ${err.slice(0, 300)}`)
    process.exitCode = 1
    return
  }

  console.log(`✅ ${TARGET_EMAIL} now has metadata.role = 'admin'`)
  console.log(
    '   Dashboard login (localhost:3000/dashboard/login) will work for this account now.',
  )
}

main().catch((err) => {
  console.error('❌', err.message)
  process.exitCode = 1
})
