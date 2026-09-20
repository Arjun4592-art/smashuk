import { NextRequest, NextResponse } from 'next/server'
import { getAdminAuthHeader } from '@/lib/api/admin-auth'
import { safeJson } from '@/lib/api/safe-json'

/**
 * GET /api/admin/abandoned-checkouts/:id
 *
 * The products inside one abandoned cart. The list endpoint only returns an
 * item COUNT, so when a row is opened the dashboard asks this route for the
 * actual line items. The cart is read through the store API (the cart id is
 * the same one used in the recovery link).
 */
const MEDUSA_URL =
  process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL ?? 'http://localhost:9000'
const PUBLISHABLE_KEY = process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY ?? ''

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const authHeader = await getAdminAuthHeader(req)
  if (!authHeader) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const { id } = await params
  try {
    const fields =
      '*items,+items.thumbnail,+items.product_handle,+items.product_title,+items.variant_title,+items.variant_sku,+items.metadata,+currency_code'
    const res = await fetch(
      `${MEDUSA_URL}/store/carts/${encodeURIComponent(id)}?fields=${encodeURIComponent(fields)}`,
      {
        headers: {
          'Content-Type': 'application/json',
          'x-publishable-api-key': PUBLISHABLE_KEY,
        },
        cache: 'no-store',
      },
    )
    if (!res.ok) {
      return NextResponse.json(
        { items: [], error: `Cart not found (${res.status})` },
        { status: res.status === 404 ? 404 : 502 },
      )
    }
    const data = await safeJson(
      res,
      'app/api/admin/abandoned-checkouts/[id]/route.ts',
    )
    const cart = data.cart ?? {}
    const items = (cart.items ?? []).map((it: any) => ({
      id: it.id,
      title: it.product_title || it.title || 'Product',
      variantTitle:
        it.variant_title && it.variant_title !== 'Default variant'
          ? it.variant_title
          : '',
      sku: it.variant_sku ?? '',
      thumbnail: it.thumbnail ?? null,
      handle: it.product_handle ?? null,
      quantity: it.quantity ?? 1,
      unitPrice: it.unit_price ?? 0,
      total: it.total ?? (it.unit_price ?? 0) * (it.quantity ?? 1),
      // e.g. string upgrade / grip choices stored on the line item
      metadata: it.metadata ?? {},
    }))
    return NextResponse.json({
      items,
      currencyCode: (cart.currency_code ?? 'gbp').toUpperCase(),
    })
  } catch (err: any) {
    console.error('[API] abandoned-checkout items error:', err)
    return NextResponse.json(
      { items: [], error: err?.message ?? 'Failed' },
      { status: 500 },
    )
  }
}
