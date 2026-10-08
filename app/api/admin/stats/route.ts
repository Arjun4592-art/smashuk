import { NextRequest, NextResponse } from 'next/server'
import { getAdminAuthHeader } from '@/lib/api/admin-auth'

const MEDUSA_URL =
  process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL ?? 'http://localhost:9000'

// The shop's own timezone. "Today" and every chart bucket are computed in
// this zone, NOT the server's (Vercel runs in UTC) and NOT the viewer's.
const SHOP_TZ = process.env.SHOP_TIMEZONE ?? 'Europe/London'

const DAY_MS = 86_400_000
const PAGE = 200
const MAX_ORDER_PAGES = 30 // safety cap: 6,000 orders per request

type Range = 'today' | 'last7' | 'last30' | 'last90' | 'thisyear'
const RANGES: Range[] = ['today', 'last7', 'last30', 'last90', 'thisyear']

/* ───────────────────────── timezone helpers ───────────────────────── */

const dtf = new Intl.DateTimeFormat('en-GB', {
  timeZone: SHOP_TZ,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  hourCycle: 'h23',
})

function parts(d: Date) {
  const p: Record<string, number> = {}
  for (const x of dtf.formatToParts(d)) {
    if (x.type !== 'literal') p[x.type] = Number(x.value)
  }
  return {
    y: p.year,
    m: p.month,
    d: p.day,
    h: p.hour,
    mi: p.minute,
    s: p.second,
  }
}

/** Offset (ms) of SHOP_TZ from UTC at the given instant. */
function tzOffset(d: Date) {
  const p = parts(d)
  const asUtc = Date.UTC(p.y, p.m - 1, p.d, p.h, p.mi, p.s)
  return asUtc - Math.floor(d.getTime() / 1000) * 1000
}

/** The instant at which the shop's calendar day y-m-d starts (00:00 local).
 *  Day/month overflow is fine (d = 0 → last day of previous month). */
function zonedMidnight(y: number, m: number, d: number): Date {
  const guess = Date.UTC(y, m - 1, d)
  const off1 = tzOffset(new Date(guess))
  let t = guess - off1
  const off2 = tzOffset(new Date(t))
  if (off2 !== off1) t = guess - off2
  return new Date(t)
}

/** Whole-day number of the shop-local calendar date of `d` (UTC-midnight based). */
function dayNumber(d: Date) {
  const p = parts(d)
  return Date.UTC(p.y, p.m - 1, p.d) / DAY_MS
}

const MONTHS = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
]
const dayLabel = (dn: number) => {
  const dt = new Date(dn * DAY_MS)
  return `${dt.getUTCDate()} ${MONTHS[dt.getUTCMonth()]}`
}

/* ───────────────────────── Medusa helpers ───────────────────────── */

async function medusaGet(path: string, authorization: string, label: string) {
  const res = await fetch(`${MEDUSA_URL}${path}`, {
    headers: { Authorization: authorization },
    cache: 'no-store',
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    throw new Error(
      `[${label}] ${data?.message ?? `Medusa request failed: ${res.status}`}`,
    )
  }
  return data
}

/** Pull orders newest-first until we pass `since`, so a filter on a short
 *  range doesn't depend on a hard-coded "first 500 orders" window. */
async function fetchOrdersSince(authorization: string, since: Date) {
  const fields =
    'id,display_id,customer_id,email,total,status,payment_status,created_at,*items'
  const out: any[] = []
  for (let page = 0; page < MAX_ORDER_PAGES; page++) {
    const data = await medusaGet(
      `/admin/orders?limit=${PAGE}&offset=${page * PAGE}&order=-created_at&fields=${encodeURIComponent(fields)}`,
      authorization,
      'orders',
    )
    const batch: any[] = data.orders ?? []
    out.push(...batch)
    if (batch.length < PAGE) break
    const oldest = new Date(batch[batch.length - 1].created_at)
    if (oldest < since) break
  }
  return out.filter((o) => new Date(o.created_at) >= since)
}

// product_id -> category names. 1,400+ products, so cache for a few minutes.
let catCache: { at: number; map: Map<string, string[]> } | null = null
async function productCategoryMap(authorization: string) {
  if (catCache && Date.now() - catCache.at < 5 * 60_000) return catCache.map
  const map = new Map<string, string[]>()
  const fields = 'id,*categories'
  const first = await medusaGet(
    `/admin/products?limit=500&offset=0&fields=${encodeURIComponent(fields)}`,
    authorization,
    'product categories',
  )
  const add = (list: any[]) => {
    for (const p of list ?? []) {
      map.set(
        p.id,
        (p.categories ?? []).map((c: any) => c.name).filter(Boolean),
      )
    }
  }
  add(first.products)
  const total: number = first.count ?? 0
  const rest: Promise<any>[] = []
  for (let off = 500; off < total; off += 500) {
    rest.push(
      medusaGet(
        `/admin/products?limit=500&offset=${off}&fields=${encodeURIComponent(fields)}`,
        authorization,
        'product categories',
      ),
    )
  }
  for (const r of await Promise.all(rest)) add(r.products)
  catCache = { at: Date.now(), map }
  return map
}

/* ───────────────────────── period maths ───────────────────────── */

interface Period {
  start: Date
  end: Date
  prevStart: Date
  prevEnd: Date
  label: string
  granularity: 'hourly' | 'daily' | 'weekly' | 'monthly'
}

function buildPeriod(range: Range, now: Date): Period {
  const t = parts(now)
  const todayStart = zonedMidnight(t.y, t.m, t.d)
  const mk = (n: number, label: string): Period => {
    const start = zonedMidnight(t.y, t.m, t.d - (n - 1))
    return {
      start,
      end: now,
      prevStart: zonedMidnight(t.y, t.m, t.d - (2 * n - 1)),
      prevEnd: start,
      label,
      granularity: n <= 30 ? 'daily' : 'weekly',
    }
  }
  switch (range) {
    case 'today': {
      const elapsed = now.getTime() - todayStart.getTime()
      const yStart = zonedMidnight(t.y, t.m, t.d - 1)
      return {
        start: todayStart,
        end: now,
        prevStart: yStart,
        // Compare "today so far" with "yesterday up to the same time".
        prevEnd: new Date(yStart.getTime() + elapsed),
        label: 'vs yesterday (same time)',
        granularity: 'hourly',
      }
    }
    case 'last7':
      return mk(7, 'vs previous 7 days')
    case 'last90':
      return mk(90, 'vs previous 90 days')
    case 'thisyear': {
      const start = zonedMidnight(t.y, 1, 1)
      return {
        start,
        end: now,
        prevStart: zonedMidnight(t.y - 1, 1, 1),
        prevEnd: zonedMidnight(t.y - 1, t.m, t.d + 1),
        label: 'vs same period last year',
        granularity: 'monthly',
      }
    }
    case 'last30':
    default:
      return mk(30, 'vs previous 30 days')
  }
}

const isPaid = (o: any) =>
  o.payment_status === 'captured' || o.payment_status === 'partially_captured'
// Cancelled / draft orders are not real sales.
const isLive = (o: any) => o.status !== 'canceled' && o.status !== 'draft'

function pctChange(curr: number, prev: number): number {
  if (prev === 0) return curr > 0 ? 100 : 0
  return Math.round(((curr - prev) / prev) * 100)
}

function summarise(orders: any[]) {
  const live = orders.filter(isLive)
  const revenue = live
    .filter(isPaid)
    .reduce((s, o) => s + (Number(o.total) || 0), 0)
  const buyers = new Set(
    live.map((o) => o.customer_id ?? o.email).filter(Boolean),
  )
  return { live, revenue, orders: live.length, customers: buyers.size }
}

/* ───────────────────────── handler ───────────────────────── */

export async function GET(req: NextRequest) {
  const authHeader = await getAdminAuthHeader(req)
  if (!authHeader) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(req.url)
  const rawRange = searchParams.get('range') ?? 'last30'
  const range: Range = (RANGES as string[]).includes(rawRange)
    ? (rawRange as Range)
    : 'last30'

  try {
    const now = new Date()
    const period = buildPeriod(range, now)

    const [allInPeriods, productsRes, categoryMap] = await Promise.all([
      fetchOrdersSince(authHeader, period.prevStart),
      medusaGet(
        `/admin/products?limit=1&status[]=published`,
        authHeader,
        'products count',
      ),
      productCategoryMap(authHeader).catch((e) => {
        console.error('[API] stats: category map failed', e)
        return new Map<string, string[]>()
      }),
    ])

    const current = allInPeriods.filter((o) => {
      const d = new Date(o.created_at)
      return d >= period.start && d <= period.end
    })
    const previous = allInPeriods.filter((o) => {
      const d = new Date(o.created_at)
      return d >= period.prevStart && d < period.prevEnd
    })

    const cur = summarise(current)
    const prev = summarise(previous)

    /* ── chart buckets ── */
    const startDay = dayNumber(period.start)
    const todayDay = dayNumber(now)
    type Bucket = { date: string; revenue: number | null; orders: number }
    const buckets: Bucket[] = []
    let bucketOf: (d: Date) => number

    if (period.granularity === 'hourly') {
      const nowHour = parts(now).h
      for (let h = 0; h < 24; h++) {
        buckets.push({
          date: `${String(h).padStart(2, '0')}:00`,
          // Hours that haven't happened yet are left empty, not £0.
          revenue: h <= nowHour ? 0 : null,
          orders: 0,
        })
      }
      bucketOf = (d) => parts(d).h
    } else if (period.granularity === 'daily') {
      const n = todayDay - startDay + 1
      for (let i = 0; i < n; i++) {
        buckets.push({ date: dayLabel(startDay + i), revenue: 0, orders: 0 })
      }
      bucketOf = (d) => dayNumber(d) - startDay
    } else if (period.granularity === 'weekly') {
      const n = todayDay - startDay + 1
      const weeks = Math.ceil(n / 7)
      for (let w = 0; w < weeks; w++) {
        buckets.push({
          date: dayLabel(startDay + w * 7),
          revenue: 0,
          orders: 0,
        })
      }
      bucketOf = (d) => Math.floor((dayNumber(d) - startDay) / 7)
    } else {
      const nowMonth = parts(now).m
      for (let m = 0; m < nowMonth; m++) {
        buckets.push({ date: MONTHS[m], revenue: 0, orders: 0 })
      }
      bucketOf = (d) => parts(d).m - 1
    }

    for (const o of cur.live) {
      if (!isPaid(o)) continue
      const i = bucketOf(new Date(o.created_at))
      const b = buckets[i]
      if (!b) continue
      b.revenue = (b.revenue ?? 0) + (Number(o.total) || 0)
      b.orders += 1
    }

    /* ── orders by category (orders that contain ≥1 item of the category) ── */
    const COLORS = [
      '#008060',
      '#2C6ECB',
      '#FFC453',
      '#8B5CF6',
      '#D82C0D',
      '#0891b2',
      '#DB2777',
      '#65A30D',
    ]
    const perCategory = new Map<string, number>()
    for (const o of cur.live) {
      const seen = new Set<string>()
      for (const it of o.items ?? []) {
        for (const c of categoryMap.get(it.product_id) ?? []) seen.add(c)
      }
      seen.forEach((c) => perCategory.set(c, (perCategory.get(c) ?? 0) + 1))
    }
    const sportBreakdown = Array.from(perCategory.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([sport, orders], i) => ({
        sport,
        orders,
        color: COLORS[i % COLORS.length],
      }))

    /* ── top products in the selected range ── */
    const prodMap = new Map<
      string,
      { id: string; name: string; sold: number; revenue: number }
    >()
    for (const o of cur.live) {
      for (const it of o.items ?? []) {
        const id = it.product_id ?? it.title
        const row = prodMap.get(id) ?? {
          id,
          name: it.product_title ?? it.title ?? 'Item',
          sold: 0,
          revenue: 0,
        }
        row.sold += Number(it.quantity) || 0
        row.revenue += (Number(it.unit_price) || 0) * (Number(it.quantity) || 0)
        prodMap.set(id, row)
      }
    }
    const topProducts = Array.from(prodMap.values())
      .sort((a, b) => b.sold - a.sold)
      .slice(0, 4)

    return NextResponse.json({
      range,
      comparisonLabel: period.label,
      granularity: period.granularity,
      // Everything below is for the SELECTED range, not all-time.
      totalRevenue: cur.revenue,
      totalOrders: cur.orders,
      totalCustomers: cur.customers,
      totalProducts: productsRes.count ?? 0,
      revenueChange: pctChange(cur.revenue, prev.revenue),
      ordersChange: pctChange(cur.orders, prev.orders),
      customersChange: pctChange(cur.customers, prev.customers),
      productsChange: 0,
      salesData: buckets,
      sportBreakdown,
      topProducts,
    })
  } catch (err: any) {
    console.error('[API] stats error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
