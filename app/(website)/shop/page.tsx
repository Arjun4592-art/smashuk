import { Suspense } from 'react'
import { generateStaticMetadata } from '@/lib/seo'
import ShopClient from './ShopClient'

export const generateMetadata = () => generateStaticMetadata('shop')

export default function ShopPage() {
  return (
    <Suspense fallback={<div className='min-h-screen bg-white' />}>
      <ShopClient />
    </Suspense>
  )
}
