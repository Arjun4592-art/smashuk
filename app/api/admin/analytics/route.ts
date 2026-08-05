import { NextRequest, NextResponse } from 'next/server'
import { getAdminAuthHeader } from '@/lib/api/admin-auth'
import { safeJson } from '@/lib/api/safe-json'

const MEDUSA_URL = process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const range = searchParams.get('range') ?? 'last30'
  const authorization = (await getAdminAuthHeader(req)) ?? ''

  if (!authorization) {
    return NextResponse.json(
      { error: 'Missing Authorization header' },
      { status: 401 },
    )
  }

  try {
    const now = new Date()
    const startDate = new Date()
    if (range === 'today') startDate.setHours(0, 0, 0, 0)
    else if (range === 'last7') startDate.setDate(now.getDate() - 7)
    else if (range === 'last30') startDate.setDate(now.getDate() - 30)
    else if (range === 'last90') startDate.setDate(now.getDate() - 90)
    else if (range === 'thisyear') startDate.setMonth(0, 1)

    // BUG FIX: "Orders by Sport" always showed 100% "Others" — the default
    // /admin/orders response only expands each item's own scalar fields
    // (title, quantity, unit_price), not two levels deep into
    // item.variant.product.metadata, which is where `sport` actually
    // lives. Without an explicit `fields` param Medusa never sends that
    // nested data at all, so `item.variant?.product?.metadata?.sport`
    // was always undefined and fell back to 'Others' for every single
    // item. Also explicitly requesting email/customer_id here (rather
    // than relying on whatever the default field set happens to include)
    // so unique-customer counting below has something to key on.
    const res = await fetch(
      `${MEDUSA_URL}/admin/orders?limit=500&payment_status[]=captured&fields=id,display_id,email,customer_id,total,created_at,shipping_address.city,*items,items.variant.product.metadata`,
      { headers: { Authorization: authorization } },
    )
    const data = await safeJson(res, 'app/api/admin/analytics/route.ts')
    if (!res.ok)
      return NextResponse.json({ error: data.message }, { status: res.status })

    const allOrders = data.orders ?? []
    const orders = allOrders.filter((o: any) => {
      const d = new Date(o.created_at)
      return d >= startDate && d <= now
    })

    const totalRevenue =
      orders.reduce((sum: number, o: any) => sum + (o.total ?? 0), 0)
    const uniqueCustomers = new Set(
      orders.map((o: any) => o.customer_id ?? o.email).filter(Boolean),
    ).size
    const avgOrderValue = orders.length > 0 ? totalRevenue / orders.length : 0

    const buckets = {} as Record<
      string,
      { revenue: number; orders: number; customers: Set<string> }
    >
    orders.forEach((o: any) => {
      const d = new Date(o.created_at)
      let key = ''
      if (range === 'today') {
        key = `${d.getHours()}:00`
      } else if (range === 'thisyear' || range === 'last90') {
        key = d.toLocaleDateString('en-GB', { month: 'short' })
      } else {
        key = d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
      }
      if (!buckets[key])
        buckets[key] = { revenue: 0, orders: 0, customers: new Set() }
      buckets[key].revenue += (o.total ?? 0)
      buckets[key].orders += 1
      const cid = o.customer_id ?? o.email
      if (cid) buckets[key].customers.add(cid)
    })

    const chartData = Object.entries(buckets).map(([label, b]) => ({
      label,
      revenue: Math.round(b.revenue),
      orders: b.orders,
      customers: b.customers.size,
    }))

    const productMap = {} as Record<
      string,
      { name: string; sold: number; revenue: number }
    >
    orders.forEach((o: any) => {
      ;(o.items ?? []).forEach((item: any) => {
        const id = item.variant?.product_id ?? item.product_id ?? item.id
        const name = item.title ?? 'Unknown'
        if (!productMap[id]) productMap[id] = { name, sold: 0, revenue: 0 }
        productMap[id].sold += item.quantity ?? 0
        productMap[id].revenue +=
          (item.unit_price ?? 0) * (item.quantity ?? 0)
      })
    })

    const topProducts = Object.entries(productMap)
      .map(([, p], idx) => ({
        rank: idx + 1,
        name: p.name,
        sold: p.sold,
        revenue: Math.round(p.revenue),
        growth: 0,
      }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5)
      .map((p, i) => ({ ...p, rank: i + 1 }))

    const cityMap = {} as Record<string, { orders: number; revenue: number }>
    orders.forEach((o: any) => {
      const city = o.shipping_address?.city ?? 'Unknown'
      if (!cityMap[city]) cityMap[city] = { orders: 0, revenue: 0 }
      cityMap[city].orders += 1
      cityMap[city].revenue += (o.total ?? 0)
    })

    const sortedCities = Object.entries(cityMap)
      .map(([city, d]) => ({ city, orders: d.orders, revenue: d.revenue }))
      .sort((a, b) => b.revenue - a.revenue)

    const topCities = sortedCities.slice(0, 5)
    const othersRevenue = sortedCities
      .slice(5)
      .reduce((s, c) => s + c.revenue, 0)
    const othersOrders = sortedCities.slice(5).reduce((s, c) => s + c.orders, 0)
    const totalCityRevenue = sortedCities.reduce((s, c) => s + c.revenue, 0)

    const citiesData = [
      ...topCities.map((c) => ({
        city: c.city,
        orders: c.orders,
        revenue: Math.round(c.revenue),
        pct:
          totalCityRevenue > 0
            ? Math.round((c.revenue / totalCityRevenue) * 100)
            : 0,
      })),
      ...(othersRevenue > 0
        ? [
            {
              city: 'Others',
              orders: othersOrders,
              revenue: Math.round(othersRevenue),
              pct:
                totalCityRevenue > 0
                  ? Math.round((othersRevenue / totalCityRevenue) * 100)
                  : 0,
            },
          ]
        : []),
    ]

    // BUG FIX: sport names were grouped by raw string ("badminton" vs
    // "Badminton" — same sport, different casing coming from different
    // product entries) so the same sport split into two separate pie
    // slices. Normalize to a single canonical capitalised label before
    // grouping so they merge into one.
    function normalizeSport(raw: string) {
      const trimmed = raw.trim()
      if (!trimmed) return 'Others'
      return trimmed.charAt(0).toUpperCase() + trimmed.slice(1).toLowerCase()
    }

    const sportMap = {} as Record<string, number>
    orders.forEach((o: any) => {
      ;(o.items ?? []).forEach((item: any) => {
        const sport = normalizeSport(
          item.variant?.product?.metadata?.sport ??
            item.metadata?.sport ??
            'Others',
        )
        sportMap[sport] = (sportMap[sport] ?? 0) + (item.quantity ?? 0)
      })
    })

    // BUG FIX: these colors were keyed to a generic multi-sport store
    // (Football/Cricket/Running/Tennis/Boxing) that doesn't match any
    // category this store actually sells (badminton/tennis/padel/squash —
    // see lib/mega-menu-data.ts). Every slice fell back to the same grey
    // '#8C9196', making the whole donut look monochrome. Use this store's
    // real sports with distinct brand-appropriate colors instead.
    const SPORT_COLORS = {
      Badminton: '#008060',
      Tennis: '#2C6ECB',
      Padel: '#FFC453',
      Squash: '#8B5CF6',
      Pickleball: '#D82C0D',
      Clothing: '#F4A261',
      Others: '#8C9196',
    } as Record<string, string>

    const sportData = Object.entries(sportMap)
      .map(([name, value]) => ({
        name,
        value,
        color: SPORT_COLORS[name] ?? '#8C9196',
      }))
      .sort((a, b) => b.value - a.value)

    return NextResponse.json({
      stats: {
        totalRevenue: Math.round(totalRevenue),
        totalOrders: orders.length,
        uniqueCustomers,
        avgOrderValue: Math.round(avgOrderValue),
      },
      chartData,
      topProducts,
      citiesData,
      sportData,
    })
  } catch (err: any) {
    console.error('[API] analytics error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
