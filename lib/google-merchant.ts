import 'server-only'
import { medusaServiceFetch } from '@/lib/api/medusa-service-token'

// The "Store code" from Google Business Profile for the physical store. It
// must match EXACTLY, otherwise Merchant Center can't link the inventory to
// the store. Set GOOGLE_STORE_CODE in the environment.
export const GOOGLE_STORE_CODE = process.env.GOOGLE_STORE_CODE ?? ''

// Single source of truth for the Merchant Center offer ID. The online product
// feed (/api/feeds/google-shopping) and the local inventory feed
// (/api/feeds/google-local-inventory) MUST use the same value, otherwise
// Google can't match a store's stock to the online product.
//
// Keeps the original Shopify offer ID where we backfilled it (see
// scripts/backfill-shopify-ids.ts) so Merchant Center treats this as the same
// listing instead of a brand-new one.
export function googleOfferId(variant: any): string {
  const shopifyProductId = variant.metadata?.shopify_product_id
  const shopifyVariantId = variant.metadata?.shopify_variant_id
  if (shopifyProductId && shopifyVariantId) {
    return `shopify_GB_${shopifyProductId}_${shopifyVariantId}`
  }
  return variant.sku || variant.id
}

export async function findSalesChannelId(
  name: string,
): Promise<string | undefined> {
  try {
    const res = await medusaServiceFetch('/admin/sales-channels?limit=100')
    if (!res.ok) return undefined
    const data = await res.json()
    const channel = (data.sales_channels ?? []).find(
      (c: any) => c.name?.toLowerCase() === name.toLowerCase(),
    )
    return channel?.id
  } catch {
    return undefined
  }
}

const PAGE_SIZE = 100
const MAX_PAGES = 100 // safety cap: 10,000 products

// Pages through /admin/products. Throws on a failed page so a feed is never
// silently published half-empty (Merchant Center would treat the missing
// items as deleted).
export async function listAdminProducts(
  params: Record<string, string>,
): Promise<any[]> {
  const products: any[] = []
  for (let page = 0; page < MAX_PAGES; page++) {
    const qs = new URLSearchParams({
      ...params,
      limit: String(PAGE_SIZE),
      offset: String(page * PAGE_SIZE),
    })
    const res = await medusaServiceFetch(`/admin/products?${qs}`)
    if (!res.ok) {
      throw new Error(`Medusa /admin/products failed with ${res.status}`)
    }
    const data = await res.json()
    const batch: any[] = data.products ?? []
    products.push(...batch)
    if (batch.length < PAGE_SIZE) break
  }
  return products
}

// IDs of every product that is sold in the physical store (the "Store" sales
// channel). Returns null if it can't be worked out, so callers can fail safe.
export async function getStoreChannelProductIds(): Promise<Set<string> | null> {
  try {
    const storeChannelId = await findSalesChannelId('Store')
    if (!storeChannelId) return null
    const products = await listAdminProducts({
      sales_channel_id: storeChannelId,
      fields: 'id',
    })
    return new Set(products.map((p) => p.id))
  } catch {
    return null
  }
}
