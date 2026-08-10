// app/api/store/store-info/route.ts
//
// Public, read-only. Exposes just the store's display name + address (no
// auth required) so client components — like the pickup "Get Directions"
// card on the order detail page — can build a Google Maps link without
// needing a server component. Reuses the same source of truth as the
// Footer (lib/store-contact.ts), so it always matches what the dashboard's
// General Settings page has configured.

import { NextResponse } from 'next/server'
import { getPublicStoreContact } from '@/lib/store-contact'

export async function GET() {
  const contact = await getPublicStoreContact()
  return NextResponse.json(contact)
}
