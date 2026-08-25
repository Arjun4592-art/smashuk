import { NextRequest, NextResponse } from 'next/server';
import { getAdminAuthHeader } from '@/lib/api/admin-auth';
import { safeJson } from '@/lib/api/safe-json';
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
    const res = await fetch(`${MEDUSA_URL}/admin/customers/${id}`, {
      headers: {
        Authorization: authHeader,
        'Content-Type': 'application/json'
      }
    });
    if (!res.ok) {
      const err = await safeJson(res, 'app/api/admin/customers/[id]/route.ts');
      return NextResponse.json({
        error: err.message
      }, {
        status: res.status
      });
    }
    const data = await safeJson(res, 'app/api/admin/customers/[id]/route.ts');
    return NextResponse.json(data);
  } catch (err) {
    console.error('[admin/customers/:id] GET error:', err);
    return NextResponse.json({
      error: 'Failed to fetch customer'
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
      first_name,
      last_name,
      email,
      phone
    } = body;
    const payload: Record<string, unknown> = {};
    if (first_name !== undefined) payload.first_name = first_name;
    if (last_name !== undefined) payload.last_name = last_name;
    if (email !== undefined) payload.email = email;
    if (phone !== undefined) payload.phone = phone;
    const res = await fetch(`${MEDUSA_URL}/admin/customers/${id}`, {
      method: 'POST',
      headers: {
        Authorization: authHeader,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });
    if (!res.ok) {
      const err = await safeJson(res, 'app/api/admin/customers/[id]/route.ts');
      return NextResponse.json({
        error: err.message
      }, {
        status: res.status
      });
    }
    const data = await safeJson(res, 'app/api/admin/customers/[id]/route.ts');
    return NextResponse.json(data);
  } catch (err) {
    console.error('[admin/customers/:id] PATCH error:', err);
    return NextResponse.json({
      error: 'Failed to update customer'
    }, {
      status: 500
    });
  }
}
