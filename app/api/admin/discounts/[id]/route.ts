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
  if (!authHeader) return NextResponse.json({
    error: 'Unauthorized'
  }, {
    status: 401
  });
  try {
    const res = await fetch(`${MEDUSA_URL}/admin/promotions/${id}`, {
      headers: {
        Authorization: authHeader,
        'Content-Type': 'application/json'
      }
    });
    const data = await safeJson(res);
    return NextResponse.json(data, {
      status: res.status
    });
  } catch (err: any) {
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
  const {
    id
  } = await params;
  const authHeader = await getAdminAuthHeader(req);
  if (!authHeader) return NextResponse.json({
    error: 'Unauthorized'
  }, {
    status: 401
  });
  try {
    const body = await req.json();
    const res = await fetch(`${MEDUSA_URL}/admin/promotions/${id}`, {
      method: 'POST',
      headers: {
        Authorization: authHeader,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(body)
    });
    const data = await safeJson(res);
    return NextResponse.json(data, {
      status: res.status
    });
  } catch (err: any) {
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
  if (!authHeader) return NextResponse.json({
    error: 'Unauthorized'
  }, {
    status: 401
  });
  try {
    const res = await fetch(`${MEDUSA_URL}/admin/promotions/${id}`, {
      method: 'DELETE',
      headers: {
        Authorization: authHeader,
        'Content-Type': 'application/json'
      }
    });
    const data = await safeJson(res);
    return NextResponse.json(data, {
      status: res.status
    });
  } catch (err: any) {
    return NextResponse.json({
      error: err.message
    }, {
      status: 500
    });
  }
}
