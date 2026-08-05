// app/api/admin/staff-activity/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getAdminAuthHeader } from '@/lib/api/admin-auth'
import { MEDUSA_URL } from '@/lib/api/medusa-service-token'

export async function GET(req: NextRequest) {
  const authHeader = await getAdminAuthHeader(req)
  if (!authHeader) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const since = req.nextUrl.searchParams.get('since')
  const limit = req.nextUrl.searchParams.get('limit') ?? '200'

  const url = new URL('/admin/staff-activity', MEDUSA_URL)
  if (since) url.searchParams.set('since', since)
  url.searchParams.set('limit', limit)

  const res = await fetch(url.toString(), {
    headers: { Authorization: authHeader },
  })
  const data = await res.json().catch(() => ({}))
  return NextResponse.json(data, { status: res.status })
}

export async function DELETE(req: NextRequest) {
  const authHeader = await getAdminAuthHeader(req)
  if (!authHeader) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const res = await fetch(
    new URL('/admin/staff-activity', MEDUSA_URL).toString(),
    {
      method: 'DELETE',
      headers: { Authorization: authHeader },
    },
  )
  const data = await res.json().catch(() => ({}))
  return NextResponse.json(data, { status: res.status })
}
