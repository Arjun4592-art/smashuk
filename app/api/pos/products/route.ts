import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { SURFACE_COOKIES } from '@/lib/api/auth-cookie'
import { medusaServiceFetch } from '@/lib/api/medusa-service-token'
import { inferSellingChannel } from '@/lib/api/selling-channels-client'
async function requirePosSession(): Promise<boolean> {
  const cookieStore = await cookies()
  const posToken = cookieStore.get(SURFACE_COOKIES.pos.tokenCookie)?.value
  const dashboardToken = cookieStore.get(
    SURFACE_COOKIES.dashboard.tokenCookie,
  )?.value
  return Boolean(posToken || dashboardToken)
}
const PRODUCT_FIELDS =
  'id,title,description,thumbnail,status,*categories,*images,*variants,*variants.prices,variants.sku,variants.id,variants.title,*variants.options,variants.options.value,*variants.options.option,variants.options.option.title,*variants.inventory_items,*variants.inventory_items.inventory,*variants.inventory_items.inventory.location_levels,*sales_channels'
const PAGE_SIZE = 200
export async function GET() {
  if (!(await requirePosSession())) {
    return NextResponse.json(
      {
        error: 'Unauthorized',
      },
      {
        status: 401,
      },
    )
  }
  try {
    // The store has grown past a single page of results — a flat
    // `limit=200` cut the catalog off there and silently dropped every
    // product after it from the POS (no error, they just never showed up
    // in search, filters, or scanning). Page through everything Medusa has.
    const allProducts: any[] = []
    let offset = 0
    while (true) {
      const response = await medusaServiceFetch(
        `/admin/products?limit=${PAGE_SIZE}&offset=${offset}&status[]=published&fields=${PRODUCT_FIELDS}`,
      )
      if (!response.ok) {
        const errText = await response.text()
        console.error('[POS] Medusa API error:', response.status, errText)
        return NextResponse.json(
          {
            error: `Medusa error: ${response.status}`,
            details: errText,
          },
          {
            status: response.status,
          },
        )
      }
      const data = await response.json()
      const page = data.products ?? []
      allProducts.push(...page)
      const count =
        typeof data.count === 'number' ? data.count : allProducts.length
      offset += page.length
      if (page.length === 0 || offset >= count) break
    }
    const products = allProducts.filter(
      (p: any) => inferSellingChannel(p.sales_channels) !== 'website',
    )
    return NextResponse.json({
      products,
    })
  } catch (err: any) {
    console.error('[POS] Products route error:', err.message)
    return NextResponse.json(
      {
        error: err.message || 'Internal server error',
      },
      {
        status: 500,
      },
    )
  }
}
