import { NextRequest, NextResponse } from 'next/server'
import { getAdminAuthHeader } from '@/lib/api/admin-auth'
import { sendMail } from '@/lib/email'
import { SITE_NAME } from '@/lib/constants'
import { hashPin } from '@/lib/api/pin-hash'
import { safeJson } from '@/lib/api/safe-json'

const MEDUSA_URL = process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL

export async function GET(req: NextRequest) {
  const authorization = (await getAdminAuthHeader(req)) ?? ''
  const { searchParams } = new URL(req.url)
  const limit = searchParams.get('limit') ?? '50'
  const offset = searchParams.get('offset') ?? '0'

  if (!authorization) {
    return NextResponse.json(
      { error: 'Missing Authorization header' },
      { status: 401 },
    )
  }

  try {
    const res = await fetch(
      `${MEDUSA_URL}/admin/users?limit=${limit}&offset=${offset}`,
      { headers: { Authorization: authorization } },
    )
    const data = await safeJson(res, 'app/api/admin/staff/route.ts')
    if (!res.ok)
      return NextResponse.json({ error: data.message }, { status: res.status })

    const staff = (data.users ?? []).map((u: any) => ({
      id: u.id,
      name: `${u.first_name ?? ''} ${u.last_name ?? ''}`.trim() || u.email,
      initials:
        `${u.first_name?.[0] ?? ''}${u.last_name?.[0] ?? ''}`.toUpperCase() ||
        u.email.slice(0, 2).toUpperCase(),
      email: u.email,
      phone: u.metadata?.phone ?? '',
      // Display-only POS permission tier. Sourced from `posRole` (the field
      // this UI actually writes). `metadata.role` fallback kept only for
      // rows created before this fix — it has no bearing on dashboard login.
      // Default (no posRole set at all) → 'admin', not 'staff': an account
      // with no explicit POS role configured is almost always the store
      // owner's own account, not a cashier who was deliberately restricted.
      role: (['admin', 'staff'].includes(u.metadata?.posRole ?? '')
        ? u.metadata.posRole
        : ['admin', 'staff'].includes(u.metadata?.role ?? '')
          ? u.metadata.role
          : 'admin'),
      // PIN is stored as a one-way (bcrypt) hash now — there is nothing
      // meaningful or safe to send back here. The dashboard's "Reset PIN"
      // flow only ever writes a new PIN, never reads the old one.
      hasPin: Boolean(u.metadata?.pin),
      shift: u.metadata?.shift ?? '',
      isActive: u.metadata?.isActive !== false,
      // NOTE: metadata.totalSales / totalOrders are legacy fields that are
      // written as 0 at creation and are never incremented anywhere when a
      // POS sale is actually completed — they always read back as 0. Real
      // per-cashier totals are computed below by aggregating completed POS
      // orders (tagged with metadata.cashier) instead of trusting these.
      totalSales: 0,
      totalOrders: 0,
    }))

    // ── Aggregate real sales per cashier from POS orders ──────────────────
    // POS orders are tagged with metadata.source = 'pos' and
    // metadata.cashier = the staff member's name (see
    // app/api/pos/orders/route.ts). We match that name against each staff
    // row to compute live totals instead of the stale metadata counters.
    try {
      const ordersUrl = new URL('/admin/orders', MEDUSA_URL)
      ordersUrl.searchParams.set('limit', '1000')
      ordersUrl.searchParams.set('fields', '+metadata,total')
      const ordersRes = await fetch(ordersUrl.toString(), {
        headers: { Authorization: authorization },
      })
      if (ordersRes.ok) {
        const ordersData = await safeJson(ordersRes, 'app/api/admin/staff/route.ts')
        const posOrders = (ordersData.orders ?? []).filter(
          (o: any) => o.metadata?.source === 'pos' && o.metadata?.cashier,
        )
        for (const s of staff) {
          const cashierOrders = posOrders.filter(
            (o: any) =>
              (o.metadata.cashier as string).trim().toLowerCase() ===
              s.name.trim().toLowerCase(),
          )
          s.totalOrders = cashierOrders.length
          s.totalSales = cashierOrders.reduce(
            (sum: number, o: any) => sum + (o.total ?? 0),
            0,
          )
        }
      }
    } catch (aggErr) {
      // Non-fatal — staff list still renders, just without live totals.
      console.warn('[staff GET] sales aggregation failed:', aggErr)
    }

    return NextResponse.json({ staff, count: data.count ?? staff.length })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  const authorization = (await getAdminAuthHeader(req)) ?? ''

  if (!authorization) {
    return NextResponse.json(
      { error: 'Missing Authorization header' },
      { status: 401 },
    )
  }

  try {
    const body = await req.json()
    const { name, email, phone, role, pin, shift, isActive } = body

    if (role !== undefined && role !== 'staff' && role !== 'admin') {
      return NextResponse.json(
        { error: "role must be 'staff' or 'admin'" },
        { status: 400 },
      )
    }

    if (!email || !pin || pin.length !== 6) {
      return NextResponse.json(
        { error: 'email and 6-digit pin required' },
        { status: 400 },
      )
    }

    const [firstName, ...rest] = (name ?? email).split(' ')
    const password = `Pos@${pin}${Date.now()}`

    // Step 1: Invite create (logged-in admin token se)
    const inviteRes = await fetch(`${MEDUSA_URL}/admin/invites`, {
      method: 'POST',
      headers: {
        Authorization: authorization,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email }),
    })
    const inviteData = await safeJson(inviteRes, 'app/api/admin/staff/route.ts')
    if (!inviteRes.ok) {
      return NextResponse.json(
        { error: inviteData.message ?? 'Invite creation failed' },
        { status: inviteRes.status },
      )
    }
    const inviteToken = inviteData.invite?.token

    // Step 2: Auth identity register
    const authRes = await fetch(`${MEDUSA_URL}/auth/user/emailpass/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    })
    const authData = await safeJson(authRes, 'app/api/admin/staff/route.ts')
    if (!authRes.ok) {
      return NextResponse.json(
        { error: authData.message ?? 'Auth registration failed' },
        { status: authRes.status },
      )
    }
    const registerToken = authData.token

    // Step 3: Accept invite (token goes in the query param, not the body)
    const acceptRes = await fetch(
      `${MEDUSA_URL}/admin/invites/accept?token=${encodeURIComponent(inviteToken)}`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${registerToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          first_name: firstName,
          last_name: rest.join(' ') || '',
        }),
      },
    )

    const acceptData = await safeJson(acceptRes, 'app/api/admin/staff/route.ts')
    if (!acceptRes.ok) {
      return NextResponse.json(
        { error: acceptData.message ?? 'Invite accept failed' },
        { status: acceptRes.status },
      )
    }

    const u = acceptData.user

    // Step 4: Metadata PATCH
    if (u?.id) {
      await fetch(`${MEDUSA_URL}/admin/users/${u.id}`, {
        method: 'POST',
        headers: {
          Authorization: authorization,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          metadata: {
            phone: phone ?? '',
            // IMPORTANT: `posRole` controls POS-only permission tier (cashier
            // vs POS-admin). It must NEVER also be written to `role`, because
            // `role` is what /api/auth/admin-login checks to grant full
            // dashboard (owner) access. Dashboard access must only ever be
            // granted by editing metadata.role directly in the Medusa admin,
            // never through this staff-management UI.
            posRole: role ?? 'staff',
            pin: await hashPin(pin),
            shift: shift ?? '',
            isActive: isActive ?? true,
            totalSales: 0,
            totalOrders: 0,
          },
        }),
      }).catch(() => {})
    }

    // Step 5: Welcome email — not the PIN itself (that's a secret; the
    // manager tells them in person), just confirmation + login instructions.
    // Non-fatal: if SMTP isn't configured or the send fails, the staff
    // member is still created successfully.
    const emailResult = await sendMail({
      to: email,
      subject: `You've been added to ${SITE_NAME} POS`,
      html: `
        <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
          <h2 style="color:#008060;">Welcome to ${SITE_NAME}!</h2>
          <p>Hi ${firstName},</p>
          <p>You've been added as <strong>${role === 'admin' ? 'an Admin' : 'Staff'}</strong> on the ${SITE_NAME} POS system${shift ? ` for the <strong>${shift}</strong> shift` : ''}.</p>
          <p>To log in at the POS terminal:</p>
          <ol>
            <li>Open the POS terminal and select your name from the list</li>
            <li>Ask your manager for your 6-digit PIN</li>
          </ol>
          <p style="color:#8C9196; font-size:13px; margin-top:24px;">If you weren't expecting this, please contact your manager.</p>
        </div>
      `,
      text: `Welcome to ${SITE_NAME}! You've been added as ${role === 'admin' ? 'an Admin' : 'Staff'}. Ask your manager for your PIN to log in at the POS terminal.`,
    })

    if (!emailResult.sent) {
      console.warn('[staff invite] welcome email not sent:', emailResult.error)
    }

    return NextResponse.json(
      {
        staff: {
          id: u?.id ?? email,
          name:
            `${u?.first_name ?? firstName} ${u?.last_name ?? rest.join(' ')}`.trim() ||
            email,
          initials:
            `${firstName[0] ?? ''}${rest[0]?.[0] ?? ''}`.toUpperCase() ||
            email.slice(0, 2).toUpperCase(),
          email,
          phone: phone ?? '',
          role: role ?? 'staff',
          pin,
          shift: shift ?? '',
          isActive: isActive ?? true,
          totalSales: 0,
          totalOrders: 0,
        },
      },
      { status: 201 },
    )
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
