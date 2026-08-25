import { NextRequest, NextResponse } from 'next/server';
import { getAdminAuthHeader } from '@/lib/api/admin-auth';
import type { SiteReview } from '@/types';
const MEDUSA_URL = process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL ?? 'http://localhost:9000';
async function safeJson(res: Response) {
  const text = await res.text();
  if (!text) return {};
  try {
    return JSON.parse(text);
  } catch {
    return {
      message: text.slice(0, 300)
    };
  }
}
async function getStore(authHeader: string) {
  const res = await fetch(`${MEDUSA_URL}/admin/stores?limit=1&fields=id,metadata`, {
    headers: {
      Authorization: authHeader
    }
  });
  const data = await safeJson(res);
  if (!res.ok) throw new Error(data.message ?? 'Failed to load store');
  const store = data.stores?.[0];
  if (!store) throw new Error('No store found');
  return store;
}
async function saveReviews(authHeader: string, storeId: string, metadata: Record<string, any>, reviews: SiteReview[]) {
  const res = await fetch(`${MEDUSA_URL}/admin/stores/${storeId}`, {
    method: 'POST',
    headers: {
      Authorization: authHeader,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      metadata: {
        ...metadata,
        reviews
      }
    })
  });
  const data = await safeJson(res);
  if (!res.ok) throw new Error(data.message ?? 'Failed to update reviews');
  return data;
}
export async function DELETE(req: NextRequest, {
  params
}: {
  params: Promise<{
    id: string;
  }>;
}) {
  const authHeader = await getAdminAuthHeader(req);
  if (!authHeader) {
    return NextResponse.json({
      error: 'Unauthorized'
    }, {
      status: 401
    });
  }
  try {
    const {
      id
    } = await params;
    const store = await getStore(authHeader);
    const existing: SiteReview[] = store.metadata?.reviews ?? [];
    const remaining = existing.filter(r => r.id !== id);
    if (remaining.length === existing.length) {
      return NextResponse.json({
        error: 'Review not found'
      }, {
        status: 404
      });
    }
    await saveReviews(authHeader, store.id, store.metadata ?? {}, remaining);
    return NextResponse.json({
      success: true
    });
  } catch (err: any) {
    console.error('[API] admin/reviews DELETE error:', err);
    return NextResponse.json({
      error: err.message
    }, {
      status: 500
    });
  }
}
export async function PATCH(req: NextRequest, {
  params
}: {
  params: Promise<{
    id: string;
  }>;
}) {
  const authHeader = await getAdminAuthHeader(req);
  if (!authHeader) {
    return NextResponse.json({
      error: 'Unauthorized'
    }, {
      status: 401
    });
  }
  try {
    const {
      id
    } = await params;
    const body = await req.json();
    const store = await getStore(authHeader);
    const existing: SiteReview[] = store.metadata?.reviews ?? [];
    let found = false;
    const updated = existing.map(r => {
      if (r.id !== id) return r;
      found = true;
      return {
        ...r,
        published: typeof body.published === 'boolean' ? body.published : r.published
      };
    });
    if (!found) {
      return NextResponse.json({
        error: 'Review not found'
      }, {
        status: 404
      });
    }
    await saveReviews(authHeader, store.id, store.metadata ?? {}, updated);
    return NextResponse.json({
      review: updated.find(r => r.id === id)
    });
  } catch (err: any) {
    console.error('[API] admin/reviews PATCH error:', err);
    return NextResponse.json({
      error: err.message
    }, {
      status: 500
    });
  }
}
