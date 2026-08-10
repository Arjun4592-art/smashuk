// app/api/pos/cash-drawer/route.ts
// ─────────────────────────────────────────────────────────────────────────────
// Cash-drawer (till) sessions used to live ONLY in the browser's Zustand
// store (persist key 'smashpro-pos-store') — see store/posStore.ts's
// openCashDrawer/closeCashDrawer/addCashMovement. That meant:
//   - till open/close and cash-in/cash-out movements were never recorded
//     anywhere a manager could see them from another device
//   - clearing browser storage silently wiped the day's cash reconciliation
//
// Fix follows the exact same pattern already used for
// app/api/admin/report-history/route.ts: persist into Medusa's own
// `store.metadata` (genuine Postgres persistence via Medusa's built-in
// Store entity) — no custom Medusa module/table needed on the backend.
//
// Model: ONE physical till/drawer open at a time (matches the existing
// single `cashDrawer: CashDrawer | null` shape in posStore.ts — this app
// doesn't model multiple concurrent terminals). Sessions are appended to
// `store.metadata.posCashDrawerSessions`, capped at MAX_HISTORY.
// ─────────────────────────────────────────────────────────────────────────────

import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { SURFACE_COOKIES } from '@/lib/api/auth-cookie'
import { medusaServiceFetch } from '@/lib/api/medusa-service-token'

const MAX_HISTORY = 100

export interface CashMovementRecord {
  id: string
  amount: number
  type: 'in' | 'out'
  reason: string
  time: string
}

export interface CashDrawerSession {
  id: string
  openedAt: string
  closedAt?: string
  openingCash: number
  closingCash?: number
  expectedCash?: number
  variance?: number
  movements: CashMovementRecord[]
  cashier: string
}

async function requirePosSession(): Promise<boolean> {
  const cookieStore = await cookies()
  const posToken = cookieStore.get(SURFACE_COOKIES.pos.tokenCookie)?.value
  const dashboardToken = cookieStore.get(
    SURFACE_COOKIES.dashboard.tokenCookie,
  )?.value
  return Boolean(posToken || dashboardToken)
}

async function safeJson(res: Response) {
  const text = await res.text()
  if (!text) return {}
  try {
    return JSON.parse(text)
  } catch {
    return { message: text.slice(0, 300) }
  }
}

async function getStoreIdAndSessions(): Promise<{
  storeId: string
  sessions: CashDrawerSession[]
} | null> {
  const res = await medusaServiceFetch(
    '/admin/stores?limit=1&fields=id,metadata',
  )
  const data = await safeJson(res)
  const store = data.stores?.[0]
  if (!res.ok || !store) return null
  return {
    storeId: store.id,
    sessions: store.metadata?.posCashDrawerSessions ?? [],
  }
}

async function saveSessions(
  storeId: string,
  sessions: CashDrawerSession[],
): Promise<{ ok: boolean; error?: string }> {
  const res = await medusaServiceFetch(`/admin/stores/${storeId}`, {
    method: 'POST',
    body: JSON.stringify({
      metadata: { posCashDrawerSessions: sessions.slice(0, MAX_HISTORY) },
    }),
  })
  const data = await safeJson(res)
  if (!res.ok) return { ok: false, error: data.message ?? 'Save failed' }
  return { ok: true }
}

// GET — current open session (if any) + recent closed history, so any
// terminal/device can see what's happening with the till right now.
export async function GET() {
  if (!(await requirePosSession())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  try {
    const result = await getStoreIdAndSessions()
    if (!result) {
      return NextResponse.json({ error: 'No store found' }, { status: 500 })
    }
    const current = result.sessions.find((s) => !s.closedAt) ?? null
    const history = result.sessions.filter((s) => s.closedAt).slice(0, 20)
    return NextResponse.json({ current, history })
  } catch (err: any) {
    console.error('[POS cash-drawer] GET error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

// POST — one endpoint, three actions (open / movement / close). Mirrors
// the shape of the local Zustand actions it's replacing/backing.
export async function POST(req: NextRequest) {
  if (!(await requirePosSession())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: any
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  const { action } = body
  if (!['open', 'movement', 'close'].includes(action)) {
    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
  }

  try {
    const result = await getStoreIdAndSessions()
    if (!result) {
      return NextResponse.json({ error: 'No store found' }, { status: 500 })
    }
    const { storeId, sessions } = result
    const openIdx = sessions.findIndex((s) => !s.closedAt)

    if (action === 'open') {
      if (openIdx !== -1) {
        // Non-fatal by design: the client already has its own local
        // drawer state and treats this as best-effort sync — but flag it
        // clearly so a manager isn't left thinking two tills are open.
        return NextResponse.json(
          {
            error: 'A cash drawer session is already open',
            current: sessions[openIdx],
          },
          { status: 409 },
        )
      }
      const { openingCash, cashier } = body
      if (typeof openingCash !== 'number' || !cashier) {
        return NextResponse.json(
          { error: 'openingCash and cashier are required' },
          { status: 400 },
        )
      }
      const session: CashDrawerSession = {
        id: `drawer-${Date.now()}`,
        openedAt: new Date().toISOString(),
        openingCash,
        movements: [],
        cashier,
      }
      const saveResult = await saveSessions(storeId, [session, ...sessions])
      if (!saveResult.ok) {
        return NextResponse.json({ error: saveResult.error }, { status: 500 })
      }
      return NextResponse.json({ session })
    }

    if (openIdx === -1) {
      return NextResponse.json(
        { error: 'No cash drawer session is currently open' },
        { status: 400 },
      )
    }

    if (action === 'movement') {
      const { amount, type, reason } = body
      if (
        typeof amount !== 'number' ||
        !['in', 'out'].includes(type) ||
        !reason
      ) {
        return NextResponse.json(
          { error: 'amount, type and reason are required' },
          { status: 400 },
        )
      }
      const movement: CashMovementRecord = {
        id: `movement-${Date.now()}`,
        amount,
        type,
        reason,
        time: new Date().toISOString(),
      }
      const updated = [...sessions]
      updated[openIdx] = {
        ...updated[openIdx],
        movements: [...updated[openIdx].movements, movement],
      }
      const saveResult = await saveSessions(storeId, updated)
      if (!saveResult.ok) {
        return NextResponse.json({ error: saveResult.error }, { status: 500 })
      }
      return NextResponse.json({ session: updated[openIdx] })
    }

    // action === 'close'
    const { closingCash, expectedCash, variance } = body
    if (typeof closingCash !== 'number') {
      return NextResponse.json(
        { error: 'closingCash is required' },
        { status: 400 },
      )
    }
    const updated = [...sessions]
    updated[openIdx] = {
      ...updated[openIdx],
      closedAt: new Date().toISOString(),
      closingCash,
      expectedCash: typeof expectedCash === 'number' ? expectedCash : undefined,
      variance: typeof variance === 'number' ? variance : undefined,
    }
    const saveResult = await saveSessions(storeId, updated)
    if (!saveResult.ok) {
      return NextResponse.json({ error: saveResult.error }, { status: 500 })
    }
    return NextResponse.json({ session: updated[openIdx] })
  } catch (err: any) {
    console.error('[POS cash-drawer] POST error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
