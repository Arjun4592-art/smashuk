// app/api/admin/draft-orders/route.ts
//
// The Orders page's "Drafts" tab used to hardcode `count: 0` — always,
// regardless of how many draft orders actually existed. Medusa v2 does
// support draft orders (Order entity with is_draft_order: true), but only
// once the @medusajs/draft-order plugin is installed on the backend — it
// isn't part of the core API. Rather than assume it's installed (which
// would 500 for any store that hasn't added it) or keep the count
// hardcoded (which lies for stores that have), this proxies the real
// request and degrades to an explicit "unavailable" flag instead of a
// silent fake zero.

import { NextRequest, NextResponse } from 'next/server'
import { getAdminAuthHeader } from '@/lib/api/admin-auth'
import { safeJson } from '@/lib/api/safe-json'

const MEDUSA_URL =
  process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL ?? 'http://localhost:9000'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const limit = Number(searchParams.get('limit') ?? 20)
  const offset = Number(searchParams.get('offset') ?? 0)

  const authHeader = await getAdminAuthHeader(req)
  if (!authHeader) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const url = new URL('/admin/draft-orders', MEDUSA_URL)
    url.searchParams.set('limit', String(limit))
    url.searchParams.set('offset', String(offset))
    url.searchParams.set('fields', '*items,*customer,+metadata')

    const res = await fetch(url.toString(), {
      headers: { Authorization: authHeader, 'Content-Type': 'application/json' },
    })

    if (!res.ok) {
      // Most likely cause: the draft-order plugin isn't installed on this
      // Medusa backend (404/501-ish response). Report that explicitly
      // instead of pretending there are zero drafts.
      return NextResponse.json({ draft_orders: [], count: 0, available: false })
    }

    const data = await safeJson(res, 'app/api/admin/draft-orders/route.ts')
    return NextResponse.json({
      draft_orders: data.draft_orders ?? [],
      count: data.count ?? 0,
      available: true,
    })
  } catch (err: any) {
    console.error('[API] draft-orders GET error:', err)
    return NextResponse.json({ draft_orders: [], count: 0, available: false })
  }
}
