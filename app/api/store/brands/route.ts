import { NextResponse } from 'next/server'
import { safeJson } from '@/lib/api/safe-json'
const MEDUSA_URL =
  process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL ?? 'http://localhost:9000'
const PUBLISHABLE_KEY = process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY ?? ''
// `dynamic = 'force-dynamic'` and `revalidate = 600` contradicted each other:
// force-dynamic opts the segment out of caching entirely, so the 600s window
// never applied and every visitor triggered a fresh 1000-product scan against
// Medusa. This route's output depends on nothing request-specific, so drop
// force-dynamic and let the revalidate window actually do its job.
export const revalidate = 600
export async function GET() {
  try {
    const params = new URLSearchParams({
      limit: '1000',
      // This route only ever reads metadata.brand / .sport / .rating /
      // .reviewCount. `*variants.inventory_quantity` was pulling the inventory
      // module join for every variant of all ~1700 products and then throwing
      // the result away — by far the most expensive part of the query.
      fields: 'id,+metadata',
    })
    const res = await fetch(`${MEDUSA_URL}/store/products?${params}`, {
      headers: {
        'Content-Type': 'application/json',
        'x-publishable-api-key': PUBLISHABLE_KEY,
      },
      next: {
        revalidate: 600,
      },
    })
    if (!res.ok) throw new Error(`Medusa products error: ${res.status}`)
    const data = await safeJson(res, 'app/api/store/brands/route.ts')
    const products: any[] = data.products ?? []
    const brandCounts = new Map<string, number>()
    const sportCounts = new Map<string, number>()
    const sportBrands = new Map<string, Set<string>>()
    let ratingSum = 0
    let ratingCount = 0
    for (const p of products) {
      const brand = p.metadata?.brand
      if (brand) brandCounts.set(brand, (brandCounts.get(brand) ?? 0) + 1)
      const sport = p.metadata?.sport
      if (sport) {
        sportCounts.set(sport, (sportCounts.get(sport) ?? 0) + 1)
        if (brand) {
          if (!sportBrands.has(sport)) sportBrands.set(sport, new Set())
          sportBrands.get(sport)!.add(brand)
        }
      }
      const rating = Number(p.metadata?.rating ?? 0)
      const reviewCount = Number(p.metadata?.reviewCount ?? 0)
      if (rating > 0 && reviewCount > 0) {
        ratingSum += rating
        ratingCount += 1
      }
    }
    const brands = [...brandCounts.entries()]
      .map(([name, count]) => ({
        name,
        count,
      }))
      .sort((a, b) => b.count - a.count)
    const bySport = Object.fromEntries(
      [...sportCounts.entries()].map(([sport, count]) => [
        sport,
        {
          productCount: count,
          brandCount: sportBrands.get(sport)?.size ?? 0,
        },
      ]),
    )
    return NextResponse.json(
      {
        brands,
        brandCount: brands.length,
        productCount: data.count ?? products.length,
        avgRating: ratingCount
          ? Number((ratingSum / ratingCount).toFixed(1))
          : null,
        bySport,
      },
      {
        headers: {
          'Cache-Control': 'public, s-maxage=600, stale-while-revalidate=3600',
        },
      },
    )
  } catch (err: any) {
    console.error('[API] store/brands GET error:', err)
    return NextResponse.json(
      {
        brands: [],
        brandCount: 0,
        productCount: 0,
        avgRating: null,
        bySport: {},
      },
      {
        status: 200,
      },
    )
  }
}
