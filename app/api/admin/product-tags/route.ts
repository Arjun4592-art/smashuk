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

// BUG FIX ("Invalid request: Field 'tags, 0, id' is required"): product
// tags — like product options and categories — are a standalone Medusa
// resource (/admin/product-tags), not something the product-create/update
// endpoint can invent inline. Sending `tags: [{ value: 'Outdoor' }]`
// straight into POST /admin/products (what this dashboard used to do)
// gets rejected: Medusa only accepts `tags: [{ id }]` there, referencing
// tags that already exist. New tag text typed in the dashboard has to be
// upserted here FIRST — same two-step pattern as global product options
// (see upsertOptionValues in lib/api/dashboard.ts) — to get real ids
// before the product payload is built.
export async function GET(req: NextRequest) {
  try {
    const authorization = (await getAdminAuthHeader(req)) ?? ''
    if (!authorization) {
      return NextResponse.json(
        { error: 'Missing Authorization header' },
        { status: 401 },
      )
    }

    const { searchParams } = new URL(req.url)
    const qs = searchParams.toString()
    const res = await fetch(
      `${MEDUSA_URL}/admin/product-tags${qs ? `?${qs}` : ''}`,
      { headers: { Authorization: authorization } },
    )

    const data = await safeJson(res)
    return NextResponse.json(data, { status: res.status })
  } catch (err: any) {
    console.error('[GET product-tags]', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

// Creates a brand-new global tag. CONFIRMED shape per Medusa's Admin API:
// POST /admin/product-tags with { value }.
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const authorization = (await getAdminAuthHeader(req)) ?? ''
    if (!authorization) {
      return NextResponse.json(
        { error: 'Missing Authorization header' },
        { status: 401 },
      )
    }

    const res = await fetch(`${MEDUSA_URL}/admin/product-tags`, {
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
    console.error('[POST product-tags]', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
