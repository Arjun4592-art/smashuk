import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { SURFACE_COOKIES, setSurfaceCookies } from '@/lib/api/auth-cookie'
import { auth } from '@/app/api/auth/[...nextauth]/route'
import { medusaStore } from '@/lib/medusa'
import { deriveGoogleShadowPassword } from '@/lib/api/google-shadow'
const MEDUSA_URL =
  process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL ?? 'http://localhost:9000'
const PUB_KEY = process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY ?? ''

// Returns a real Medusa customer token. Google sign-ins can be sitting on a
// placeholder `nextauth:<email>` cookie when the Google -> Medusa sync failed
// earlier; the old code treated that as "not logged in" and silently returned
// zero orders. Retry the sync here (same logic as /api/auth/me) so a Google
// customer still sees their orders.
async function getToken(): Promise<{
  token?: string
  freshToken?: string
}> {
  const cs = await cookies()
  const t = cs.get(SURFACE_COOKIES.website.tokenCookie)?.value
  if (!t) return {}
  if (!t.startsWith('nextauth:')) return { token: t }
  const email = t.slice(9)
  try {
    const session = await auth()
    if (
      !session?.user?.email ||
      session.user.email.toLowerCase() !== email.toLowerCase()
    ) {
      return {}
    }
    const password = await deriveGoogleShadowPassword(email)
    const loginResponse = await medusaStore.auth.login(
      'customer',
      'emailpass',
      {
        email,
        password,
      },
    )
    if (typeof loginResponse === 'string') {
      return { token: loginResponse, freshToken: loginResponse }
    }
  } catch (err) {
    console.error('[api/store/orders] Google -> Medusa token sync failed:', err)
  }
  return {}
}
export async function GET(req: NextRequest) {
  const { token, freshToken } = await getToken()
  if (!token)
    return NextResponse.json({
      orders: [],
      error: 'not_synced',
    })
  const orderId = req.nextUrl.searchParams.get('id')
  const url = orderId
    ? `${MEDUSA_URL}/store/orders/${orderId}`
    : `${MEDUSA_URL}/store/orders`
  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
      'x-publishable-api-key': PUB_KEY,
    },
  })
  const body = await res.json().catch(() => ({}))
  if (!res.ok) {
    console.error(
      '[api/store/orders] Medusa returned',
      res.status,
      JSON.stringify(body),
    )
  }
  const response = NextResponse.json(body, {
    status: res.ok ? 200 : res.status,
  })
  if (freshToken) {
    setSurfaceCookies(
      response.cookies,
      'website',
      {
        isAuthenticated: true,
        role: 'customer',
      },
      freshToken,
      'lax',
    )
  }
  return response
}
