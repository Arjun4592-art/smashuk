const MEDUSA_URL =
  process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL ?? 'http://localhost:9000'

type SyncVariant = {
  id: string
  title?: string
  sku?: string | null
  inventory_items?: {
    inventory_item_id?: string
    inventory?: { id?: string; location_levels?: any[] }
  }[]
}

// Medusa is sensitive to load, so variants are processed a few at a time
// (not all at once, and no longer strictly one after another).
const VARIANT_CONCURRENCY = 3

async function runLimited<T>(
  items: T[],
  limit: number,
  worker: (item: T) => Promise<void>,
): Promise<void> {
  let next = 0
  const lanes = Array.from(
    { length: Math.min(limit, items.length) },
    async () => {
      while (next < items.length) {
        const item = items[next++]
        await worker(item)
      }
    },
  )
  await Promise.all(lanes)
}

export interface SyncResult {
  /** Variants whose stock level was written (or created). */
  updated: number
  /** Variants that could not be synced. */
  failed: number
  /** Set when the product itself could not be read. */
  error?: string
}

// The default stock location practically never changes, so it is cached for a
// few minutes instead of being fetched on every single Save.
const LOCATION_TTL_MS = 10 * 60 * 1000
const locKey = '__smashStockLocation'
const locG = globalThis as unknown as Record<
  string,
  { id: string; at: number } | undefined
>

export async function getDefaultStockLocationId(
  authorization: string,
): Promise<string | null> {
  const cached = locG[locKey]
  if (cached && Date.now() - cached.at < LOCATION_TTL_MS) return cached.id
  const res = await fetch(`${MEDUSA_URL}/admin/stock-locations?limit=1`, {
    headers: { Authorization: authorization },
  })
  const data = await res.json().catch(() => ({}))
  const id: string | undefined = data?.stock_locations?.[0]?.id
  if (!id) return null
  locG[locKey] = { id, at: Date.now() }
  return id
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
 *
 * Speed: the product is read ONCE (stock levels included). A variant that
 * already has an item + level and nothing to write costs zero extra calls,
 * and the variants that do need work are handled a few at a time.
 */
export async function syncVariantInventory(
  productId: string,
  authorization: string,
  locationId: string,
  variantStocks: Record<string, number> = {},
  defaultQty: number = 0,
  options: {
    /**
     * When true and the product has exactly ONE variant, `defaultQty` is
     * written to that variant's EXISTING stock level too. Without this, the
     * default only ever applied when a level was being created, so editing the
     * Stock field of a single-variant product and pressing Save did nothing.
     * Only pass true when the user actually changed the stock field —
     * otherwise a stale form could overwrite a newer quantity.
     */
    applyDefaultToExisting?: boolean
    /**
     * When true, `defaultQty` is written to EVERY variant of the product
     * (single-variant or multi-variant) — used by the bulk "Set stock" action.
     */
    applyDefaultToAllVariants?: boolean
    /**
     * Skip the per-variant "is this inventory item shared with another
     * product?" lookup. The bulk stock action uses it: it only changes a
     * quantity, and that lookup is one extra Medusa call per variant.
     */
    skipSharedCheck?: boolean
  } = {},
): Promise<SyncResult> {
  const result: SyncResult = { updated: 0, failed: 0 }
  const res = await fetch(
    `${MEDUSA_URL}/admin/products/${productId}?fields=*variants,*variants.inventory_items,*variants.inventory_items.inventory.location_levels`,
    { headers: { Authorization: authorization } },
  )
  if (!res.ok) {
    result.error = `Could not read product (HTTP ${res.status})`
    return result
  }
  const data = await res.json().catch(() => null)
  const variants: SyncVariant[] = data?.product?.variants ?? []

  const applyDefault =
    options.applyDefaultToAllVariants === true ||
    (options.applyDefaultToExisting === true && variants.length === 1)

  await runLimited(variants, VARIANT_CONCURRENCY, async (variant) => {
    try {
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
      // Nothing to write for this variant unless an explicit quantity was
      // given or the caller asked for the default to be applied.
      const mustWrite = explicitQty !== undefined || applyDefault

      const invItem = variant.inventory_items?.[0]
      let inventoryItemId: string | undefined =
        invItem?.inventory_item_id ?? invItem?.inventory?.id ?? undefined
      const inlineLevel = (invItem?.inventory?.location_levels ?? []).find(
        (l: any) => l.location_id === locationId,
      )

      // Fast path: item + level exist and there is nothing to change.
      if (inventoryItemId && inlineLevel && !mustWrite) return

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
          result.failed++
          return
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
          result.failed++
          return
        }
      } else if (mustWrite && !options.skipSharedCheck) {
        // Sharing only matters when we are about to WRITE a quantity to the
        // item, so the extra lookup is skipped for untouched variants.
        inventoryItemId = await detachIfShared(
          productId,
          variant,
          inventoryItemId,
          authorization,
        )
      }

      let existingLevel = inlineLevel
      if (
        !existingLevel ||
        inventoryItemId !==
          (invItem?.inventory_item_id ?? invItem?.inventory?.id)
      ) {
        const levelsRes = await fetch(
          `${MEDUSA_URL}/admin/inventory-items/${inventoryItemId}/location-levels?location_id[]=${locationId}`,
          { headers: { Authorization: authorization } },
        )
        const levelsData = await levelsRes.json().catch(() => ({}))
        existingLevel = (levelsData.inventory_levels ?? []).find(
          (l: any) => l.location_id === locationId,
        )
      }

      if (existingLevel) {
        // Don't clobber a real quantity with a default 0 unless the caller said
        // the user really edited it.
        if (!mustWrite) return
        // `qty` is the AVAILABLE quantity (that is what the dashboard shows:
        // stocked - reserved). Medusa stores STOCKED, so add the reserved units
        // back — writing `qty` straight into stocked_quantity would silently
        // drop every reservation.
        const reserved = existingLevel.reserved_quantity ?? 0
        const currentStocked = existingLevel.stocked_quantity ?? 0
        const targetStocked = qty + reserved
        if (targetStocked === currentStocked) return
        const updateRes = await fetch(
          `${MEDUSA_URL}/admin/inventory-items/${inventoryItemId}/location-levels/${locationId}`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: authorization,
            },
            body: JSON.stringify({ stocked_quantity: targetStocked }),
          },
        ).catch(() => null)
        if (!updateRes || !updateRes.ok) {
          console.warn(
            `[inventory-sync] Stock level update failed for variant ${variant.id} (item ${inventoryItemId})`,
          )
          result.failed++
          return
        }
        result.updated++
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
          result.failed++
          return
        }
        result.updated++
      }
    } catch (err: any) {
      console.warn(
        `[inventory-sync] Variant ${variant.id} failed:`,
        err?.message,
      )
      result.failed++
    }
  })
  return result
}
