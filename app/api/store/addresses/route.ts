// app/api/store/addresses/route.ts
// Server-side proxy to Medusa's /store/customers/me/addresses — no CORS,
// keeps the customer JWT server-side only.

import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { SURFACE_COOKIES } from '@/lib/api/auth-cookie'

const MEDUSA_URL =
  process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL ?? 'http://localhost:9000'
const PUBLISHABLE_KEY = process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY ?? ''

async function getCustomerToken() {
  const cookieStore = await cookies()
  const token = cookieStore.get(SURFACE_COOKIES.website.tokenCookie)?.value
  if (!token || token.startsWith('nextauth:')) return undefined
  return token
}

function headers(token?: string) {
  const h: Record<string, string> = {
    'Content-Type': 'application/json',
    'x-publishable-api-key': PUBLISHABLE_KEY,
  }
  if (token) h['Authorization'] = `Bearer ${token}`
  return h
}

// GET — list all saved addresses for the logged-in customer
export async function GET() {
  const token = await getCustomerToken()
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const res = await fetch(`${MEDUSA_URL}/store/customers/me/addresses`, {
    headers: headers(token),
    cache: 'no-store',
  })
  const data = await res.json().catch(() => ({}))
  return NextResponse.json(data, { status: res.status })
}

// POST — add a new address
export async function POST(req: NextRequest) {
  const token = await getCustomerToken()
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const res = await fetch(`${MEDUSA_URL}/store/customers/me/addresses`, {
    method: 'POST',
    headers: headers(token),
    body: JSON.stringify(body),
  })
  const data = await res.json().catch(() => ({}))
  return NextResponse.json(data, { status: res.status })
}

// PATCH — update an existing address (body must include addressId)
export async function PATCH(req: NextRequest) {
  const token = await getCustomerToken()
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { addressId, ...rest } = await req.json()
  if (!addressId) {
    return NextResponse.json({ error: 'addressId required' }, { status: 400 })
  }

  const res = await fetch(
    `${MEDUSA_URL}/store/customers/me/addresses/${addressId}`,
    {
      method: 'POST',
      headers: headers(token),
      body: JSON.stringify(rest),
    },
  )
  const data = await res.json().catch(() => ({}))
  return NextResponse.json(data, { status: res.status })
}

// DELETE — remove an address (?addressId=xxx)
export async function DELETE(req: NextRequest) {
  const token = await getCustomerToken()
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const addressId = req.nextUrl.searchParams.get('addressId')
  if (!addressId) {
    return NextResponse.json({ error: 'addressId required' }, { status: 400 })
  }

  const res = await fetch(
    `${MEDUSA_URL}/store/customers/me/addresses/${addressId}`,
    {
      method: 'DELETE',
      headers: headers(token),
    },
  )
  const data = await res.json().catch(() => ({}))
  return NextResponse.json(data, { status: res.status })
}
