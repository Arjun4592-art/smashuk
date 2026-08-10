import { NextRequest, NextResponse } from 'next/server'
import { getAdminAuthHeader } from '@/lib/api/admin-auth'
import { resolveSalesChannels } from '@/lib/api/selling-channels'

const MEDUSA_URL =
  process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL ?? 'http://localhost:9000'

// Medusa sometimes returns an empty body — a raw res.json() call on that
// throws and masks the real status/error with a generic 500.
async function safeJson(res: Response) {
  const text = await res.text()
  if (!text) return {}
  try {
    return JSON.parse(text)
  } catch {
    return { message: text.slice(0, 300) }
  }
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params
    const authorization = (await getAdminAuthHeader(req)) ?? ''

    if (!authorization) {
      return NextResponse.json(
        { error: 'Missing Authorization header' },
        { status: 401 },
      )
    }

    // BUG FIX: `*options` was missing here, so the edit page never learned
    // the real ids of the product's existing options (e.g. "Default",
    // "Size", "Color"). Without those ids, saving the product re-sent the
    // options with no id, which Medusa treats as "create a new option" —
    // failing with an already-exists error since one with that title was
    // already on the product.
    const res = await fetch(
      `${MEDUSA_URL}/admin/products/${id}?fields=*variants,*variants.prices,*variants.inventory_items,*variants.inventory_items.inventory.location_levels,*variants.options,*variants.options.option,*categories,*images,*options,*options.values,*sales_channels`,
      {
        headers: { Authorization: authorization },
      },
    )

    const data = await safeJson(res)
    return NextResponse.json(data, { status: res.status })
  } catch (err: any) {
    console.error('[GET product]', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params
    const body = await req.json()
    const authorization = (await getAdminAuthHeader(req)) ?? ''

    if (!authorization) {
      return NextResponse.json(
        { error: 'Missing Authorization header' },
        { status: 401 },
      )
    }

    // Same "Sell on: Website / Store / Both" mapping as product create —
    // if the edit form sent a choice, resolve it to real sales_channels
    // before forwarding to Medusa so it actually re-links the product.
    if (body.selling_channel) {
      const channels = await resolveSalesChannels(
        body.selling_channel,
        authorization,
        MEDUSA_URL,
      )
      if (channels) body.sales_channels = channels
    }
    delete body.selling_channel

    const res = await fetch(`${MEDUSA_URL}/admin/products/${id}`, {
      method: 'POST', // Medusa v2 uses POST for updates, not PATCH
      headers: {
        'Content-Type': 'application/json',
        Authorization: authorization,
      },
      body: JSON.stringify(body),
    })

    const data = await safeJson(res)
    return NextResponse.json(data, { status: res.status })
  } catch (err: any) {
    console.error('[PATCH product]', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params
    const authorization = (await getAdminAuthHeader(req)) ?? ''

    if (!authorization) {
      return NextResponse.json(
        { error: 'Missing Authorization header' },
        { status: 401 },
      )
    }

    const res = await fetch(`${MEDUSA_URL}/admin/products/${id}`, {
      method: 'DELETE',
      headers: { Authorization: authorization },
    })

    const data = await safeJson(res)
    return NextResponse.json(data, { status: res.status })
  } catch (err: any) {
    console.error('[DELETE product]', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
