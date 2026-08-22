import { NextRequest, NextResponse } from 'next/server'
import { getAdminAuthHeader } from '@/lib/api/admin-auth'
import { safeJson } from '@/lib/api/safe-json'

const MEDUSA_URL =
  process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL ?? 'http://localhost:9000'

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params
  const authHeader = await getAdminAuthHeader(req)
  if (!authHeader) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await req.json()
    const res = await fetch(`${MEDUSA_URL}/admin/blog-categories/${id}`, {
      method: 'POST',
      headers: {
        Authorization: authHeader,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    })
    if (!res.ok) {
      const err = await safeJson(
        res,
        'app/api/admin/blog-categories/[id]/route.ts',
      )
      return NextResponse.json({ error: err.message }, { status: res.status })
    }
    return NextResponse.json(
      await safeJson(res, 'app/api/admin/blog-categories/[id]/route.ts'),
    )
  } catch (err: any) {
    console.error('[API] blog category update error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params
  const authHeader = await getAdminAuthHeader(req)
  if (!authHeader) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const res = await fetch(`${MEDUSA_URL}/admin/blog-categories/${id}`, {
      method: 'DELETE',
      headers: { Authorization: authHeader },
    })
    if (!res.ok) {
      const err = await safeJson(
        res,
        'app/api/admin/blog-categories/[id]/route.ts',
      )
      return NextResponse.json({ error: err.message }, { status: res.status })
    }
    return NextResponse.json(
      await safeJson(res, 'app/api/admin/blog-categories/[id]/route.ts'),
    )
  } catch (err: any) {
    console.error('[API] blog category delete error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
