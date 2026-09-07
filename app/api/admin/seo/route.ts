import { NextRequest, NextResponse } from 'next/server'
import { getAdminAuthHeader } from '@/lib/api/admin-auth'
import {
  readSeoConfig,
  invalidateSeoConfigCache,
  DEFAULT_SEO,
} from '@/lib/seo-config'
import { getAllCollectionHandles } from '@/lib/collections-data'
import { discoverStaticPages, isDiscoveredPageKey } from '@/lib/discover-pages'
const MEDUSA_URL =
  process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL ?? 'http://localhost:9000'
// New pages need zero manual registration here: any page.tsx added under
// app/(website) is picked up automatically by discoverStaticPages().
function isAllowedPage(page: string): boolean {
  if (page === '_global') return true
  if (page.startsWith('collection:')) {
    return getAllCollectionHandles().includes(page.slice('collection:'.length))
  }
  return isDiscoveredPageKey(page)
}
async function safeJson(res: Response) {
  const text = await res.text()
  if (!text) return {}
  try {
    return JSON.parse(text)
  } catch {
    return {
      message: text.slice(0, 300),
    }
  }
}
export async function GET(req: NextRequest) {
  const page = new URL(req.url).searchParams.get('page')
  const config = await readSeoConfig()
  if (page) {
    return NextResponse.json(config[page] ?? DEFAULT_SEO[page] ?? {})
  }
  // _pages: every static route discovered under app/(website) right now —
  // lets the dashboard list new pages without anyone editing this API.
  return NextResponse.json({ ...config, _pages: discoverStaticPages() })
}
export async function POST(req: NextRequest) {
  const authHeader = await getAdminAuthHeader(req)
  if (!authHeader) {
    return NextResponse.json(
      {
        error: 'Unauthorized',
      },
      {
        status: 401,
      },
    )
  }
  try {
    const body = await req.json()
    const { page, ...seoData } = body
    if (!page || !isAllowedPage(page)) {
      const knownKeys = discoverStaticPages()
        .map((p) => p.key)
        .join(', ')
      return NextResponse.json(
        {
          error: `page field must be one of: ${knownKeys}, _global, or a collection:<handle> key`,
        },
        {
          status: 400,
        },
      )
    }
    const config = await readSeoConfig()
    config[page] = {
      ...config[page],
      ...seoData,
    }
    const storeRes = await fetch(
      `${MEDUSA_URL}/admin/stores?limit=1&fields=id,metadata`,
      {
        headers: {
          Authorization: authHeader,
        },
      },
    )
    const storeData = await safeJson(storeRes)
    const storeId = storeData.stores?.[0]?.id
    const currentMetadata = storeData.stores?.[0]?.metadata ?? {}
    if (!storeRes.ok || !storeId) {
      return NextResponse.json(
        {
          error: storeData.message ?? 'No store found',
        },
        {
          status: storeRes.status || 500,
        },
      )
    }
    const res = await fetch(`${MEDUSA_URL}/admin/stores/${storeId}`, {
      method: 'POST',
      headers: {
        Authorization: authHeader,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        metadata: {
          ...currentMetadata,
          seoConfig: config,
        },
      }),
    })
    const data = await safeJson(res)
    if (!res.ok) {
      return NextResponse.json(
        {
          error: data.message ?? 'Failed to save SEO settings',
        },
        {
          status: res.status,
        },
      )
    }
    invalidateSeoConfigCache()
    return NextResponse.json({
      success: true,
      page,
      data: config[page],
    })
  } catch (err: any) {
    console.error('[API] seo update error:', err)
    return NextResponse.json(
      {
        error: err.message,
      },
      {
        status: 500,
      },
    )
  }
}