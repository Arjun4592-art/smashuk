import { NextRequest, NextResponse } from 'next/server'
import { getAdminAuthHeader } from '@/lib/api/admin-auth'
import { safeJson } from '@/lib/api/safe-json'
const MEDUSA_URL =
  process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL ?? 'http://localhost:9000'
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const limit = searchParams.get('limit') ?? '50'
  const offset = searchParams.get('offset') ?? '0'
  const q = searchParams.get('q') ?? undefined
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
    const url = new URL('/admin/customer-groups', MEDUSA_URL)
    url.searchParams.set('limit', limit)
    url.searchParams.set('offset', offset)
    url.searchParams.set('fields', '+customers.id')
    if (q) url.searchParams.set('q', q)
    const res = await fetch(url.toString(), {
      headers: {
        Authorization: authHeader,
        'Content-Type': 'application/json',
      },
    })
    const data = await safeJson(res, 'app/api/admin/customer-groups/route.ts')
    if (!res.ok)
      return NextResponse.json(
        {
          error: data.message,
        },
        {
          status: res.status,
        },
      )
    return NextResponse.json(data)
  } catch (err: any) {
    console.error('[API] customer-groups GET error:', err)
    return NextResponse.json(
      {
        error: err.message,
      },
      {
        status: 500,
      },
    )
  }
}
export async function POST(req: NextRequest) {
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
    const body = await req.json()
    if (!body.name) {
      return NextResponse.json(
        {
          error: 'Group name is required',
        },
        {
          status: 400,
        },
      )
    }
    const res = await fetch(`${MEDUSA_URL}/admin/customer-groups`, {
      method: 'POST',
      headers: {
        Authorization: authHeader,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: body.name,
      }),
    })
    const data = await safeJson(res, 'app/api/admin/customer-groups/route.ts')
    if (!res.ok)
      return NextResponse.json(
        {
          error: data.message,
        },
        {
          status: res.status,
        },
      )
    return NextResponse.json(data, {
      status: 201,
    })
  } catch (err: any) {
    console.error('[API] customer-groups POST error:', err)
    return NextResponse.json(
      {
        error: err.message,
      },
      {
        status: 500,
      },
    )
  }
}
