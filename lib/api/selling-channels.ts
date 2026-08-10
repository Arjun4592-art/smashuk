// lib/api/selling-channels.ts
//
// SERVER-ONLY. Maps the dashboard's "Sell on: Website / Store / Both" product
// field to real Medusa sales_channel ids. We use two fixed, named sales
// channels — "Website" and "Store" — instead of the single default channel
// every product used to get auto-attached to. If either channel doesn't
// exist yet (e.g. fresh Medusa instance), it's created on first use.

import 'server-only'

export type SellingChannel = 'both' | 'website' | 'store'

const CHANNEL_NAMES: Record<'website' | 'store', string> = {
  website: 'Website',
  store: 'Store',
}

let cache: { website?: string; store?: string } | null = null

async function ensureChannel(
  key: 'website' | 'store',
  authorization: string,
  medusaUrl: string,
): Promise<string | undefined> {
  if (cache?.[key]) return cache[key]

  const name = CHANNEL_NAMES[key]

  // Look for an existing channel with this exact name first.
  const listRes = await fetch(`${medusaUrl}/admin/sales-channels?limit=100`, {
    headers: { Authorization: authorization },
  })
  const listData = await listRes.json().catch(() => ({}))
  let channel = (listData.sales_channels ?? []).find(
    (c: any) => c.name?.toLowerCase() === name.toLowerCase(),
  )

  // Not found — create it.
  if (!channel) {
    const createRes = await fetch(`${medusaUrl}/admin/sales-channels`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: authorization,
      },
      body: JSON.stringify({
        name,
        description:
          key === 'website'
            ? 'Products sold on the smashuk.co website'
            : 'Products sold in-store via POS',
      }),
    })
    const createData = await createRes.json().catch(() => ({}))
    channel = createData.sales_channel
  }

  if (channel?.id) {
    cache = { ...cache, [key]: channel.id }
    return channel.id
  }
  return undefined
}

/**
 * Given the dashboard's selling-channel choice, return the Medusa
 * `sales_channels` array to attach to a product. Falls back to whatever
 * channel already exists (old single-channel behaviour) if channel
 * creation/lookup fails for some reason — a product should never end up
 * unsellable just because this helper had a hiccup.
 */
export async function resolveSalesChannels(
  selling: SellingChannel | undefined,
  authorization: string,
  medusaUrl: string,
): Promise<{ id: string }[] | undefined> {
  const choice = selling ?? 'both'

  try {
    const ids: string[] = []
    if (choice === 'website' || choice === 'both') {
      const id = await ensureChannel('website', authorization, medusaUrl)
      if (id) ids.push(id)
    }
    if (choice === 'store' || choice === 'both') {
      const id = await ensureChannel('store', authorization, medusaUrl)
      if (id) ids.push(id)
    }
    if (ids.length > 0) return ids.map((id) => ({ id }))
  } catch (err) {
    console.warn('[selling-channels] resolve failed:', err)
  }

  // Fallback: old behaviour — attach whatever the first available channel is,
  // so the product is at least sellable somewhere instead of nowhere.
  try {
    const res = await fetch(`${medusaUrl}/admin/sales-channels?limit=1`, {
      headers: { Authorization: authorization },
    })
    const data = await res.json()
    const fallbackId = data.sales_channels?.[0]?.id
    return fallbackId ? [{ id: fallbackId }] : undefined
  } catch {
    return undefined
  }
}

/**
 * Given a product's sales_channels array (as returned by Medusa), figure out
 * which dashboard choice it maps back to — for pre-filling the edit form.
 */
export function inferSellingChannel(
  salesChannels: { name?: string }[] | undefined,
): SellingChannel {
  const names = new Set(
    (salesChannels ?? []).map((c) => c.name?.toLowerCase()).filter(Boolean),
  )
  const hasWebsite = names.has('website')
  const hasStore = names.has('store')
  if (hasWebsite && hasStore) return 'both'
  if (hasStore) return 'store'
  if (hasWebsite) return 'website'
  // Unrecognized/legacy default channel — treat as "both" so nothing that
  // used to be sellable everywhere silently narrows down.
  return 'both'
}
