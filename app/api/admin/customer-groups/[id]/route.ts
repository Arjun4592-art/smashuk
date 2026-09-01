import { NextRequest, NextResponse } from 'next/server'
import { getAdminAuthHeader } from '@/lib/api/admin-auth'
import { safeJson } from '@/lib/api/safe-json'
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
    const url = new URL(`/admin/customer-groups/${id}`, MEDUSA_URL)
    url.searchParams.set(
      'fields',
      '+customers.id,+customers.email,+customers.first_name,+customers.last_name',
    )
    const res = await fetch(url.toString(), {
      headers: {
        Authorization: authHeader,
        'Content-Type': 'application/json',
      },
    })
    const data = await safeJson(
      res,
      'app/api/admin/customer-groups/[id]/route.ts',
    )
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
    console.error('[API] customer-group GET error:', err)
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
  try {
    const res = await fetch(`${MEDUSA_URL}/admin/customer-groups/${id}`, {
      method: 'DELETE',
      headers: {
        Authorization: authHeader,
      },
    })
    const data = await safeJson(
      res,
      'app/api/admin/customer-groups/[id]/route.ts',
    )
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
    console.error('[API] customer-group DELETE error:', err)
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
