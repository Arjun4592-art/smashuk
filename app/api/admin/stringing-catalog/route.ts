// app/api/admin/stringing-catalog/route.ts
//
// Manages the manually-editable catalog of individual strings (company +
// model, per sport) shown on the public stringing booking form — see
// lib/stringing-catalog.ts for the full explanation of what this is and
// how it differs from the 3 "Stringing Service" Medusa products.
//
// GET  — dashboard Settings page loads the current list to display/edit.
// POST — saves the full list back (replace-all, same "Save Changes"
//        pattern as the rest of the Settings page) after an add/edit/
//        toggle/delete in the UI.

import { NextRequest, NextResponse } from 'next/server'
import { getAdminAuthHeader } from '@/lib/api/admin-auth'
import {
  getStringingCatalog,
  saveStringingCatalog,
  type StringCatalogItem,
} from '@/lib/stringing-catalog'

export async function GET(req: NextRequest) {
  const authorization = await getAdminAuthHeader(req)
  if (!authorization) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const items = await getStringingCatalog()
    return NextResponse.json({ items })
  } catch (err: any) {
    console.error('[stringing-catalog GET] error:', err)
    return NextResponse.json(
      { error: err.message ?? 'Failed to load stringing catalog' },
      { status: 500 },
    )
  }
}

export async function POST(req: NextRequest) {
  const authorization = await getAdminAuthHeader(req)
  if (!authorization) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await req.json()
    const items: StringCatalogItem[] = Array.isArray(body?.items)
      ? body.items
      : []

    // Basic shape validation — every item needs a sport/brand/name, id is
    // regenerated server-side if missing so the client can't collide IDs.
    const VALID_SPORTS = new Set(['badminton', 'tennis', 'squash'])
    for (const item of items) {
      if (!VALID_SPORTS.has(item.sport)) {
        return NextResponse.json(
          { error: `Invalid sport: ${item.sport}` },
          { status: 400 },
        )
      }
      if (!item.brand?.trim() || !item.name?.trim()) {
        return NextResponse.json(
          { error: 'Every string needs a company/brand and a name.' },
          { status: 400 },
        )
      }
      if (!item.id) {
        item.id = `${item.sport}-${Date.now()}-${Math.random()
          .toString(36)
          .slice(2, 8)}`
      }
      item.available = !!item.available
    }

    await saveStringingCatalog(items, authorization)
    return NextResponse.json({ items })
  } catch (err: any) {
    console.error('[stringing-catalog POST] error:', err)
    return NextResponse.json(
      { error: err.message ?? 'Failed to save stringing catalog' },
      { status: 500 },
    )
  }
}
