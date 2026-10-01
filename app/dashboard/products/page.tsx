import { redirect } from 'next/navigation'
import ProductsClient from './ProductsClient'
import {
  AdminAuthError,
  getAdminProductList,
  getDashboardAuth,
  type AdminListResult,
} from '@/lib/api/admin-products-server'

export const dynamic = 'force-dynamic'

// Server component: the first page of products (and the tab counts) is loaded
// here, on the server, and streamed to the browser with the page — the client
// never starts from an empty spinner.
export default async function ProductsPage() {
  const authorization = await getDashboardAuth()
  if (!authorization) redirect('/dashboard/login')

  let initialData: AdminListResult | null = null
  let initialError: string | null = null
  try {
    initialData = await getAdminProductList(authorization, {
      limit: 20,
      offset: 0,
    })
  } catch (err: any) {
    if (err instanceof AdminAuthError) redirect('/dashboard/login')
    console.error('[dashboard/products] server load failed:', err)
    initialError = err?.message || 'Failed to load products'
  }

  return (
    <ProductsClient initialData={initialData} initialError={initialError} />
  )
}
