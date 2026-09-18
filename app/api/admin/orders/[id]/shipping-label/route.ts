import { NextRequest, NextResponse } from 'next/server'
import { getAdminAuthHeader } from '@/lib/api/admin-auth'
import { MEDUSA_URL } from '@/lib/api/medusa-service-token'

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const authHeaderRaw = await getAdminAuthHeader(req)
  if (!authHeaderRaw) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const { id } = await params

  const url = new URL(`/admin/orders/${id}/shipping-label`, MEDUSA_URL)
  const r = await fetch(url.toString(), {
    headers: { Authorization: authHeaderRaw },
  })
  const text = await r.text()
  let data: any = {}
  try {
    data = text ? JSON.parse(text) : {}
  } catch {
    data = { error: text || `Backend returned ${r.status}` }
  }
  return NextResponse.json(data, { status: r.status })
}
