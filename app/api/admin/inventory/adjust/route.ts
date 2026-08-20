import { NextRequest, NextResponse } from 'next/server'
import { getAdminAuthHeader } from '@/lib/api/admin-auth'

const MEDUSA_URL = process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL

async function safeJson(res: Response, label: string) {
  const text = await res.text()
  try {
    return JSON.parse(text)
  } catch {
    console.error(
      `[adjust] ${label} returned non-JSON (status ${res.status}):`,
      text.slice(0, 300),
    )
    throw new Error(
      `${label} failed with status ${res.status} (non-JSON response)`,
    )
  }
}

export async function POST(req: NextRequest) {
  try {
    const { variant_id, quantity } = await req.json()
    const authorization = (await getAdminAuthHeader(req)) ?? ''

    if (!authorization) {
      return NextResponse.json(
        { error: 'Missing Authorization header' },
        { status: 401 },
      )
    }
    if (!variant_id || quantity === undefined) {
      return NextResponse.json(
        { error: 'variant_id and quantity required' },
        { status: 400 },
      )
    }

    const headers = {
      'Content-Type': 'application/json',
      Authorization: authorization,
    }

    // Saare products loop karke target variant dhoondo
    let inventoryItemId: string | null = null
    let foundProductId: string | null = null
    let offset = 0
    const limit = 100

    while (!inventoryItemId) {
      const url = `${MEDUSA_URL}/admin/products?limit=${limit}&offset=${offset}&fields=id,variants.id,*variants.inventory_items`
      const res = await fetch(url, { headers })
      const data = await safeJson(res, 'product search')

      if (!res.ok) {
        return NextResponse.json(
          { error: data.message ?? 'Search failed' },
          { status: res.status },
        )
      }

      for (const product of data.products ?? []) {
        const variant = product.variants?.find((v: any) => v.id === variant_id)
        if (variant) {
          inventoryItemId =
            variant.inventory_items?.[0]?.inventory_item_id ??
            variant.inventory_items?.[0]?.id ??
            null
          foundProductId = product.id
          break
        }
      }

      if (inventoryItemId) break
      if (!data.products || data.products.length < limit) break // no more pages
      offset += limit
    }

    if (!inventoryItemId) {
      // No inventory item was linked at all yet (not just a missing
      // location-level) — this is why stock adjust always 404'd for
      // imported products (e.g. the smashuk.co scrape). Create an
      // inventory item, then explicitly link it to the variant.
      //
      // BUG FIX: this used to pass { variant_id } to the create call and
      // assume that alone would link it — confirmed against Medusa's own
      // Admin API reference that it does NOT reliably do so. There's a
      // dedicated endpoint for linking:
      //   POST /admin/products/{id}/variants/{variant_id}/inventory-items
      //   body: { inventory_item_id, required_quantity }
      // Without this second call the item gets created but stays
      // unlinked, so it looks like nothing happened even though a stray
      // inventory item now exists in Medusa with no SKU or variant tie.
      if (!foundProductId) {
        return NextResponse.json(
          { error: 'Variant not found in any product — cannot create/link an inventory item for it.' },
          { status: 404 },
        )
      }

      const createItemRes = await fetch(`${MEDUSA_URL}/admin/inventory-items`, {
        method: 'POST',
        headers,
        body: JSON.stringify({}),
      })
      const createItemData = await safeJson(createItemRes, 'inventory item create')

      if (!createItemRes.ok) {
        return NextResponse.json(
          {
            error:
              createItemData.message ??
              'Variant not found or inventory item could not be created.',
          },
          { status: createItemRes.status || 404 },
        )
      }

      inventoryItemId =
        createItemData.inventory_item?.id ?? createItemData.id ?? null

      if (!inventoryItemId) {
        return NextResponse.json(
          { error: 'Variant not found or no inventory item linked.' },
          { status: 404 },
        )
      }

      const linkRes = await fetch(
        `${MEDUSA_URL}/admin/products/${foundProductId}/variants/${variant_id}/inventory-items`,
        {
          method: 'POST',
          headers,
          body: JSON.stringify({ inventory_item_id: inventoryItemId, required_quantity: 1 }),
        },
      )
      if (!linkRes.ok) {
        const linkData = await safeJson(linkRes, 'inventory item link')
        return NextResponse.json(
          { error: linkData.message ?? 'Inventory item created but could not be linked to the variant.' },
          { status: linkRes.status || 500 },
        )
      }
    }

    // Fetch location levels
    const levelsRes = await fetch(
      `${MEDUSA_URL}/admin/inventory-items/${inventoryItemId}/location-levels`,
      { headers },
    )
    const levelsData = await safeJson(levelsRes, 'levels fetch')
    const levels = levelsData?.inventory_levels ?? []

    // If there's no level yet (e.g. Yonex products), get one from the location list and create it
    if (levels.length === 0) {
      const locRes = await fetch(
        `${MEDUSA_URL}/admin/stock-locations?limit=1`,
        { headers },
      )
      const locData = await safeJson(locRes, 'stock locations fetch')
      const locationId = locData.stock_locations?.[0]?.id

      if (!locationId) {
        return NextResponse.json(
          {
            error:
              'No stock location found. Add one in Medusa → Settings → Stock Locations.',
          },
          { status: 404 },
        )
      }

      const createRes = await fetch(
        `${MEDUSA_URL}/admin/inventory-items/${inventoryItemId}/location-levels`,
        {
          method: 'POST',
          headers,
          body: JSON.stringify({
            location_id: locationId,
            stocked_quantity: quantity,
          }),
        },
      )
      const createData = await safeJson(createRes, 'level create')

      if (!createRes.ok) {
        return NextResponse.json(
          { error: createData.message ?? 'Failed to create level' },
          { status: createRes.status },
        )
      }

      return NextResponse.json(createData)
    }

    // Level already exists — update it
    // NOTE: Medusa v2's location-level update endpoint only accepts POST —
    // there's no PATCH route registered, which is why Express's
    // default (non-JSON) 404 page used to show up. That was the real bug.
    const locationId = levels[0].location_id
    const updateRes = await fetch(
      `${MEDUSA_URL}/admin/inventory-items/${inventoryItemId}/location-levels/${locationId}`,
      {
        method: 'POST',
        headers,
        body: JSON.stringify({ stocked_quantity: quantity }),
      },
    )
    const updateData = await safeJson(updateRes, 'update')

    if (!updateRes.ok) {
      return NextResponse.json(
        { error: updateData.message ?? 'Update failed' },
        { status: updateRes.status },
      )
    }

    return NextResponse.json(updateData)
  } catch (err: any) {
    console.error('[API] inventory adjust error:', err.message)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
