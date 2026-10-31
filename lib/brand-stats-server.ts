import 'server-only'
import { safeJson } from '@/lib/api/safe-json'
import type { BrandStats } from '@/lib/api/store'

const MEDUSA_URL =
  process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL ?? 'http://localhost:9000'
const PUBLISHABLE_KEY = process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY ?? ''

export async function loadBrandStats(): Promise<BrandStats> {
  const params = new URLSearchParams({
    limit: '1000',
    // Only metadata is read. Asking for inventory here used to join the
    // inventory module for every variant and then discard the result.
    fields: 'id,+metadata',
  })
  const res = await fetch(`${MEDUSA_URL}/store/products?${params}`, {
    headers: {
      'Content-Type': 'application/json',
      'x-publishable-api-key': PUBLISHABLE_KEY,
    },
    next: { revalidate: 600 },
  })
  if (!res.ok) throw new Error(`Medusa products error: ${res.status}`)
  const data = await safeJson(res, 'lib/brand-stats-server.ts')
  const products: { metadata?: Record<string, unknown> }[] = data.products ?? []
  const brandCounts = new Map<string, number>()
  const sportCounts = new Map<string, number>()
  const sportBrands = new Map<string, Set<string>>()
  let ratingSum = 0
  let ratingCount = 0
  for (const p of products) {
    const brand = p.metadata?.brand as string | undefined
    if (brand) brandCounts.set(brand, (brandCounts.get(brand) ?? 0) + 1)
    const sport = p.metadata?.sport as string | undefined
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
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
  const bySport = Object.fromEntries(
    [...sportCounts.entries()].map(([sport, count]) => [
      sport,
      { productCount: count, brandCount: sportBrands.get(sport)?.size ?? 0 },
    ]),
  )
  return {
    brands,
    brandCount: brands.length,
    productCount: data.count ?? products.length,
    avgRating: ratingCount
      ? Number((ratingSum / ratingCount).toFixed(1))
      : null,
    bySport,
  }
}

/** Never throws; the homepage falls back to client-side loading on failure. */
export async function loadBrandStatsSafe(): Promise<BrandStats | undefined> {
  try {
    return await loadBrandStats()
  } catch (err) {
    console.error(
      '[brand-stats] server load failed:',
      err instanceof Error ? err.message : err,
    )
    return undefined
  }
}
