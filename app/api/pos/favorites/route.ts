import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { SURFACE_COOKIES } from '@/lib/api/auth-cookie'
import { medusaServiceFetch } from '@/lib/api/medusa-service-token'
import {
  MAX_FAVORITES_PER_TAB,
  isFavoriteTabId,
  sanitizeFavorites,
  type FavoritesMap,
} from '@/lib/pos/favorites'

export const dynamic = 'force-dynamic'

async function requirePosSession(): Promise<boolean> {
  const cookieStore = await cookies()
  const posToken = cookieStore.get(SURFACE_COOKIES.pos.tokenCookie)?.value
  const dashboardToken = cookieStore.get(
    SURFACE_COOKIES.dashboard.tokenCookie,
  )?.value
  return Boolean(posToken || dashboardToken)
}

async function loadStore(): Promise<{
  id: string
  metadata: Record<string, unknown>
}> {
  const res = await medusaServiceFetch(
    '/admin/stores?limit=1&fields=id,metadata',
    { cache: 'no-store' },
  )
  if (!res.ok) throw new Error(`Medusa store error ${res.status}`)
  const data = await res.json()
  const store = data.stores?.[0]
  if (!store?.id) throw new Error('No store found')
  return { id: store.id, metadata: store.metadata ?? {} }
}

export async function GET() {
  if (!(await requirePosSession())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  try {
    const store = await loadStore()
    return NextResponse.json({
      favorites: sanitizeFavorites(store.metadata.posFavorites),
    })
  } catch (err: any) {
    console.error('[POS] Favorites GET error:', err.message)
    return NextResponse.json(
      { error: err.message || 'Failed to load favorites' },
      { status: 500 },
    )
  }
}

export async function POST(req: NextRequest) {
  if (!(await requirePosSession())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  try {
    const body = await req.json().catch(() => ({}))
    const { action, tab, productId } = body ?? {}
    if (action !== 'pin' && action !== 'unpin') {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }
    if (!isFavoriteTabId(tab)) {
      return NextResponse.json({ error: 'Invalid tab' }, { status: 400 })
    }
    if (typeof productId !== 'string' || !productId) {
      return NextResponse.json({ error: 'productId required' }, { status: 400 })
    }

    const store = await loadStore()
    const favorites: FavoritesMap = sanitizeFavorites(
      store.metadata.posFavorites,
    )
    const list = favorites[tab]
    if (action === 'pin') {
      if (!list.includes(productId)) {
        if (list.length >= MAX_FAVORITES_PER_TAB) {
          return NextResponse.json(
            {
              error: `This tab already has ${MAX_FAVORITES_PER_TAB} favorites`,
            },
            { status: 400 },
          )
        }
        list.push(productId)
      }
    } else {
      favorites[tab] = list.filter((id) => id !== productId)
    }

    const saveRes = await medusaServiceFetch(`/admin/stores/${store.id}`, {
      method: 'POST',
      body: JSON.stringify({
        metadata: { ...store.metadata, posFavorites: favorites },
      }),
    })
    if (!saveRes.ok) {
      const text = await saveRes.text()
      throw new Error(
        `Medusa save error ${saveRes.status}: ${text.slice(0, 200)}`,
      )
    }
    return NextResponse.json({ favorites })
  } catch (err: any) {
    console.error('[POS] Favorites POST error:', err.message)
    return NextResponse.json(
      { error: err.message || 'Failed to save favorites' },
      { status: 500 },
    )
  }
}
