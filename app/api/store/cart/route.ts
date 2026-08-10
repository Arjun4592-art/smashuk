// app/api/store/cart/route.ts — Cart CRUD proxy (no CORS)

import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { SURFACE_COOKIES } from '@/lib/api/auth-cookie'
import { safeJson } from '@/lib/api/safe-json'

const MEDUSA_URL = process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL ?? 'http://localhost:9000'
const PUB_KEY = process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY ?? ''

function storeHeaders(token?: string) {
  const h: Record<string, string> = {
    'Content-Type': 'application/json',
    'x-publishable-api-key': PUB_KEY,
  }
  if (token) h['Authorization'] = `Bearer ${token}`
  return h
}

async function getCustomerToken() {
  const cookieStore = await cookies()
  const token = cookieStore.get(SURFACE_COOKIES.website.tokenCookie)?.value
  if (!token || token.startsWith('nextauth:')) return undefined
  return token
}

// GET /api/store/cart?id=xxx — fetch cart
export async function GET(req: NextRequest) {
  const cartId = req.nextUrl.searchParams.get('id')
  if (!cartId) return NextResponse.json({ error: 'Cart ID required' }, { status: 400 })

  const token = await getCustomerToken()
  const res = await fetch(`${MEDUSA_URL}/store/carts/${cartId}`, {
    headers: storeHeaders(token),
  })
  const data = await safeJson(res, 'app/api/store/cart/route.ts')
  return NextResponse.json(data, { status: res.status })
}

// POST /api/store/cart — create cart
export async function POST(req: NextRequest) {
  const token = await getCustomerToken()
  // Get region
  const regRes = await fetch(`${MEDUSA_URL}/store/regions?limit=1`, { headers: storeHeaders() })
  const regData = await safeJson(regRes, 'app/api/store/cart/route.ts (regions)')
  const regionId = regData.regions?.[0]?.id

  // BUG FIX: if the region fetch failed or returned no region, this used to
  // silently fall through with region_id: undefined — Medusa would either
  // reject the cart create or fall back to some default region, with no
  // error ever surfaced to the customer or logged with useful context. A
  // missing region means wrong/no currency & tax on the whole cart, so this
  // must be a hard failure, not a silent one.
  if (!regionId) {
    console.error(
      '[/api/store/cart] POST — no region available from Medusa:',
      regData,
    )
    return NextResponse.json(
      { error: 'Store is not configured with a region — cannot create cart.' },
      { status: 503 },
    )
  }

  const res = await fetch(`${MEDUSA_URL}/store/carts`, {
    method: 'POST',
    headers: storeHeaders(token),
    body: JSON.stringify({ region_id: regionId }),
  })
  const data = await safeJson(res, 'app/api/store/cart/route.ts')
  return NextResponse.json(data, { status: res.status })
}

// PATCH /api/store/cart — update cart (shipping address etc)
export async function PATCH(req: NextRequest) {
  const body = await req.json()
  const { cartId, ...rest } = body
  if (!cartId) return NextResponse.json({ error: 'Cart ID required' }, { status: 400 })

  const token = await getCustomerToken()
  const res = await fetch(`${MEDUSA_URL}/store/carts/${cartId}`, {
    method: 'POST',
    headers: storeHeaders(token),
    body: JSON.stringify(rest),
  })
  const data = await safeJson(res, 'app/api/store/cart/route.ts')
  return NextResponse.json(data, { status: res.status })
}
