// lib/stringing-catalog-types.ts
//
// Plain type definitions shared between the server-only data layer
// (lib/stringing-catalog.ts, which has `import 'server-only'` and must
// never be imported at runtime from a 'use client' component) and client
// components that only need the shape, not the data-fetching logic —
// e.g. app/dashboard/settings/page.tsx and
// components/website/StringingBookingForm.tsx.
//
// Kept in its own file (rather than relying on `import type` being elided
// from the client bundle) so there's no ambiguity: this file has no
// 'server-only' import and is always safe to import from either side.

export type Sport = 'badminton' | 'tennis' | 'squash'

export interface StringCatalogItem {
  id: string
  sport: Sport
  brand: string
  name: string
  available: boolean
}
