import { Suspense } from 'react'
import { generateShopMetadata } from '@/lib/seo'
import ShopClient from '@/app/(website)/shop/ShopClient'
import ShopHeader from '@/app/(website)/shop/ShopHeader'
import { buildInitialCatalogQuery } from '@/lib/catalog/initial'
import { loadCatalogPageSafe } from '@/lib/catalog/server-page'
export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<{
    [key: string]: string | string[] | undefined
  }>
}) {
  return generateShopMetadata(await searchParams)
}
export const revalidate = 3600
export default async function ShopPage({
  searchParams,
}: {
  searchParams: Promise<{
    [key: string]: string | string[] | undefined
  }>
}) {
  const params = await searchParams
  const first = (v: string | string[] | undefined) =>
    Array.isArray(v) ? v[0] : v
  // Load page 1 on the server so the product grid is part of the HTML (fast
  // LCP, crawlable, no skeleton flash) instead of being fetched after hydration.
  const initialData = await loadCatalogPageSafe(
    buildInitialCatalogQuery({
      q: first(params.q),
      sport: first(params.sport),
      badge: first(params.badge),
      category: first(params.category),
      brand: first(params.brand),
      gender: first(params.gender),
      level: first(params.level),
      style: first(params.style),
    }),
  )
  return (
    <div className='min-h-screen bg-white'>
      <ShopHeader
        q={first(params.q)}
        sport={first(params.sport)}
        badge={first(params.badge)}
      />
      <Suspense fallback={<div className='min-h-[50vh] bg-white' />}>
        <ShopClient initialData={initialData} />
      </Suspense>
    </div>
  )
}
