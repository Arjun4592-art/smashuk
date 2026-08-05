// app/api/store/shipping-settings/route.ts
//
// Public, read-only. Exposes just the store's Free Shipping Threshold
// (no auth required) so client components — the cart and checkout pages
// — can show the real dashboard-configured value instead of a hardcoded
// constant. Reuses the same source of truth as the dashboard's Settings >
// Shipping page (lib/shipping-settings.ts / store.metadata.shippingSettings).

import { NextResponse } from 'next/server'
import { getPublicFreeShippingThreshold } from '@/lib/shipping-settings'

export async function GET() {
  const freeShippingThreshold = await getPublicFreeShippingThreshold()
  return NextResponse.json({ freeShippingThreshold })
}
