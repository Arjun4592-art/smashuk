// lib/api/selling-channels-client.ts
//
// Client-safe copy of the inferSellingChannel logic from
// lib/api/selling-channels.ts (which is marked 'server-only' and can't be
// imported from a 'use client' page). Keep these two in sync if the
// "Website" / "Store" naming ever changes.

export type SellingChannel = 'both' | 'website' | 'store'

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
  return 'both'
}
