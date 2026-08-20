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

// This is the step that actually makes a global option (e.g. "Color")
// usable on THIS product — creating/updating the option's values alone
// (see /admin/product-options/[optionId]) does NOT attach it to a
// product. CONFIRMED via Medusa's own admin UI network traffic:
// POST /admin/products/:id/options/batch with
// { add: [{ id, value_ids }], remove: [], update: [] }.
// - `add`: options not yet linked to this product.
// - `update`: options already linked, but the set of linked value_ids
//   changed (e.g. a new Size value was added to an existing variant).
// - `remove`: option ids to unlink from this product entirely.
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params
    const body = await req.json()
    const authorization = (await getAdminAuthHeader(req)) ?? ''
    if (!authorization) {
      return NextResponse.json(
        { error: 'Missing Authorization header' },
        { status: 401 },
      )
    }

    const res = await fetch(
      `${MEDUSA_URL}/admin/products/${id}/options/batch`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: authorization,
        },
        body: JSON.stringify(body),
      },
    )

    const data = await safeJson(res)
    return NextResponse.json(data, { status: res.status })
  } catch (err: any) {
    console.error('[POST products/:id/options/batch]', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
