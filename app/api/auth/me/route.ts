// app/api/auth/me/route.ts
//
// Session hydration endpoint.
// On page refresh, the client restores its user state from here.
// The token never comes back in the response — only the user object.

import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { SURFACE_COOKIES } from '@/lib/api/auth-cookie'
import { isPosSessionValid } from '@/lib/api/pos-session'

const MEDUSA_URL =
  process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL ?? 'http://localhost:9000'
const PUBLISHABLE_KEY =
  process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY ?? ''

type Surface = 'website' | 'dashboard' | 'pos'

async function getCustomerUser(token: string) {
  const res = await fetch(`${MEDUSA_URL}/store/customers/me`, {
    headers: {
      Authorization: `Bearer ${token}`,
      'x-publishable-api-key': PUBLISHABLE_KEY,
    },
  })
  if (!res.ok) return null
  const { customer } = await res.json()
  return {
    id: customer.id,
    name:
      `${customer.first_name ?? ''} ${customer.last_name ?? ''}`.trim() ||
      customer.email,
    email: customer.email ?? '',
    role: 'customer' as const,
    createdAt: customer.created_at,
    // Set at Google sign-in (see [...nextauth]/route.ts) — without this,
    // the avatar picked up at login would vanish on the very next refresh.
    avatar: customer.metadata?.avatar as string | undefined,
  }
}

// POS sessions authenticate with a shared SERVICE token (see
// /api/auth/pos-pin), not a per-staff token — Medusa v2 has no per-user JWT
// for PIN-only login. That means /admin/users/me is NOT safe to use here:
// it always resolves to the service account itself, which is why every POS
// login used to be treated as admin regardless of which staff PIN was
// entered. Instead we look up the specific staff member by the id stored in
// the pos-auth cookie, using the same posRole logic as /api/auth/pos-pin.
async function getPosStaffUser(
  serviceToken: string,
  staffId: string,
  sessionId: string | undefined,
) {
  const res = await fetch(`${MEDUSA_URL}/admin/users/${staffId}`, {
    headers: { Authorization: `Bearer ${serviceToken}` },
  })
  if (!res.ok) return null
  const { user: u } = await res.json()
  const meta = u?.metadata ?? {}

  if (meta.isActive === false) return null

  // Single-session enforcement: if this same staff member logged in on
  // another device since this cookie was issued, metadata.activeSessionId
  // will have moved on — treat this session as signed out.
  if (!isPosSessionValid(meta, sessionId)) return null

  const role: 'admin' | 'staff' = ['admin', 'staff'].includes(meta.posRole)
    ? meta.posRole
    : 'admin'

  return {
    id: u.id,
    name: `${u.first_name ?? ''} ${u.last_name ?? ''}`.trim() || u.email,
    email: u.email ?? '',
    role,
    createdAt: u.created_at,
  }
}

async function getAdminUser(token: string) {
  const res = await fetch(`${MEDUSA_URL}/admin/users/me`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!res.ok) return null
  const { user: u } = await res.json()
  const meta = u?.metadata ?? {}
  // SECURITY FIX: this used to also accept `meta.posRole === 'owner'` as a
  // dashboard-owner signal. That exact fallback was identified as a
  // privilege-escalation hole and deliberately removed from
  // /api/auth/admin-login/route.ts (see the SECURITY comment there) — POS
  // Manager sessions must never be treated as dashboard admins. It was left
  // here by mistake, which meant a session-refresh call to this endpoint
  // could still grant admin via the same hole the login route had already
  // closed. `metadata.role === 'admin'` is now the ONLY dashboard-owner
  // signal, in both places, matching admin-login exactly.
  const isOwner = meta.role === 'admin'
  const role: 'admin' | 'staff' = isOwner ? 'admin' : 'staff'
  return {
    id: u.id,
    name:
      `${u.first_name ?? ''} ${u.last_name ?? ''}`.trim() || u.email,
    email: u.email ?? '',
    role,
    createdAt: u.created_at,
  }
}

export async function GET(req: NextRequest) {
  try {
    const cookieStore = await cookies()
    const surface = (req.nextUrl.searchParams.get('surface') ?? 'website') as Surface

    const { authCookie, tokenCookie } = SURFACE_COOKIES[surface]
    const authRaw = cookieStore.get(authCookie)?.value
    const token = cookieStore.get(tokenCookie)?.value

    // No cookie at all
    if (!authRaw || !token) {
      return NextResponse.json({ user: null })
    }

    // Quick parse of auth-state cookie (non-secret, just role+isAuthenticated)
    let authState: {
      isAuthenticated?: boolean
      role?: string
      userId?: string
      sessionId?: string
    } = {}
    try {
      authState = JSON.parse(decodeURIComponent(authRaw))
    } catch {
      return NextResponse.json({ user: null })
    }

    if (!authState.isAuthenticated) {
      return NextResponse.json({ user: null })
    }

    // NextAuth-backed google tokens start with 'nextauth:' prefix
    // — restore from auth-state cookie directly (Medusa can't validate them)
    if (token.startsWith('nextauth:')) {
      const email = token.slice(9)
      return NextResponse.json({
        user: {
          id: email,
          name: email,
          email,
          role: 'customer',
          createdAt: new Date().toISOString(),
        },
      })
    }

    // Verify token with Medusa and return fresh user data
    let user = null
    if (surface === 'website') {
      user = await getCustomerUser(token)
    } else if (surface === 'pos') {
      // pos-auth cookie carries the real staffId (see /api/auth/pos-pin) —
      // the token itself is a shared service token and cannot identify who
      // is logged in.
      const staffId = authState.userId
      user = staffId
        ? await getPosStaffUser(token, staffId, authState.sessionId)
        : null
    } else {
      user = await getAdminUser(token)
    }

    if (!user) {
      // Token expired / invalid — tell client to clear state
      return NextResponse.json({ user: null })
    }

    return NextResponse.json({ user })
  } catch (err: any) {
    console.error('[API] /auth/me error:', err)
    return NextResponse.json({ user: null })
  }
}
