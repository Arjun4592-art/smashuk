import { NextResponse } from 'next/server'
import { loadBrandStats } from '@/lib/brand-stats-server'
// `dynamic = 'force-dynamic'` and `revalidate = 600` contradicted each other:
// force-dynamic opts the segment out of caching entirely, so the 600s window
// never applied and every visitor triggered a fresh 1000-product scan against
// Medusa. This route's output depends on nothing request-specific, so drop
// force-dynamic and let the revalidate window actually do its job.
export const revalidate = 600
export async function GET() {
  try {
    // One implementation, shared with the homepage (lib/brand-stats-server.ts).
    const stats = await loadBrandStats()
    return NextResponse.json(stats, {
      headers: {
        'Cache-Control': 'public, s-maxage=600, stale-while-revalidate=3600',
      },
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
