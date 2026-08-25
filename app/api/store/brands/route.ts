import { NextResponse } from 'next/server'
import { safeJson } from '@/lib/api/safe-json'
const MEDUSA_URL =
  process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL ?? 'http://localhost:9000'
const PUBLISHABLE_KEY = process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY ?? ''
export const dynamic = 'force-dynamic'
export const revalidate = 600
export async function GET() {
  try {
    const params = new URLSearchParams({
      limit: '1000',
      fields: '+metadata,*variants.inventory_quantity',
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
    return NextResponse.json({
      brands,
      brandCount: brands.length,
      productCount: data.count ?? products.length,
      avgRating: ratingCount
        ? Number((ratingSum / ratingCount).toFixed(1))
        : null,
      bySport,
    })
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
