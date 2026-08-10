import { NextRequest, NextResponse } from 'next/server'
import { getAdminAuthHeader } from '@/lib/api/admin-auth'
import { safeJson } from '@/lib/api/safe-json'

const MEDUSA_URL =
  process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL ?? 'http://localhost:9000'

// Product Types are used as the dynamic "Brand" field in the dashboard's
// Add/Edit Product form (see lib/api/selling-channels.ts sibling comment in
// products routes for the same pattern used for sales channels). Medusa
// already ships an admin UI for these at Settings → Product Types, so this
// route is just a thin passthrough — no new data model needed.

export async function GET(req: NextRequest) {
  const authHeader = await getAdminAuthHeader(req)
  if (!authHeader) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const url = new URL('/admin/product-types', MEDUSA_URL)
    url.searchParams.set('limit', '200')
    url.searchParams.set('fields', 'id,value,created_at')

    const res = await fetch(url.toString(), {
      headers: {
        Authorization: authHeader,
        'Content-Type': 'application/json',
      },
    })
    if (!res.ok) {
      const err = await safeJson(res, 'app/api/admin/product-types/route.ts')
      return NextResponse.json({ error: err.message }, { status: res.status })
    }
    return NextResponse.json(await safeJson(res, 'app/api/admin/product-types/route.ts'))
  } catch (err: any) {
    console.error('[API] product-types error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  const authHeader = await getAdminAuthHeader(req)
  if (!authHeader) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await req.json() // { value: "Prince" }
    const res = await fetch(`${MEDUSA_URL}/admin/product-types`, {
      method: 'POST',
      headers: {
        Authorization: authHeader,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    })
    if (!res.ok) {
      const err = await safeJson(res, 'app/api/admin/product-types/route.ts')
      return NextResponse.json({ error: err.message }, { status: res.status })
    }
    return NextResponse.json(await safeJson(res, 'app/api/admin/product-types/route.ts'), { status: 201 })
  } catch (err: any) {
    console.error('[API] product-type create error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
