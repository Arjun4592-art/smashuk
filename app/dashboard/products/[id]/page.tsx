import Link from 'next/link'
import { redirect } from 'next/navigation'
import EditProductClient from './EditProductClient'
import {
  AdminAuthError,
  getDashboardAuth,
  getEditorData,
  type EditorData,
} from '@/lib/api/admin-products-server'

export const dynamic = 'force-dynamic'

// Server component: product + categories + options + brand/sport lists are all
// fetched here, in parallel, server → Medusa, and handed to the form as props.
// The browser no longer queues 4+ heavy requests before the form can render.
export default async function EditProductPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const authorization = await getDashboardAuth()
  if (!authorization) redirect('/dashboard/login')

  let initial: EditorData | null = null
  let errorMessage = ''
  try {
    initial = await getEditorData(authorization, id)
  } catch (err: any) {
    if (err instanceof AdminAuthError) redirect('/dashboard/login')
    console.error('[dashboard/products/:id] server load failed:', err)
    errorMessage = err?.message || 'Failed to load product'
  }

  if (!initial) {
    return (
      <div className='max-w-xl mx-auto mt-16 p-6 bg-white border border-[#E1E3E5] rounded-xl text-center space-y-3'>
        <p className='text-[14px] font-medium text-[#202223]'>
          Couldn&apos;t load this product
        </p>
        <p className='text-[13px] text-[#D82C0D]'>{errorMessage}</p>
        <div className='flex items-center justify-center gap-3 pt-1'>
          <Link
            href={`/dashboard/products/${id}`}
            className='px-4 py-2 bg-[#008060] text-white text-[13px] font-medium rounded-lg no-underline'
          >
            Retry
          </Link>
          <Link
            href='/dashboard/products'
            className='px-4 py-2 border border-[#E1E3E5] text-[13px] text-[#202223] rounded-lg no-underline'
          >
            Back to products
          </Link>
        </div>
      </div>
    )
  }

  return <EditProductClient id={id} initial={initial} />
}
