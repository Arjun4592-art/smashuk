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

// Updates an existing GLOBAL option (e.g. adding "12" to Size's value
// list). CONFIRMED via Medusa's own admin UI network traffic:
// POST /admin/product-options/:id with { title, values, ranks }, where
// `values` is the FULL desired list — old values + new ones together,
// not just the new one. Sending only the new value would drop the rest.
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ optionId: string }> },
) {
  try {
    const { optionId } = await params
    const body = await req.json()
    const authorization = (await getAdminAuthHeader(req)) ?? ''
    if (!authorization) {
      return NextResponse.json(
        { error: 'Missing Authorization header' },
        { status: 401 },
      )
    }

    const res = await fetch(`${MEDUSA_URL}/admin/product-options/${optionId}`, {
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
    console.error('[POST product-options/:id]', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

// Deletes a global option outright — used for cleaning up a stale
// exclusive option (e.g. leftover "Default"/"Type") once nothing on the
// product references it anymore. CONFIRMED per Medusa's documented Admin
// API route list: DELETE /admin/product-options/:id.
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ optionId: string }> },
) {
  try {
    const { optionId } = await params
    const authorization = (await getAdminAuthHeader(req)) ?? ''
    if (!authorization) {
      return NextResponse.json(
        { error: 'Missing Authorization header' },
        { status: 401 },
      )
    }

    const res = await fetch(`${MEDUSA_URL}/admin/product-options/${optionId}`, {
      method: 'DELETE',
      headers: { Authorization: authorization },
    })

    const data = await safeJson(res)
    return NextResponse.json(data, { status: res.status })
  } catch (err: any) {
    console.error('[DELETE product-options/:id]', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
