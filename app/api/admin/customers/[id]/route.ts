import { NextRequest, NextResponse } from 'next/server'
import { getAdminAuthHeader } from '@/lib/api/admin-auth'
import { safeJson } from '@/lib/api/safe-json'
import { fetchWithTimeout } from '@/lib/api/fetch-with-timeout'
// Ids end up inside a URL path sent to Medusa, so only well-formed ones pass.
const ID_RE = /^[A-Za-z0-9_-]{3,100}$/
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const MEDUSA_URL =
  process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL ?? 'http://localhost:9000'
export async function GET(
  req: NextRequest,
  {
    params,
  }: {
    params: Promise<{
      id: string
    }>
  },
) {
  const { id } = await params
  const authHeader = await getAdminAuthHeader(req)
  if (!authHeader) {
    return NextResponse.json(
      {
        error: 'Unauthorized',
      },
      {
        status: 401,
      },
    )
  }
  try {
    const res = await fetch(`${MEDUSA_URL}/admin/customers/${id}`, {
      headers: {
        Authorization: authHeader,
        'Content-Type': 'application/json',
      },
    })
    if (!res.ok) {
      const err = await safeJson(res, 'app/api/admin/customers/[id]/route.ts')
      return NextResponse.json(
        {
          error: err.message,
        },
        {
          status: res.status,
        },
      )
    }
    const data = await safeJson(res, 'app/api/admin/customers/[id]/route.ts')
    return NextResponse.json(data)
  } catch (err) {
    console.error('[admin/customers/:id] GET error:', err)
    return NextResponse.json(
      {
        error: 'Failed to fetch customer',
      },
      {
        status: 500,
      },
    )
  }
}
export async function PATCH(
  req: NextRequest,
  {
    params,
  }: {
    params: Promise<{
      id: string
    }>
  },
) {
  const { id } = await params
  const authHeader = await getAdminAuthHeader(req)
  if (!authHeader) {
    return NextResponse.json(
      {
        error: 'Unauthorized',
      },
      {
        status: 401,
      },
    )
  }
  try {
    if (!ID_RE.test(id)) {
      return NextResponse.json(
        {
          error: 'Invalid customer id',
        },
        {
          status: 400,
        },
      )
    }
    const body = await req.json().catch(() => null)
    if (!body || typeof body !== 'object') {
      return NextResponse.json(
        {
          error: 'Invalid request',
        },
        {
          status: 400,
        },
      )
    }
    const { first_name, last_name, email, phone } = body
    // A string, or null to clear the field. Anything else is rejected.
    const text = (v: unknown, max: number) =>
      v === null
        ? null
        : typeof v === 'string' && v.length <= max
          ? v.trim()
          : undefined
    const payload: Record<string, unknown> = {}
    for (const [key, value, max] of [
      ['first_name', first_name, 100],
      ['last_name', last_name, 100],
      ['phone', phone, 40],
    ] as const) {
      if (value === undefined) continue
      const clean = text(value, max)
      if (clean === undefined) {
        return NextResponse.json(
          {
            error: `Invalid ${key.replace('_', ' ')}`,
          },
          {
            status: 400,
          },
        )
      }
      payload[key] = clean === '' ? null : clean
    }
    if (email !== undefined) {
      const clean = typeof email === 'string' ? email.trim().toLowerCase() : ''
      if (!clean || clean.length > 254 || !EMAIL_RE.test(clean)) {
        return NextResponse.json(
          {
            error: 'Enter a valid email address',
          },
          {
            status: 400,
          },
        )
      }
      payload.email = clean
    }
    if (Object.keys(payload).length === 0) {
      return NextResponse.json(
        {
          error: 'Nothing to update',
        },
        {
          status: 400,
        },
      )
    }
    const res = await fetchWithTimeout(`${MEDUSA_URL}/admin/customers/${id}`, {
      method: 'POST',
      headers: {
        Authorization: authHeader,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
      timeoutMs: 15_000,
    })
    if (!res.ok) {
      const err = await safeJson(res, 'app/api/admin/customers/[id]/route.ts')
      return NextResponse.json(
        {
          error: err.message,
        },
        {
          status: res.status,
        },
      )
    }
    const data = await safeJson(res, 'app/api/admin/customers/[id]/route.ts')
    return NextResponse.json(data)
  } catch (err) {
    console.error('[admin/customers/:id] PATCH error:', err)
    return NextResponse.json(
      {
        error: 'Failed to update customer',
      },
      {
        status: 500,
      },
    )
  }
}
// DELETE /api/admin/customers/:id
// Permanently deletes ONE customer (the dashboard asks for confirmation first).
// Medusa's own delete also detaches the customer's login, so the same email can
// register again later. Dashboard (admin) sessions only - POS sessions are not
// accepted, matching the bulk delete route.
export async function DELETE(
  req: NextRequest,
  {
    params,
  }: {
    params: Promise<{
      id: string
    }>
  },
) {
  const { id } = await params
  const authHeader = await getAdminAuthHeader(req)
  if (!authHeader) {
    return NextResponse.json(
      {
        error: 'Unauthorized',
      },
      {
        status: 401,
      },
    )
  }
  if (!ID_RE.test(id)) {
    return NextResponse.json(
      {
        error: 'Invalid customer id',
      },
      {
        status: 400,
      },
    )
  }
  try {
    const res = await fetchWithTimeout(`${MEDUSA_URL}/admin/customers/${id}`, {
      method: 'DELETE',
      headers: {
        Authorization: authHeader,
      },
      timeoutMs: 30_000,
    })
    // 404 = already gone, which is the state the user asked for.
    if (!res.ok && res.status !== 404) {
      const err = await res.json().catch(
        () =>
          ({}) as {
            message?: string
          },
      )
      return NextResponse.json(
        {
          error:
            err.message ?? `Failed to delete customer (HTTP ${res.status})`,
        },
        {
          status: res.status,
        },
      )
    }
    return NextResponse.json({
      id,
      deleted: true,
    })
  } catch (err) {
    console.error('[admin/customers/:id] DELETE error:', err)
    return NextResponse.json(
      {
        error: 'Failed to delete customer',
      },
      {
        status: 500,
      },
    )
  }
}
