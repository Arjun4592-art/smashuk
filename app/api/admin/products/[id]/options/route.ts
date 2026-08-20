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

// Medusa v2.16 rejected the top-level `options` field on the general
// product-update payload ("The 'options' property was removed in version
// 2.16.0. Please remove it from your request payload."). Adding/renaming a
// product's options (e.g. adding a "Color" option to a product that only
// had "Size") now has to go through this dedicated endpoint instead — see
// the save flow in app/dashboard/products/[id]/page.tsx, which calls this
// BEFORE the main PATCH /admin/products/:id so the option exists by the
// time the variants payload references its values.
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

    const res = await fetch(`${MEDUSA_URL}/admin/products/${id}/options`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: authorization,
      },
      body: JSON.stringify(body),
    })

    const data = await safeJson(res)
    return NextResponse.json(data, { status: res.status })
  } catch (err: any) {
    console.error('[POST product option]', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
