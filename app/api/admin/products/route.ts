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
    'id,title,status,thumbnail,metadata,*images,*categories,*variants,variants.id,variants.title,variants.sku,variants.barcode,*variants.prices,*variants.images,*variants.inventory_items,*variants.inventory_items.inventory.location_levels',
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
    const variantStocksEarly: Record<string, number> = body._variantStocks ?? {}
    delete body._variantStocks

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

    // BUG FIX ("Invalid request: Unrecognized fields: 'images'" when
    // creating a product with variants that have picked images): same
    // issue already fixed on the update route
    // (app/api/admin/products/[id]/route.ts) — this Medusa version's
    // product-create DTO doesn't accept a per-variant `images` array
    // either, but app/dashboard/products/new/page.tsx's "Variant Media"
    // picker still sends variant.images: [{ url }, ...]. Medusa rejected
    // the ENTIRE create request because of it — not just the images —
    // which is why the whole product failed to save. Move each variant's
    // picked image urls into variant.metadata.variant_images instead (so
    // nothing is lost) and strip the unsupported field before forwarding.
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

    console.log('[products POST] Product created:', data.product?.id)

    // Step 2: Set inventory per-variant.
    //
    // IMPORTANT — Medusa v2 notes:
    // • After product create, Medusa auto-creates one InventoryItem per
    //   variant and links it. We re-fetch with the correct expand path to
    //   get those items and their ids.
    // • The correct expand path for inventory item id is:
    //   *variants.inventory_items  → gives VariantInventoryItem objects
    //   each with .inventory_item_id (not .id which is the link row id).
    // • If a location-level already exists (unlikely on a brand-new product
    //   but possible in race conditions), we PATCH it instead of POST.
    // • Per-variant stock is supported: the body carries _variantStocks
    //   (a map of variantTitle → qty). If absent we fall back to _stock.

    const variantStocks: Record<string, number> = variantStocksEarly

    // BUG FIX: this used to gate the ENTIRE inventory-linking block below.
    // If every variant's stock field was left blank/0 (hasAnyStock false),
    // we'd skip linking ANY variant to a stock location at all — not just
    // leave them at 0 units, but leave them with NO location-level row,
    // which is what the dashboard shows as "available at 0 locations" and
    // the storefront treats as permanently out of stock even after stock
    // is added later through Medusa admin directly. We now always run the
    // linking step whenever the product has variants, defaulting missing
    // quantities to 0 instead of skipping the variant entirely.
    const hasVariantsToLink = true

    // Step 2a (always): Auto-set SKU + title on inventory items even when
    // stock qty is 0. Without this, Medusa leaves inventory item SKU blank
    // and admins have to fill it in manually inside Medusa admin every time.
    // We always patch it from the variant's own sku/title right after create.
    if (data.product?.id) {
      try {
        const skuProductRes = await fetch(
          `${MEDUSA_URL}/admin/products/${data.product.id}?fields=*variants,*variants.inventory_items`,
          { headers: { Authorization: authorization } },
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
            console.log(
              '[products POST] Inventory SKU auto-set:',
              invItemId,
              '→',
              patchBody.sku ?? '(no sku)',
            )
          }
        }
      } catch (skuErr: any) {
        // Non-fatal — product is created fine, just SKU won't be pre-filled in Medusa admin
        console.warn(
          '[products POST] SKU auto-set failed (non-fatal):',
          skuErr.message,
        )
      }
    }

    if (hasVariantsToLink && data.product?.id) {
      // 2a. Get stock location
      const locRes = await fetch(
        `${MEDUSA_URL}/admin/stock-locations?limit=1`,
        {
          headers: { Authorization: authorization },
        },
      )
      const locData = await safeJson(locRes, 'stock-locations')
      const locationId = locData.stock_locations?.[0]?.id

      if (!locationId) {
        console.warn(
          '[products POST] No stock location found — inventory not set. Add one in Medusa → Settings → Stock Locations.',
        )
      } else {
        // 2b. Re-fetch product with inventory_items expanded (Medusa v2 path)
        const productRes = await fetch(
          `${MEDUSA_URL}/admin/products/${data.product.id}?fields=*variants,*variants.inventory_items`,
          { headers: { Authorization: authorization } },
        )
        const productData = await safeJson(productRes, 'product refetch')
        const variants: any[] = productData.product?.variants ?? []

        for (const variant of variants) {
          // Medusa v2: VariantInventoryItem has .inventory_item_id (the actual
          // inventory item id) and .id (the join-table row id). Always prefer
          // .inventory_item_id. Also try .inventory?.id as a final fallback.
          let inventoryItemId: string | undefined =
            variant.inventory_items?.[0]?.inventory_item_id ??
            variant.inventory_items?.[0]?.inventory?.id ??
            undefined

          // BUG FIX ("available at 0 locations" / SKU missing entirely
          // from Medusa's Inventory page for a newly-created product):
          // Medusa's create-product workflow does not reliably create AND
          // link an InventoryItem for every variant on its own — same root
          // cause confirmed in app/api/admin/products/[id]/route.ts (the
          // edit flow). Previously we just skipped the variant here
          // (`continue`), which is exactly how a variant ends up with no
          // inventory item at all. Confirmed against Medusa's own Admin
          // API reference: creating the item does NOT reliably link it via
          // `variant_id` — there's a dedicated endpoint for that:
          //   POST /admin/products/{id}/variants/{variant_id}/inventory-items
          //   body: { inventory_item_id, required_quantity }
          // So if still missing here, create + link it explicitly now,
          // exactly like the admin UI itself does under the hood.
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
                  body: JSON.stringify({ sku: variant.sku || undefined }),
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
              console.log(
                '[products POST] Inventory item created + linked for variant',
                variant.id,
                '→',
                newInvItemId,
              )
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

          // Determine qty for this variant:
          // 1. variantStocks[variantTitle] if set from per-variant form rows
          // 2. stockQty (top-level form.stock) as fallback
          const variantTitle = variant.title ?? ''
          // BUG FIX: `qty` was referenced below without ever being computed
          // — it was never resolved from variantStocks/stockQty in this
          // route (unlike app/api/admin/products/[id]/route.ts, which does
          // this correctly on edit). That left a bare undefined `qty`
          // reference, which threw "ReferenceError: qty is not defined" for
          // every product create with variants — including the "Set Up
          // Stringing Services" button (app/api/admin/services/seed-stringing/route.ts),
          // which creates its 3 services through this exact route. Mirror
          // the edit route's fallback chain: explicit per-variant stock (by
          // title, then sku, then trimmed title) → top-level stockQty.
          const qty =
            variantStocks[variantTitle] ??
            variantStocks[variant.sku ?? ''] ??
            variantStocks[variantTitle.trim()] ??
            stockQty
          // BUG FIX: previously `if (qty <= 0) continue` — any variant with
          // no stock entered (blank form field, or a variant added without
          // typing a quantity) got skipped here entirely, so it never got
          // an inventory location-level row at all. That's exactly the
          // "available at 0 locations" state in the dashboard. Now we
          // always create/update the level, defaulting to 0 instead of
          // skipping, so every variant is at least linked to the store's
          // location and admins can edit its quantity in place.
          const safeQty = qty > 0 ? qty : 0

          // 2c. Check if location-level already exists
          const levelsRes = await fetch(
            `${MEDUSA_URL}/admin/inventory-items/${inventoryItemId}/location-levels?location_id[]=${locationId}`,
            { headers: { Authorization: authorization } },
          )
          const levelsData = await safeJson(levelsRes, 'levels fetch')
          const existingLevel = (levelsData.inventory_levels ?? []).find(
            (l: any) => l.location_id === locationId,
          )

          if (existingLevel) {
            // Level exists — update it (Medusa v2 uses POST for updates here)
            const upRes = await fetch(
              `${MEDUSA_URL}/admin/inventory-items/${inventoryItemId}/location-levels/${locationId}`,
              {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  Authorization: authorization,
                },
                body: JSON.stringify({ stocked_quantity: safeQty }),
              },
            )
            const upData = await safeJson(upRes, 'level update')
            if (!upRes.ok)
              console.warn(
                '[products POST] Level update failed:',
                upData.message,
              )
          } else {
            // No level yet — create it
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
            else
              console.log(
                '[products POST] Inventory set: variant',
                variant.id,
                '→',
                safeQty,
                'units',
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
