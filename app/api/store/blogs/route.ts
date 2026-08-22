// app/api/store/blogs/route.ts
//
// Public, unauthenticated proxy so the website /blog pages can show real
// posts written in the dashboard instead of the old hardcoded
// lib/blog-posts.ts array. Mirrors the pattern used in
// app/api/store/brands/route.ts (publishable key, no admin auth, cached).
//
// Assumes the Medusa backend's blog-post module exposes a matching public
// GET /store/blog-posts route that only returns status: "published" posts.
// If that store route doesn't exist yet on the backend (only /admin/blog-posts
// does), this will 404/500 — the backend module needs a store route added.

import { NextRequest, NextResponse } from 'next/server'
import { safeJson } from '@/lib/api/safe-json'

const MEDUSA_URL =
  process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL ?? 'http://localhost:9000'
const PUBLISHABLE_KEY = process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY ?? ''

export const revalidate = 120 // 2 min — new/edited posts show up quickly

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const url = new URL('/store/blog-posts', MEDUSA_URL)
    url.searchParams.set('status', 'published')
    if (searchParams.get('category')) {
      url.searchParams.set('category', searchParams.get('category')!)
    }
    if (searchParams.get('limit')) {
      url.searchParams.set('limit', searchParams.get('limit')!)
    }

    const res = await fetch(url.toString(), {
      headers: {
        'Content-Type': 'application/json',
        'x-publishable-api-key': PUBLISHABLE_KEY,
      },
      next: { revalidate: 120 },
    })

    if (!res.ok) {
      const err = await safeJson(res, 'app/api/store/blogs/route.ts')
      return NextResponse.json(
        { posts: [], error: err.message },
        { status: 200 }, // never break the website's blog page, just show empty
      )
    }
    const data = await safeJson(res, 'app/api/store/blogs/route.ts')
    return NextResponse.json({ posts: data.posts ?? data.blog_posts ?? [] })
  } catch (err: any) {
    console.error('[API] store/blogs GET error:', err)
    return NextResponse.json({ posts: [], error: err.message }, { status: 200 })
  }
}
