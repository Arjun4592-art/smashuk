// app/api/admin/notification-settings/route.ts
//
// The Notifications settings page previously had NO persistence at all —
// `channels` was seeded with a hardcoded fake email/phone
// ("admin@smashuk.co.uk" / "+91 98765 43210") and `handleSave` was just a
// `setTimeout` that threw the toggle states away on every page refresh.
//
// BUG FIX: this was then fixed to save to `public/notification-settings.json`
// via Node's `fs` — but that has two real problems: (1) most serverless
// hosts (incl. Vercel, this app's stated deploy target) have a READ-ONLY
// filesystem at request time except `/tmp`, so every Save would fail once
// deployed even though it worked in local `next dev`; (2) anything under
// `public/` is served as a static file at the site root by default. This
// now persists in Medusa's own `store.metadata.notificationSettings` —
// genuine Postgres persistence via Medusa, never served as a static asset —
// the same mechanism app/api/admin/general-settings/route.ts uses.

import { NextRequest, NextResponse } from 'next/server'
import { getAdminAuthHeader } from '@/lib/api/admin-auth'

const MEDUSA_URL =
  process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL ?? 'http://localhost:9000'

const DEFAULTS = {
  // Per-notification-type email/sms/push toggles, keyed by notification id
  // (e.g. "new_order", "order_cancelled" — see NOTIFICATION_GROUPS on the
  // page). Empty until the admin saves; the page fills in its own sensible
  // per-type defaults on first load.
  settings: {} as Record<string, { email: boolean; sms: boolean; push: boolean }>,
  channels: {
    email: '',
    smsPhone: '',
    pushEnabled: true,
  },
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
        { error: data.message ?? 'Failed to load notification settings' },
        { status: res.status },
      )
    }
    const meta = data.stores?.[0]?.metadata ?? {}
    return NextResponse.json(meta.notificationSettings ?? DEFAULTS)
  } catch (err: any) {
    console.error('[API] notification-settings GET error:', err)
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
      body: JSON.stringify({ metadata: { notificationSettings: body } }),
    })
    const data = await safeJson(res)
    if (!res.ok) {
      return NextResponse.json(
        { error: data.message ?? 'Failed to save notification settings' },
        { status: res.status },
      )
    }
    return NextResponse.json({ success: true })
  } catch (err: any) {
    console.error('[API] notification-settings save error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
