import { NextRequest, NextResponse } from 'next/server';
import { getAdminAuthHeader } from '@/lib/api/admin-auth';
import { safeJson } from '@/lib/api/safe-json';
export async function POST(req: NextRequest) {
  try {
    const authorization = (await getAdminAuthHeader(req)) ?? '';
    if (!authorization) {
      return NextResponse.json({
        error: 'Unauthorized'
      }, {
        status: 401
      });
    }
    const contentType = req.headers.get('content-type') ?? '';
    const body = await req.arrayBuffer();
    const medusaUrl = `${process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL}/admin/uploads`;
    const res = await fetch(medusaUrl, {
      method: 'POST',
      headers: {
        'Content-Type': contentType,
        Authorization: authorization
      },
      body: Buffer.from(body)
    });
    const data = await safeJson(res, 'app/api/admin/uploads/route.ts');
    if (!res.ok) {
      console.error('[API] Medusa upload error:', data);
      return NextResponse.json({
        error: data?.message ?? 'Upload failed'
      }, {
        status: res.status
      });
    }
    return NextResponse.json(data);
  } catch (err: any) {
    console.error('[API] upload error:', err);
    return NextResponse.json({
      error: err.message
    }, {
      status: 500
    });
  }
}
