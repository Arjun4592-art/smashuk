import { NextRequest, NextResponse } from 'next/server'
import { getAdminAuthHeader } from '@/lib/api/admin-auth'
import { invalidateCatalog } from '@/lib/catalog/source'
import { upsertAdminProduct } from '@/lib/api/admin-products-server'
const MEDUSA_URL =
  process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL ?? 'http://localhost:9000'
async function safeJson(res: Response) {
  const text = await res.text()
  if (!text) return {}
  try {
    return JSON.parse(text)
  } catch {
    return {
      message: text.slice(0, 300),
    }
  }
}
export async function DELETE(
  req: NextRequest,
  {
    params,
  }: {
    params: Promise<{
      id: string
      variantId: string
    }>
  },
) {
  try {
    const { id, variantId } = await params
    const authorization = (await getAdminAuthHeader(req)) ?? ''
    if (!authorization) {
      return NextResponse.json(
        {
          error: 'Missing Authorization header',
        },
        {
          status: 401,
        },
      )
    }
    const res = await fetch(
      `${MEDUSA_URL}/admin/products/${id}/variants/${variantId}`,
      {
        method: 'DELETE',
        headers: {
          Authorization: authorization,
        },
      },
    )
    const data = await safeJson(res)
    if (res.ok) {
      invalidateCatalog()
      await upsertAdminProduct(id, authorization)
    }
    return NextResponse.json(data, {
      status: res.status,
    })
  } catch (err: any) {
    console.error('[DELETE products/:id/variants/:variantId]', err)
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
export async function POST(
  req: NextRequest,
  {
    params,
  }: {
    params: Promise<{
      id: string
      variantId: string
    }>
  },
) {
  try {
    const { id, variantId } = await params
    const t0 = Date.now()
    const authorization = (await getAdminAuthHeader(req)) ?? ''
    if (!authorization) {
      return NextResponse.json(
        { error: 'Missing Authorization header' },
        { status: 401 },
      )
    }
    const body = (await req.json()) ?? {}
    // Same shaping the product route applies to each variant: Medusa has no
    // `images` on a variant, so they live in metadata.variant_images.
    const { id: _ignoredId, images, ...rest } = body
    const payload: Record<string, any> = { ...rest }
    if (Array.isArray(images)) {
      payload.metadata = {
        ...(rest.metadata || {}),
        variant_images: images
          .map((img: any) => (typeof img === 'string' ? img : img?.url))
          .filter(Boolean),
      }
    }
    const res = await fetch(
      `${MEDUSA_URL}/admin/products/${id}/variants/${variantId}?fields=id,title`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: authorization,
        },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(280_000),
      },
    )
    const data = await safeJson(res)
    console.log(
      `[POST variant ${variantId}] Medusa answered HTTP ${res.status} in ${Date.now() - t0}ms`,
    )
    // The product PATCH that follows in the same Save invalidates the catalog
    // and refreshes the dashboard list, so it is not repeated here.
    return NextResponse.json(data, { status: res.status })
  } catch (err: any) {
    console.error('[POST products/:id/variants/:variantId]', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
