import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { SURFACE_COOKIES } from '@/lib/api/auth-cookie'
import { medusaServiceFetch } from '@/lib/api/medusa-service-token'

// POS version of /api/admin/orders/[id]/shipping-label.
// The /api/admin/** routes are dashboard-only, so the POS terminal gets its
// own read-only route (needs a POS or dashboard session).
async function requirePosSession(): Promise<boolean> {
  const cookieStore = await cookies()
  const posToken = cookieStore.get(SURFACE_COOKIES.pos.tokenCookie)?.value
  const dashboardToken = cookieStore.get(
    SURFACE_COOKIES.dashboard.tokenCookie,
  )?.value
  return Boolean(posToken || dashboardToken)
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!(await requirePosSession())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const { id } = await params
  try {
    const r = await medusaServiceFetch(`/admin/orders/${id}/shipping-label`)
    const text = await r.text()
    let data: any = {}
    try {
      data = text ? JSON.parse(text) : {}
    } catch {
      data = { error: text || `Backend returned ${r.status}` }
    }
    return NextResponse.json(data, { status: r.status })
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message ?? 'Failed to fetch shipping label' },
      { status: 500 },
    )
  }
}
