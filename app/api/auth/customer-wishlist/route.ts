import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { SURFACE_COOKIES } from '@/lib/api/auth-cookie'

const MEDUSA_URL =
  process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL ?? 'http://localhost:9000'
const PUBLISHABLE_KEY = process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY ?? ''

// The wishlist now lives in the Medusa backend (favorites module), one row
// per customer + product, served by /store/wishlist. This route forwards the
// customer's token; the backend decides who the customer is.

function backendHeaders(token: string) {
  return {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
    'x-publishable-api-key': PUBLISHABLE_KEY,
  }
}

async function getToken() {
  const cookieStore = await cookies()
  return cookieStore.get(SURFACE_COOKIES.website.tokenCookie)?.value
}

export async function GET() {
  try {
    const token = await getToken()
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const res = await fetch(`${MEDUSA_URL}/store/wishlist`, {
      headers: backendHeaders(token),
      cache: 'no-store',
    })
    if (!res.ok) {
      return NextResponse.json(
        { error: 'Failed to load wishlist' },
        { status: res.status },
      )
    }
    const data = await res.json()
    return NextResponse.json({
      productIds: Array.isArray(data?.productIds) ? data.productIds : [],
    })
  } catch {
    return NextResponse.json(
      { error: 'Failed to load wishlist' },
      { status: 500 },
    )
  }
}

// Body: { add?: string[], remove?: string[], clear?: boolean }
// (An old cached browser bundle may still send { productIds }; that is treated
// as "add these" and never removes anything.)
export async function POST(req: NextRequest) {
  try {
    const token = await getToken()
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const body = await req.json().catch(() => ({}))
    const add = Array.isArray(body?.add)
      ? body.add
      : Array.isArray(body?.productIds)
        ? body.productIds
        : undefined
    const remove = Array.isArray(body?.remove) ? body.remove : undefined
    const clear = body?.clear === true

    if (add === undefined && remove === undefined && !clear) {
      return NextResponse.json({ error: 'Nothing to update' }, { status: 400 })
    }

    const res = await fetch(`${MEDUSA_URL}/store/wishlist`, {
      method: 'POST',
      headers: backendHeaders(token),
      body: JSON.stringify({ add, remove, clear }),
    })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) {
      return NextResponse.json(
        { error: data?.error || data?.message || 'Failed to save wishlist' },
        { status: res.status },
      )
    }
    return NextResponse.json({
      success: true,
      productIds: Array.isArray(data?.productIds) ? data.productIds : [],
    })
  } catch {
    return NextResponse.json(
      { error: 'Failed to save wishlist' },
      { status: 500 },
    )
  }
}
