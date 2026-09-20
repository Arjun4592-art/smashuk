import { NextRequest, NextResponse } from 'next/server'
import { getAdminAuthHeader } from '@/lib/api/admin-auth'
import { POST as createProduct } from '../../route'

const MEDUSA_URL =
  process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL ?? 'http://localhost:9000'

async function safeJson(res: Response) {
  const text = await res.text()
  if (!text) return {}
  try {
    return JSON.parse(text)
  } catch {
    return { message: text.slice(0, 300) }
  }
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/[\s-]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

// Duplicates a product: fetches the full source product, then re-creates it
// (new title/handle/SKUs so nothing collides) as a draft via the existing
// create route — that keeps SKU sync, inventory linking and metadata
// defaults identical to normal product creation.
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params
  const authorization = (await getAdminAuthHeader(req)) ?? ''
  if (!authorization) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const fields =
      '+metadata,*variants,+variants.metadata,*variants.prices,*variants.options,*variants.options.option,*variants.images,*categories,*images,*options,*options.values,*sales_channels,*tags'
    const srcRes = await fetch(
      `${MEDUSA_URL}/admin/products/${id}?fields=${fields}`,
      { headers: { Authorization: authorization } },
    )
    const srcData = await safeJson(srcRes)
    if (!srcRes.ok || !srcData.product) {
      return NextResponse.json(
        { error: srcData.message ?? 'Product not found' },
        { status: srcRes.status || 404 },
      )
    }
    const p = srcData.product

    const copyTitle = `${p.title} (Copy)`
    const handle = `${slugify(copyTitle)}-${Date.now().toString(36)}`

    const options = (p.options ?? []).map((o: any) => ({
      id: o.id,
      title: o.title,
      values: (o.values ?? []).map((v: any) => v.value),
    }))

    const variants = (p.variants ?? []).map((v: any) => ({
      title: v.title,
      sku: v.sku ? `${v.sku}-COPY` : undefined,
      manage_inventory: v.manage_inventory,
      weight: v.weight ?? undefined,
      prices: (v.prices ?? []).map((pr: any) => ({
        amount: pr.amount,
        currency_code: pr.currency_code,
      })),
      metadata: v.metadata ?? undefined,
      options: Object.fromEntries(
        (v.options ?? [])
          .filter((o: any) => o.option?.title)
          .map((o: any) => [o.option.title, o.value]),
      ),
      images:
        (v.images ?? []).length > 0
          ? v.images.map((img: any) => ({ url: img.url }))
          : undefined,
    }))

    const payload = {
      title: copyTitle,
      handle,
      description: p.description ?? undefined,
      status: 'draft',
      thumbnail: p.thumbnail ?? undefined,
      images:
        (p.images ?? []).length > 0
          ? p.images.map((img: any, idx: number) => ({
              url: img.url,
              rank: idx,
            }))
          : undefined,
      categories: (p.categories ?? []).map((c: any) => ({ id: c.id })),
      tags: (p.tags ?? []).map((t: any) => ({ id: t.id })),
      sales_channels: (p.sales_channels ?? []).map((sc: any) => ({
        id: sc.id,
      })),
      options,
      variants,
      metadata: { ...(p.metadata ?? {}) },
      _stock: 0,
    }

    // Call the create handler DIRECTLY instead of an HTTP request to our own
    // site. The old `fetch(`${req.nextUrl.origin}/api/admin/products`)` worked
    // locally but failed in production ("fetch failed"): behind a proxy /
    // container, nextUrl.origin is the internal address (localhost:3000,
    // 0.0.0.0, wrong port…), which the server cannot reach.
    const headers = new Headers(req.headers)
    headers.set('Content-Type', 'application/json')
    headers.delete('content-length')
    const createReq = new NextRequest(new URL('/api/admin/products', req.url), {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
    })
    const createRes = await createProduct(createReq)
    const createData = await safeJson(createRes)
    return NextResponse.json(createData, { status: createRes.status })
  } catch (err: any) {
    console.error('[duplicate product]', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
