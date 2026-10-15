import { NextRequest, NextResponse } from 'next/server'
import { medusaServiceFetch } from '@/lib/api/medusa-service-token'
import { MAIL_IN_EXTRAS, MAIL_IN_HANDLES } from '@/lib/mail-in'
import { isStringingCategoryHandle, stringingKind } from '@/lib/stringing'

const ALLOWED_HANDLES = new Set<string>([
  ...Object.values(MAIL_IN_HANDLES),
  ...MAIL_IN_EXTRAS.map((e) => e.handle),
])

type Item = { productId?: unknown; variantId?: unknown }

export async function POST(req: NextRequest) {
  let body: { items?: Item[] }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request.' }, { status: 400 })
  }
  const items = (body.items ?? [])
    .map((i) => ({
      productId: typeof i.productId === 'string' ? i.productId : '',
      variantId: typeof i.variantId === 'string' ? i.variantId : '',
    }))
    .filter((i) => i.productId && i.variantId)
    .slice(0, 40)
  if (items.length === 0) return NextResponse.json({ updated: 0 })

  const variantsByProduct = new Map<string, Set<string>>()
  for (const i of items) {
    if (!variantsByProduct.has(i.productId))
      variantsByProduct.set(i.productId, new Set())
    variantsByProduct.get(i.productId)!.add(i.variantId)
  }

  let updated = 0
  const skipped: string[] = []
  try {
    for (const [productId, variantIds] of variantsByProduct) {
      const res = await medusaServiceFetch(
        `/admin/products/${encodeURIComponent(productId)}?fields=id,handle,title,metadata,*categories,*variants`,
      )
      if (!res.ok) {
        skipped.push(productId)
        continue
      }
      const { product } = await res.json()
      if (!product) {
        skipped.push(productId)
        continue
      }
      const isMailInProduct = ALLOWED_HANDLES.has(String(product.handle ?? ''))
      const inStringingCategory = (product.categories ?? []).some((c: any) =>
        isStringingCategoryHandle(c?.handle),
      )
      const isStringService =
        inStringingCategory &&
        stringingKind(product.title, product.metadata?.stringing_type) ===
          'service'
      if (!isMailInProduct && !isStringService) {
        skipped.push(productId)
        continue
      }
      for (const v of product.variants ?? []) {
        if (!variantIds.has(v.id)) continue
        if (v.manage_inventory === false) continue
        const up = await medusaServiceFetch(
          `/admin/products/${encodeURIComponent(productId)}/variants/${encodeURIComponent(v.id)}`,
          {
            method: 'POST',
            body: JSON.stringify({ manage_inventory: false }),
          },
        )
        if (up.ok) updated += 1
        else
          console.error(
            `[mail-in/prepare] could not update variant ${v.id}:`,
            up.status,
          )
      }
    }
    // Make the next /api/store/stringing-options call re-read the catalogue.
    const state = (globalThis as any).__smashCatalogState
    if (updated > 0 && state && typeof state.generation === 'number')
      state.generation += 1
    return NextResponse.json({ updated, skipped })
  } catch (err: any) {
    console.error('[mail-in/prepare]', err?.message ?? err)
    // Not fatal: the cart call below reports the real error if stock blocks.
    return NextResponse.json({ updated, skipped, error: 'prepare failed' })
  }
}
