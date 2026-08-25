import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { SURFACE_COOKIES } from '@/lib/api/auth-cookie';
import { safeJson } from '@/lib/api/safe-json';
const MEDUSA_URL = process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL ?? 'http://localhost:9000';
const PUB_KEY = process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY ?? '';
function storeHeaders(token?: string) {
  const h: Record<string, string> = {
    'Content-Type': 'application/json',
    'x-publishable-api-key': PUB_KEY
  };
  if (token) h['Authorization'] = `Bearer ${token}`;
  return h;
}
async function getToken() {
  const cs = await cookies();
  const t = cs.get(SURFACE_COOKIES.website.tokenCookie)?.value;
  return t?.startsWith('nextauth:') ? undefined : t;
}
export async function POST(req: NextRequest) {
  const {
    cartId,
    variant_id,
    quantity,
    metadata
  } = await req.json();
  const token = await getToken();
  const res = await fetch(`${MEDUSA_URL}/store/carts/${cartId}/line-items`, {
    method: 'POST',
    headers: storeHeaders(token),
    body: JSON.stringify({
      variant_id,
      quantity,
      ...(metadata ? {
        metadata
      } : {})
    })
  });
  const data = await safeJson(res, 'cart/items POST');
  return NextResponse.json(data, {
    status: res.status
  });
}
export async function PATCH(req: NextRequest) {
  const {
    cartId,
    lineItemId,
    quantity
  } = await req.json();
  const token = await getToken();
  const res = await fetch(`${MEDUSA_URL}/store/carts/${cartId}/line-items/${lineItemId}`, {
    method: 'POST',
    headers: storeHeaders(token),
    body: JSON.stringify({
      quantity
    })
  });
  const data = await safeJson(res, 'cart/items PATCH');
  return NextResponse.json(data, {
    status: res.status
  });
}
export async function DELETE(req: NextRequest) {
  const {
    cartId,
    lineItemId
  } = await req.json();
  const token = await getToken();
  const res = await fetch(`${MEDUSA_URL}/store/carts/${cartId}/line-items/${lineItemId}`, {
    method: 'DELETE',
    headers: storeHeaders(token)
  });
  if (res.status === 204) return NextResponse.json({
    success: true
  });
  const data = await safeJson(res, 'cart/items DELETE');
  return NextResponse.json(data, {
    status: res.status
  });
}
