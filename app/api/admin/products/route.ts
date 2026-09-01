import { NextRequest, NextResponse } from 'next/server'
import { getAdminAuthHeader } from '@/lib/api/admin-auth'
import { resolveSalesChannels } from '@/lib/api/selling-channels'
import { safeJson } from '@/lib/api/safe-json'
const MEDUSA_URL =
  process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL ?? 'http://localhost:9000'
export async function GET(req: NextRequest) {
  const authorization = (await getAdminAuthHeader(req)) ?? ''
  if (!authorization) {
    return NextResponse.json(
      {
        error: 'Unauthorized',
      },
      {
        status: 401,
      },
    )
  }
  const { searchParams } = new URL(req.url)
  const limit = searchParams.get('limit') ?? '20'
  const offset = searchParams.get('offset') ?? '0'
  const q = searchParams.get('q')
  const status = searchParams.get('status')
  const params = new URLSearchParams({
    limit,
    offset,
  })
  if (q) params.set('q', q)
  if (status) params.set('status', status)
  params.set(
    'fields',
    'id,title,handle,status,thumbnail,metadata,*images,*categories,*variants,variants.id,variants.title,variants.sku,variants.barcode,*variants.prices,*variants.images,*variants.inventory_items,*variants.inventory_items.inventory.location_levels',
  )
  try {
    const res = await fetch(`${MEDUSA_URL}/admin/products?${params}`, {
      headers: {
        Authorization: authorization,
      },
    })
    const data = await safeJson(res, 'app/api/admin/products/route.ts')
    if (!res.ok)
      return NextResponse.json(
        {
          error: data.message,
        },
        {
          status: res.status,
        },
      )
    return NextResponse.json(data)
  } catch (err: any) {
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
export async function POST(req: NextRequest) {
  const authorization = (await getAdminAuthHeader(req)) ?? ''
  if (!authorization) {
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
    const body = await req.json()
    const stockQty = body._stock ?? 0
    delete body._stock
    const variantStocksEarly: Record<string, number> = body._variantStocks ?? {}
    delete body._variantStocks
    body.metadata = body.metadata ?? {}
    if (!body.metadata.metaTitle && body.title) {
      body.metadata.metaTitle =
        body.title.length <= 60
          ? body.title
          : body.title.slice(0, 57).trim() + '...'
    }
    if (!body.metadata.metaDescription) {
      const clean = (body.description ?? '').replace(/\s+/g, ' ').trim()
      const fallback =
        clean ||
        `Buy ${body.title ?? 'this product'} online at Smash Racket Pro. Fast UK delivery, genuine products, easy returns.`
      body.metadata.metaDescription =
        fallback.length <= 155
          ? fallback
          : fallback.slice(0, 152).trim() + '...'
    }
    if (!body.metadata.metaKeywords) {
      const parts = [
        body.metadata.brand,
        body.metadata.sport,
        ...(Array.isArray(body.tags) ? body.tags.map((t: any) => t.value) : []),
      ].filter(Boolean)
      if (parts.length)
        body.metadata.metaKeywords = Array.from(new Set(parts)).join(', ')
    }
    if (!body.metadata.ogImage && body.thumbnail) {
      body.metadata.ogImage = body.thumbnail
    }
    body.status = 'published'
    const sellingChannel = body.selling_channel
    delete body.selling_channel
    if (!body.sales_channels) {
      const channels = await resolveSalesChannels(
        sellingChannel,
        authorization,
        MEDUSA_URL,
      )
      if (channels) body.sales_channels = channels
    }
    if (!body.shipping_profile_id) {
      try {
        const spRes = await fetch(
          `${MEDUSA_URL}/admin/shipping-profiles?limit=50`,
          {
            headers: {
              Authorization: authorization,
            },
          },
        )
        const spData = await safeJson(spRes, 'app/api/admin/products/route.ts')
        const defaultProfileId =
          (spData.shipping_profiles ?? []).find(
            (p: any) => p.type === 'default',
          )?.id ??
          (spData.shipping_profiles ?? []).find((p: any) =>
            /default/i.test(p.name ?? ''),
          )?.id
        if (defaultProfileId) {
          body.shipping_profile_id = defaultProfileId
        }
      } catch (spErr) {
        console.warn('[products POST] shipping profile lookup failed:', spErr)
      }
    }
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
    const res = await fetch(`${MEDUSA_URL}/admin/products`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: authorization,
      },
      body: JSON.stringify(body),
    })
    const data = await safeJson(res, 'app/api/admin/products/route.ts')
    if (!res.ok)
      return NextResponse.json(
        {
          error: data.message,
        },
        {
          status: res.status,
        },
      )
    const variantStocks: Record<string, number> = variantStocksEarly
    const hasVariantsToLink = true
    if (data.product?.id) {
      try {
        const skuProductRes = await fetch(
          `${MEDUSA_URL}/admin/products/${data.product.id}?fields=*variants,*variants.inventory_items`,
          {
            headers: {
              Authorization: authorization,
            },
          },
        )
        const skuProductData = await safeJson(
          skuProductRes,
          'sku product refetch',
        )
        const skuVariants: any[] = skuProductData.product?.variants ?? []
        for (const variant of skuVariants) {
          const invItemId: string | undefined =
            variant.inventory_items?.[0]?.inventory_item_id ??
            variant.inventory_items?.[0]?.inventory?.id ??
            undefined
          if (!invItemId) continue
          const patchBody: Record<string, string> = {}
          if (variant.sku) patchBody.sku = variant.sku
          if (variant.title) patchBody.title = variant.title
          if (Object.keys(patchBody).length === 0) continue
          const skuPatchRes = await fetch(
            `${MEDUSA_URL}/admin/inventory-items/${invItemId}`,
            {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                Authorization: authorization,
              },
              body: JSON.stringify(patchBody),
            },
          )
          const skuPatchData = await safeJson(skuPatchRes, 'sku patch')
          if (!skuPatchRes.ok) {
            console.warn(
              '[products POST] SKU patch failed for',
              invItemId,
              ':',
              skuPatchData.message,
            )
          } else {
          }
        }
      } catch (skuErr: any) {
        console.warn(
          '[products POST] SKU auto-set failed (non-fatal):',
          skuErr.message,
        )
      }
    }
    if (hasVariantsToLink && data.product?.id) {
      const locRes = await fetch(
        `${MEDUSA_URL}/admin/stock-locations?limit=1`,
        {
          headers: {
            Authorization: authorization,
          },
        },
      )
      const locData = await safeJson(locRes, 'stock-locations')
      const locationId = locData.stock_locations?.[0]?.id
      if (!locationId) {
        console.warn(
          '[products POST] No stock location found — inventory not set. Add one in Medusa → Settings → Stock Locations.',
        )
      } else {
        const productRes = await fetch(
          `${MEDUSA_URL}/admin/products/${data.product.id}?fields=*variants,*variants.inventory_items`,
          {
            headers: {
              Authorization: authorization,
            },
          },
        )
        const productData = await safeJson(productRes, 'product refetch')
        const variants: any[] = productData.product?.variants ?? []
        for (const variant of variants) {
          let inventoryItemId: string | undefined =
            variant.inventory_items?.[0]?.inventory_item_id ??
            variant.inventory_items?.[0]?.inventory?.id ??
            undefined
          if (!inventoryItemId) {
            try {
              const createRes = await fetch(
                `${MEDUSA_URL}/admin/inventory-items`,
                {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                    Authorization: authorization,
                  },
                  body: JSON.stringify({
                    sku: variant.sku || undefined,
                  }),
                },
              )
              const createData = await safeJson(
                createRes,
                'inventory item create',
              )
              if (!createRes.ok) {
                console.warn(
                  '[products POST] Inventory item create failed for variant',
                  variant.id,
                  ':',
                  createData.message,
                )
                continue
              }
              const newInvItemId =
                createData.inventory_item?.id ?? createData.id
              const linkRes = await fetch(
                `${MEDUSA_URL}/admin/products/${data.product.id}/variants/${variant.id}/inventory-items`,
                {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                    Authorization: authorization,
                  },
                  body: JSON.stringify({
                    inventory_item_id: newInvItemId,
                    required_quantity: 1,
                  }),
                },
              )
              if (!linkRes.ok) {
                const linkData = await safeJson(linkRes, 'inventory item link')
                console.warn(
                  '[products POST] Inventory item LINK failed for variant',
                  variant.id,
                  ':',
                  linkData.message,
                )
                continue
              }
              inventoryItemId = newInvItemId
            } catch (invItemErr: any) {
              console.warn(
                '[products POST] Inventory item create/link threw for variant',
                variant.id,
                ':',
                invItemErr.message,
              )
              continue
            }
          }
          if (!inventoryItemId) {
            console.warn(
              '[products POST] No inventory item for variant:',
              variant.id,
              '— skipping',
            )
            continue
          }
          const variantTitle = variant.title ?? ''
          const qty =
            variantStocks[variantTitle] ??
            variantStocks[variant.sku ?? ''] ??
            variantStocks[variantTitle.trim()] ??
            stockQty
          const safeQty = qty > 0 ? qty : 0
          const levelsRes = await fetch(
            `${MEDUSA_URL}/admin/inventory-items/${inventoryItemId}/location-levels?location_id[]=${locationId}`,
            {
              headers: {
                Authorization: authorization,
              },
            },
          )
          const levelsData = await safeJson(levelsRes, 'levels fetch')
          const existingLevel = (levelsData.inventory_levels ?? []).find(
            (l: any) => l.location_id === locationId,
          )
          if (existingLevel) {
            const upRes = await fetch(
              `${MEDUSA_URL}/admin/inventory-items/${inventoryItemId}/location-levels/${locationId}`,
              {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  Authorization: authorization,
                },
                body: JSON.stringify({
                  stocked_quantity: safeQty,
                }),
              },
            )
            const upData = await safeJson(upRes, 'level update')
            if (!upRes.ok)
              console.warn(
                '[products POST] Level update failed:',
                upData.message,
              )
          } else {
            const createRes = await fetch(
              `${MEDUSA_URL}/admin/inventory-items/${inventoryItemId}/location-levels`,
              {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  Authorization: authorization,
                },
                body: JSON.stringify({
                  location_id: locationId,
                  stocked_quantity: safeQty,
                }),
              },
            )
            const createData = await safeJson(createRes, 'level create')
            if (!createRes.ok)
              console.warn(
                '[products POST] Level create failed:',
                createData.message,
              )
            else void 0
          }
        }
      }
    }
    return NextResponse.json(data, {
      status: 201,
    })
  } catch (err: any) {
    console.error('[API] product create error:', err)
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
