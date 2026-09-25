import { NextRequest, NextResponse } from 'next/server'
import { getAdminAuthHeader } from '@/lib/api/admin-auth'
import { safeJson } from '@/lib/api/safe-json'

const MEDUSA_URL = process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL

type Channel = 'website' | 'pos'

/**
 * GET /api/admin/reports/profit
 *
 * Query params:
 *  - range: today | last7 | last30 | last90 | thisyear (default last30)
 *  - channel: all | website | pos (default all)
 *  - category: product_category id (optional)
 *  - productId: medusa product id (optional)
 *
 * Returns a gross-profit / gross-margin breakdown that mirrors what
 * Shopify's "Profit" report shows: revenue, cost of goods sold (from
 * product.metadata.cost_price), gross profit and margin — split by
 * sales channel (website vs POS) and by product, filterable by
 * category/product.
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const range = searchParams.get('range') ?? 'last30'
  const channelFilter = (searchParams.get('channel') ?? 'all') as
    'all' | Channel
  const categoryFilter = searchParams.get('category') ?? ''
  const productFilter = searchParams.get('productId') ?? ''

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

    // 1. Orders (paid only) in range, with line items.
    const ordersRes = await fetch(
      `${MEDUSA_URL}/admin/orders?limit=500&payment_status[]=captured&fields=id,display_id,total,created_at,+metadata,*items,items.variant_id,items.product_id,+items.variant_sku,+items.variant.metadata`,
      { headers: { Authorization: authorization } },
    )
    const ordersData = await safeJson(ordersRes, 'reports/profit (orders)')
    if (!ordersRes.ok) {
      return NextResponse.json(
        { error: ordersData.message ?? ordersData.error },
        { status: ordersRes.status },
      )
    }
    const orders = (ordersData.orders ?? []).filter((o: any) => {
      const d = new Date(o.created_at)
      return d >= startDate && d <= now
    })

    // 2. Products (all) with cost_price + category, paginated.
    const productInfoById: Record<
      string,
      {
        name: string
        sku: string
        costPrice: number
        categoryId: string
        categoryName: string
      }
    > = {}
    const variantInfoById: Record<string, { sku: string; costPrice: number }> =
      {}
    {
      let offset = 0
      const limit = 200
      let total = Infinity
      while (offset < total) {
        const params = new URLSearchParams({
          limit: String(limit),
          offset: String(offset),
          fields: 'id,title,+metadata,*categories,*variants,+variants.metadata',
        })
        const pRes = await fetch(`${MEDUSA_URL}/admin/products?${params}`, {
          headers: { Authorization: authorization },
        })
        if (!pRes.ok) break
        const pData = await safeJson(pRes, 'reports/profit (products)')
        total = pData.count ?? 0
        ;(pData.products ?? []).forEach((p: any) => {
          const variants = p.variants ?? []
          const skus = variants.map((v: any) => v.sku).filter(Boolean)
          // Product-level cost_price (set via the dashboard's "add product"
          // form) — used as a fallback for products with no per-variant cost.
          const productLevelCost = Number(p.metadata?.cost_price ?? 0)
          productInfoById[p.id] = {
            name: p.title,
            sku: skus.join(', '),
            costPrice: productLevelCost,
            categoryId: p.categories?.[0]?.id ?? '',
            categoryName: p.categories?.[0]?.name ?? 'Uncategorised',
          }
          // Per-variant cost_price — this is where the Shopify CSV importer
          // (scripts/import-shopify-csv.ts) actually stores "Cost per item",
          // so most imported products only have cost data here, not on the
          // product itself.
          variants.forEach((v: any) => {
            const variantCost = Number(v.metadata?.cost_price ?? NaN)
            variantInfoById[v.id] = {
              sku: v.sku ?? '',
              costPrice: !isNaN(variantCost) ? variantCost : productLevelCost,
            }
          })
        })
        offset += limit
      }
    }

    function channelOf(o: any): Channel {
      return o.metadata?.source === 'pos' ? 'pos' : 'website'
    }

    type ProductAgg = {
      productId: string
      name: string
      sku: string
      categoryId: string
      categoryName: string
      unitsSold: number
      revenue: number
      cost: number
      grossProfit: number
      website: { revenue: number; cost: number; grossProfit: number }
      pos: { revenue: number; cost: number; grossProfit: number }
    }
    const byProduct: Record<string, ProductAgg> = {}
    const totals = {
      revenue: 0,
      cost: 0,
      grossProfit: 0,
      website: { revenue: 0, cost: 0, grossProfit: 0 },
      pos: { revenue: 0, cost: 0, grossProfit: 0 },
    }

    orders.forEach((o: any) => {
      const channel = channelOf(o)
      if (channelFilter !== 'all' && channel !== channelFilter) return
      ;(o.items ?? []).forEach((item: any) => {
        const productId: string =
          item.product_id ?? item.variant?.product_id ?? item.id
        const info = productInfoById[productId]
        if (categoryFilter && info?.categoryId !== categoryFilter) return
        if (productFilter && productId !== productFilter) return

        const variantId: string | undefined =
          item.variant_id ?? item.variant?.id
        const variantInfo = variantId ? variantInfoById[variantId] : undefined
        // Direct cost/sku from the order line item itself, in case this
        // variant was deleted/changed after the order was placed and is no
        // longer in the current products fetch.
        const itemVariantCost = Number(item.variant?.metadata?.cost_price)
        const itemVariantSku: string | undefined = item.variant_sku

        // Prefer the specific variant's cost (this is where Shopify-imported
        // products actually keep "Cost per item"); fall back to the
        // product-level cost_price for manually-created products.
        const unitCost =
          variantInfo?.costPrice ??
          (!isNaN(itemVariantCost) ? itemVariantCost : undefined) ??
          info?.costPrice ??
          0

        const qty = item.quantity ?? 0
        const lineRevenue = (item.unit_price ?? 0) * qty
        const lineCost = unitCost * qty
        const lineProfit = lineRevenue - lineCost

        if (!byProduct[productId]) {
          byProduct[productId] = {
            productId,
            name: info?.name ?? item.title ?? 'Unknown product',
            sku: info?.sku || variantInfo?.sku || itemVariantSku || '',
            categoryId: info?.categoryId ?? '',
            categoryName: info?.categoryName ?? 'Uncategorised',
            unitsSold: 0,
            revenue: 0,
            cost: 0,
            grossProfit: 0,
            website: { revenue: 0, cost: 0, grossProfit: 0 },
            pos: { revenue: 0, cost: 0, grossProfit: 0 },
          }
        }
        const agg = byProduct[productId]
        agg.unitsSold += qty
        agg.revenue += lineRevenue
        agg.cost += lineCost
        agg.grossProfit += lineProfit
        agg[channel].revenue += lineRevenue
        agg[channel].cost += lineCost
        agg[channel].grossProfit += lineProfit

        totals.revenue += lineRevenue
        totals.cost += lineCost
        totals.grossProfit += lineProfit
        totals[channel].revenue += lineRevenue
        totals[channel].cost += lineCost
        totals[channel].grossProfit += lineProfit
      })
    })

    const round = (n: number) => Math.round(n * 100) / 100
    const margin = (profit: number, revenue: number) =>
      revenue > 0 ? round((profit / revenue) * 100) : 0

    const products = Object.values(byProduct)
      .map((p) => ({
        productId: p.productId,
        name: p.name,
        sku: p.sku,
        category: p.categoryName,
        unitsSold: p.unitsSold,
        revenue: round(p.revenue),
        cost: round(p.cost),
        grossProfit: round(p.grossProfit),
        margin: margin(p.grossProfit, p.revenue),
        website: {
          revenue: round(p.website.revenue),
          cost: round(p.website.cost),
          grossProfit: round(p.website.grossProfit),
        },
        pos: {
          revenue: round(p.pos.revenue),
          cost: round(p.pos.cost),
          grossProfit: round(p.pos.grossProfit),
        },
      }))
      .sort((a, b) => b.grossProfit - a.grossProfit)

    const categoryMap: Record<
      string,
      { category: string; revenue: number; cost: number; grossProfit: number }
    > = {}
    Object.values(byProduct).forEach((p) => {
      const key = p.categoryId || 'uncategorised'
      if (!categoryMap[key]) {
        categoryMap[key] = {
          category: p.categoryName,
          revenue: 0,
          cost: 0,
          grossProfit: 0,
        }
      }
      categoryMap[key].revenue += p.revenue
      categoryMap[key].cost += p.cost
      categoryMap[key].grossProfit += p.grossProfit
    })
    const byCategory = Object.values(categoryMap)
      .map((c) => ({
        category: c.category,
        revenue: round(c.revenue),
        cost: round(c.cost),
        grossProfit: round(c.grossProfit),
        margin: margin(c.grossProfit, c.revenue),
      }))
      .sort((a, b) => b.grossProfit - a.grossProfit)

    return NextResponse.json({
      range,
      summary: {
        revenue: round(totals.revenue),
        cost: round(totals.cost),
        grossProfit: round(totals.grossProfit),
        margin: margin(totals.grossProfit, totals.revenue),
        website: {
          revenue: round(totals.website.revenue),
          cost: round(totals.website.cost),
          grossProfit: round(totals.website.grossProfit),
          margin: margin(totals.website.grossProfit, totals.website.revenue),
        },
        pos: {
          revenue: round(totals.pos.revenue),
          cost: round(totals.pos.cost),
          grossProfit: round(totals.pos.grossProfit),
          margin: margin(totals.pos.grossProfit, totals.pos.revenue),
        },
      },
      byCategory,
      products,
    })
  } catch (err: any) {
    console.error('[API] reports/profit error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
