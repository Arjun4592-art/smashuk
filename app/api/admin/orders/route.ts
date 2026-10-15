import { NextRequest, NextResponse } from 'next/server'
import { getAdminAuthHeader } from '@/lib/api/admin-auth'
const MEDUSA_URL =
  process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL ?? 'http://localhost:9000'
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const limit = Number(searchParams.get('limit') ?? 20)
  const offset = Number(searchParams.get('offset') ?? 0)
  const status = searchParams.get('status')?.split(',').filter(Boolean)
  const authHeader = await getAdminAuthHeader(req)
  if (!authHeader) {
    return NextResponse.json(
      {
        error: 'Unauthorized',
      },
      {
        status: 401,
      },
    )
  }
  try {
    const url = new URL('/admin/orders', MEDUSA_URL)
    url.searchParams.set('limit', String(limit))
    url.searchParams.set('offset', String(offset))
    url.searchParams.set('order', '-created_at')
    // items.metadata is needed to recognise mail-in bookings (see below).
    url.searchParams.set(
      'fields',
      [
        // Without these, Medusa v2 drops its defaults once any non-"+" field
        // is passed -> display_id / created_at / total came back undefined
        // ("SR-—", "Invalid Date", £0.00 in the orders list).
        'id',
        'display_id',
        'status',
        'email',
        'currency_code',
        'created_at',
        'total',
        'payment_status',
        'fulfillment_status',
        'metadata',
        '*items',
        'items.metadata',
        '*customer',
        '*shipping_address',
        '*payment_collections.payments',
      ].join(','),
    )
    if (status?.length) {
      status.forEach((s) => url.searchParams.append('status[]', s))
    }
    const res = await fetch(url.toString(), {
      headers: {
        Authorization: authHeader,
        'Content-Type': 'application/json',
      },
    })
    if (!res.ok) {
      const err = await res.json()
      return NextResponse.json(
        {
          error: err.message,
        },
        {
          status: res.status,
        },
      )
    }
    const data = await res.json()
    // Mail-in stringing orders are worked from Orders > Mail-in Stringing
    // (/dashboard/mail-in), so they are kept out of the main order list.
    // Pass ?include_mail_in=1 to get them back.
    if (
      searchParams.get('include_mail_in') !== '1' &&
      Array.isArray(data.orders)
    ) {
      data.orders = data.orders.filter(
        (o: any) =>
          !(o.items ?? []).some(
            (i: any) =>
              i?.metadata?.mail_in === true || i?.metadata?.mail_in === 'true',
          ),
      )
    }
    return NextResponse.json(data)
  } catch (err: any) {
    console.error('[API] orders GET error:', err)
    return NextResponse.json(
      {
        error: err.message,
      },
      {
        status: 500,
      },
    )
  }
}
export async function POST(req: NextRequest) {
  const authHeader = await getAdminAuthHeader(req)
  if (!authHeader) {
    return NextResponse.json(
      {
        error: 'Unauthorized',
      },
      {
        status: 401,
      },
    )
  }
  try {
    const body = await req.json()
    const res = await fetch(`${MEDUSA_URL}/admin/orders`, {
      method: 'POST',
      headers: {
        Authorization: authHeader,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    })
    if (!res.ok) {
      const err = await res.json().catch(() => ({
        message: 'Unknown error',
      }))
      return NextResponse.json(
        {
          error: err.message,
        },
        {
          status: res.status,
        },
      )
    }
    return NextResponse.json(await res.json())
  } catch (err: any) {
    console.error('[API] orders POST error:', err)
    return NextResponse.json(
      {
        error: err.message,
      },
      {
        status: 500,
      },
    )
  }
}
