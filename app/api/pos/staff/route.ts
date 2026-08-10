// app/api/pos/staff/route.ts
// ─────────────────────────────────────────────────────────────────────────────
// Returns the list of active staff for the POS PIN-select screen.
// This is called BEFORE the staff member is logged in, so it must never
// leak anything sensitive — no PIN, no email, no phone. Just enough to
// render "who are you" tiles: id, name, initials, POS role, shift.
//
// PINs are verified server-side in /api/auth/pos-pin, never here and
// never on the client.
// ─────────────────────────────────────────────────────────────────────────────

import { NextResponse } from 'next/server'
import { medusaServiceFetch } from '@/lib/api/medusa-service-token'

export async function GET() {
  try {
    const res = await medusaServiceFetch(
      '/admin/users?limit=100&fields=id,first_name,last_name,email,metadata',
    )

    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      return NextResponse.json(
        { error: err.message ?? 'Failed to load staff' },
        { status: res.status },
      )
    }

    const data = await res.json()

    const staff = (data.users ?? [])
      .map((u: any) => {
        const name = `${u.first_name ?? ''} ${u.last_name ?? ''}`.trim() || u.email
        const initials =
          `${u.first_name?.[0] ?? ''}${u.last_name?.[0] ?? ''}`.toUpperCase() ||
          (u.email ?? '??').slice(0, 2).toUpperCase()
        // No posRole set at all → this is almost always the store owner's
        // own account (created before staff roles existed), not a cashier —
        // default to 'admin', not 'staff'.
        const role: 'admin' | 'staff' = ['admin', 'staff'].includes(
          u.metadata?.posRole,
        )
          ? u.metadata.posRole
          : 'admin'

        return {
          id: u.id,
          name,
          initials,
          role,
          shift: u.metadata?.shift ?? '',
          isActive: u.metadata?.isActive !== false,
        }
      })
      .filter((s: any) => s.isActive)

    return NextResponse.json({ staff })
  } catch (err: any) {
    console.error('[POS] staff list error:', err.message)
    return NextResponse.json(
      { error: err.message || 'Internal server error' },
      { status: 500 },
    )
  }
}
