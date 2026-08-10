import { NextRequest, NextResponse } from 'next/server'
import { getAdminAuthHeader } from '@/lib/api/admin-auth'
import { hashPin } from '@/lib/api/pin-hash'
import { safeJson } from '@/lib/api/safe-json'

const MEDUSA_URL = process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params
  const authorization = (await getAdminAuthHeader(req)) ?? ''

  if (!authorization) {
    return NextResponse.json(
      { error: 'Missing Authorization header' },
      { status: 401 },
    )
  }

  try {
    const body = await req.json()
    const { name, phone, role, pin, shift, isActive, totalSales, totalOrders } =
      body

    const [firstName, ...rest] = (name ?? '').split(' ')

    // SECURITY: `role` comes straight from the request body. The Add/Edit
    // Staff UI only ever sends 'staff' or 'admin', but this API route can be
    // called directly (a POS Manager session is allowed to reach this path —
    // see middleware.ts POS_MANAGER_ALLOWED_PATHS). Without this whitelist,
    // someone could PATCH their own staff record with e.g. role: "owner" and
    // — because /api/auth/admin-login used to also trust
    // metadata.posRole === 'owner' — grant themselves full dashboard access.
    // The app only has two roles, so anything else is rejected outright
    // rather than silently coerced, so a bad client sees the problem instead
    // of a confusing partial update.
    if (role !== undefined && role !== 'staff' && role !== 'admin') {
      return NextResponse.json(
        { error: "role must be 'staff' or 'admin'" },
        { status: 400 },
      )
    }

    const updatePayload: any = {
      metadata: {
        phone,
        posRole: role,
        shift,
        isActive,
        totalSales,
        totalOrders,
      },
    }

    // Only touch the PIN if the caller actually sent a new one — the
    // dashboard's Edit form leaves this blank unless the manager typed a
    // replacement, and the dedicated "Reset PIN" flow always sends a full
    // 6-digit value. Never overwrite the stored hash with '' just because
    // some other field was edited.
    if (typeof pin === 'string' && pin.length > 0) {
      updatePayload.metadata.pin = await hashPin(pin)
    }

    if (firstName) {
      updatePayload.first_name = firstName
      updatePayload.last_name = rest.join(' ') || ''
    }

    const res = await fetch(`${MEDUSA_URL}/admin/users/${id}`, {
      method: 'POST', // Medusa admin user update is POST, not PATCH
      headers: {
        Authorization: authorization,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(updatePayload),
    })

    const data = await safeJson(res, 'app/api/admin/staff/[id]/route.ts')
    if (!res.ok)
      return NextResponse.json({ error: data.message }, { status: res.status })

    const u = data.user
    return NextResponse.json({
      staff: {
        id: u.id,
        name: `${u.first_name ?? ''} ${u.last_name ?? ''}`.trim() || u.email,
        initials:
          `${u.first_name?.[0] ?? ''}${u.last_name?.[0] ?? ''}`.toUpperCase() ||
          u.email.slice(0, 2).toUpperCase(),
        email: u.email,
        phone: u.metadata?.phone ?? '',
        // Display-only POS permission tier — see note in ../route.ts
        // (defaults to 'admin' when unset, not 'staff')
        role: (['admin', 'staff'].includes(u.metadata?.posRole ?? '')
          ? u.metadata.posRole
          : ['admin', 'staff'].includes(u.metadata?.role ?? '')
            ? u.metadata.role
            : 'admin'),
        hasPin: Boolean(u.metadata?.pin),
        shift: u.metadata?.shift ?? '',
        isActive: u.metadata?.isActive !== false,
        createdAt: u.created_at,
        totalSales: u.metadata?.totalSales ?? 0,
        totalOrders: u.metadata?.totalOrders ?? 0,
      },
    })
  } catch (err: any) {
    console.error('[API] staff update error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params
  const authorization = (await getAdminAuthHeader(_req)) ?? ''

  if (!authorization) {
    return NextResponse.json(
      { error: 'Missing Authorization header' },
      { status: 401 },
    )
  }

  try {
    const res = await fetch(`${MEDUSA_URL}/admin/users/${id}`, {
      method: 'DELETE',
      headers: { Authorization: authorization },
    })

    // Medusa DELETE sometimes returns a 204/empty body — parse safely
    let data: any = {}
    const text = await res.text()
    if (text) {
      try {
        data = JSON.parse(text)
      } catch {
        // empty/non-JSON response, treat as success if res.ok
      }
    }

    if (!res.ok)
      return NextResponse.json(
        { error: data.message ?? 'Delete failed' },
        { status: res.status },
      )

    return NextResponse.json(
      Object.keys(data).length ? data : { id, deleted: true },
    )
  } catch (err: any) {
    console.error('[API] staff delete error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
