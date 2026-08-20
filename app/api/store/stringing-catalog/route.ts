// app/api/store/stringing-catalog/route.ts
//
// Public, read-only, no auth. Exposes the manually-managed string catalog
// (see lib/stringing-catalog.ts) filtered to `available: true`, and grouped
// by sport, so the /local-store/stringing booking form can show only
// what's actually in stock right now instead of the full static list.
//
// Optional ?sport=badminton|tennis|squash narrows the response.

import { NextRequest, NextResponse } from 'next/server'
import { getStringingCatalog } from '@/lib/stringing-catalog'

export async function GET(req: NextRequest) {
  try {
    const sport = req.nextUrl.searchParams.get('sport')
    const all = await getStringingCatalog()
    const available = all.filter((i) => i.available)
    const filtered = sport
      ? available.filter((i) => i.sport === sport)
      : available

    return NextResponse.json({ items: filtered })
  } catch (err: any) {
    console.error('[store/stringing-catalog] error:', err)
    // Fail soft — empty list means the form falls back to its static
    // lib/stringing-options.ts groups instead of erroring out.
    return NextResponse.json({ items: [] })
  }
}
