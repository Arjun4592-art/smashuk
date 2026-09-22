import { NextRequest, NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import { getAdminAuthHeader } from '@/lib/api/admin-auth'
import { invalidateHeroSlidesCache } from '@/lib/hero-slides'
import {
  DEFAULT_HERO_SLIDES,
  sanitizeHeroSlides,
} from '@/lib/hero-slides-shared'

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

// GET: saved hero slides for the dashboard screen (built-in slides if none saved yet).
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
    const saved = sanitizeHeroSlides(store.metadata?.heroSlides)
    return NextResponse.json({
      storeId: store.id,
      isCustom: saved.length > 0,
      heroSlides: saved.length > 0 ? saved : DEFAULT_HERO_SLIDES,
    })
  } catch (err: any) {
    console.error('[API] hero-slides GET error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

// POST: saves the slides into store metadata. Nothing else in the metadata changes.
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
    const heroSlides = sanitizeHeroSlides(body.heroSlides)
    const live = heroSlides.filter((s) => s.enabled && s.image && s.heading)
    if (live.length === 0) {
      return NextResponse.json(
        {
          error:
            'At least one enabled slide with an image and a heading is required',
        },
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
        metadata: { ...currentMetadata, heroSlides },
      }),
    })
    const data = await safeJson(res)
    if (!res.ok) {
      return NextResponse.json(
        { error: data.message ?? 'Failed to save hero slides' },
        { status: res.status },
      )
    }
    invalidateHeroSlidesCache()
    // The homepage is statically cached (revalidate = 3600): without this the
    // change would only show up after that hour is over.
    revalidatePath('/')
    return NextResponse.json({ success: true })
  } catch (err: any) {
    console.error('[API] hero-slides POST error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
