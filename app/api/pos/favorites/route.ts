import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { SURFACE_COOKIES } from '@/lib/api/auth-cookie'
import { medusaServiceFetch } from '@/lib/api/medusa-service-token'

export const dynamic = 'force-dynamic'

// POS favorites now live in the Medusa backend (favorites module), one row
// per pin, served by /admin/pos/favorites. This route only checks the POS
// session and forwards the request - all validation and limits are enforced
// in the backend.

async function requirePosSession(): Promise<boolean> {
  const cookieStore = await cookies()
  const posToken = cookieStore.get(SURFACE_COOKIES.pos.tokenCookie)?.value
  const dashboardToken = cookieStore.get(
    SURFACE_COOKIES.dashboard.tokenCookie,
  )?.value
  return Boolean(posToken || dashboardToken)
}

async function relay(res: Response, fallbackError: string) {
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    return NextResponse.json(
      { error: data?.error || data?.message || fallbackError },
      { status: res.status },
    )
  }
  return NextResponse.json(data)
}

export async function GET() {
  if (!(await requirePosSession())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  try {
    const res = await medusaServiceFetch('/admin/pos/favorites', {
      cache: 'no-store',
    })
    return await relay(res, 'Failed to load favorites')
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
    const res = await medusaServiceFetch('/admin/pos/favorites', {
      method: 'POST',
      body: JSON.stringify(body ?? {}),
    })
    return await relay(res, 'Failed to save favorites')
  } catch (err: any) {
    console.error('[POS] Favorites POST error:', err.message)
    return NextResponse.json(
      { error: err.message || 'Failed to save favorites' },
      { status: 500 },
    )
  }
}
