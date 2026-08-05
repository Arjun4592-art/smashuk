// app/api/admin/shipping-settings/route.ts
//
// Stores shipping zones/rates config. This does NOT yet drive real Medusa
// shipping options at checkout — Medusa v2's shipping model (fulfillment
// sets, service zones, shipping profiles) is a bigger, separate piece of
// work that needs to be verified against a live store before wiring
// checkout to it. This makes the dashboard's Shipping settings page
// actually save/load, persisted in Medusa's own `store.metadata` (the same
// mechanism app/api/admin/general-settings/route.ts and
// lib/store-contact.ts already use).
//
// BUG FIX: this used to write to `public/shipping-settings.json` via
// Node's `fs`. Two real problems with that:
//   1. Most serverless hosts (incl. Vercel, this app's stated deploy
//      target) have a READ-ONLY filesystem at request time except `/tmp` —
//      every "Save" here would fail (EROFS/EACCES) once deployed, even
//      though it worked fine in local `next dev`.
//   2. Anything under `public/` is served as a static file at the site
//      root by Next.js by default — a JSON file written there could end up
//      reachable at a public URL with no authentication at all.
// Using store.metadata avoids both: it's real Postgres persistence via
// Medusa, and it's never served as a static asset.

import { NextRequest, NextResponse } from 'next/server'
import { getAdminAuthHeader } from '@/lib/api/admin-auth'

const MEDUSA_URL =
  process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL ?? 'http://localhost:9000'

// BUG FIX: this used to default to '999', which never matched the £80
// actually used on the live site (lib/constants.ts FREE_SHIPPING_THRESHOLD,
// now the fallback in lib/shipping-settings.ts) — a store owner who'd never
// touched this page would see "£999" here while customers saw free
// shipping kick in at £80. Match the real default instead.
const DEFAULTS = {
  zones: [],
  freeShippingThreshold: '80',
  defaultWeight: '500',
  packagingFee: '0',
}

async function safeJson(res: Response) {
  const text = await res.text()
  if (!text) return {}
  try {
    return JSON.parse(text)
  } catch {
    return { message: text.slice(0, 300) }
  }
}

export async function GET(req: NextRequest) {
  const authHeader = await getAdminAuthHeader(req)
  if (!authHeader) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const res = await fetch(
      `${MEDUSA_URL}/admin/stores?limit=1&fields=id,metadata`,
      { headers: { Authorization: authHeader } },
    )
    const data = await safeJson(res)
    if (!res.ok) {
      return NextResponse.json(
        { error: data.message ?? 'Failed to load shipping settings' },
        { status: res.status },
      )
    }
    const meta = data.stores?.[0]?.metadata ?? {}
    return NextResponse.json(meta.shippingSettings ?? DEFAULTS)
  } catch (err: any) {
    console.error('[API] shipping-settings GET error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  const authHeader = await getAdminAuthHeader(req)
  if (!authHeader) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  try {
    const body = await req.json()

    const storeRes = await fetch(
      `${MEDUSA_URL}/admin/stores?limit=1&fields=id`,
      { headers: { Authorization: authHeader } },
    )
    const storeData = await safeJson(storeRes)
    const storeId = storeData.stores?.[0]?.id
    if (!storeRes.ok || !storeId) {
      return NextResponse.json(
        { error: storeData.message ?? 'No store found' },
        { status: storeRes.status || 500 },
      )
    }

    const res = await fetch(`${MEDUSA_URL}/admin/stores/${storeId}`, {
      method: 'POST',
      headers: {
        Authorization: authHeader,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ metadata: { shippingSettings: body } }),
    })
    const data = await safeJson(res)
    if (!res.ok) {
      return NextResponse.json(
        { error: data.message ?? 'Failed to save shipping settings' },
        { status: res.status },
      )
    }
    return NextResponse.json({ success: true })
  } catch (err: any) {
    console.error('[API] shipping-settings POST error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
