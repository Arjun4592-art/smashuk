import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { SURFACE_COOKIES } from '@/lib/api/auth-cookie';
const MEDUSA_URL = process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL ?? 'http://localhost:9000';
const PUBLISHABLE_KEY = process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY ?? '';
export async function POST(req: NextRequest) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(SURFACE_COOKIES.website.tokenCookie)?.value;
    if (!token) {
      return NextResponse.json({
        error: 'Unauthorized'
      }, {
        status: 401
      });
    }
    const {
      old_password,
      new_password
    } = await req.json();
    if (!old_password || !new_password) {
      return NextResponse.json({
        error: 'Current and new password are required.'
      }, {
        status: 400
      });
    }
    if (new_password.length < 8) {
      return NextResponse.json({
        error: 'New password must be at least 8 characters.'
      }, {
        status: 400
      });
    }
    const res = await fetch(`${MEDUSA_URL}/store/customers/me/password`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        'x-publishable-api-key': PUBLISHABLE_KEY
      },
      body: JSON.stringify({
        old_password,
        new_password
      })
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      return NextResponse.json({
        error: err?.message ?? 'Password change failed. Check your current password.'
      }, {
        status: res.status
      });
    }
    return NextResponse.json({
      success: true
    });
  } catch (err: any) {
    return NextResponse.json({
      error: 'Password change failed.'
    }, {
      status: 500
    });
  }
}
