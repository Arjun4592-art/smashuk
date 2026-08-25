import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { SURFACE_COOKIES, setSurfaceCookies } from '@/lib/api/auth-cookie';
import { isPosSessionValid } from '@/lib/api/pos-session';
import { auth } from '@/app/api/auth/[...nextauth]/route';
import { medusaStore } from '@/lib/medusa';
import { deriveGoogleShadowPassword } from '@/lib/api/google-shadow';
const MEDUSA_URL = process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL ?? 'http://localhost:9000';
const PUBLISHABLE_KEY = process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY ?? '';
type Surface = 'website' | 'dashboard' | 'pos';
async function getCustomerUser(token: string) {
  const res = await fetch(`${MEDUSA_URL}/store/customers/me`, {
    headers: {
      Authorization: `Bearer ${token}`,
      'x-publishable-api-key': PUBLISHABLE_KEY
    }
  });
  if (!res.ok) return null;
  const {
    customer
  } = await res.json();
  return {
    id: customer.id,
    name: `${customer.first_name ?? ''} ${customer.last_name ?? ''}`.trim() || customer.email,
    email: customer.email ?? '',
    role: 'customer' as const,
    createdAt: customer.created_at,
    avatar: customer.metadata?.avatar as string | undefined
  };
}
async function getPosStaffUser(serviceToken: string, staffId: string, sessionId: string | undefined) {
  const res = await fetch(`${MEDUSA_URL}/admin/users/${staffId}`, {
    headers: {
      Authorization: `Bearer ${serviceToken}`
    }
  });
  if (!res.ok) return null;
  const {
    user: u
  } = await res.json();
  const meta = u?.metadata ?? {};
  if (meta.isActive === false) return null;
  if (!isPosSessionValid(meta, sessionId)) return null;
  const role: 'admin' | 'staff' = ['admin', 'staff'].includes(meta.posRole) ? meta.posRole : 'admin';
  return {
    id: u.id,
    name: `${u.first_name ?? ''} ${u.last_name ?? ''}`.trim() || u.email,
    email: u.email ?? '',
    role,
    createdAt: u.created_at
  };
}
async function getAdminUser(token: string) {
  const res = await fetch(`${MEDUSA_URL}/admin/users/me`, {
    headers: {
      Authorization: `Bearer ${token}`
    }
  });
  if (!res.ok) return null;
  const {
    user: u
  } = await res.json();
  const meta = u?.metadata ?? {};
  const isOwner = meta.role === 'admin';
  const role: 'admin' | 'staff' = isOwner ? 'admin' : 'staff';
  return {
    id: u.id,
    name: `${u.first_name ?? ''} ${u.last_name ?? ''}`.trim() || u.email,
    email: u.email ?? '',
    role,
    createdAt: u.created_at
  };
}
export async function GET(req: NextRequest) {
  try {
    const cookieStore = await cookies();
    const surface = (req.nextUrl.searchParams.get('surface') ?? 'website') as Surface;
    const {
      authCookie,
      tokenCookie
    } = SURFACE_COOKIES[surface];
    const authRaw = cookieStore.get(authCookie)?.value;
    const token = cookieStore.get(tokenCookie)?.value;
    if (!authRaw || !token) {
      return NextResponse.json({
        user: null
      });
    }
    let authState: {
      isAuthenticated?: boolean;
      role?: string;
      userId?: string;
      sessionId?: string;
    } = {};
    try {
      authState = JSON.parse(decodeURIComponent(authRaw));
    } catch {
      return NextResponse.json({
        user: null
      });
    }
    if (!authState.isAuthenticated) {
      return NextResponse.json({
        user: null
      });
    }
    if (token.startsWith('nextauth:')) {
      const email = token.slice(9);
      const session = await auth();
      const sessionName = session?.user?.name || email;
      const sessionImage = (session?.user as any)?.image as string | undefined;
      try {
        const shadowPassword = await deriveGoogleShadowPassword(email);
        const loginResponse = await medusaStore.auth.login('customer', 'emailpass', {
          email,
          password: shadowPassword
        });
        if (typeof loginResponse === 'string') {
          const customerUser = await getCustomerUser(loginResponse);
          if (customerUser) {
            const response = NextResponse.json({
              user: {
                ...customerUser,
                avatar: customerUser.avatar ?? sessionImage
              }
            });
            setSurfaceCookies(response.cookies, 'website', {
              isAuthenticated: true,
              role: 'customer'
            }, loginResponse, 'lax');
            return response;
          }
        }
      } catch (err) {
        console.error('[api/auth/me] Retried Google → Medusa sync, still failing:', err);
      }
      return NextResponse.json({
        user: {
          id: email,
          name: sessionName,
          email,
          role: 'customer',
          createdAt: new Date().toISOString(),
          avatar: sessionImage
        }
      });
    }
    let user = null;
    if (surface === 'website') {
      user = await getCustomerUser(token);
    } else if (surface === 'pos') {
      const staffId = authState.userId;
      user = staffId ? await getPosStaffUser(token, staffId, authState.sessionId) : null;
    } else {
      user = await getAdminUser(token);
    }
    if (!user) {
      return NextResponse.json({
        user: null
      });
    }
    return NextResponse.json({
      user
    });
  } catch (err: any) {
    console.error('[API] /auth/me error:', err);
    return NextResponse.json({
      user: null
    });
  }
}
