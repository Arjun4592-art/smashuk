import { NextRequest, NextResponse } from 'next/server';
import { getAdminAuthHeader } from '@/lib/api/admin-auth';
import { hashPin } from '@/lib/api/pin-hash';
import { safeJson } from '@/lib/api/safe-json';
const MEDUSA_URL = process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL;
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
  const authorization = (await getAdminAuthHeader(req)) ?? '';
  if (!authorization) {
    return NextResponse.json({
      error: 'Missing Authorization header'
    }, {
      status: 401
    });
  }
  try {
    const body = await req.json();
    const {
      name,
      phone,
      role,
      pin,
      shift,
      isActive,
      totalSales,
      totalOrders
    } = body;
    const [firstName, ...rest] = (name ?? '').split(' ');
    if (role !== undefined && role !== 'staff' && role !== 'admin') {
      return NextResponse.json({
        error: "role must be 'staff' or 'admin'"
      }, {
        status: 400
      });
    }
    const updatePayload: any = {
      metadata: {
        phone,
        posRole: role,
        shift,
        isActive,
        totalSales,
        totalOrders
      }
    };
    if (typeof pin === 'string' && pin.length > 0) {
      updatePayload.metadata.pin = await hashPin(pin);
    }
    if (firstName) {
      updatePayload.first_name = firstName;
      updatePayload.last_name = rest.join(' ') || '';
    }
    const res = await fetch(`${MEDUSA_URL}/admin/users/${id}`, {
      method: 'POST',
      headers: {
        Authorization: authorization,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(updatePayload)
    });
    const data = await safeJson(res, 'app/api/admin/staff/[id]/route.ts');
    if (!res.ok) return NextResponse.json({
      error: data.message
    }, {
      status: res.status
    });
    const u = data.user;
    return NextResponse.json({
      staff: {
        id: u.id,
        name: `${u.first_name ?? ''} ${u.last_name ?? ''}`.trim() || u.email,
        initials: `${u.first_name?.[0] ?? ''}${u.last_name?.[0] ?? ''}`.toUpperCase() || u.email.slice(0, 2).toUpperCase(),
        email: u.email,
        phone: u.metadata?.phone ?? '',
        role: ['admin', 'staff'].includes(u.metadata?.posRole ?? '') ? u.metadata.posRole : ['admin', 'staff'].includes(u.metadata?.role ?? '') ? u.metadata.role : 'admin',
        hasPin: Boolean(u.metadata?.pin),
        shift: u.metadata?.shift ?? '',
        isActive: u.metadata?.isActive !== false,
        createdAt: u.created_at,
        totalSales: u.metadata?.totalSales ?? 0,
        totalOrders: u.metadata?.totalOrders ?? 0
      }
    });
  } catch (err: any) {
    console.error('[API] staff update error:', err);
    return NextResponse.json({
      error: err.message
    }, {
      status: 500
    });
  }
}
export async function DELETE(_req: NextRequest, {
  params
}: {
  params: Promise<{
    id: string;
  }>;
}) {
  const {
    id
  } = await params;
  const authorization = (await getAdminAuthHeader(_req)) ?? '';
  if (!authorization) {
    return NextResponse.json({
      error: 'Missing Authorization header'
    }, {
      status: 401
    });
  }
  try {
    const res = await fetch(`${MEDUSA_URL}/admin/users/${id}`, {
      method: 'DELETE',
      headers: {
        Authorization: authorization
      }
    });
    let data: any = {};
    const text = await res.text();
    if (text) {
      try {
        data = JSON.parse(text);
      } catch {}
    }
    if (!res.ok) return NextResponse.json({
      error: data.message ?? 'Delete failed'
    }, {
      status: res.status
    });
    return NextResponse.json(Object.keys(data).length ? data : {
      id,
      deleted: true
    });
  } catch (err: any) {
    console.error('[API] staff delete error:', err);
    return NextResponse.json({
      error: err.message
    }, {
      status: 500
    });
  }
}
