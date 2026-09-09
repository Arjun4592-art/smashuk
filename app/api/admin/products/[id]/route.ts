import { NextRequest, NextResponse } from 'next/server'
import { getAdminAuthHeader } from '@/lib/api/admin-auth'
import { resolveSalesChannels } from '@/lib/api/selling-channels'
import { syncVariantInventory } from '@/lib/api/inventory-sync'
const MEDUSA_URL =
  process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL ?? 'http://localhost:9000'
async function safeJson(res: Response) {
  const text = await res.text()
  if (!text) return {}
  try {
    return JSON.parse(text)
  } catch {
    return {
      message: text.slice(0, 300),
    }
  }
}
export async function GET(
  req: NextRequest,
  {
    params,
  }: {
    params: Promise<{
      id: string
    }>
  },
) {
  try {
    const { id } = await params
    const authorization = (await getAdminAuthHeader(req)) ?? ''
    if (!authorization) {
      return NextResponse.json(
        {
          error: 'Missing Authorization header',
        },
        {
          status: 401,
        },
      )
    }
    const res = await fetch(
      `${MEDUSA_URL}/admin/products/${id}?fields=+metadata,*variants,+variants.metadata,*variants.prices,*variants.inventory_items,*variants.inventory_items.inventory.location_levels,*variants.options,*variants.options.option,*variants.images,*categories,*images,*options,*options.values,*sales_channels,*tags`,
      {
        headers: {
          Authorization: authorization,
        },
      },
    )
    const data = await safeJson(res)
    // Medusa's `fields` expansion here returns the raw location_levels rows,
    // not the computed `inventory_quantity` the dashboard form reads — so
    // derive it ourselves (stocked - reserved, summed across locations) and
    // attach it to each variant. Without this every Stock field in the
    // dashboard reads as blank even when stock genuinely exists.
    if (data?.product?.variants) {
      data.product.variants = data.product.variants.map((v: any) => {
        const levels = v.inventory_items?.[0]?.inventory?.location_levels ?? []
        const inventory_quantity = levels.reduce(
          (sum: number, l: any) =>
            sum + ((l.stocked_quantity ?? 0) - (l.reserved_quantity ?? 0)),
          0,
        )
        return { ...v, inventory_quantity }
      })
    }
    return NextResponse.json(data, {
      status: res.status,
    })
  } catch (err: any) {
    console.error('[GET product]', err)
    return NextResponse.json(
      {
        error: err.message,
      },
      {
        status: 500,
      },
    )
  }
}
export async function PATCH(
  req: NextRequest,
  {
    params,
  }: {
    params: Promise<{
      id: string
    }>
  },
) {
  try {
    const { id } = await params
    const body = await req.json()
    const authorization = (await getAdminAuthHeader(req)) ?? ''
    if (!authorization) {
      return NextResponse.json(
        {
          error: 'Missing Authorization header',
        },
        {
          status: 401,
        },
      )
    }
    const stockQty: number = body._stock ?? 0
    const variantStocks: Record<string, number> = body._variantStocks ?? {}
    delete body._stock
    delete body._variantStocks
    if (body.selling_channel) {
      const channels = await resolveSalesChannels(
        body.selling_channel,
        authorization,
        MEDUSA_URL,
      )
      if (channels) body.sales_channels = channels
    }
    delete body.selling_channel
    if (Array.isArray(body.variants)) {
      body.variants = body.variants.map((v: any) => {
        if (!v || !Array.isArray(v.images)) return v
        const urls = v.images.map((img: any) => img.url).filter(Boolean)
        const { images, ...rest } = v
        return {
          ...rest,
          metadata: {
            ...(rest.metadata || {}),
            variant_images: urls,
          },
        }
      })
    }
    const res = await fetch(`${MEDUSA_URL}/admin/products/${id}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: authorization,
      },
      body: JSON.stringify(body),
    })
    const data = await safeJson(res)
    if (res.ok && data.product?.id) {
      try {
        const locRes = await fetch(
          `${MEDUSA_URL}/admin/stock-locations?limit=1`,
          {
            headers: { Authorization: authorization },
          },
        )
        const locData = await safeJson(locRes)
        const locationId = locData.stock_locations?.[0]?.id
        if (!locationId) {
          console.warn(
            '[PATCH product] No stock location found — inventory not set.',
          )
        } else {
          // stockQty is a fallback default when a variant has no
          // variant-specific quantity in the payload (e.g. single-variant edits).
          await syncVariantInventory(
            data.product.id,
            authorization,
            locationId,
            variantStocks,
            stockQty,
          )
        }
      } catch (invErr: any) {
        console.warn(
          '[PATCH product] Inventory set error (non-fatal):',
          invErr.message,
        )
      }
    }
    return NextResponse.json(data, {
      status: res.status,
    })
  } catch (err: any) {
    console.error('[PATCH product]', err)
    return NextResponse.json(
      {
        error: err.message,
      },
      {
        status: 500,
      },
    )
  }
}
export async function DELETE(
  req: NextRequest,
  {
    params,
  }: {
    params: Promise<{
      id: string
    }>
  },
) {
  try {
    const { id } = await params
    const authorization = (await getAdminAuthHeader(req)) ?? ''
    if (!authorization) {
      return NextResponse.json(
        {
          error: 'Missing Authorization header',
        },
        {
          status: 401,
        },
      )
    }
    const res = await fetch(`${MEDUSA_URL}/admin/products/${id}`, {
      method: 'DELETE',
      headers: {
        Authorization: authorization,
      },
    })
    const data = await safeJson(res)
    return NextResponse.json(data, {
      status: res.status,
    })
  } catch (err: any) {
    console.error('[DELETE product]', err)
    return NextResponse.json(
      {
        error: err.message,
      },
      {
        status: 500,
      },
    )
  }
}
