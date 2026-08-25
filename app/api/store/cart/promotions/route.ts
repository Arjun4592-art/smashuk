import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { SURFACE_COOKIES } from '@/lib/api/auth-cookie';
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
async function getCustomerToken() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SURFACE_COOKIES.website.tokenCookie)?.value;
  if (!token || token.startsWith('nextauth:')) return undefined;
  return token;
}
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
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const {
    cartId,
    code
  } = body;
  if (!cartId || !code) {
    return NextResponse.json({
      error: 'cartId and code are required'
    }, {
      status: 400
    });
  }
  const token = await getCustomerToken();
  const cartRes = await fetch(`${MEDUSA_URL}/store/carts/${cartId}?fields=id,*promotions`, {
    headers: storeHeaders(token)
  });
  const cartData = await safeJson(cartRes);
  if (!cartRes.ok) {
    return NextResponse.json({
      error: cartData.message ?? 'Cart not found'
    }, {
      status: cartRes.status
    });
  }
  const existingCodes: string[] = (cartData.cart?.promotions ?? []).map((p: any) => p.code);
  const upperCode = String(code).trim().toUpperCase();
  if (existingCodes.includes(upperCode)) {
    return NextResponse.json({
      error: 'That code is already applied'
    }, {
      status: 400
    });
  }
  const res = await fetch(`${MEDUSA_URL}/store/carts/${cartId}/promotions`, {
    method: 'POST',
    headers: storeHeaders(token),
    body: JSON.stringify({
      promo_codes: [...existingCodes, upperCode]
    })
  });
  const data = await safeJson(res);
  if (!res.ok) {
    return NextResponse.json({
      error: data.message ?? 'Invalid or expired coupon code'
    }, {
      status: res.status
    });
  }
  const appliedCodes: string[] = (data.cart?.promotions ?? []).map((p: any) => p.code);
  if (!appliedCodes.includes(upperCode)) {
    return NextResponse.json({
      error: 'Invalid or expired coupon code'
    }, {
      status: 400
    });
  }
  return NextResponse.json({
    cart: data.cart
  });
}
export async function DELETE(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const {
    cartId,
    code
  } = body;
  if (!cartId || !code) {
    return NextResponse.json({
      error: 'cartId and code are required'
    }, {
      status: 400
    });
  }
  const token = await getCustomerToken();
  const upperCode = String(code).trim().toUpperCase();
  const res = await fetch(`${MEDUSA_URL}/store/carts/${cartId}/promotions`, {
    method: 'DELETE',
    headers: storeHeaders(token),
    body: JSON.stringify({
      promo_codes: [upperCode]
    })
  });
  const data = await safeJson(res);
  if (!res.ok) {
    return NextResponse.json({
      error: data.message ?? 'Failed to remove coupon'
    }, {
      status: res.status
    });
  }
  return NextResponse.json({
    cart: data.cart
  });
}
