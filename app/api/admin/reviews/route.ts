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
export async function GET(req: NextRequest) {
  const authHeader = await getAdminAuthHeader(req);
  if (!authHeader) {
    return NextResponse.json({
      error: 'Unauthorized'
    }, {
      status: 401
    });
  }
  try {
    const store = await getStore(authHeader);
    const reviews: SiteReview[] = store.metadata?.reviews ?? [];
    reviews.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    return NextResponse.json({
      reviews
    });
  } catch (err: any) {
    console.error('[API] admin/reviews GET error:', err);
    return NextResponse.json({
      error: err.message
    }, {
      status: 500
    });
  }
}
export async function POST(req: NextRequest) {
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
    const {
      name,
      sport,
      city,
      rating,
      review,
      avatar,
      published
    } = body;
    if (!name || !review || !rating) {
      return NextResponse.json({
        error: 'name, review and rating are required'
      }, {
        status: 400
      });
    }
    const store = await getStore(authHeader);
    const existing: SiteReview[] = store.metadata?.reviews ?? [];
    const newReview: SiteReview = {
      id: `rev_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      name: String(name).trim(),
      sport: String(sport ?? '').trim(),
      city: String(city ?? '').trim(),
      rating: Math.min(5, Math.max(1, Number(rating))),
      review: String(review).trim(),
      avatar: avatar || String(name).trim().split(/\s+/).map((w: string) => w[0]).slice(0, 2).join('').toUpperCase(),
      published: published ?? true,
      createdAt: new Date().toISOString()
    };
    const updated = [...existing, newReview];
    const res = await fetch(`${MEDUSA_URL}/admin/stores/${store.id}`, {
      method: 'POST',
      headers: {
        Authorization: authHeader,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        metadata: {
          ...(store.metadata ?? {}),
          reviews: updated
        }
      })
    });
    const data = await safeJson(res);
    if (!res.ok) {
      return NextResponse.json({
        error: data.message ?? 'Failed to save review'
      }, {
        status: res.status
      });
    }
    return NextResponse.json({
      review: newReview
    });
  } catch (err: any) {
    console.error('[API] admin/reviews POST error:', err);
    return NextResponse.json({
      error: err.message
    }, {
      status: 500
    });
  }
}
