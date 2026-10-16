import { NextRequest, NextResponse } from 'next/server'
import {
  resolveCustomerToken,
  attachFreshToken,
} from '@/lib/api/customer-token'

const MEDUSA_URL =
  process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL ?? 'http://localhost:9000'
const PUBLISHABLE_KEY = process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY ?? ''

// Only these fields are forwarded to Medusa (it rejects unknown keys).
const ALLOWED_FIELDS = [
  'first_name',
  'last_name',
  'phone',
  'company',
  'address_1',
  'address_2',
  'city',
  'province',
  'postal_code',
  'country_code',
  'address_name',
  'is_default_shipping',
  'is_default_billing',
  'metadata',
] as const

function pickAddressFields(body: Record<string, unknown>) {
  const out: Record<string, unknown> = {}
  for (const key of ALLOWED_FIELDS) {
    if (body[key] !== undefined) out[key] = body[key]
  }
  return out
}

function medusaHeaders(token: string) {
  return {
    'Content-Type': 'application/json',
    'x-publishable-api-key': PUBLISHABLE_KEY,
    Authorization: `Bearer ${token}`,
  }
}

// Medusa errors use `message`; the client reads `error`.
function toResponse(
  res: Response,
  data: any,
  freshToken?: string,
): NextResponse {
  const payload = res.ok
    ? data
    : { ...data, error: data?.message ?? data?.error ?? 'Request failed' }
  return attachFreshToken(
    NextResponse.json(payload, { status: res.status }),
    freshToken,
  )
}

const unauthorized = () =>
  NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

export async function GET() {
  const { token, freshToken } = await resolveCustomerToken()
  if (!token) return unauthorized()
  const res = await fetch(`${MEDUSA_URL}/store/customers/me/addresses`, {
    headers: medusaHeaders(token),
    cache: 'no-store',
  })
  const data = await res.json().catch(() => ({}))
  return toResponse(res, data, freshToken)
}

export async function POST(req: NextRequest) {
  const { token, freshToken } = await resolveCustomerToken()
  if (!token) return unauthorized()
  const body = await req.json().catch(() => ({}))
  const res = await fetch(`${MEDUSA_URL}/store/customers/me/addresses`, {
    method: 'POST',
    headers: medusaHeaders(token),
    body: JSON.stringify(pickAddressFields(body)),
  })
  const data = await res.json().catch(() => ({}))
  return toResponse(res, data, freshToken)
}

export async function PATCH(req: NextRequest) {
  const { token, freshToken } = await resolveCustomerToken()
  if (!token) return unauthorized()
  const { addressId, ...rest } = await req.json().catch(() => ({}))
  if (!addressId) {
    return NextResponse.json({ error: 'addressId required' }, { status: 400 })
  }
  const res = await fetch(
    `${MEDUSA_URL}/store/customers/me/addresses/${encodeURIComponent(addressId)}`,
    {
      method: 'POST',
      headers: medusaHeaders(token),
      body: JSON.stringify(pickAddressFields(rest)),
    },
  )
  const data = await res.json().catch(() => ({}))
  return toResponse(res, data, freshToken)
}

export async function DELETE(req: NextRequest) {
  const { token, freshToken } = await resolveCustomerToken()
  if (!token) return unauthorized()
  const addressId = req.nextUrl.searchParams.get('addressId')
  if (!addressId) {
    return NextResponse.json({ error: 'addressId required' }, { status: 400 })
  }
  const res = await fetch(
    `${MEDUSA_URL}/store/customers/me/addresses/${encodeURIComponent(addressId)}`,
    { method: 'DELETE', headers: medusaHeaders(token) },
  )
  const data = await res.json().catch(() => ({}))
  return toResponse(res, data, freshToken)
}
