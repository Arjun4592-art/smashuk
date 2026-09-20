import { NextRequest, NextResponse } from 'next/server'
import { randomUUID } from 'crypto'
import { getAdminAuthHeader } from '@/lib/api/admin-auth'
import { MEDUSA_URL } from '@/lib/api/medusa-service-token'

// Saves a staff comment on an order (shown in the order Timeline).
// Stored in order.metadata.staff_comments — existing metadata is preserved.
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const authHeader = await getAdminAuthHeader(req)
  if (!authHeader) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const { id } = await params
  const body = await req.json().catch(() => ({}))
  const text = typeof body?.text === 'string' ? body.text.trim() : ''
  if (!text) {
    return NextResponse.json({ error: 'Comment is empty' }, { status: 400 })
  }
  if (text.length > 2000) {
    return NextResponse.json({ error: 'Comment is too long' }, { status: 400 })
  }

  const headers = {
    Authorization: authHeader,
    'Content-Type': 'application/json',
  }
  try {
    const getRes = await fetch(
      `${MEDUSA_URL}/admin/orders/${id}?fields=id,metadata`,
      { headers },
    )
    const getData = await getRes.json().catch(() => ({}))
    if (!getRes.ok || !getData?.order) {
      return NextResponse.json(
        { error: getData?.message ?? `Order not found (${getRes.status})` },
        { status: getRes.status || 404 },
      )
    }
    const metadata = getData.order.metadata ?? {}
    const existing = Array.isArray(metadata.staff_comments)
      ? metadata.staff_comments
      : []
    const comment = {
      id: randomUUID(),
      text,
      author: 'Staff',
      created_at: new Date().toISOString(),
    }
    const saveRes = await fetch(`${MEDUSA_URL}/admin/orders/${id}`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        metadata: { ...metadata, staff_comments: [...existing, comment] },
      }),
    })
    if (!saveRes.ok) {
      const err = await saveRes.json().catch(() => ({}))
      return NextResponse.json(
        { error: err?.message ?? 'Failed to save comment' },
        { status: saveRes.status },
      )
    }
    return NextResponse.json({ comment })
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message ?? 'Failed to save comment' },
      { status: 500 },
    )
  }
}
