// app/api/admin/gift-cards/route.ts
//
// Proxies to the loyalty plugin's /admin/gift-cards endpoint (confirmed
// from node_modules/@medusajs/loyalty-plugin .medusa/server/src/api/admin/gift-cards).
// This manages individual issued gift card codes (manual issue, e.g. a
// goodwill/refund gift card) — separate from the sellable "Gift Card"
// Product with denomination variants, which customers buy at /gift-cards
// and which is managed like any other product at
// app/dashboard/products/[id] (its variants ARE the denominations).

import { NextRequest, NextResponse } from 'next/server'
import { getAdminAuthHeader } from '@/lib/api/admin-auth'
import { safeJson } from '@/lib/api/safe-json'

const MEDUSA_URL = process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL

// Fields confirmed from query-config.js — giftCardFields
const FIELDS =
  'id,status,code,value,currency_code,line_item_id,reference_id,reference,expires_at,note,updated_at,created_at,metadata'

export async function GET(req: NextRequest) {
  const authorization = (await getAdminAuthHeader(req)) ?? ''
  if (!authorization) {
    return NextResponse.json(
      { error: 'Missing Authorization header' },
      { status: 401 },
    )
  }

  const { searchParams } = new URL(req.url)
  const limit = searchParams.get('limit') ?? '20'
  const offset = searchParams.get('offset') ?? '0'
  const q = searchParams.get('q')
  const status = searchParams.get('status') // 'pending' | 'redeemed'

  const params = new URLSearchParams({
    limit,
    offset,
    fields: FIELDS,
    order: '-created_at',
  })
  if (q) params.set('q', q)
  if (status) params.set('status', status)

  try {
    const res = await fetch(`${MEDUSA_URL}/admin/gift-cards?${params}`, {
      headers: { Authorization: authorization },
    })
    const data = await safeJson(res, 'app/api/admin/gift-cards/route.ts')
    if (!res.ok) {
      return NextResponse.json({ error: data.message }, { status: res.status })
    }
    return NextResponse.json(data)
  } catch (err: any) {
    console.error('[API] admin/gift-cards GET error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

// Manual issue — e.g. goodwill/refund gift card handed out by staff.
// body: { value: number, currency_code?: string, code?: string,
//          expires_at?: string, note?: string }
// (code is optional — the plugin auto-generates one if omitted)
export async function POST(req: NextRequest) {
  const authorization = (await getAdminAuthHeader(req)) ?? ''
  if (!authorization) {
    return NextResponse.json(
      { error: 'Missing Authorization header' },
      { status: 401 },
    )
  }

  try {
    const body = await req.json()
    if (!body.value || Number(body.value) <= 0) {
      return NextResponse.json(
        { error: 'A positive value is required' },
        { status: 400 },
      )
    }

    const payload: Record<string, unknown> = {
      value: Number(body.value),
      currency_code: body.currency_code ?? 'gbp',
      reference: 'manual_issue',
    }
    if (body.code) payload.code = String(body.code).trim().toUpperCase()
    if (body.expires_at) payload.expires_at = body.expires_at
    if (body.note) payload.note = body.note

    const res = await fetch(
      `${MEDUSA_URL}/admin/gift-cards?fields=${encodeURIComponent(FIELDS)}`,
      {
        method: 'POST',
        headers: {
          Authorization: authorization,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      },
    )
    const data = await safeJson(res, 'app/api/admin/gift-cards/route.ts')
    if (!res.ok) {
      return NextResponse.json({ error: data.message }, { status: res.status })
    }
    return NextResponse.json(data, { status: 201 })
  } catch (err: any) {
    console.error('[API] admin/gift-cards POST error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
