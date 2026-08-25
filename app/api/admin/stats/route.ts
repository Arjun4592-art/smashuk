import { NextRequest, NextResponse } from 'next/server';
import { getAdminAuthHeader } from '@/lib/api/admin-auth';
const MEDUSA_URL = process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL ?? 'http://localhost:9000';
function daysAgo(n: number) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  d.setHours(0, 0, 0, 0);
  return d;
}
async function medusaGet(path: string, authorization: string, label: string) {
  const res = await fetch(`${MEDUSA_URL}${path}`, {
    headers: {
      Authorization: authorization
    }
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(`[${label}] ${data?.message ?? `Medusa request failed: ${res.status}`}`);
  }
  return data;
}
export async function GET(req: NextRequest) {
  const authHeader = await getAdminAuthHeader(req);
  if (!authHeader) {
    return NextResponse.json({
      error: 'Unauthorized'
    }, {
      status: 401
    });
  }
  const {
    searchParams
  } = new URL(req.url);
  const range = searchParams.get('range') ?? 'last30';
  try {
    const [ordersRes, customersRes, productsRes, allOrders] = await Promise.all([medusaGet('/admin/orders?limit=1', authHeader, 'orders count'), medusaGet('/admin/customers?limit=1', authHeader, 'customers count'), medusaGet('/admin/products?limit=1', authHeader, 'products count'), medusaGet('/admin/orders?limit=500', authHeader, 'orders (revenue+chart)')]);
    const allOrdersForRevenue = allOrders;
    const rangeStart = new Date();
    if (range === 'today') rangeStart.setHours(0, 0, 0, 0);else if (range === 'last7') rangeStart.setDate(rangeStart.getDate() - 7);else if (range === 'last30') rangeStart.setDate(rangeStart.getDate() - 30);else if (range === 'last90') rangeStart.setDate(rangeStart.getDate() - 90);else if (range === 'thisyear') rangeStart.setMonth(0, 1);else rangeStart.setDate(rangeStart.getDate() - 30);
    const thirtyDaysAgo = rangeStart;
    const recentOrders = (allOrders.orders ?? []).filter((o: any) => new Date(o.created_at) >= rangeStart);
    const revenueByDate: Record<string, {
      revenue: number;
      orders: number;
    }> = {};
    const today = new Date();
    if (range === 'today') {
      for (let h = 0; h < 24; h++) {
        const key = `${h}:00`;
        revenueByDate[key] = {
          revenue: 0,
          orders: 0
        };
      }
    } else if (range === 'last7') {
      for (let i = 6; i >= 0; i--) {
        const d = new Date(today);
        d.setDate(d.getDate() - i);
        const key = d.toLocaleDateString('en-GB', {
          month: 'short',
          day: 'numeric'
        });
        revenueByDate[key] = {
          revenue: 0,
          orders: 0
        };
      }
    } else if (range === 'last30') {
      for (let i = 29; i >= 0; i--) {
        const d = new Date(today);
        d.setDate(d.getDate() - i);
        const key = d.toLocaleDateString('en-GB', {
          month: 'short',
          day: 'numeric'
        });
        revenueByDate[key] = {
          revenue: 0,
          orders: 0
        };
      }
    } else {
      const months = new Set<string>();
      recentOrders.forEach((o: any) => {
        months.add(new Date(o.created_at).toLocaleDateString('en-GB', {
          month: 'short'
        }));
      });
      months.forEach(m => {
        revenueByDate[m] = {
          revenue: 0,
          orders: 0
        };
      });
    }
    for (const order of recentOrders) {
      if (order.payment_status !== 'captured' && order.payment_status !== 'partially_captured') {
        continue;
      }
      const d = new Date(order.created_at);
      let key: string;
      if (range === 'today') {
        key = `${d.getHours()}:00`;
      } else if (range === 'last90' || range === 'thisyear') {
        key = d.toLocaleDateString('en-GB', {
          month: 'short'
        });
      } else {
        key = d.toLocaleDateString('en-GB', {
          month: 'short',
          day: 'numeric'
        });
      }
      if (revenueByDate[key] !== undefined) {
        revenueByDate[key].revenue += order.total ?? 0;
        revenueByDate[key].orders += 1;
      }
    }
    const salesData = Object.entries(revenueByDate).map(([date, vals]) => ({
      date,
      ...vals
    }));
    const COLORS = ['#008060', '#2C6ECB', '#FFC453', '#8B5CF6', '#D82C0D', '#0891b2'];
    const categoriesRes = await medusaGet('/admin/product-categories?limit=6', authHeader, 'categories');
    const sportBreakdown = await Promise.all((categoriesRes.product_categories ?? []).slice(0, 6).map(async (cat: any, i: number) => {
      const res = await medusaGet(`/admin/products?limit=1&category_id[]=${encodeURIComponent(cat.id)}`, authHeader, `products for category ${cat.name}`);
      return {
        sport: cat.name,
        orders: res.count ?? 0,
        color: COLORS[i % COLORS.length]
      };
    }));
    const now = new Date();
    const thirtyDaysAgoBound = daysAgo(30);
    const sixtyDaysAgo = daysAgo(60);
    const allOrdersList = allOrdersForRevenue.orders ?? [];
    const currentPeriodOrders = allOrdersList.filter((o: any) => new Date(o.created_at) >= thirtyDaysAgoBound);
    const prevPeriodOrders = allOrdersList.filter((o: any) => {
      const d = new Date(o.created_at);
      return d >= sixtyDaysAgo && d < thirtyDaysAgoBound;
    });
    function paidRevenue(orders: any[]) {
      return orders.filter((o: any) => o.payment_status === 'captured' || o.payment_status === 'partially_captured').reduce((sum: number, o: any) => sum + (o.total ?? 0), 0);
    }
    function pctChange(curr: number, prev: number): number {
      if (prev === 0) return curr > 0 ? 100 : 0;
      return Math.round((curr - prev) / prev * 100);
    }
    const currRevenue = paidRevenue(currentPeriodOrders);
    const prevRevenue = paidRevenue(prevPeriodOrders);
    const totalRevenue = paidRevenue(allOrdersList);
    const currCustomers = new Set(currentPeriodOrders.map((o: any) => o.customer_id ?? o.email).filter(Boolean)).size;
    const prevCustomers = new Set(prevPeriodOrders.map((o: any) => o.customer_id ?? o.email).filter(Boolean)).size;
    return NextResponse.json({
      totalRevenue: totalRevenue,
      totalOrders: ordersRes.count,
      totalCustomers: customersRes.count,
      totalProducts: productsRes.count,
      revenueChange: pctChange(currRevenue, prevRevenue),
      ordersChange: pctChange(currentPeriodOrders.length, prevPeriodOrders.length),
      customersChange: pctChange(currCustomers, prevCustomers),
      productsChange: 0,
      salesData,
      sportBreakdown
    });
  } catch (err: any) {
    console.error('[API] stats error:', err);
    return NextResponse.json({
      error: err.message
    }, {
      status: 500
    });
  }
}
