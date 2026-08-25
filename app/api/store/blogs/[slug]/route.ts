import { NextRequest, NextResponse } from 'next/server';
import { safeJson } from '@/lib/api/safe-json';
const MEDUSA_URL = process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL ?? 'http://localhost:9000';
const PUBLISHABLE_KEY = process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY ?? '';
export const revalidate = 120;
export async function GET(req: NextRequest, {
  params
}: {
  params: Promise<{
    slug: string;
  }>;
}) {
  const {
    slug
  } = await params;
  try {
    const res = await fetch(`${MEDUSA_URL}/store/blog-posts/${encodeURIComponent(slug)}`, {
      headers: {
        'Content-Type': 'application/json',
        'x-publishable-api-key': PUBLISHABLE_KEY
      },
      next: {
        revalidate: 120
      }
    });
    if (!res.ok) {
      const err = await safeJson(res, 'app/api/store/blogs/[slug]/route.ts');
      return NextResponse.json({
        post: null,
        error: err.message
      }, {
        status: res.status === 404 ? 404 : 200
      });
    }
    const data = await safeJson(res, 'app/api/store/blogs/[slug]/route.ts');
    const post = data.post ?? data.blog_post ?? null;
    if (!post || post.status !== 'published') {
      return NextResponse.json({
        post: null
      }, {
        status: 404
      });
    }
    return NextResponse.json({
      post
    });
  } catch (err: any) {
    console.error('[API] store/blogs/[slug] GET error:', err);
    return NextResponse.json({
      post: null,
      error: err.message
    }, {
      status: 200
    });
  }
}
