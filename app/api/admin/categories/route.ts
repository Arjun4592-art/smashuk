import { NextRequest, NextResponse } from 'next/server'
import { getAdminAuthHeader } from '@/lib/api/admin-auth'
import { safeJson } from '@/lib/api/safe-json'

const MEDUSA_URL =
  process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL ?? 'http://localhost:9000'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const limit = Number(searchParams.get('limit') ?? 100)
  const offset = Number(searchParams.get('offset') ?? 0)

  const authHeader = await getAdminAuthHeader(req)
  if (!authHeader) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const url = new URL('/admin/product-categories', MEDUSA_URL)
    url.searchParams.set('limit', String(limit))
    url.searchParams.set('offset', String(offset))
    // Explicit fields — is_active ka default-field-set behaviour version se
    // version can change this behavior, so we always request it explicitly here.
    url.searchParams.set(
      'fields',
      'id,name,handle,description,is_active,rank,parent_category_id,metadata,created_at,products.id',
    )

    const res = await fetch(url.toString(), {
      headers: {
        Authorization: authHeader,
        'Content-Type': 'application/json',
      },
    })
    if (!res.ok) {
      const err = await safeJson(res, 'app/api/admin/categories/route.ts')
      return NextResponse.json({ error: err.message }, { status: res.status })
    }
    return NextResponse.json(await safeJson(res, 'app/api/admin/categories/route.ts'))
  } catch (err: any) {
    console.error('[API] categories error:', err)
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
    const res = await fetch(`${MEDUSA_URL}/admin/product-categories`, {
      method: 'POST',
      headers: {
        Authorization: authHeader,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    })
    if (!res.ok) {
      const err = await safeJson(res, 'app/api/admin/categories/route.ts')
      return NextResponse.json({ error: err.message }, { status: res.status })
    }
    return NextResponse.json(await safeJson(res, 'app/api/admin/categories/route.ts'), { status: 201 })
  } catch (err: any) {
    console.error('[API] category create error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
