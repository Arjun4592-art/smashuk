import { NextRequest, NextResponse } from 'next/server'
import { getAdminAuthHeader } from '@/lib/api/admin-auth'
import { resolveSalesChannels } from '@/lib/api/selling-channels'

const MEDUSA_URL =
  process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL ?? 'http://localhost:9000'

// Medusa sometimes returns an empty body — a raw res.json() call on that
// throws and masks the real status/error with a generic 500.
async function safeJson(res: Response) {
  const text = await res.text()
  if (!text) return {}
  try {
    return JSON.parse(text)
  } catch {
    return { message: text.slice(0, 300) }
  }
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params
    const authorization = (await getAdminAuthHeader(req)) ?? ''

    if (!authorization) {
      return NextResponse.json(
        { error: 'Missing Authorization header' },
        { status: 401 },
      )
    }

    // BUG FIX: `*options` was missing here, so the edit page never learned
    // the real ids of the product's existing options (e.g. "Default",
    // "Size", "Color"). Without those ids, saving the product re-sent the
    // options with no id, which Medusa treats as "create a new option" —
    // failing with an already-exists error since one with that title was
    // already on the product.
    const res = await fetch(
      `${MEDUSA_URL}/admin/products/${id}?fields=+metadata,*variants,*variants.prices,*variants.inventory_items,*variants.inventory_items.inventory.location_levels,*variants.options,*variants.options.option,*variants.images,*categories,*images,*options,*options.values,*sales_channels`,
      {
        headers: { Authorization: authorization },
      },
    )

    const data = await safeJson(res)
    return NextResponse.json(data, { status: res.status })
  } catch (err: any) {
    console.error('[GET product]', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params
    const body = await req.json()
    const authorization = (await getAdminAuthHeader(req)) ?? ''

    if (!authorization) {
      return NextResponse.json(
        { error: 'Missing Authorization header' },
        { status: 401 },
      )
    }

    // Extract _stock and _variantStocks before forwarding to Medusa
    // (these are our custom fields, not real Medusa fields)
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

    // BUG FIX ("Invalid request: Unrecognized fields: 'images'" on save):
    // Medusa's product-update DTO on this version no longer accepts a
    // per-variant `images` array in the update payload — same class of
    // breaking change as the `options` field removal noted elsewhere in
    // this file. The dashboard edit page still sends
    // variant.images: [{ url }, ...] (scoped "Variant Media" picks), so
    // every save with any variant that has picked images was rejected
    // outright — the whole product update failed, not just the images.
    // Move each variant's picked images into variant.metadata instead
    // (so nothing is lost) and strip the unsupported field before
    // forwarding to Medusa.
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
      method: 'POST', // Medusa v2 uses POST for updates, not PATCH
      headers: {
        'Content-Type': 'application/json',
        Authorization: authorization,
      },
      body: JSON.stringify(body),
    })

    const data = await safeJson(res)

    // BUG FIX (missing inventory item — "success but nothing stored in
    // Medusa"): Medusa v2 creates a variant's InventoryItem via an async
    // event-bus subscriber, not inline during the product create/update
    // call. Refetching right after and reading .inventory_item_id can race
    // that subscriber and come back empty — most often for a newly-added
    // variant during an edit. Instead of trusting the refetch, create the
    // inventory item explicitly if it's missing (same pattern already used
    // in app/api/admin/inventory/adjust/route.ts for imported products).
    async function ensureInventoryItemId(
      variant: any,
    ): Promise<string | undefined> {
      const existing: string | undefined =
        variant.inventory_items?.[0]?.inventory_item_id ??
        variant.inventory_items?.[0]?.inventory?.id ??
        undefined
      if (existing) return existing

      try {
        const createRes = await fetch(`${MEDUSA_URL}/admin/inventory-items`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: authorization,
          },
          body: JSON.stringify({
            variant_id: variant.id,
            sku: variant.sku || undefined,
          }),
        })
        const createData = await safeJson(createRes)
        if (createRes.ok) {
          const newId = createData.inventory_item?.id ?? createData.id
          console.log(
            '[PATCH product] Inventory item created for variant',
            variant.id,
            '→',
            newId,
          )
          return newId
        }

        // BUG FIX ("available at 0 locations" for brand-new Size/Color
        // variants): the explicit create above can lose a genuine race
        // against Medusa's own async subscriber — for a variant that was
        // JUST created in this same request, the subscriber can create
        // its InventoryItem microseconds before we get here, so our
        // create 400/409s as a duplicate. Previously we gave up right
        // here and skipped the variant entirely, which is exactly what
        // left it unlinked from any location. Instead, re-fetch this
        // variant fresh — whichever side won the race, the item now
        // exists and shows up here.
        console.warn(
          '[PATCH product] Inventory item create failed for variant',
          variant.id,
          '- refetching in case it already exists (subscriber race):',
          createData.message,
        )
        const refetchRes = await fetch(
          `${MEDUSA_URL}/admin/products/${id}?fields=*variants.inventory_items`,
          { headers: { Authorization: authorization } },
        )
        const refetchData = await safeJson(refetchRes)
        const freshVariant = (refetchData.product?.variants ?? []).find(
          (v: any) => v.id === variant.id,
        )
        const foundId: string | undefined =
          freshVariant?.inventory_items?.[0]?.inventory_item_id ??
          freshVariant?.inventory_items?.[0]?.inventory?.id ??
          undefined
        if (foundId) {
          console.log(
            '[PATCH product] Found inventory item via refetch for variant',
            variant.id,
            '→',
            foundId,
          )
          return foundId
        }
        console.warn(
          '[PATCH product] Inventory item still not found for variant',
          variant.id,
          '— giving up.',
        )
        return undefined
      } catch (createErr: any) {
        console.warn(
          '[PATCH product] Inventory item create threw for variant',
          variant.id,
          ':',
          createErr.message,
        )
        return undefined
      }
    }

    // AUTO-FIX: After a product update, re-sync each variant's SKU and title
    // to its linked inventory item. This handles the case where a user edits
    // a variant's SKU in the dashboard — the inventory item in Medusa admin
    // would otherwise stay out of sync and require manual update.
    if (res.ok && data.product?.id) {
      try {
        const refetchRes = await fetch(
          `${MEDUSA_URL}/admin/products/${id}?fields=*variants,*variants.inventory_items`,
          { headers: { Authorization: authorization } },
        )
        const refetchData = await safeJson(refetchRes)
        const updatedVariants: any[] = refetchData.product?.variants ?? []

        for (const variant of updatedVariants) {
          const invItemId = await ensureInventoryItemId(variant)

          if (!invItemId) continue

          const patchBody: Record<string, string> = {}
          if (variant.sku) patchBody.sku = variant.sku
          if (variant.title) patchBody.title = variant.title
          if (Object.keys(patchBody).length === 0) continue

          const patchRes = await fetch(
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
          if (!patchRes.ok) {
            const patchData = await safeJson(patchRes)
            console.warn(
              '[PATCH product] Inventory SKU sync failed:',
              patchData.message,
            )
          }
        }
      } catch (syncErr: any) {
        console.warn(
          '[PATCH product] Inventory SKU sync error (non-fatal):',
          syncErr.message,
        )
      }
    }

    // BUG FIX: Set inventory stock levels when editing a product.
    // The edit form sends _stock (single product) and _variantStocks
    // (per-variant map), same as the create route — but this route never
    // acted on them. For every variant with an explicit qty we POST the
    // new stocked_quantity. This mirrors the create-route logic.
    //
    // SECOND BUG FIX (the "available at 0 locations" issue): this used to
    // be gated by `hasAnyStock` (skip everything if no qty was typed
    // anywhere) and then skip each variant with `if (qty <= 0) continue`.
    // That meant a variant added without typing a stock number — or a
    // whole edit where the Inventory tab wasn't touched — never got an
    // inventory location-level row created at all, which is exactly what
    // the dashboard shows as "available at 0 locations" (not "0 units",
    // but literally not linked to any location, so the storefront treats
    // it as permanently unbuyable). We now ALWAYS check every variant and
    // create a missing level (defaulting to 0) so it's at least linked.
    // We deliberately do NOT touch an *existing* level's quantity unless
    // an explicit qty was provided for that variant — otherwise editing a
    // product's title/price with the Inventory tab untouched would silently
    // wipe out stock that was set directly in Medusa admin.
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

        if (locationId) {
          // Re-fetch with inventory_items expanded so we get inventory item ids
          const invProductRes = await fetch(
            `${MEDUSA_URL}/admin/products/${id}?fields=*variants,*variants.inventory_items`,
            { headers: { Authorization: authorization } },
          )
          const invProductData = await safeJson(invProductRes)
          const invVariants: any[] = invProductData.product?.variants ?? []

          for (const variant of invVariants) {
            const invItemId = await ensureInventoryItemId(variant)

            if (!invItemId) continue

            const variantTitle = variant.title ?? ''
            // BUG FIX: _variantStocks keys are built on the frontend as
            // [size, color].filter(Boolean).join(' / ') — e.g. "7 / Black"
            // or "7" (size-only) or "Black" (color-only). That matches
            // Medusa's variant.title for existing variants, BUT for a
            // brand-new variant just created in this same PATCH call,
            // Medusa's title may already be set correctly ("7 / Black") so
            // the lookup works fine. However the lookup also fails silently
            // when variant.title has extra whitespace or casing differences.
            // Also support lookup by variant.id directly (sent as
            // _variantStocks key when the frontend knows the medusaId) and
            // by SKU as a last resort fallback.
            const stockByTitle = variantStocks[variantTitle]
            const stockBySku = variant.sku
              ? variantStocks[variant.sku]
              : undefined
            const stockById = variant.id ? variantStocks[variant.id] : undefined
            // Also try trimmed title match for any whitespace edge cases
            const stockByTrimmedTitle = variantStocks[variantTitle.trim()]
            const explicitStock =
              stockByTitle !== undefined
                ? stockByTitle
                : stockById !== undefined
                  ? stockById
                  : stockBySku !== undefined
                    ? stockBySku
                    : stockByTrimmedTitle !== undefined
                      ? stockByTrimmedTitle
                      : undefined

            const hasExplicitQty = explicitStock !== undefined || stockQty > 0
            const qty = explicitStock !== undefined ? explicitStock : stockQty

            // Check if a location-level already exists
            const levelsRes = await fetch(
              `${MEDUSA_URL}/admin/inventory-items/${invItemId}/location-levels?location_id[]=${locationId}`,
              { headers: { Authorization: authorization } },
            )
            const levelsData = await safeJson(levelsRes)
            const existingLevel = (levelsData.inventory_levels ?? []).find(
              (l: any) => l.location_id === locationId,
            )

            if (existingLevel) {
              // A level already exists — only overwrite its quantity if
              // the admin actually typed a number for this variant. This
              // is what protects existing stock (e.g. set directly in
              // Medusa admin) from being silently zeroed out just because
              // the Inventory tab wasn't touched during this edit.
              if (!hasExplicitQty) continue

              const upRes = await fetch(
                `${MEDUSA_URL}/admin/inventory-items/${invItemId}/location-levels/${locationId}`,
                {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                    Authorization: authorization,
                  },
                  body: JSON.stringify({ stocked_quantity: qty }),
                },
              )
              if (!upRes.ok) {
                const upData = await safeJson(upRes)
                console.warn(
                  '[PATCH product] Inventory level update failed:',
                  upData.message,
                )
              } else {
                console.log(
                  '[PATCH product] Inventory updated: variant',
                  variant.id,
                  '→',
                  qty,
                )
              }
            } else {
              // No level yet at all — this is the "available at 0
              // locations" case. Always create it, even with 0, so the
              // variant is at least linked to the store's location and
              // shows up correctly (as genuinely out of stock, not
              // "unlinked") everywhere. Use the explicit qty if given.
              const safeQty = hasExplicitQty && qty > 0 ? qty : 0
              const createRes = await fetch(
                `${MEDUSA_URL}/admin/inventory-items/${invItemId}/location-levels`,
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
              if (!createRes.ok) {
                const createData = await safeJson(createRes)
                console.warn(
                  '[PATCH product] Inventory level create failed:',
                  createData.message,
                )
              } else {
                console.log(
                  '[PATCH product] Inventory created: variant',
                  variant.id,
                  '→',
                  safeQty,
                )
              }
            }
          }
        } else {
          console.warn(
            '[PATCH product] No stock location found — inventory not set.',
          )
        }
      } catch (invErr: any) {
        console.warn(
          '[PATCH product] Inventory set error (non-fatal):',
          invErr.message,
        )
      }
    }

    return NextResponse.json(data, { status: res.status })
  } catch (err: any) {
    console.error('[PATCH product]', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params
    const authorization = (await getAdminAuthHeader(req)) ?? ''

    if (!authorization) {
      return NextResponse.json(
        { error: 'Missing Authorization header' },
        { status: 401 },
      )
    }

    const res = await fetch(`${MEDUSA_URL}/admin/products/${id}`, {
      method: 'DELETE',
      headers: { Authorization: authorization },
    })

    const data = await safeJson(res)
    return NextResponse.json(data, { status: res.status })
  } catch (err: any) {
    console.error('[DELETE product]', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
