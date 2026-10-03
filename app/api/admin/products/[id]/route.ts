import { NextRequest, NextResponse } from 'next/server'
import { getAdminAuthHeader } from '@/lib/api/admin-auth'
import { resolveSalesChannels } from '@/lib/api/selling-channels'
import {
  syncVariantInventory,
  getDefaultStockLocationId,
} from '@/lib/api/inventory-sync'
import { invalidateCatalog } from '@/lib/catalog/source'
import {
  upsertAdminProduct,
  removeAdminProduct,
} from '@/lib/api/admin-products-server'
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
    const t0 = Date.now()
    const lap = (label: string) =>
      console.log(`[PATCH product ${id}] ${label} +${Date.now() - t0}ms`)
    const body = await req.json()
    lap(
      `start (variants: ${Array.isArray(body.variants) ? body.variants.length : 0}, images: ${Array.isArray(body.images) ? body.images.length : 0})`,
    )
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
    // Only true when the edit form's stock field was actually changed by the
    // user (see the dashboard edit page). Lets a single-variant product's
    // stock be updated from the Save button.
    const stockDirty: boolean = body._stockDirty === true
    delete body._stock
    delete body._variantStocks
    delete body._stockDirty
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
    // Look the stock location up while Medusa is busy saving the product
    // (it is cached, so this is normally instant) instead of afterwards.
    const locationPromise = getDefaultStockLocationId(authorization).catch(
      () => null,
    )
    lap('sending update to Medusa')
    let res: Response
    try {
      // Medusa's default response is the whole product (variants, prices,
      // options, images, ...) — ~90 KB and a heavy re-query for big products.
      // Only the ids are needed here, so ask for just those.
      const postUpdate = (qs: string) =>
        fetch(`${MEDUSA_URL}/admin/products/${id}${qs}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: authorization,
          },
          body: JSON.stringify(body),
          // Stay under nginx's 300s so the user gets a clear message instead
          // of a gateway error, and so the log shows exactly where it hung.
          signal: AbortSignal.timeout(280_000),
        })
      res = await postUpdate('?fields=id,variants.id,variants.title')
      if (res.status === 400) {
        // If this Medusa version rejects `fields`, fall back to the default
        // response (a rejected 400 changed nothing, so retrying is safe).
        const txt = await res.clone().text()
        if (/field/i.test(txt)) {
          lap('Medusa rejected fields param, retrying without it')
          res = await postUpdate('')
        }
      }
    } catch (e: any) {
      lap(`Medusa update FAILED: ${e?.name ?? ''} ${e?.message ?? e}`)
      return NextResponse.json(
        {
          error:
            e?.name === 'TimeoutError' || e?.name === 'AbortError'
              ? 'Medusa did not finish saving this product within 280 seconds. The product update is stuck on the backend — check the Medusa logs / database before trying again.'
              : `Cannot reach Medusa (${e?.cause?.code ?? e?.message}).`,
        },
        { status: 504 },
      )
    }
    lap(`Medusa update answered HTTP ${res.status}`)
    const data = await safeJson(res)
    if (res.status === 502 || res.status === 503 || res.status === 504) {
      console.error('[PATCH product] Medusa gateway error', res.status)
      return NextResponse.json(
        {
          error:
            res.status === 504
              ? 'The server took too long to respond (504 Gateway Timeout). Your changes may still have been saved in the background — refresh the page and check before saving again.'
              : 'The server is temporarily unavailable (' +
                res.status +
                '). Please try again.',
        },
        { status: res.status },
      )
    }
    if (res.ok && data.product?.id) {
      try {
        // Inventory sync starts with ONE deep read of the product (all
        // variants + inventory items + stock levels). On a 12-variant product
        // that single read took ~63s on this Medusa, even when every stock
        // value was already correct. So only sync when something stock-related
        // can actually have changed: the form sent a changed variant stock
        // (the dashboard now sends only those), the single Stock field was
        // edited, or a variant without an id (brand new) was sent and needs
        // its inventory item + level created.
        const hasNewVariant =
          Array.isArray(body.variants) && body.variants.some((v: any) => !v?.id)
        const needsInventorySync =
          Object.keys(variantStocks).length > 0 || stockDirty || hasNewVariant
        if (!needsInventorySync) {
          lap('inventory sync skipped (no stock change)')
        }
        const locationId = needsInventorySync ? await locationPromise : null
        if (!needsInventorySync) {
          // nothing to do
        } else if (!locationId) {
          console.warn(
            '[PATCH product] No stock location found — inventory not set.',
          )
        } else {
          // stockQty is a fallback default when a variant has no
          // variant-specific quantity in the payload (e.g. single-variant edits).
          // Only some variants' stock changed (the dashboard sends just
          // those, keyed by variant title): read just those variants.
          let onlyVariantIds: string[] | undefined
          if (
            !stockDirty &&
            !hasNewVariant &&
            Object.keys(variantStocks).length > 0
          ) {
            const respVariants: { id: string; title?: string }[] =
              data.product.variants ?? []
            const ids: string[] = []
            let allMatched = true
            for (const key of Object.keys(variantStocks)) {
              const hit = respVariants.find(
                (v) =>
                  (v.title ?? '') === key ||
                  (v.title ?? '').trim().toLowerCase() ===
                    key.trim().toLowerCase(),
              )
              if (hit) ids.push(hit.id)
              else {
                allMatched = false
                break
              }
            }
            if (allMatched && ids.length > 0) {
              onlyVariantIds = Array.from(new Set(ids))
            }
          }
          lap(
            `inventory sync start (${onlyVariantIds ? `${onlyVariantIds.length} variant(s)` : 'all variants'})`,
          )
          await syncVariantInventory(
            data.product.id,
            authorization,
            locationId,
            variantStocks,
            stockQty,
            {
              applyDefaultToExisting:
                stockDirty && Object.keys(variantStocks).length === 0,
              onlyVariantIds,
            },
          )
        }
        lap('inventory sync done')
      } catch (invErr: any) {
        console.warn(
          '[PATCH product] Inventory set error (non-fatal):',
          invErr.message,
        )
      }
      // Product + inventory are written — make the shop rebuild its
      // catalogue snapshot so status / price / stock changes show up now.
      invalidateCatalog()
      // Dashboard list reflects this edit immediately.
      await upsertAdminProduct(data.product.id, authorization)
      lap('done')
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
    if (res.ok) {
      invalidateCatalog()
      removeAdminProduct(id)
    }
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
