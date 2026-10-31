import Link from 'next/link'
import ProductGrid from '@/components/website/ProductGrid'
import { ArrowRightIcon } from '@/components/ui/Icons'
import { getProductsByIds, normalizeProduct } from '@/lib/api/store'
import { loadCatalogPageCached } from '@/lib/catalog/server-page'
import { catalogQueryFromParams, toCardProduct } from '@/lib/catalog/types'
import type { HomeProductsBlock } from '@/lib/home-layout-shared'
import type { Product } from '@/types'

async function loadProducts(block: HomeProductsBlock): Promise<Product[]> {
  if (block.source === 'manual') {
    const ids = block.products.map((p) => p.id)
    if (ids.length === 0) return []
    const raw = await getProductsByIds(ids)
    const byId = new Map<string, Product>()
    for (const p of raw) byId.set(p.id, normalizeProduct(p))
    return ids
      .map((id) => byId.get(id))
      .filter((p): p is Product => !!p)
      .filter((p) => !block.onlyInStock || p.inStock)
      .map(toCardProduct)
  }

  const sp = new URLSearchParams()
  const { sport, category, brand, badge } = block.filters
  if (sport) sp.set('sport', sport)
  if (category) sp.set('category', category)
  if (brand) sp.set('brand', brand)
  if (badge) sp.set('badge', badge)
  sp.set('sort', block.sort)
  sp.set('page', '1')
  sp.set('perPage', String(block.limit))
  // The catalogue applies the shop's default price slider (0–500) unless told
  // otherwise. A homepage section shouldn't silently drop expensive products,
  // so open the range right up.
  sp.set('price', '0-1000000')
  if (block.onlyInStock) sp.set('inStock', '1')

  // Cached variant keeps the homepage static/ISR (see server-page.ts).
  const { products } = await loadCatalogPageCached(catalogQueryFromParams(sp), {
    facets: false,
  })
  return products
}

export default async function HomeProductSection({
  block,
}: {
  block: HomeProductsBlock
}) {
  let products: Product[] = []
  try {
    products = await loadProducts(block)
  } catch (err: any) {
    // A failing section disappears instead of breaking the whole homepage.
    console.error('[home] product section failed:', err?.message ?? err)
    return null
  }
  if (products.length === 0) return null

  const bg = block.background === 'gray' ? 'bg-[#F2F4F7]' : 'bg-white'
  const showViewAll = !!block.viewAllLabel && !!block.viewAllHref

  return (
    <section className={`py-16 ${bg}`}>
      <div className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8'>
        <ProductGrid
          products={products}
          title={block.title || undefined}
          showSort={block.showSort}
          showViewToggle={block.showViewToggle}
          columns={block.columns}
        />
        {showViewAll && (
          <div className='mt-10 text-center'>
            <Link
              href={block.viewAllHref}
              className='inline-flex items-center gap-2 bg-[#0A1F44] hover:bg-[#E8553A] text-white font-montserrat font-bold px-6 py-3 rounded-full transition-all duration-300 shadow-md text-sm'
            >
              {block.viewAllLabel}
              <ArrowRightIcon size={14} />
            </Link>
          </div>
        )}
      </div>
    </section>
  )
}
