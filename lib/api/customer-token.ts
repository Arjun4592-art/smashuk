import 'server-only'
import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { SURFACE_COOKIES, setSurfaceCookies } from '@/lib/api/auth-cookie'
import { auth } from '@/app/api/auth/[...nextauth]/route'
import { medusaStore } from '@/lib/medusa'
import { deriveGoogleShadowPassword } from '@/lib/api/google-shadow'

/**
 * Returns a real Medusa customer token for the website surface.
 *
 * Google sign-ins can be sitting on a placeholder `nextauth:<email>` cookie
 * when the Google -> Medusa sync failed earlier. In that case we retry the
 * sync here (same logic as /api/auth/me and /api/store/orders) instead of
 * treating the user as logged out.
 *
 * `freshToken` is set when a new token was minted; the caller should persist
 * it on its response with `attachFreshToken`.
 */
export async function resolveCustomerToken(): Promise<{
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
      { email, password },
    )
    if (typeof loginResponse === 'string') {
      return { token: loginResponse, freshToken: loginResponse }
    }
  } catch (err) {
    console.error('[customer-token] Google -> Medusa token sync failed:', err)
  }
  return {}
}

export function attachFreshToken(
  response: NextResponse,
  freshToken?: string,
): NextResponse {
  if (freshToken) {
    setSurfaceCookies(
      response.cookies,
      'website',
      { isAuthenticated: true, role: 'customer' },
      freshToken,
      'lax',
    )
  }
  return response
}
