// app/api/admin/seo/route.ts
//
// Stores/retrieves SEO data for static pages.
// Data: Medusa's `store.metadata.seoConfig` (see lib/seo-config.ts for the
// BUG FIX writeup on why this moved off `public/seo-config.json`).
// Pages: home | shop | about | contact (extend as needed)

import { NextRequest, NextResponse } from 'next/server'
import { getAdminAuthHeader } from '@/lib/api/admin-auth'
import { readSeoConfig, invalidateSeoConfigCache, DEFAULT_SEO } from '@/lib/seo-config'

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

// GET /api/admin/seo?page=home
export async function GET(req: NextRequest) {
  const page = new URL(req.url).searchParams.get('page')
  const config = await readSeoConfig()

  if (page) {
    return NextResponse.json(config[page] ?? DEFAULT_SEO[page] ?? {})
  }

  // if no page param was given, return the whole config
  return NextResponse.json(config)
}

// POST /api/admin/seo  body: { page: 'home', ...seoFields }
export async function POST(req: NextRequest) {
  // SECURITY: controls public SEO metadata — must require a logged-in admin session.
  const authHeader = await getAdminAuthHeader(req)
  if (!authHeader) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await req.json()
    const { page, ...seoData } = body

    const ALLOWED_PAGES = ['home', 'shop', 'about', 'contact', 'local-store', '_global']
    if (!page || !ALLOWED_PAGES.includes(page)) {
      return NextResponse.json(
        { error: `page field must be one of: ${ALLOWED_PAGES.join(', ')}` },
        { status: 400 },
      )
    }

    const config = await readSeoConfig()
    config[page] = { ...config[page], ...seoData }

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
      body: JSON.stringify({ metadata: { seoConfig: config } }),
    })
    const data = await safeJson(res)
    if (!res.ok) {
      return NextResponse.json(
        { error: data.message ?? 'Failed to save SEO settings' },
        { status: res.status },
      )
    }

    invalidateSeoConfigCache()
    return NextResponse.json({ success: true, page, data: config[page] })
  } catch (err: any) {
    console.error('[API] seo update error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
