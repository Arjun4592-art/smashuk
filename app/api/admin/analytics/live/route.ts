import { NextRequest, NextResponse } from 'next/server';
import { BetaAnalyticsDataClient } from '@google-analytics/data';
import { getAdminAuthHeader } from '@/lib/api/admin-auth';
const MEDUSA_URL = process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL ?? 'http://localhost:9000';
function getClient() {
  const email = process.env.GA4_SERVICE_ACCOUNT_EMAIL;
  const key = process.env.GA4_SERVICE_ACCOUNT_PRIVATE_KEY;
  if (!email || !key) {
    throw new Error('GA4 service account credentials are not configured');
  }
  return new BetaAnalyticsDataClient({
    credentials: {
      client_email: email,
      private_key: key.replace(/\\n/g, '\n')
    }
  });
}
async function getTodaysOrders(req: NextRequest) {
  const authHeader = await getAdminAuthHeader(req);
  if (!authHeader) return {
    count: 0,
    amount: 0
  };
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  try {
    const url = new URL('/admin/orders', MEDUSA_URL);
    url.searchParams.set('limit', '200');
    url.searchParams.set('fields', '+total,+created_at');
    url.searchParams.set('created_at[$gte]', startOfToday.toISOString());
    const res = await fetch(url.toString(), {
      headers: {
        Authorization: authHeader,
        'Content-Type': 'application/json'
      },
      cache: 'no-store'
    });
    if (!res.ok) return {
      count: 0,
      amount: 0
    };
    const data = await res.json();
    const orders: any[] = data.orders ?? [];
    const amount = orders.reduce((sum, o) => sum + (o.total ?? 0), 0);
    return {
      count: orders.length,
      amount
    };
  } catch {
    return {
      count: 0,
      amount: 0
    };
  }
}
export async function GET(req: NextRequest) {
  const propertyId = process.env.GA4_PROPERTY_ID;
  const todaysOrders = await getTodaysOrders(req);
  if (!propertyId) {
    return NextResponse.json({
      connected: false,
      error: 'GA4_PROPERTY_ID is not configured',
      todaysOrders
    }, {
      status: 200
    });
  }
  try {
    const client = getClient();
    const [[totalResponse], [minuteResponse], [countryResponse], [deviceResponse], [pageResponse], [eventResponse]] = await Promise.all([client.runRealtimeReport({
      property: `properties/${propertyId}`,
      metrics: [{
        name: 'activeUsers'
      }]
    }), client.runRealtimeReport({
      property: `properties/${propertyId}`,
      dimensions: [{
        name: 'minutesAgo'
      }],
      metrics: [{
        name: 'activeUsers'
      }]
    }), client.runRealtimeReport({
      property: `properties/${propertyId}`,
      dimensions: [{
        name: 'country'
      }],
      metrics: [{
        name: 'activeUsers'
      }],
      orderBys: [{
        metric: {
          metricName: 'activeUsers'
        },
        desc: true
      }],
      limit: 5
    }), client.runRealtimeReport({
      property: `properties/${propertyId}`,
      dimensions: [{
        name: 'deviceCategory'
      }],
      metrics: [{
        name: 'activeUsers'
      }],
      orderBys: [{
        metric: {
          metricName: 'activeUsers'
        },
        desc: true
      }]
    }), client.runRealtimeReport({
      property: `properties/${propertyId}`,
      dimensions: [{
        name: 'unifiedScreenName'
      }],
      metrics: [{
        name: 'screenPageViews'
      }],
      orderBys: [{
        metric: {
          metricName: 'screenPageViews'
        },
        desc: true
      }],
      limit: 5
    }), client.runRealtimeReport({
      property: `properties/${propertyId}`,
      dimensions: [{
        name: 'eventName'
      }],
      metrics: [{
        name: 'eventCount'
      }],
      orderBys: [{
        metric: {
          metricName: 'eventCount'
        },
        desc: true
      }],
      limit: 8
    })]);
    const activeVisitors = Number(totalResponse.rows?.[0]?.metricValues?.[0]?.value ?? 0);
    const usersByMinute = (minuteResponse.rows ?? []).map(row => ({
      minutesAgo: Number(row.dimensionValues?.[0]?.value ?? 0),
      activeUsers: Number(row.metricValues?.[0]?.value ?? 0)
    })).sort((a, b) => b.minutesAgo - a.minutesAgo);
    const usersByCountry = (countryResponse.rows ?? []).map(row => ({
      country: row.dimensionValues?.[0]?.value || 'Unknown',
      activeUsers: Number(row.metricValues?.[0]?.value ?? 0)
    })).filter(r => r.activeUsers > 0);
    const usersByDevice = (deviceResponse.rows ?? []).map(row => ({
      device: row.dimensionValues?.[0]?.value || 'Unknown',
      activeUsers: Number(row.metricValues?.[0]?.value ?? 0)
    })).filter(r => r.activeUsers > 0);
    const topActivePages = (pageResponse.rows ?? []).map(row => ({
      page: row.dimensionValues?.[0]?.value || 'Unknown',
      views: Number(row.metricValues?.[0]?.value ?? 0)
    })).filter(r => r.views > 0);
    const events = (eventResponse.rows ?? []).map(row => ({
      name: row.dimensionValues?.[0]?.value || 'unknown',
      count: Number(row.metricValues?.[0]?.value ?? 0)
    })).filter(r => r.count > 0);
    const cartsActive = events.find(e => e.name === 'add_to_cart')?.count ?? 0;
    const checkouts = events.find(e => e.name === 'begin_checkout')?.count ?? 0;
    return NextResponse.json({
      connected: true,
      activeVisitors,
      cartsActive,
      checkouts,
      usersByMinute,
      usersByCountry,
      usersByDevice,
      topActivePages,
      events,
      todaysOrders,
      updatedAt: new Date().toISOString()
    });
  } catch (error) {
    console.error('[GA4 realtime] failed to fetch:', error);
    return NextResponse.json({
      connected: false,
      error: error instanceof Error ? error.message : 'Unknown GA4 error',
      todaysOrders
    }, {
      status: 200
    });
  }
}
