// app/api/auth/admin-login/route.ts
//
// DASHBOARD LOGIN — only admin/owner can access
// Logic:
//   metadata.role === 'admin'   → Owner/Admin  (full dashboard)
//   koi bhi aur Medusa admin user → ACCESS DENIED (staff POS use kare)
//
// NOTE: there used to also be a `metadata.posRole === 'owner'` compatibility
// fallback here. It was removed deliberately — see the SECURITY comment
// further down for why (it was a real privilege-escalation hole). Do not
// re-add it.

import { NextRequest, NextResponse } from 'next/server'
import { setSurfaceCookies } from '@/lib/api/auth-cookie'
import { logStaffActivity } from '@/lib/api/staff-activity'

const MEDUSA_URL =
  process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL ?? 'http://localhost:9000'

// Rate limiting per IP
// Note: in-memory map is per-process. In serverless environments (Vercel),
// each cold start creates a fresh map. For production, use Redis or Upstash.
const attempts = new Map<string, { count: number; resetAt: number }>()
const MAX_ATTEMPTS = 5
const WINDOW_MS = 15 * 60 * 1000
const MAX_MAP_SIZE = 5000 // prevent unbounded memory growth

function isRateLimited(key: string): boolean {
  const now = Date.now()

  // Evict expired entries periodically to prevent memory leak
  if (attempts.size > MAX_MAP_SIZE) {
    for (const [k, v] of attempts.entries()) {
      if (now > v.resetAt) attempts.delete(k)
    }
  }

  const entry = attempts.get(key)
  if (!entry || now > entry.resetAt) {
    attempts.set(key, { count: 1, resetAt: now + WINDOW_MS })
    return false
  }
  entry.count += 1
  return entry.count > MAX_ATTEMPTS
}

export async function POST(req: NextRequest) {
  try {
    const ip = req.headers.get('x-forwarded-for') ?? 'unknown'
    const { email, password } = await req.json()

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password required.' },
        { status: 400 },
      )
    }

    if (isRateLimited(`admin:${ip}:${email}`)) {
      return NextResponse.json(
        { error: 'Too many attempts. Try again later.' },
        { status: 429 },
      )
    }

    // Step 1: Medusa admin JWT lo
    const loginRes = await fetch(`${MEDUSA_URL}/auth/user/emailpass`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    })

    const loginData = await loginRes.json()
    if (!loginRes.ok || !loginData.token) {
      return NextResponse.json(
        { error: 'Invalid email or password.' },
        { status: 401 },
      )
    }

    const token = loginData.token as string

    // Step 2: Medusa se user profile lo
    const meRes = await fetch(`${MEDUSA_URL}/admin/users/me`, {
      headers: { Authorization: `Bearer ${token}` },
    })

    if (!meRes.ok) {
      return NextResponse.json(
        { error: 'Invalid email or password.' },
        { status: 401 },
      )
    }

    const { user: mu } = await meRes.json()
    const meta = mu?.metadata ?? {}

    // Step 3: ONLY ADMIN gets dashboard access — not staff
    //
    // SECURITY: `metadata.role` here is the ONLY dashboard gate. It must
    // only ever be set to 'admin' by editing the user directly in the
    // Medusa admin (or via a trusted server-side script) — NEVER by the
    // in-app "Add/Edit Staff" UI. That UI writes `metadata.posRole` instead,
    // which controls POS-only permissions and must stay completely separate
    // from this check. (Previously the Add Staff form also wrote
    // `metadata.role`, which let anyone marked "POS Manager" get full
    // dashboard access — see app/api/admin/staff/route.ts fix. A second,
    // separate hole existed here too: this check used to also accept
    // `metadata.posRole === 'owner'` as a "compatibility" fallback, but the
    // PATCH /api/admin/staff/[id] route wrote `posRole` straight from the
    // request body with no whitelist — so any POS Manager session could
    // PATCH their own staff record with `role: "owner"` and grant themselves
    // full dashboard access. The app only ever has two roles, admin and
    // staff, so that fallback is removed and the PATCH route now whitelists
    // the value it accepts — see app/api/admin/staff/[id]/route.ts.)
    const isAdmin = meta.role === 'admin'

    if (!isAdmin) {
      return NextResponse.json(
        {
          error:
            'Dashboard access is for Owner/Admin only. Staff should use the POS.',
        },
        { status: 403 },
      )
    }

    const user = {
      id: mu.id,
      name: `${mu.first_name ?? ''} ${mu.last_name ?? ''}`.trim() || mu.email,
      email: mu.email,
      role: 'admin' as const,
      createdAt: mu.created_at,
    }

    const response = NextResponse.json({ user })
    setSurfaceCookies(
      response.cookies,
      'dashboard',
      { isAuthenticated: true, role: 'admin', userId: mu.id },
      token,
    )

    // Fire-and-forget — never blocks or fails the login itself.
    logStaffActivity({
      staffId: mu.id,
      staffName: user.name,
      action: 'login',
      surface: 'dashboard',
    })

    return response
  } catch (err: any) {
    console.error('[admin-login]', err)
    return NextResponse.json(
      { error: 'Login failed. Please try again.' },
      { status: 500 },
    )
  }
}
