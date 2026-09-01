import { NextRequest, NextResponse } from 'next/server'
import { getAdminAuthHeader } from '@/lib/api/admin-auth'
import { safeJson } from '@/lib/api/safe-json'
const MEDUSA_URL =
  process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL ?? 'http://localhost:9000'
export async function POST(
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
    const body = await req.json()
    const add: string[] = body.add ?? []
    const remove: string[] = body.remove ?? []
    const res = await fetch(
      `${MEDUSA_URL}/admin/customer-groups/${id}/customers`,
      {
        method: 'POST',
        headers: {
          Authorization: authHeader,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          add,
          remove,
        }),
      },
    )
    const data = await safeJson(
      res,
      'app/api/admin/customer-groups/[id]/customers/route.ts',
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
    console.error('[API] customer-group customers POST error:', err)
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
