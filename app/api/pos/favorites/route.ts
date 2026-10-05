import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { SURFACE_COOKIES } from '@/lib/api/auth-cookie'
import { medusaServiceFetch } from '@/lib/api/medusa-service-token'
import {
  MAX_CUSTOM_TABS,
  MAX_FAVORITES_PER_TAB,
  customTabsOnly,
  newCustomTabId,
  normalizeTabLabel,
  sanitizeFavorites,
  sanitizeTabs,
  tabLabelExists,
  type FavoriteTab,
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

function readState(metadata: Record<string, unknown>): {
  tabs: FavoriteTab[]
  favorites: FavoritesMap
} {
  const tabs = sanitizeTabs(metadata.posFavoriteTabs)
  const favorites = sanitizeFavorites(metadata.posFavorites, tabs)
  return { tabs, favorites }
}

export async function GET() {
  if (!(await requirePosSession())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  try {
    const store = await loadStore()
    const { tabs, favorites } = readState(store.metadata)
    return NextResponse.json({ favorites, tabs })
  } catch (err: any) {
    console.error('[POS] Favorites GET error:', err.message)
    return NextResponse.json(
      { error: err.message || 'Failed to load favorites' },
      { status: 500 },
    )
  }
}

// Favorites live in ONE store-metadata blob, and every pin/unpin is a
// read-modify-write of that blob. Two requests overlapping meant the later
// write silently erased the earlier pin (lost update) — which is how bulk
// pinning lost products. So: (1) requests are run one at a time per server
// process, and (2) after saving, the result is re-read and the change is
// retried if it didn't stick (covers multiple server instances).
let postChain: Promise<unknown> = Promise.resolve()

export async function POST(req: NextRequest) {
  const run = postChain.then(() => handlePost(req))
  postChain = run.then(
    () => undefined,
    () => undefined,
  )
  return run
}

async function handlePost(req: NextRequest) {
  if (!(await requirePosSession())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  try {
    const body = await req.json().catch(() => ({}))
    const { action, tab, productId, label } = body ?? {}
    if (
      action !== 'pin' &&
      action !== 'unpin' &&
      action !== 'addTab' &&
      action !== 'renameTab' &&
      action !== 'deleteTab'
    ) {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }

    const fail = (error: string, status = 400) =>
      NextResponse.json({ error }, { status })

    let result: {
      favorites: FavoritesMap
      tabs: FavoriteTab[]
      tabId?: string
    } | null = null

    for (let attempt = 0; attempt < 5; attempt++) {
      const store = await loadStore()
      let { tabs, favorites } = readState(store.metadata)
      let createdTabId: string | undefined

      if (action === 'pin' || action === 'unpin') {
        if (typeof tab !== 'string' || !tabs.some((t) => t.id === tab)) {
          return fail('Invalid tab')
        }
        if (typeof productId !== 'string' || !productId) {
          return fail('productId required')
        }
        const list = favorites[tab]
        if (action === 'pin') {
          if (!list.includes(productId)) {
            if (list.length >= MAX_FAVORITES_PER_TAB) {
              return fail(
                `This tab already has ${MAX_FAVORITES_PER_TAB} favorites`,
              )
            }
            list.push(productId)
          }
        } else {
          favorites[tab] = list.filter((id) => id !== productId)
        }
      } else if (action === 'addTab') {
        const cleanLabel = normalizeTabLabel(label)
        if (!cleanLabel) return fail('Enter a tab name')
        if (tabLabelExists(tabs, cleanLabel)) {
          return fail('A tab with that name already exists')
        }
        if (tabs.filter((t) => t.custom).length >= MAX_CUSTOM_TABS) {
          return fail(`You can add up to ${MAX_CUSTOM_TABS} custom tabs`)
        }
        if (
          productId !== undefined &&
          (typeof productId !== 'string' || !productId)
        ) {
          return fail('Invalid productId')
        }
        createdTabId = newCustomTabId()
        tabs = [...tabs, { id: createdTabId, label: cleanLabel, custom: true }]
        favorites = {
          ...favorites,
          [createdTabId]: typeof productId === 'string' ? [productId] : [],
        }
      } else if (action === 'renameTab') {
        const target = tabs.find((t) => t.id === tab)
        if (!target) return fail('Tab not found', 404)
        if (!target.custom) return fail('Built-in tabs cannot be renamed')
        const cleanLabel = normalizeTabLabel(label)
        if (!cleanLabel) return fail('Enter a tab name')
        if (tabLabelExists(tabs, cleanLabel, target.id)) {
          return fail('A tab with that name already exists')
        }
        tabs = tabs.map((t) =>
          t.id === target.id ? { ...t, label: cleanLabel } : t,
        )
      } else {
        // deleteTab
        const target = tabs.find((t) => t.id === tab)
        if (!target) return fail('Tab not found', 404)
        if (!target.custom) return fail('Built-in tabs cannot be deleted')
        tabs = tabs.filter((t) => t.id !== target.id)
        favorites = sanitizeFavorites(favorites, tabs)
      }

      const saveRes = await medusaServiceFetch(`/admin/stores/${store.id}`, {
        method: 'POST',
        body: JSON.stringify({
          metadata: {
            posFavorites: favorites,
            posFavoriteTabs: customTabsOnly(tabs),
          },
        }),
      })
      if (!saveRes.ok) {
        const text = await saveRes.text()
        throw new Error(
          `Medusa save error ${saveRes.status}: ${text.slice(0, 200)}`,
        )
      }

      // Verify the write stuck (another instance may have overwritten it).
      // Check the WHOLE saved state, not just the one pin that changed, so a
      // concurrent write that dropped OTHER pins is also caught and retried.
      const after = readState((await loadStore()).metadata)
      let stuck =
        JSON.stringify(after.favorites) === JSON.stringify(favorites) &&
        JSON.stringify(customTabsOnly(after.tabs)) ===
          JSON.stringify(customTabsOnly(tabs))
      if (action === 'pin') {
        stuck = stuck && (after.favorites[tab] ?? []).includes(productId)
      } else if (action === 'unpin') {
        stuck = stuck && !(after.favorites[tab] ?? []).includes(productId)
      }
      result = {
        favorites: after.favorites,
        tabs: after.tabs,
        tabId: createdTabId,
      }
      if (stuck) break
      if (attempt === 4) {
        throw new Error('Could not save favorite — please try again')
      }
    }

    return NextResponse.json({
      favorites: result!.favorites,
      tabs: result!.tabs,
      tabId: result!.tabId,
    })
  } catch (err: any) {
    console.error('[POS] Favorites POST error:', err.message)
    return NextResponse.json(
      { error: err.message || 'Failed to save favorites' },
      { status: 500 },
    )
  }
}
