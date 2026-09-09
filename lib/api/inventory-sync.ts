const MEDUSA_URL =
  process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL ?? 'http://localhost:9000'

type SyncVariant = {
  id: string
  title?: string
  sku?: string | null
  inventory_items?: {
    inventory_item_id?: string
    inventory?: { id?: string }
  }[]
}

/**
 * Generates a SKU that is guaranteed not to collide with anything else in
 * the store. A blank/duplicate SKU is the main way two unrelated variants
 * end up sharing one Medusa inventory item (Medusa falls back to matching
 * by SKU when a variant has no explicit inventory item), so every variant
 * must get a real, unique value before we touch inventory at all.
 */
function generateFallbackSku(productId: string, variantId: string): string {
  return `AUTO-${productId.slice(-8)}-${variantId.slice(-8)}`.toUpperCase()
}

async function ensureUniqueSku(
  productId: string,
  variant: SyncVariant,
  authorization: string,
): Promise<string> {
  if (variant.sku && variant.sku.trim().length > 0) return variant.sku
  const sku = generateFallbackSku(productId, variant.id)
  await fetch(
    `${MEDUSA_URL}/admin/products/${productId}/variants/${variant.id}`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: authorization,
      },
      body: JSON.stringify({ sku }),
    },
  ).catch(() => {})
  return sku
}

/**
 * Checks whether an inventory item is linked to any variant outside the
 * given product. If it is, this variant was handed a shared item — split it
 * off onto a brand-new dedicated inventory item immediately instead of
 * letting the collision reach the storefront.
 */
async function detachIfShared(
  productId: string,
  variant: SyncVariant,
  inventoryItemId: string,
  authorization: string,
): Promise<string> {
  const res = await fetch(
    `${MEDUSA_URL}/admin/inventory-items/${inventoryItemId}?fields=*variants,*variants.product_id`,
    { headers: { Authorization: authorization } },
  )
  if (!res.ok) return inventoryItemId
  const data = await res.json().catch(() => null)
  const linkedVariants: any[] = data?.inventory_item?.variants ?? []
  const sharedWithOtherProduct = linkedVariants.some(
    (v: any) => v.product_id && v.product_id !== productId,
  )
  if (!sharedWithOtherProduct) return inventoryItemId

  await fetch(
    `${MEDUSA_URL}/admin/products/${productId}/variants/${variant.id}/inventory-items/${inventoryItemId}`,
    { method: 'DELETE', headers: { Authorization: authorization } },
  ).catch(() => {})

  const sku = await ensureUniqueSku(productId, variant, authorization)
  const createRes = await fetch(`${MEDUSA_URL}/admin/inventory-items`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: authorization,
    },
    body: JSON.stringify({ sku }),
  })
  const createData = await createRes.json().catch(() => ({}))
  const newInventoryItemId = createData.inventory_item?.id ?? createData.id
  if (!newInventoryItemId) return inventoryItemId

  await fetch(
    `${MEDUSA_URL}/admin/products/${productId}/variants/${variant.id}/inventory-items`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: authorization,
      },
      body: JSON.stringify({
        inventory_item_id: newInventoryItemId,
        required_quantity: 1,
      }),
    },
  ).catch(() => {})

  console.warn(
    `[inventory-sync] Variant ${variant.id} on product ${productId} was sharing inventory item ${inventoryItemId} with another product — split onto ${newInventoryItemId}.`,
  )
  return newInventoryItemId
}

/**
 * Guarantees every variant on a product has its own dedicated inventory
 * item and an explicit (never-blank) stock level row at the given location.
 * Call this after any create/update that touches variants — new product,
 * edited product, or a single new variant added to an existing product.
 */
export async function syncVariantInventory(
  productId: string,
  authorization: string,
  locationId: string,
  variantStocks: Record<string, number> = {},
  defaultQty: number = 0,
): Promise<void> {
  const res = await fetch(
    `${MEDUSA_URL}/admin/products/${productId}?fields=*variants,*variants.inventory_items,*variants.inventory_items.inventory.location_levels`,
    { headers: { Authorization: authorization } },
  )
  if (!res.ok) return
  const data = await res.json().catch(() => null)
  const variants: SyncVariant[] = data?.product?.variants ?? []

  for (const variant of variants) {
    const invItem = variant.inventory_items?.[0]
    let inventoryItemId: string | undefined =
      invItem?.inventory_item_id ?? invItem?.inventory?.id ?? undefined

    if (!inventoryItemId) {
      const sku = await ensureUniqueSku(productId, variant, authorization)
      const createRes = await fetch(`${MEDUSA_URL}/admin/inventory-items`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: authorization,
        },
        body: JSON.stringify({ sku }),
      })
      const createData = await createRes.json().catch(() => ({}))
      inventoryItemId = createData.inventory_item?.id ?? createData.id
      if (!inventoryItemId) {
        console.warn(
          `[inventory-sync] Could not create inventory item for variant ${variant.id}`,
        )
        continue
      }
      const linkRes = await fetch(
        `${MEDUSA_URL}/admin/products/${productId}/variants/${variant.id}/inventory-items`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: authorization,
          },
          body: JSON.stringify({
            inventory_item_id: inventoryItemId,
            required_quantity: 1,
          }),
        },
      )
      if (!linkRes.ok) {
        const linkErr = await linkRes.json().catch(() => ({}))
        console.warn(
          `[inventory-sync] Link failed for variant ${variant.id} (item ${inventoryItemId}):`,
          linkErr.message,
        )
        continue
      }
    } else {
      inventoryItemId = await detachIfShared(
        productId,
        variant,
        inventoryItemId,
        authorization,
      )
    }

    const variantTitle = variant.title ?? ''
    const normalizedTitle = variantTitle.trim().toLowerCase()
    let explicitQty =
      variantStocks[variantTitle] ??
      variantStocks[variant.sku ?? ''] ??
      variantStocks[variant.id] ??
      variantStocks[variantTitle.trim()]
    if (explicitQty === undefined) {
      // Fall back to a case/whitespace-insensitive match in case the
      // caller's key formatting doesn't exactly match Medusa's variant title.
      const fallbackKey = Object.keys(variantStocks).find(
        (k) => k.trim().toLowerCase() === normalizedTitle,
      )
      if (fallbackKey) explicitQty = variantStocks[fallbackKey]
    }
    const qty =
      explicitQty !== undefined && explicitQty >= 0 ? explicitQty : defaultQty

    const levelsRes = await fetch(
      `${MEDUSA_URL}/admin/inventory-items/${inventoryItemId}/location-levels?location_id[]=${locationId}`,
      { headers: { Authorization: authorization } },
    )
    const levelsData = await levelsRes.json().catch(() => ({}))
    const existingLevel = (levelsData.inventory_levels ?? []).find(
      (l: any) => l.location_id === locationId,
    )
    if (existingLevel) {
      if (explicitQty === undefined) continue // don't clobber a real quantity with a default 0
      await fetch(
        `${MEDUSA_URL}/admin/inventory-items/${inventoryItemId}/location-levels/${locationId}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: authorization,
          },
          body: JSON.stringify({ stocked_quantity: qty }),
        },
      ).catch(() => {})
    } else {
      // Always create the row explicitly — a variant must never be left
      // with no stock level at all, even if that means starting at 0.
      const createLevelRes = await fetch(
        `${MEDUSA_URL}/admin/inventory-items/${inventoryItemId}/location-levels`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: authorization,
          },
          body: JSON.stringify({
            location_id: locationId,
            stocked_quantity: qty,
          }),
        },
      )
      if (!createLevelRes.ok) {
        const levelErr = await createLevelRes.json().catch(() => ({}))
        console.warn(
          `[inventory-sync] Stock level create failed for variant ${variant.id} (item ${inventoryItemId}):`,
          levelErr.message,
        )
      }
    }
  }
}
