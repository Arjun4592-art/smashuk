import { NextRequest, NextResponse } from 'next/server'
import { getAdminAuthHeader } from '@/lib/api/admin-auth'
import { safeJson } from '@/lib/api/safe-json'

const MEDUSA_URL =
  process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL ?? 'http://localhost:9000'

// Powers the Brand / Sport dropdowns on the Add/Edit Product pages.
//
// Brand and Sport stay exactly what they've always been — free-text fields
// on product.metadata (metadata.brand / metadata.sport). Nothing about how
// that data is stored or read changes here, on purpose: the storefront,
// POS, filters, and everywhere else that reads metadata.brand/metadata.sport
// keep working completely untouched.
//
// The only thing this route changes is where the *dropdown options* come
// from: instead of a hardcoded SPORTS/BRANDS array baked into the frontend
// (which drifted out of sync across files and needed a code deploy to
// update), the options are now the distinct values already in use across
// the real product catalog — plus whatever new value someone types into
// "+ Add new", which just becomes an option going forward the moment it's
// saved on a product.
export async function GET(req: NextRequest) {
  const authHeader = await getAdminAuthHeader(req)
  if (!authHeader) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const brands = new Set<string>()
    const sports = new Set<string>()

    let offset = 0
    const limit = 200
    let total = Infinity

    while (offset < total) {
      const url = new URL('/admin/products', MEDUSA_URL)
      url.searchParams.set('limit', String(limit))
      url.searchParams.set('offset', String(offset))
      url.searchParams.set('fields', 'id,metadata')

      const res = await fetch(url.toString(), {
        headers: {
          Authorization: authHeader,
          'Content-Type': 'application/json',
        },
      })
      if (!res.ok) {
        const err = await safeJson(res, 'app/api/admin/products/field-options/route.ts')
        return NextResponse.json({ error: err.message }, { status: res.status })
      }
      const data = await safeJson(res, 'app/api/admin/products/field-options/route.ts')
      total = data.count ?? 0

      for (const p of data.products ?? []) {
        const brand = p.metadata?.brand
        const sport = p.metadata?.sport
        if (typeof brand === 'string' && brand.trim()) brands.add(brand.trim())
        if (typeof sport === 'string' && sport.trim()) sports.add(sport.trim())
      }

      offset += limit
    }

    return NextResponse.json({
      brands: [...brands].sort((a, b) => a.localeCompare(b)),
      sports: [...sports].sort((a, b) => a.localeCompare(b)),
    })
  } catch (err: any) {
    console.error('[API] field-options error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
