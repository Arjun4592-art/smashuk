import { NextRequest, NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { getAdminAuthHeader } from '@/lib/api/admin-auth';
import { safeJson } from '@/lib/api/safe-json';
function revalidateBlog(slug?: string) {
  if (slug) revalidatePath(`/blog/${slug}`);
  revalidatePath('/blog');
}
const MEDUSA_URL = process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL ?? 'http://localhost:9000';
export async function GET(req: NextRequest, {
  params
}: {
  params: Promise<{
    id: string;
  }>;
}) {
  const {
    id
  } = await params;
  const authHeader = await getAdminAuthHeader(req);
  if (!authHeader) {
    return NextResponse.json({
      error: 'Unauthorized'
    }, {
      status: 401
    });
  }
  try {
    const res = await fetch(`${MEDUSA_URL}/admin/blog-posts/${id}`, {
      headers: {
        Authorization: authHeader,
        'Content-Type': 'application/json'
      }
    });
    if (!res.ok) {
      const err = await safeJson(res, 'app/api/admin/blogs/[id]/route.ts');
      return NextResponse.json({
        error: err.message
      }, {
        status: res.status
      });
    }
    return NextResponse.json(await safeJson(res, 'app/api/admin/blogs/[id]/route.ts'));
  } catch (err: any) {
    console.error('[API] blog get error:', err);
    return NextResponse.json({
      error: err.message
    }, {
      status: 500
    });
  }
}
export async function POST(req: NextRequest, {
  params
}: {
  params: Promise<{
    id: string;
  }>;
}) {
  const {
    id
  } = await params;
  const authHeader = await getAdminAuthHeader(req);
  if (!authHeader) {
    return NextResponse.json({
      error: 'Unauthorized'
    }, {
      status: 401
    });
  }
  try {
    const body = await req.json();
    const res = await fetch(`${MEDUSA_URL}/admin/blog-posts/${id}`, {
      method: 'POST',
      headers: {
        Authorization: authHeader,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(body)
    });
    if (!res.ok) {
      const err = await safeJson(res, 'app/api/admin/blogs/[id]/route.ts');
      return NextResponse.json({
        error: err.message
      }, {
        status: res.status
      });
    }
    const data = await safeJson(res, 'app/api/admin/blogs/[id]/route.ts');
    revalidateBlog(data?.post?.slug ?? body?.slug);
    return NextResponse.json(data);
  } catch (err: any) {
    console.error('[API] blog update error:', err);
    return NextResponse.json({
      error: err.message
    }, {
      status: 500
    });
  }
}
export async function DELETE(req: NextRequest, {
  params
}: {
  params: Promise<{
    id: string;
  }>;
}) {
  const {
    id
  } = await params;
  const authHeader = await getAdminAuthHeader(req);
  if (!authHeader) {
    return NextResponse.json({
      error: 'Unauthorized'
    }, {
      status: 401
    });
  }
  try {
    let slug: string | undefined;
    try {
      const existing = await fetch(`${MEDUSA_URL}/admin/blog-posts/${id}`, {
        headers: {
          Authorization: authHeader
        }
      });
      if (existing.ok) {
        const data = await safeJson(existing, 'app/api/admin/blogs/[id]/route.ts');
        slug = data?.post?.slug;
      }
    } catch {}
    const res = await fetch(`${MEDUSA_URL}/admin/blog-posts/${id}`, {
      method: 'DELETE',
      headers: {
        Authorization: authHeader
      }
    });
    if (!res.ok) {
      const err = await safeJson(res, 'app/api/admin/blogs/[id]/route.ts');
      return NextResponse.json({
        error: err.message
      }, {
        status: res.status
      });
    }
    const data = await safeJson(res, 'app/api/admin/blogs/[id]/route.ts');
    revalidateBlog(slug);
    return NextResponse.json(data);
  } catch (err: any) {
    console.error('[API] blog delete error:', err);
    return NextResponse.json({
      error: err.message
    }, {
      status: 500
    });
  }
}
