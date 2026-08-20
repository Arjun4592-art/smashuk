// app/api/admin/general-settings/route.ts
//
// The dashboard's main Settings page (Store Details / Address / Regional)
// previously had NO backend at all — every field was seeded with a
// hardcoded fake value ("Smash Pro", "admin@smashpro.co.uk", "123 Sports
// Complex"...) and "Save Changes" was just a `setTimeout` that discarded
// whatever the admin typed. This route makes it real:
//
//   - Store Name  → Medusa's actual `store.name` field
//   - Everything else (email/phone/website/description/address/timezone/
//     weightUnit/language) → Medusa doesn't have native store fields for
//     these, so they live in the store's `metadata` JSON column, which is
//     genuinely persisted in Postgres via Medusa (not a local file, not a
//     mock).
//   - Currency is intentionally NOT editable here — it's read-only,
//     sourced from the store's default region (same source as
//     /api/admin/store-settings, which POS/checkout already trust).
//     Changing a live store's currency has cart/pricing implications that
//     go through Medusa's regions/supported_currencies model, not a single
//     settings toggle — same reasoning as why "Delete Store" and "Change
//     Password" on this page are deliberately informational rather than
//     wired to a one-click action.

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

export async function GET(req: NextRequest) {
  const authHeader = await getAdminAuthHeader(req)
  if (!authHeader) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const res = await fetch(
      `${MEDUSA_URL}/admin/stores?limit=1&fields=id,name,default_currency_code,metadata`,
      { headers: { Authorization: authHeader } },
    )
    const data = await safeJson(res)
    if (!res.ok) {
      return NextResponse.json(
        { error: data.message ?? 'Failed to load store' },
        { status: res.status },
      )
    }

    const store = data.stores?.[0]
    if (!store) {
      return NextResponse.json({ error: 'No store found' }, { status: 404 })
    }

    const meta = store.metadata ?? {}

    return NextResponse.json({
      storeId: store.id,
      store: {
        name: store.name ?? '',
        email: meta.email ?? '',
        phone: meta.phone ?? '',
        website: meta.website ?? '',
        description: meta.description ?? '',
        currency: (store.default_currency_code ?? 'gbp').toUpperCase(),
        timezone: meta.timezone ?? 'Europe/London',
        weightUnit: meta.weightUnit ?? 'kg',
        language: meta.language ?? 'en',
      },
      address: {
        line1: meta.address_line1 ?? '',
        line2: meta.address_line2 ?? '',
        city: meta.address_city ?? '',
        state: meta.address_state ?? '',
        pincode: meta.address_pincode ?? '',
        country: meta.address_country ?? '',
      },
    })
  } catch (err: any) {
    console.error('[API] general-settings GET error:', err)
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
    const { storeId, store, address } = body

    if (!storeId) {
      return NextResponse.json({ error: 'storeId required' }, { status: 400 })
    }

    // BUG FIX: this used to build `metadata` from ONLY this form's own
    // fields (email/phone/address/...), without first fetching and
    // spreading the store's CURRENT metadata. Any other feature that
    // stores its own data in store.metadata (e.g. lib/stringing-catalog.ts
    // → metadata.stringing_catalog) would get silently wiped out the next
    // time an admin saved this General Settings form, since Medusa's store
    // update replaces `metadata` wholesale rather than merging it.
    // Uses the same list-endpoint + fields pattern as every other route in
    // this codebase that reads store metadata (GET above,
    // report-history.ts, etc.) rather than a single-resource GET by ID,
    // whose response shape isn't used/confirmed anywhere else here.
    const currentRes = await fetch(
      `${MEDUSA_URL}/admin/stores?limit=1&fields=id,metadata`,
      { headers: { Authorization: authHeader } },
    )
    const currentData = await safeJson(currentRes)
    const currentMetadata = currentRes.ok
      ? (currentData.stores?.[0]?.metadata ?? {})
      : {}

    const payload = {
      name: store?.name,
      metadata: {
        ...currentMetadata,
        email: store?.email ?? '',
        phone: store?.phone ?? '',
        website: store?.website ?? '',
        description: store?.description ?? '',
        timezone: store?.timezone ?? '',
        weightUnit: store?.weightUnit ?? '',
        language: store?.language ?? '',
        address_line1: address?.line1 ?? '',
        address_line2: address?.line2 ?? '',
        address_city: address?.city ?? '',
        address_state: address?.state ?? '',
        address_pincode: address?.pincode ?? '',
        address_country: address?.country ?? '',
      },
    }

    // Medusa v2's store update endpoint only accepts POST, not PATCH.
    const res = await fetch(`${MEDUSA_URL}/admin/stores/${storeId}`, {
      method: 'POST',
      headers: {
        Authorization: authHeader,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    })
    const data = await safeJson(res)
    if (!res.ok) {
      return NextResponse.json(
        { error: data.message ?? 'Failed to save settings' },
        { status: res.status },
      )
    }

    return NextResponse.json({ success: true })
  } catch (err: any) {
    console.error('[API] general-settings POST error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
