import { NextRequest, NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import { getAdminAuthHeader } from '@/lib/api/admin-auth'
import { errorMessage } from '@/lib/error-message'
import { invalidateHomeLayoutCache } from '@/lib/home-layout'
import { DEFAULT_PROMO_BANNER } from '@/lib/promo-banner'
import {
  buildDefaultHomeLayout,
  sanitizeHomeLayout,
} from '@/lib/home-layout-shared'

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

// GET: the saved home layout for the dashboard screen (the built-in layout if
// nothing has been saved yet), plus the store-wide Promo Banner so the screen
// can show what a "linked" discount banner currently says.
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
    const saved = sanitizeHomeLayout(store.metadata?.homeLayout)
    return NextResponse.json({
      storeId: store.id,
      isCustom: !!saved,
      layout: saved ?? buildDefaultHomeLayout(),
      promoBanner: {
        ...DEFAULT_PROMO_BANNER,
        ...(store.metadata?.promoBanner ?? {}),
      },
    })
  } catch (err) {
    console.error('[API] home-layout GET error:', err)
    return NextResponse.json(
      { error: errorMessage(err, 'Failed to load home page') },
      { status: 500 },
    )
  }
}

// POST: saves the layout into store metadata. Nothing else in the metadata changes.
export async function POST(req: NextRequest) {
  const authHeader = await getAdminAuthHeader(req)
  if (!authHeader) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  try {
    const body = await req.json()
    const { storeId } = body
    if (!storeId) {
      return NextResponse.json({ error: 'storeId required' }, { status: 400 })
    }
    const layout = sanitizeHomeLayout(body.layout)
    if (!layout || !layout.blocks.some((b) => b.enabled)) {
      return NextResponse.json(
        { error: 'Keep at least one homepage section switched on' },
        { status: 400 },
      )
    }
    const currentRes = await fetch(
      `${MEDUSA_URL}/admin/stores?limit=1&fields=id,metadata`,
      { headers: { Authorization: authHeader } },
    )
    const currentData = await safeJson(currentRes)
    const currentMetadata = currentRes.ok
      ? (currentData.stores?.[0]?.metadata ?? {})
      : {}
    const res = await fetch(`${MEDUSA_URL}/admin/stores/${storeId}`, {
      method: 'POST',
      headers: {
        Authorization: authHeader,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        metadata: { ...currentMetadata, homeLayout: layout },
      }),
    })
    const data = await safeJson(res)
    if (!res.ok) {
      return NextResponse.json(
        { error: data.message ?? 'Failed to save home page' },
        { status: res.status },
      )
    }
    invalidateHomeLayoutCache()
    // The homepage is statically cached (revalidate = 3600): without this the
    // change would only show up after that hour is over.
    revalidatePath('/')
    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('[API] home-layout POST error:', err)
    return NextResponse.json(
      { error: errorMessage(err, 'Failed to save home page') },
      { status: 500 },
    )
  }
}
