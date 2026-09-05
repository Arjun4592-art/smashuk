import { NextRequest, NextResponse } from 'next/server'
import { getAdminAuthHeader } from '@/lib/api/admin-auth'
import {
  DEFAULT_PROMO_BANNER,
  invalidatePromoBannerCache,
} from '@/lib/promo-banner'

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

// GET: returns saved promo banner config for the dashboard screen.
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
        { error: data.message ?? 'Failed to load store' },
        { status: res.status },
      )
    }
    const store = data.stores?.[0]
    if (!store) {
      return NextResponse.json({ error: 'No store found' }, { status: 404 })
    }
    const saved = store.metadata?.promoBanner ?? {}
    return NextResponse.json({
      storeId: store.id,
      promoBanner: { ...DEFAULT_PROMO_BANNER, ...saved },
    })
  } catch (err: any) {
    console.error('[API] promo-banner GET error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

// POST: saves promo banner config into store metadata. Nothing else changes.
export async function POST(req: NextRequest) {
  const authHeader = await getAdminAuthHeader(req)
  if (!authHeader) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  try {
    const body = await req.json()
    const { storeId, promoBanner } = body
    if (!storeId) {
      return NextResponse.json({ error: 'storeId required' }, { status: 400 })
    }
    const currentRes = await fetch(
      `${MEDUSA_URL}/admin/stores?limit=1&fields=id,metadata`,
      { headers: { Authorization: authHeader } },
    )
    const currentData = await safeJson(currentRes)
    const currentMetadata = currentRes.ok
      ? (currentData.stores?.[0]?.metadata ?? {})
      : {}
    const payload = {
      metadata: {
        ...currentMetadata,
        promoBanner: {
          enabled: promoBanner?.enabled !== false,
          eyebrow: promoBanner?.eyebrow?.trim() ?? '',
          heading: promoBanner?.heading?.trim() ?? '',
          subtext: promoBanner?.subtext?.trim() ?? '',
          code: promoBanner?.code?.trim() ?? '',
          discountLabel: promoBanner?.discountLabel?.trim() ?? '',
          ctaText: promoBanner?.ctaText?.trim() ?? '',
          ctaLink: promoBanner?.ctaLink?.trim() ?? '',
        },
      },
    }
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
        { error: data.message ?? 'Failed to save promo banner' },
        { status: res.status },
      )
    }
    invalidatePromoBannerCache()
    return NextResponse.json({ success: true })
  } catch (err: any) {
    console.error('[API] promo-banner POST error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
