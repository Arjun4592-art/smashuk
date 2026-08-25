import { NextRequest, NextResponse } from 'next/server';
import { getAdminAuthHeader } from '@/lib/api/admin-auth';
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
export async function DELETE(req: NextRequest, {
  params
}: {
  params: Promise<{
    id: string;
    variantId: string;
  }>;
}) {
  try {
    const {
      id,
      variantId
    } = await params;
    const authorization = (await getAdminAuthHeader(req)) ?? '';
    if (!authorization) {
      return NextResponse.json({
        error: 'Missing Authorization header'
      }, {
        status: 401
      });
    }
    const res = await fetch(`${MEDUSA_URL}/admin/products/${id}/variants/${variantId}`, {
      method: 'DELETE',
      headers: {
        Authorization: authorization
      }
    });
    const data = await safeJson(res);
    return NextResponse.json(data, {
      status: res.status
    });
  } catch (err: any) {
    console.error('[DELETE products/:id/variants/:variantId]', err);
    return NextResponse.json({
      error: err.message
    }, {
      status: 500
    });
  }
}
