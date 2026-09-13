import { NextRequest, NextResponse } from 'next/server'
import { BetaAnalyticsDataClient } from '@google-analytics/data'
import { getAdminAuthHeader } from '@/lib/api/admin-auth'
const MEDUSA_URL =
  process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL ?? 'http://localhost:9000'
function getClient() {
  const email = process.env.GA4_SERVICE_ACCOUNT_EMAIL
  const key = process.env.GA4_SERVICE_ACCOUNT_PRIVATE_KEY
  if (!email || !key) {
    throw new Error('GA4 service account credentials are not configured')
  }
  return new BetaAnalyticsDataClient({
    credentials: {
      client_email: email,
      private_key: key.replace(/\\n/g, '\n'),
    },
  })
}
// GA4's Realtime Data API charges an hourly-quota "token" per report call,
// and this route fires 6 report calls per hit. Without a cache, every
// dashboard tab polling on its own interval — and every admin who happens
// to have Live View open at the same time — multiplies that 6x straight
// into the property's per-hour quota, which is how this used to blow the
// quota (RESOURCE_EXHAUSTED) well before the hour was up. A plain in-memory
// cache is enough here (not Redis) for the same reason as receipt-cache.ts:
// this app runs as a single persistent Node process under PM2, not
// serverless/edge. The cache is keyed by propertyId (in practice always
// one value) so it still works correctly if that ever changes.
const GA4_CACHE_TTL_MS = 40 * 1000
let ga4Cache: {
  propertyId: string
  expiresAt: number
  data: Omit<LivePayload, 'todaysOrders' | 'updatedAt'>
} | null = null
type LivePayload = {
  connected: boolean
  error?: string
  activeVisitors?: number
  cartsActive?: number
  checkouts?: number
  usersByMinute?: {
    minutesAgo: number
    activeUsers: number
  }[]
  usersByCountry?: {
    country: string
    activeUsers: number
  }[]
  usersByDevice?: {
    device: string
    activeUsers: number
  }[]
  topActivePages?: {
    page: string
    views: number
  }[]
  events?: {
    name: string
    count: number
  }[]
  todaysOrders: {
    count: number
    amount: number
  }
  updatedAt: string
}
async function getTodaysOrders(req: NextRequest) {
  const authHeader = await getAdminAuthHeader(req)
  if (!authHeader)
    return {
      count: 0,
      amount: 0,
    }
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
    if (!res.ok)
      return {
        count: 0,
        amount: 0,
      }
    const data = await res.json()
    const orders: any[] = data.orders ?? []
    const amount = orders.reduce((sum, o) => sum + (o.total ?? 0), 0)
    return {
      count: orders.length,
      amount,
    }
  } catch {
    return {
      count: 0,
      amount: 0,
    }
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
      {
        status: 200,
      },
    )
  }
  // Serve from cache when fresh — this is what stops N polling tabs from
  // turning into N x 6 quota tokens; they all share the same GA4 fetch.
  if (
    ga4Cache &&
    ga4Cache.propertyId === propertyId &&
    ga4Cache.expiresAt > Date.now()
  ) {
    return NextResponse.json({
      ...ga4Cache.data,
      todaysOrders,
      updatedAt: new Date().toISOString(),
    })
  }
  try {
    const client = getClient()
    const [
      [totalResponse],
      [minuteResponse],
      [countryResponse],
      [deviceResponse],
      [pageResponse],
      [eventResponse],
    ] = await Promise.all([
      client.runRealtimeReport({
        property: `properties/${propertyId}`,
        metrics: [
          {
            name: 'activeUsers',
          },
        ],
      }),
      client.runRealtimeReport({
        property: `properties/${propertyId}`,
        dimensions: [
          {
            name: 'minutesAgo',
          },
        ],
        metrics: [
          {
            name: 'activeUsers',
          },
        ],
      }),
      client.runRealtimeReport({
        property: `properties/${propertyId}`,
        dimensions: [
          {
            name: 'country',
          },
        ],
        metrics: [
          {
            name: 'activeUsers',
          },
        ],
        orderBys: [
          {
            metric: {
              metricName: 'activeUsers',
            },
            desc: true,
          },
        ],
        limit: 5,
      }),
      client.runRealtimeReport({
        property: `properties/${propertyId}`,
        dimensions: [
          {
            name: 'deviceCategory',
          },
        ],
        metrics: [
          {
            name: 'activeUsers',
          },
        ],
        orderBys: [
          {
            metric: {
              metricName: 'activeUsers',
            },
            desc: true,
          },
        ],
      }),
      client.runRealtimeReport({
        property: `properties/${propertyId}`,
        dimensions: [
          {
            name: 'unifiedScreenName',
          },
        ],
        metrics: [
          {
            name: 'screenPageViews',
          },
        ],
        orderBys: [
          {
            metric: {
              metricName: 'screenPageViews',
            },
            desc: true,
          },
        ],
        limit: 5,
      }),
      client.runRealtimeReport({
        property: `properties/${propertyId}`,
        dimensions: [
          {
            name: 'eventName',
          },
        ],
        metrics: [
          {
            name: 'eventCount',
          },
        ],
        orderBys: [
          {
            metric: {
              metricName: 'eventCount',
            },
            desc: true,
          },
        ],
        limit: 8,
      }),
    ])
    const activeVisitors = Number(
      totalResponse.rows?.[0]?.metricValues?.[0]?.value ?? 0,
    )
    const usersByMinute = (minuteResponse.rows ?? [])
      .map((row) => ({
        minutesAgo: Number(row.dimensionValues?.[0]?.value ?? 0),
        activeUsers: Number(row.metricValues?.[0]?.value ?? 0),
      }))
      .sort((a, b) => b.minutesAgo - a.minutesAgo)
    const usersByCountry = (countryResponse.rows ?? [])
      .map((row) => ({
        country: row.dimensionValues?.[0]?.value || 'Unknown',
        activeUsers: Number(row.metricValues?.[0]?.value ?? 0),
      }))
      .filter((r) => r.activeUsers > 0)
    const usersByDevice = (deviceResponse.rows ?? [])
      .map((row) => ({
        device: row.dimensionValues?.[0]?.value || 'Unknown',
        activeUsers: Number(row.metricValues?.[0]?.value ?? 0),
      }))
      .filter((r) => r.activeUsers > 0)
    const topActivePages = (pageResponse.rows ?? [])
      .map((row) => ({
        page: row.dimensionValues?.[0]?.value || 'Unknown',
        views: Number(row.metricValues?.[0]?.value ?? 0),
      }))
      .filter((r) => r.views > 0)
    const events = (eventResponse.rows ?? [])
      .map((row) => ({
        name: row.dimensionValues?.[0]?.value || 'unknown',
        count: Number(row.metricValues?.[0]?.value ?? 0),
      }))
      .filter((r) => r.count > 0)
    const cartsActive = events.find((e) => e.name === 'add_to_cart')?.count ?? 0
    const checkouts =
      events.find((e) => e.name === 'begin_checkout')?.count ?? 0
    const ga4Data = {
      connected: true as const,
      activeVisitors,
      cartsActive,
      checkouts,
      usersByMinute,
      usersByCountry,
      usersByDevice,
      topActivePages,
      events,
    }
    ga4Cache = {
      propertyId,
      expiresAt: Date.now() + GA4_CACHE_TTL_MS,
      data: ga4Data,
    }
    return NextResponse.json({
      ...ga4Data,
      todaysOrders,
      updatedAt: new Date().toISOString(),
    })
  } catch (error) {
    console.error('[GA4 realtime] failed to fetch:', error)
    // Don't cache the failure — if quota was exhausted, we want the very
    // next request after it resets to try GA4 again rather than being
    // stuck serving a cached error for the full TTL.
    return NextResponse.json(
      {
        connected: false,
        error: error instanceof Error ? error.message : 'Unknown GA4 error',
        todaysOrders,
      },
      {
        status: 200,
      },
    )
  }
}
