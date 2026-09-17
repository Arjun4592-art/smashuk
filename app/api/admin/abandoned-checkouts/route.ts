import { NextRequest, NextResponse } from 'next/server'
import { getAdminAuthHeader } from '@/lib/api/admin-auth'
import { safeJson } from '@/lib/api/safe-json'
const MEDUSA_URL =
  process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL ?? 'http://localhost:9000'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const limit = Number(searchParams.get('limit') ?? 50)
  const offset = Number(searchParams.get('offset') ?? 0)
  const minutes = Number(searchParams.get('minutes') ?? 60)
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
    const url = new URL('/admin/abandoned-checkouts', MEDUSA_URL)
    url.searchParams.set('limit', String(limit))
    url.searchParams.set('offset', String(offset))
    url.searchParams.set('minutes', String(minutes))
    const res = await fetch(url.toString(), {
      headers: {
        Authorization: authHeader,
        'Content-Type': 'application/json',
      },
    })
    if (!res.ok) {
      return NextResponse.json({
        abandoned_checkouts: [],
        count: 0,
        available: false,
      })
    }
    const data = await safeJson(
      res,
      'app/api/admin/abandoned-checkouts/route.ts',
    )
    return NextResponse.json({
      abandoned_checkouts: data.abandoned_checkouts ?? [],
      count: data.count ?? 0,
      available: true,
    })
  } catch (err: any) {
    console.error('[API] abandoned-checkouts GET error:', err)
    return NextResponse.json({
      abandoned_checkouts: [],
      count: 0,
      available: false,
    })
  }
}
