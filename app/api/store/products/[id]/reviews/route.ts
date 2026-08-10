// app/api/store/products/[id]/reviews/route.ts
//
// GET  — public, returns published reviews for a product (from product metadata)
// POST — auth required; customer must have a delivered order containing this product.
//        Stores review in product.metadata.productReviews[].
//        Also updates product.metadata.rating and product.metadata.reviewCount.

import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { SURFACE_COOKIES } from '@/lib/api/auth-cookie'
import { medusaServiceFetch, MEDUSA_URL } from '@/lib/api/medusa-service-token'
import { safeJson } from '@/lib/api/safe-json'

export interface ProductReview {
  id: string
  customerId: string
  customerName: string
  rating: number // 1–5
  title: string
  body: string
  orderId: string
  published: boolean
  createdAt: string
}

async function getCustomerToken() {
  const cs = await cookies()
  const t = cs.get(SURFACE_COOKIES.website.tokenCookie)?.value
  return t?.startsWith('nextauth:') ? undefined : t
}

async function getProductWithMeta(productId: string) {
  const res = await medusaServiceFetch(
    `/admin/products/${productId}?fields=id,metadata`,
  )
  if (!res.ok) throw new Error(`Product fetch failed: ${res.status}`)
  const data = await safeJson(res, 'app/api/store/products/[id]/reviews/route.ts')
  return data.product
}

// ── GET ────────────────────────────────────────────────────────────────────────
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params
    const product = await getProductWithMeta(id)
    const reviews: ProductReview[] = product?.metadata?.productReviews ?? []
    const published = reviews
      .filter((r) => r.published)
      .sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      )
    return NextResponse.json({ reviews: published })
  } catch (err: any) {
    console.error('[API] product reviews GET error:', err)
    return NextResponse.json({ reviews: [] })
  }
}

// ── POST ───────────────────────────────────────────────────────────────────────
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: productId } = await params

  // 1. Require customer auth
  const token = await getCustomerToken()
  if (!token) {
    return NextResponse.json(
      { error: 'Login required to leave a review' },
      { status: 401 },
    )
  }

  // 2. Validate body
  const body = await req.json()
  const { rating, title, reviewBody, orderId } = body
  if (!rating || !reviewBody || !orderId) {
    return NextResponse.json(
      { error: 'rating, reviewBody and orderId are required' },
      { status: 400 },
    )
  }
  if (rating < 1 || rating > 5) {
    return NextResponse.json({ error: 'Rating must be 1–5' }, { status: 400 })
  }

  // 3. Verify this customer actually has a delivered order containing this product
  const PUB_KEY = process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY ?? ''
  // BUG FIX (part of the delivered-status fix above): `fulfillment_status`
  // wasn't in this fields list at all, so `order?.fulfillment_status` was
  // always `undefined` — meaning the eligibility check below could only
  // ever pass via `order.status === 'completed'`, never via delivery state.
  const orderRes = await fetch(
    `${MEDUSA_URL}/store/orders/${orderId}?fields=*items,*items.variant,status,fulfillment_status,customer_id`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
        'x-publishable-api-key': PUB_KEY,
      },
    },
  )
  if (!orderRes.ok) {
    return NextResponse.json(
      { error: 'Could not verify order' },
      { status: 400 },
    )
  }
  const { order } = await safeJson(orderRes, 'app/api/store/products/[id]/reviews/route.ts')

  // Must be delivered.
  // BUG FIX: this only accepted the literal fulfillment_status 'fulfilled',
  // which just means a fulfillment record exists (e.g. shipped) — it is NOT
  // the same as delivered. lib/api/medusa-fulfillment.ts's
  // markOrderDelivered() sets fulfillment_status to 'delivered' or
  // 'partially_delivered' for orders that are actually delivered (POS
  // cash-pickup orders reach this too — see app/api/pos/orders/route.ts).
  // Those genuinely-delivered orders were being rejected here unless
  // order.status also happened to be 'completed', which most orders never
  // set. Accept the real "delivered" states instead.
  const deliveredStatuses = ['delivered', 'partially_delivered']
  if (
    order?.status !== 'completed' &&
    !deliveredStatuses.includes(order?.fulfillment_status)
  ) {
    return NextResponse.json(
      { error: 'You can only review products from delivered orders' },
      { status: 403 },
    )
  }

  // Must contain this product
  const hasProduct = (order?.items ?? []).some(
    (item: any) =>
      item.variant?.product_id === productId || item.product_id === productId,
  )
  if (!hasProduct) {
    return NextResponse.json(
      { error: 'This product is not in that order' },
      { status: 403 },
    )
  }

  // 4. Load existing product metadata
  const product = await getProductWithMeta(productId)
  if (!product) {
    return NextResponse.json({ error: 'Product not found' }, { status: 404 })
  }

  const existingReviews: ProductReview[] =
    product.metadata?.productReviews ?? []

  // Prevent duplicate review for same order
  const alreadyReviewed = existingReviews.some(
    (r) => r.orderId === orderId && r.customerId === order.customer_id,
  )
  if (alreadyReviewed) {
    return NextResponse.json(
      { error: 'You have already reviewed this product for this order' },
      { status: 409 },
    )
  }

  // 5. Build new review
  const customerName =
    `${order.shipping_address?.first_name ?? ''} ${order.shipping_address?.last_name ?? ''}`.trim() ||
    'Verified Buyer'

  const newReview: ProductReview = {
    id: `pr_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    customerId: order.customer_id,
    customerName,
    rating: Math.min(5, Math.max(1, Number(rating))),
    title: String(title ?? '').trim(),
    body: String(reviewBody).trim(),
    orderId,
    published: true, // auto-publish; add moderation toggle later if needed
    createdAt: new Date().toISOString(),
  }

  const updatedReviews = [...existingReviews, newReview]

  // 6. Recalculate average rating + count
  const publishedReviews = updatedReviews.filter((r) => r.published)
  const avgRating =
    publishedReviews.length > 0
      ? Math.round(
          (publishedReviews.reduce((sum, r) => sum + r.rating, 0) /
            publishedReviews.length) *
            10,
        ) / 10
      : 0

  // 7. Persist to Medusa product metadata via service token
  const updateRes = await medusaServiceFetch(`/admin/products/${productId}`, {
    method: 'POST',
    body: JSON.stringify({
      metadata: {
        ...(product.metadata ?? {}),
        productReviews: updatedReviews,
        rating: avgRating,
        reviewCount: publishedReviews.length,
      },
    }),
  })

  if (!updateRes.ok) {
    const err = await updateRes.json().catch(() => ({}))
    console.error('[API] product reviews POST save error:', err)
    return NextResponse.json(
      { error: 'Failed to save review' },
      { status: 500 },
    )
  }

  return NextResponse.json({
    review: newReview,
    rating: avgRating,
    reviewCount: publishedReviews.length,
  })
}
