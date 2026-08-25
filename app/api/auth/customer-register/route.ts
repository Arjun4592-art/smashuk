import { NextRequest, NextResponse } from 'next/server';
import { setSurfaceCookies } from '@/lib/api/auth-cookie';
const MEDUSA_URL = process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL ?? 'http://localhost:9000';
const PUBLISHABLE_KEY = process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY ?? '';
const STORE_HEADERS = {
  'Content-Type': 'application/json',
  'x-publishable-api-key': PUBLISHABLE_KEY
};
export async function POST(req: NextRequest) {
  try {
    const {
      name,
      email,
      password
    } = await req.json();
    if (!name || !email || !password) {
      return NextResponse.json({
        error: 'Name, email and password required.'
      }, {
        status: 400
      });
    }
    if (password.length < 8) {
      return NextResponse.json({
        error: 'Password must be at least 8 characters.'
      }, {
        status: 400
      });
    }
    const regRes = await fetch(`${MEDUSA_URL}/auth/customer/emailpass/register`, {
      method: 'POST',
      headers: STORE_HEADERS,
      body: JSON.stringify({
        email,
        password
      })
    });
    const regData = await regRes.json().catch(() => ({}));
    if (!regRes.ok) {
      const msg = regData?.message ?? regData?.error ?? 'Registration failed.';
      if (regRes.status === 409 || msg.toLowerCase().includes('exist')) {
        return NextResponse.json({
          error: 'This email is already registered. Please login.'
        }, {
          status: 409
        });
      }
      return NextResponse.json({
        error: msg
      }, {
        status: regRes.status
      });
    }
    const registrationToken = regData.token as string;
    if (!registrationToken) {
      return NextResponse.json({
        error: 'Registration failed. Please try again.'
      }, {
        status: 500
      });
    }
    const [firstName, ...rest] = name.trim().split(' ');
    const createCustomerRes = await fetch(`${MEDUSA_URL}/store/customers`, {
      method: 'POST',
      headers: {
        ...STORE_HEADERS,
        Authorization: `Bearer ${registrationToken}`
      },
      body: JSON.stringify({
        email,
        first_name: firstName,
        last_name: rest.join(' ') || ''
      })
    });
    const createCustomerData = await createCustomerRes.json().catch(() => ({}));
    if (!createCustomerRes.ok) {
      const msg = createCustomerData?.message ?? 'Could not create customer profile.';
      return NextResponse.json({
        error: msg
      }, {
        status: createCustomerRes.status
      });
    }
    const loginRes = await fetch(`${MEDUSA_URL}/auth/customer/emailpass`, {
      method: 'POST',
      headers: STORE_HEADERS,
      body: JSON.stringify({
        email,
        password
      })
    });
    const loginData = await loginRes.json();
    if (!loginRes.ok || !loginData.token) {
      return NextResponse.json({
        error: 'Registration successful but login failed. Please login manually.'
      }, {
        status: 201
      });
    }
    const token = loginData.token as string;
    const customer = createCustomerData.customer;
    const user = {
      id: customer?.id ?? email,
      name: `${customer?.first_name ?? ''} ${customer?.last_name ?? ''}`.trim() || name,
      email,
      role: 'customer' as const,
      createdAt: customer?.created_at ?? new Date().toISOString()
    };
    const response = NextResponse.json({
      user
    }, {
      status: 201
    });
    setSurfaceCookies(response.cookies, 'website', {
      isAuthenticated: true,
      role: 'customer'
    }, token, 'lax');
    return response;
  } catch (err: any) {
    console.error('[customer-register]', err);
    return NextResponse.json({
      error: 'Registration failed. Please try again.'
    }, {
      status: 500
    });
  }
}
