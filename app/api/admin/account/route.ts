// app/api/admin/account/route.ts
//
// The Settings page's Account tab previously seeded name/email with
// hardcoded fake values ("Admin User" / "admin@smashpro.co.uk") that were
// never read from or written back to Medusa. This wires it to the actual
// logged-in admin user, the same /admin/users/:id resource the Staff page
// already manages (see app/api/admin/staff/[id]/route.ts for the same
// POST-not-PATCH pattern).
//
// Password changes are intentionally NOT handled here — see the toast in
// app/dashboard/settings/page.tsx for why that needs a Medusa-backend
// change (an email/reset-password subscriber) that can't be wired from
// this Next.js app alone.

import { NextRequest, NextResponse } from 'next/server'
import { getAdminAuthHeader } from '@/lib/api/admin-auth'

const MEDUSA_URL =
  process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL ?? 'http://localhost:9000'

async function safeJson(res: Response) {
  const text = await res.text()
  if (!text) return {}
  try {
    return JSON.parse(text)
  } catch {
    return { message: text.slice(0, 300) }
  }
}

export async function GET(req: NextRequest) {
  const authHeader = await getAdminAuthHeader(req)
  if (!authHeader) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const res = await fetch(`${MEDUSA_URL}/admin/users/me`, {
      headers: { Authorization: authHeader },
    })
    const data = await safeJson(res)
    if (!res.ok) {
      return NextResponse.json(
        { error: data.message ?? 'Failed to load account' },
        { status: res.status },
      )
    }

    const u = data.user
    return NextResponse.json({
      id: u.id,
      name: `${u.first_name ?? ''} ${u.last_name ?? ''}`.trim() || u.email,
      email: u.email ?? '',
    })
  } catch (err: any) {
    console.error('[API] account GET error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  const authHeader = await getAdminAuthHeader(req)
  if (!authHeader) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await req.json()
    const { id, name, email } = body
    if (!id) {
      return NextResponse.json({ error: 'id required' }, { status: 400 })
    }

    const [firstName, ...rest] = (name ?? '').trim().split(' ')
    const payload: any = {}
    if (firstName) {
      payload.first_name = firstName
      payload.last_name = rest.join(' ') || ''
    }
    if (email) payload.email = email

    // Medusa v2's user update endpoint only accepts POST, not PATCH.
    const res = await fetch(`${MEDUSA_URL}/admin/users/${id}`, {
      method: 'POST',
      headers: {
        Authorization: authHeader,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    })
    const data = await safeJson(res)
    if (!res.ok) {
      return NextResponse.json(
        { error: data.message ?? 'Failed to update account' },
        { status: res.status },
      )
    }

    const u = data.user
    return NextResponse.json({
      id: u.id,
      name: `${u.first_name ?? ''} ${u.last_name ?? ''}`.trim() || u.email,
      email: u.email ?? '',
    })
  } catch (err: any) {
    console.error('[API] account POST error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
