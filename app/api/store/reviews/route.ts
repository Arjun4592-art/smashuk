// app/api/store/reviews/route.ts
//
// PUBLIC endpoint (no login required) — powers the homepage ReviewsSlider.
// Reads `store.metadata.reviews` via the service account (same pattern as
// lib/api/store-contact.ts) and returns only `published: true` reviews,
// newest first. No auth required, but nothing sensitive lives on a review.

import { NextResponse } from 'next/server'
import { medusaServiceFetch } from '@/lib/api/medusa-service-token'
import type { SiteReview } from '@/types'
import { safeJson } from '@/lib/api/safe-json'

export const revalidate = 300 // 5 min

export async function GET() {
  try {
    const res = await medusaServiceFetch(
      '/admin/stores?limit=1&fields=id,metadata',
    )
    if (!res.ok) throw new Error(`Medusa stores error: ${res.status}`)

    const { stores } = await safeJson(res, 'app/api/store/reviews/route.ts')
    const store = stores?.[0]
    const all: SiteReview[] = store?.metadata?.reviews ?? []

    const published = all
      .filter((r) => r.published)
      .sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      )

    return NextResponse.json({ reviews: published })
  } catch (err: any) {
    console.error('[API] store/reviews GET error:', err)
    // Fail soft — the slider handles an empty list gracefully.
    return NextResponse.json({ reviews: [] })
  }
}
