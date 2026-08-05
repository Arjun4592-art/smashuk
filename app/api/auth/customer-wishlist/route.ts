// app/api/auth/customer-wishlist/route.ts
// Reads/writes the logged-in customer's wishlist as Medusa customer
// metadata (customer.metadata.wishlist), using the same website surface
// token cookie pattern as customer-profile/route.ts. This is what makes the
// wishlist survive across devices/browsers instead of only living in
// localStorage (see store/wishlistStore.ts).

import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { SURFACE_COOKIES } from '@/lib/api/auth-cookie'

const MEDUSA_URL =
  process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL ?? 'http://localhost:9000'
const PUBLISHABLE_KEY =
  process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY ?? ''

// GET → returns the customer's saved wishlist product ids
export async function GET() {
  try {
    const cookieStore = await cookies()
    const token = cookieStore.get(SURFACE_COOKIES.website.tokenCookie)?.value
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const res = await fetch(
      `${MEDUSA_URL}/store/customers/me?fields=%2Bmetadata`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          'x-publishable-api-key': PUBLISHABLE_KEY,
        },
        cache: 'no-store',
      },
    )

    if (!res.ok) {
      return NextResponse.json({ error: 'Failed to load wishlist' }, { status: res.status })
    }

    const data = await res.json()
    const wishlist = Array.isArray(data?.customer?.metadata?.wishlist)
      ? data.customer.metadata.wishlist
      : []

    return NextResponse.json({ productIds: wishlist })
  } catch (err: any) {
    return NextResponse.json({ error: 'Failed to load wishlist' }, { status: 500 })
  }
}

// POST { productIds: string[] } → overwrites the saved wishlist
export async function POST(req: NextRequest) {
  try {
    const cookieStore = await cookies()
    const token = cookieStore.get(SURFACE_COOKIES.website.tokenCookie)?.value
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { productIds } = await req.json()
    if (!Array.isArray(productIds)) {
      return NextResponse.json({ error: 'productIds must be an array' }, { status: 400 })
    }

    const res = await fetch(`${MEDUSA_URL}/store/customers/me`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        'x-publishable-api-key': PUBLISHABLE_KEY,
      },
      body: JSON.stringify({ metadata: { wishlist: productIds } }),
    })

    if (!res.ok) {
      return NextResponse.json({ error: 'Failed to save wishlist' }, { status: res.status })
    }

    return NextResponse.json({ success: true })
  } catch (err: any) {
    return NextResponse.json({ error: 'Failed to save wishlist' }, { status: 500 })
  }
}
