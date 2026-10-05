import { NextRequest, NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import { getAdminAuthHeader } from '@/lib/api/admin-auth'
import {
  getDefaultMegaMenuConfig,
  sanitizeMegaMenuConfig,
} from '@/lib/mega-menu-config'
import { invalidateMegaMenuCache, parseSavedMegaMenu } from '@/lib/mega-menu'

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

// GET: saved menu (or the built-in defaults if nothing was saved yet).
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
    return NextResponse.json({
      storeId: store.id,
      isCustomised: !!store.metadata?.megaMenu,
      config: parseSavedMegaMenu(store.metadata?.megaMenu),
    })
  } catch (err: any) {
    console.error('[API] mega-menu GET error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

// POST: { storeId, config } saves the menu. { storeId, reset: true } removes
// the saved copy so the site goes back to the built-in default menu.
export async function POST(req: NextRequest) {
  const authHeader = await getAdminAuthHeader(req)
  if (!authHeader) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  try {
    const body = await req.json()
    const { storeId, config, reset } = body
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

    let megaMenu: unknown = null
    let cleaned = getDefaultMegaMenuConfig()
    if (!reset) {
      cleaned = sanitizeMegaMenuConfig(config)
      if (cleaned.menus.length === 0) {
        return NextResponse.json(
          { error: 'Add at least one menu before saving' },
          { status: 400 },
        )
      }
      megaMenu = cleaned
    }

    // Medusa merges metadata keys; null removes the key.
    const res = await fetch(`${MEDUSA_URL}/admin/stores/${storeId}`, {
      method: 'POST',
      headers: {
        Authorization: authHeader,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        metadata: { megaMenu },
      }),
    })
    const data = await safeJson(res)
    if (!res.ok) {
      return NextResponse.json(
        { error: data.message ?? 'Failed to save menu' },
        { status: res.status },
      )
    }
    invalidateMegaMenuCache()
    // The header sits in the website layout, so refresh every page under it.
    revalidatePath('/', 'layout')
    return NextResponse.json({ success: true, config: cleaned })
  } catch (err: any) {
    console.error('[API] mega-menu POST error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
