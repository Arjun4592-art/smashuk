import { NextRequest, NextResponse } from 'next/server'
import { getAdminAuthHeader } from '@/lib/api/admin-auth'

const MEDUSA_URL =
  process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL ?? 'http://localhost:9000'

async function safeJson(res: Response) {
  const text = await res.text()
  if (!text) return {}
  try {
    return JSON.parse(text)
  } catch {
    return { message: text.slice(0, 300) }
  }
}

// Deletes a single variant from a product. Needed when a product is
// converted from a single "Default" variant to Size/Color variants:
// Medusa refuses to unlink the old option ("Cannot unassign product
// option from product which has variants for that option") as long as
// the old "Default" variant — which still references that option's
// value — still exists. This lets the dashboard delete that stale
// variant first, so the old option can then be unlinked cleanly.
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; variantId: string }> },
) {
  try {
    const { id, variantId } = await params
    const authorization = (await getAdminAuthHeader(req)) ?? ''
    if (!authorization) {
      return NextResponse.json(
        { error: 'Missing Authorization header' },
        { status: 401 },
      )
    }

    const res = await fetch(
      `${MEDUSA_URL}/admin/products/${id}/variants/${variantId}`,
      {
        method: 'DELETE',
        headers: { Authorization: authorization },
      },
    )

    const data = await safeJson(res)
    return NextResponse.json(data, { status: res.status })
  } catch (err: any) {
    console.error('[DELETE products/:id/variants/:variantId]', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
