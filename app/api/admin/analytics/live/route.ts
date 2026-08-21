import { NextRequest, NextResponse } from 'next/server'
import { BetaAnalyticsDataClient } from '@google-analytics/data'
import { getAdminAuthHeader } from '@/lib/api/admin-auth'

const MEDUSA_URL =
  process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL ?? 'http://localhost:9000'

// Lazily build the client so a missing/invalid env var doesn't crash the
// whole route module at import time — we want a clean JSON error instead.
function getClient() {
  const email = process.env.GA4_SERVICE_ACCOUNT_EMAIL
  const key = process.env.GA4_SERVICE_ACCOUNT_PRIVATE_KEY

  if (!email || !key) {
    throw new Error('GA4 service account credentials are not configured')
  }

  return new BetaAnalyticsDataClient({
    credentials: {
      client_email: email,
      // .env files store the key with literal \n sequences — convert them
      // back to real newlines for the PEM to parse correctly.
      private_key: key.replace(/\\n/g, '\n'),
    },
  })
}

async function getTodaysOrders(req: NextRequest) {
  const authHeader = await getAdminAuthHeader(req)
  if (!authHeader) return { count: 0, amount: 0 }

  // Midnight local-server-time today, in ISO — Medusa's created_at filter
  // expects ISO timestamps.
  const startOfToday = new Date()
  startOfToday.setHours(0, 0, 0, 0)

  try {
    const url = new URL('/admin/orders', MEDUSA_URL)
    url.searchParams.set('limit', '200')
    url.searchParams.set('fields', '+total,+created_at')
    url.searchParams.set('created_at[$gte]', startOfToday.toISOString())

    const res = await fetch(url.toString(), {
      headers: {
        Authorization: authHeader,
        'Content-Type': 'application/json',
      },
      cache: 'no-store',
    })

    if (!res.ok) return { count: 0, amount: 0 }

    const data = await res.json()
    const orders: any[] = data.orders ?? []
    const amount = orders.reduce((sum, o) => sum + (o.total ?? 0), 0)

    return { count: orders.length, amount }
  } catch {
    return { count: 0, amount: 0 }
  }
}

export async function GET(req: NextRequest) {
  const propertyId = process.env.GA4_PROPERTY_ID

  const todaysOrders = await getTodaysOrders(req)

  if (!propertyId) {
    return NextResponse.json(
      {
        connected: false,
        error: 'GA4_PROPERTY_ID is not configured',
        todaysOrders,
      },
      { status: 200 },
    )
  }

  try {
    const client = getClient()

    // Realtime report: active users right now, broken out by an event we
    // care about, so we can derive "active visitors".
    const [realtimeResponse] = await client.runRealtimeReport({
      property: `properties/${propertyId}`,
      metrics: [{ name: 'activeUsers' }],
    })

    const activeVisitors = Number(
      realtimeResponse.rows?.[0]?.metricValues?.[0]?.value ?? 0,
    )

    // Today's carts-active / checkouts, using standard GA4 ecommerce events
    // (add_to_cart, begin_checkout) via the realtime API's event breakdown.
    const [eventResponse] = await client.runRealtimeReport({
      property: `properties/${propertyId}`,
      dimensions: [{ name: 'eventName' }],
      metrics: [{ name: 'eventCount' }],
    })

    let cartsActive = 0
    let checkouts = 0

    for (const row of eventResponse.rows ?? []) {
      const eventName = row.dimensionValues?.[0]?.value
      const count = Number(row.metricValues?.[0]?.value ?? 0)

      if (eventName === 'add_to_cart') cartsActive = count
      if (eventName === 'begin_checkout') checkouts = count
    }

    return NextResponse.json({
      connected: true,
      activeVisitors,
      cartsActive,
      checkouts,
      todaysOrders,
      updatedAt: new Date().toISOString(),
    })
  } catch (error) {
    console.error('[GA4 realtime] failed to fetch:', error)
    return NextResponse.json(
      {
        connected: false,
        error: error instanceof Error ? error.message : 'Unknown GA4 error',
        todaysOrders,
      },
      { status: 200 },
    )
  }
}
