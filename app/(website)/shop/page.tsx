import { Suspense } from 'react';
import { generateStaticMetadata } from '@/lib/seo';
import ShopClient from '@/app/(website)/shop/ShopClient';
import ShopHeader from '@/app/(website)/shop/ShopHeader';
export const generateMetadata = () => generateStaticMetadata('shop');
export default async function ShopPage({
  searchParams
}: {
  searchParams: Promise<{
    [key: string]: string | string[] | undefined;
  }>;
}) {
  const params = await searchParams;
  const first = (v: string | string[] | undefined) => Array.isArray(v) ? v[0] : v;
  return <div className='min-h-screen bg-white'>
      <ShopHeader q={first(params.q)} sport={first(params.sport)} badge={first(params.badge)} />
      <Suspense fallback={<div className='min-h-[50vh] bg-white' />}>
        <ShopClient />
      </Suspense>
    </div>;
}
