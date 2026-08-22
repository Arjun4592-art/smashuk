import { NextRequest, NextResponse } from 'next/server'
import { getAdminAuthHeader } from '@/lib/api/admin-auth'
import { safeJson } from '@/lib/api/safe-json'

const MEDUSA_URL =
  process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL ?? 'http://localhost:9000'

export async function GET(req: NextRequest) {
  const authHeader = await getAdminAuthHeader(req)
  if (!authHeader) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const res = await fetch(`${MEDUSA_URL}/admin/blog-categories`, {
      headers: {
        Authorization: authHeader,
        'Content-Type': 'application/json',
      },
    })
    if (!res.ok) {
      const err = await safeJson(res, 'app/api/admin/blog-categories/route.ts')
      return NextResponse.json({ error: err.message }, { status: res.status })
    }
    return NextResponse.json(
      await safeJson(res, 'app/api/admin/blog-categories/route.ts'),
    )
  } catch (err: any) {
    console.error('[API] blog categories list error:', err)
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
    const res = await fetch(`${MEDUSA_URL}/admin/blog-categories`, {
      method: 'POST',
      headers: {
        Authorization: authHeader,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    })
    if (!res.ok) {
      const err = await safeJson(res, 'app/api/admin/blog-categories/route.ts')
      return NextResponse.json({ error: err.message }, { status: res.status })
    }
    return NextResponse.json(
      await safeJson(res, 'app/api/admin/blog-categories/route.ts'),
      { status: 201 },
    )
  } catch (err: any) {
    console.error('[API] blog category create error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
