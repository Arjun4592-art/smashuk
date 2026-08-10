import { NextRequest, NextResponse } from 'next/server'
import { getAdminAuthHeader } from '@/lib/api/admin-auth'
import { resolveSalesChannels } from '@/lib/api/selling-channels'
import { safeJson } from '@/lib/api/safe-json'

const MEDUSA_URL =
  process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL ?? 'http://localhost:9000'

export async function GET(req: NextRequest) {
  const authorization = (await getAdminAuthHeader(req)) ?? ''
  if (!authorization) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(req.url)
  const limit = searchParams.get('limit') ?? '20'
  const offset = searchParams.get('offset') ?? '0'
  const q = searchParams.get('q')
  const status = searchParams.get('status')

  const params = new URLSearchParams({ limit, offset })
  if (q) params.set('q', q)
  if (status) params.set('status', status)

  params.set(
    'fields',
    'id,title,status,thumbnail,metadata,*images,*categories,*variants,variants.id,variants.title,variants.sku,variants.barcode,*variants.prices,*variants.inventory_items,*variants.inventory_items.inventory.location_levels',
  )

  try {
    const res = await fetch(`${MEDUSA_URL}/admin/products?${params}`, {
      headers: { Authorization: authorization },
    })
    const data = await safeJson(res, 'app/api/admin/products/route.ts')
    if (!res.ok)
      return NextResponse.json({ error: data.message }, { status: res.status })
    return NextResponse.json(data)
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  const authorization = (await getAdminAuthHeader(req)) ?? ''
  if (!authorization) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await req.json()
    const stockQty = body._stock ?? 0
    delete body._stock

    // BUG FIX: safety net so the dashboard SEO page (app/dashboard/seo/page.tsx,
    // which reads product.metadata.metaTitle/metaDescription/metaKeywords)
    // never gets a blank row for a new product, even if a caller other than
    // app/dashboard/products/new/page.tsx (which already fills these in)
    // hits this route without them.
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
        `Buy ${body.title ?? 'this product'} online at SmashUK. Fast UK delivery, genuine products, easy returns.`
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

    // BUG FIX: products created from the dashboard used to keep whatever
    // status the "Save as Draft" / "Publish" toggle sent (defaulting to
    // 'draft' — see app/dashboard/products/new/page.tsx). From now on,
    // every product added from the dashboard is published immediately —
    // no separate publish step needed.
    body.status = 'published'

    // Where a product is sold: "website", "store" (POS), or "both". Comes
    // from the dashboard's Add/Edit Product "Sell on" field — not a real
    // Medusa field, so pull it off the body before forwarding to Medusa.
    const sellingChannel = body.selling_channel
    delete body.selling_channel

    // BUG FIX: this route never attached a sales channel at all. Medusa's
    // Store API only serves a variant if its product is BOTH published AND
    // linked to the sales channel scoped by the storefront/POS's
    // publishable key — otherwise checkout fails with "Variants ... do not
    // exist or belong to a product that is not published", even though the
    // product shows as "Published" in the admin. This is exactly the bug
    // reported on prod_01KTET90JCSS4AYXFD9HQQW4NV. Resolve the "Website" /
    // "Store" channels here (creating them on first use) so every new
    // product is actually purchasable in the place(s) it was meant for.
    if (!body.sales_channels) {
      const channels = await resolveSalesChannels(
        sellingChannel,
        authorization,
        MEDUSA_URL,
      )
      if (channels) body.sales_channels = channels
    }

    // BUG FIX: same class of issue as sales_channels above — without a
    // shipping_profile_id, a product has no shipping profile at all, and
    // every checkout (POS or website) for it fails with "cart items
    // require shipping profiles that are not satisfied by the current
    // shipping methods", since there's nothing for any shipping option to
    // match against. Auto-attach the store's default shipping profile.
    if (!body.shipping_profile_id) {
      try {
        const spRes = await fetch(
          `${MEDUSA_URL}/admin/shipping-profiles?limit=50`,
          {
            headers: { Authorization: authorization },
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
        // Non-fatal — product still gets created, just won't be sellable
        // with shipping until a profile is set manually.
      }
    }

    // Step 1: Create product
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
      return NextResponse.json({ error: data.message }, { status: res.status })

    console.log(
      '[products POST] Product created:',
      data.product?.id,
      'stockQty:',
      stockQty,
    )

    // Step 2: Set inventory if stock was provided
    if (stockQty > 0 && data.product?.id) {
      // Stock location lo
      const locRes = await fetch(
        `${MEDUSA_URL}/admin/stock-locations?limit=1`,
        {
          headers: { Authorization: authorization },
        },
      )
      const locData = await safeJson(locRes, 'app/api/admin/products/route.ts')
      const locationId = locData.stock_locations?.[0]?.id

      console.log('[products POST] Location ID:', locationId)

      if (locationId) {
        // Re-fetch the product with expanded fields so we get variant.inventory_items
        const productRes = await fetch(
          `${MEDUSA_URL}/admin/products/${data.product.id}?fields=*variants,*variants.inventory_items`,
          { headers: { Authorization: authorization } },
        )
        const productData = await safeJson(productRes, 'app/api/admin/products/route.ts')
        const variants = productData.product?.variants ?? []

        console.log(
          '[products POST] Variants fetched:',
          JSON.stringify(
            variants.map((v: any) => ({
              id: v.id,
              inventory_items: v.inventory_items,
            })),
          ),
        )

        for (const variant of variants) {
          const inventoryItemId =
            variant.inventory_items?.[0]?.inventory_item_id ??
            variant.inventory_items?.[0]?.id

          console.log(
            '[products POST] Variant:',
            variant.id,
            '→ inventoryItemId:',
            inventoryItemId,
          )

          if (inventoryItemId) {
            const setRes = await fetch(
              `${MEDUSA_URL}/admin/inventory-items/${inventoryItemId}/location-levels`,
              {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  Authorization: authorization,
                },
                body: JSON.stringify({
                  location_id: locationId,
                  stocked_quantity: stockQty,
                }),
              },
            )
            const setData = await safeJson(setRes, 'app/api/admin/products/route.ts')
            console.log(
              '[products POST] Inventory set result:',
              setRes.status,
              JSON.stringify(setData),
            )
          } else {
            console.log(
              '[products POST] No inventory item found for variant:',
              variant.id,
            )
          }
        }
      }
    }

    return NextResponse.json(data, { status: 201 })
  } catch (err: any) {
    console.error('[API] product create error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
