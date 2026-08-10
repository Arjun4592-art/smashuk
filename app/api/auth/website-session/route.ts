// app/api/auth/website-session/route.ts
//
// After Google OAuth, a NextAuth session gets established.
// This route is called from the client (once the NextAuth session is available)
// and sets the website surface cookies so middleware works correctly.

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/app/api/auth/[...nextauth]/route'
import { setSurfaceCookies } from '@/lib/api/auth-cookie'

const MEDUSA_URL =
  process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL ?? 'http://localhost:9000'
const PUBLISHABLE_KEY =
  process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY ?? ''

export async function POST(req: NextRequest) {
  try {
    // Validate against the NextAuth session
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: 'No active session.' }, { status: 401 })
    }

    const medusaToken = (session.user as any).medusaToken as string | null

    // Use the Medusa token if we have one, otherwise just set the auth-state cookie
    // (in the Google OAuth case, the Medusa session is already linked)
    let customerData: {
      id: string
      email: string
      first_name?: string
      last_name?: string
      created_at?: string
      metadata?: Record<string, any> | null
    } | null = null

    if (medusaToken) {
      try {
        const meRes = await fetch(`${MEDUSA_URL}/store/customers/me`, {
          headers: {
            Authorization: `Bearer ${medusaToken}`,
            'x-publishable-api-key': PUBLISHABLE_KEY,
          },
        })
        if (meRes.ok) {
          const data = await meRes.json()
          customerData = data.customer
        }
      } catch {
        // Medusa sync fail — NextAuth session se fallback
      }
    }

    const user = {
      id: customerData?.id ?? (session.user as any).id ?? session.user.email ?? '',
      name:
        (customerData
          ? `${customerData.first_name ?? ''} ${customerData.last_name ?? ''}`.trim()
          : session.user.name) || session.user.email || '',
      email: customerData?.email ?? session.user.email ?? '',
      role: 'customer' as const,
      createdAt: customerData?.created_at ?? new Date().toISOString(),
      // Prefer what's actually stored on the Medusa customer (metadata.avatar,
      // set at Google sign-in — see [...nextauth]/route.ts) and fall back to
      // the live Google session image if the Medusa sync hasn't caught up yet.
      avatar:
        (customerData?.metadata?.avatar as string | undefined) ??
        (session.user as any).image ??
        undefined,
    }

    const token = medusaToken ?? `nextauth:${session.user.email}`
    const response = NextResponse.json({ user })
    setSurfaceCookies(
      response.cookies,
      'website',
      { isAuthenticated: true, role: 'customer' },
      token,
      'lax',
    )
    return response
  } catch (err: any) {
    console.error('[API] website-session error:', err)
    return NextResponse.json(
      { error: 'Session sync failed.' },
      { status: 500 },
    )
  }
}
