import { NextRequest, NextResponse } from 'next/server'
import { fetchWithTimeout } from '@/lib/api/fetch-with-timeout'

// Liveness / readiness probe for uptime monitors and PM2 scripts.
//
//   GET /api/health          -> 200 as soon as this Node process can answer
//   GET /api/health?deep=1   -> also checks that the Medusa backend responds
//
// Point UptimeRobot / BetterStack at /api/health?deep=1 so you get an alert
// when either the storefront or the backend is down. Never cached.
export const dynamic = 'force-dynamic'

const MEDUSA_URL =
  process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL ?? 'http://localhost:9000'

export async function GET(req: NextRequest) {
  const base = {
    ok: true,
    uptimeSec: Math.round(process.uptime()),
    memoryMb: Math.round(process.memoryUsage().rss / 1024 / 1024),
  }
  if (req.nextUrl.searchParams.get('deep') !== '1') {
    return NextResponse.json(base, { headers: { 'Cache-Control': 'no-store' } })
  }
  try {
    const res = await fetchWithTimeout(`${MEDUSA_URL}/health`, {
      timeoutMs: 3_000,
      cache: 'no-store',
    })
    const backendOk = res.ok
    return NextResponse.json(
      {
        ...base,
        ok: backendOk,
        backend: backendOk ? 'up' : `http ${res.status}`,
      },
      {
        status: backendOk ? 200 : 503,
        headers: { 'Cache-Control': 'no-store' },
      },
    )
  } catch {
    return NextResponse.json(
      { ...base, ok: false, backend: 'unreachable' },
      { status: 503, headers: { 'Cache-Control': 'no-store' } },
    )
  }
}
