import { NextRequest, NextResponse } from 'next/server'
import { medusaServiceFetch } from '@/lib/api/medusa-service-token'
import {
  GOOGLE_STORE_CODE,
  findSalesChannelId,
  googleOfferId,
  listAdminProducts,
} from '@/lib/google-merchant'

// Local inventory feed for Google Merchant Center (free local listings /
// local inventory ads). One row per variant sold in the physical store.
//
// Merchant Center setup: Products > Data sources > Add product source >
// Local inventory > Scheduled fetch, URL:
//   https://smashuk.co/api/feeds/google-local-inventory?key=<GOOGLE_FEED_KEY>
// Format: tab-separated (.tsv). Fetch daily or more often.
//
// Env: GOOGLE_STORE_CODE (Business Profile store code), GOOGLE_FEED_KEY
// (shared secret), optional GOOGLE_STORE_LOCATION_ID (defaults to the first
// stock location, same as the rest of this app).

export const dynamic = 'force-dynamic'

const FIELDS =
  'id,status,+metadata,*sales_channels,*variants,*variants.prices,*variants.inventory_items,*variants.inventory_items.inventory.location_levels'

async function resolveLocationId(): Promise<string | null> {
  if (process.env.GOOGLE_STORE_LOCATION_ID) {
    return process.env.GOOGLE_STORE_LOCATION_ID
  }
  const res = await medusaServiceFetch(
    '/admin/stock-locations?limit=1&fields=id',
  )
  if (!res.ok) return null
  const data = await res.json()
  return data.stock_locations?.[0]?.id ?? null
}

// Units of this variant that can be sold from the given stock location.
// stocked - reserved per inventory item, divided by how many of that item one
// variant consumes; a variant made of several items is limited by the scarcest.
function availableQuantity(variant: any, locationId: string): number | null {
  if (variant.manage_inventory === false) return null // never runs out
  const links: any[] = variant.inventory_items ?? []
  if (links.length === 0) return 0
  let min = Infinity
  for (const link of links) {
    const levels: any[] = link.inventory?.location_levels ?? []
    const level = levels.find((l) => l.location_id === locationId)
    const available = level
      ? Math.max(
          0,
          (level.stocked_quantity ?? 0) - (level.reserved_quantity ?? 0),
        )
      : 0
    const perVariant = Math.max(1, link.required_quantity ?? 1)
    min = Math.min(min, Math.floor(available / perVariant))
  }
  return Number.isFinite(min) ? min : 0
}

// Same price logic as the online feed, so local and online prices agree.
function priceFields(
  product: any,
  variant: any,
): { price: string; sale: string } {
  const gbp = (variant.prices ?? []).find((p: any) => p.currency_code === 'gbp')
  if (gbp?.amount == null) return { price: '', sale: '' }
  const current = Number(gbp.amount)
  const compareAt = product.metadata?.compare_at_price
    ? Number(product.metadata.compare_at_price)
    : product.metadata?.originalPrice
      ? Number(product.metadata.originalPrice) / 100
      : undefined
  const onSale = typeof compareAt === 'number' && compareAt > current
  return {
    price: `${(onSale ? compareAt : current).toFixed(2)} GBP`,
    sale: onSale ? `${current.toFixed(2)} GBP` : '',
  }
}

const clean = (v: string) => v.replace(/[\t\r\n]/g, ' ')

export async function GET(req: NextRequest) {
  const feedKey = process.env.GOOGLE_FEED_KEY
  if (!feedKey) {
    return new NextResponse('GOOGLE_FEED_KEY is not configured', {
      status: 503,
    })
  }
  if (req.nextUrl.searchParams.get('key') !== feedKey) {
    return new NextResponse('Unauthorized', { status: 401 })
  }
  if (!GOOGLE_STORE_CODE) {
    return new NextResponse('GOOGLE_STORE_CODE is not configured', {
      status: 503,
    })
  }

  try {
    const [locationId, storeChannelId, websiteChannelId] = await Promise.all([
      resolveLocationId(),
      findSalesChannelId('Store'),
      findSalesChannelId('Website'),
    ])
    if (!locationId || !storeChannelId) {
      return new NextResponse(
        'Stock location or Store sales channel not found',
        {
          status: 500,
        },
      )
    }

    const products = await listAdminProducts({
      sales_channel_id: storeChannelId,
      fields: FIELDS,
    })

    const rows = ['id\tstore_code\tavailability\tquantity\tprice\tsale_price']
    for (const product of products) {
      if (product.status !== 'published') continue
      // Local inventory only works for items that also exist in the online
      // product feed, which is built from the Website channel.
      const onWebsite =
        !websiteChannelId ||
        (product.sales_channels ?? []).some(
          (c: any) => c.id === websiteChannelId,
        )
      if (!onWebsite) continue

      for (const variant of product.variants ?? []) {
        const qty = availableQuantity(variant, locationId)
        const inStock = qty === null || qty > 0
        const { price, sale } = priceFields(product, variant)
        rows.push(
          [
            clean(googleOfferId(variant)),
            clean(GOOGLE_STORE_CODE),
            inStock ? 'in stock' : 'out of stock',
            qty === null ? '' : String(qty),
            price,
            sale,
          ].join('\t'),
        )
      }
    }

    return new NextResponse(rows.join('\n') + '\n', {
      headers: {
        'Content-Type': 'text/tab-separated-values; charset=utf-8',
        'Cache-Control': 'private, no-store',
        'X-Robots-Tag': 'noindex',
      },
    })
  } catch (err: any) {
    console.error('[feeds/google-local-inventory]', err)
    return new NextResponse('Feed generation failed', { status: 500 })
  }
}
