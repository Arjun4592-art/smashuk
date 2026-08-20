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

// Same 2.16.0 reason as ../route.ts — updating an EXISTING option's values
// (e.g. adding a new Size like "12" to a product that already has a Size
// option) now goes through this dedicated endpoint instead of the
// top-level `options` field on the general product-update payload.
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; optionId: string }> },
) {
  try {
    const { id, optionId } = await params
    const body = await req.json()
    const authorization = (await getAdminAuthHeader(req)) ?? ''

    if (!authorization) {
      return NextResponse.json(
        { error: 'Missing Authorization header' },
        { status: 401 },
      )
    }

    const res = await fetch(
      `${MEDUSA_URL}/admin/products/${id}/options/${optionId}`,
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
    console.error('[POST update product option]', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
