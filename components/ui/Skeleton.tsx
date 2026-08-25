import { cn, PRODUCT_GRID_COLS } from '@/lib/utils';
export function Skeleton({
  className
}: {
  className?: string;
}) {
  return <div className={cn('animate-pulse rounded-lg bg-gray-100', className)} />;
}
export function ProductCardSkeleton() {
  return <div className='bg-white rounded-2xl overflow-hidden border border-gray-100'>
      <Skeleton className='aspect-square w-full rounded-none' />
      <div className='p-4 space-y-2'>
        <Skeleton className='h-3 w-16' />
        <Skeleton className='h-4 w-full' />
        <Skeleton className='h-4 w-3/4' />
        <div className='flex items-center justify-between pt-2'>
          <Skeleton className='h-5 w-20' />
          <Skeleton className='h-8 w-8 rounded-full' />
        </div>
      </div>
    </div>;
}
export function ProductGridSkeleton({
  count = 8,
  columns = 4
}: {
  count?: number;
  columns?: 2 | 3 | 4;
}) {
  return <div className={cn('grid gap-4 sm:gap-5', PRODUCT_GRID_COLS[columns])}>
      {Array.from({
      length: count
    }).map((_, i) => <ProductCardSkeleton key={i} />)}
    </div>;
}
export function ProductDetailSkeleton() {
  return <div className='max-w-7xl mx-auto px-4 py-8 grid grid-cols-1 lg:grid-cols-2 gap-10 animate-pulse'>
      <div className='space-y-3'>
        <Skeleton className='aspect-square w-full rounded-2xl' />
        <div className='grid grid-cols-4 gap-2'>
          {[...Array(4)].map((_, i) => <Skeleton key={i} className='aspect-square rounded-xl' />)}
        </div>
      </div>
      <div className='space-y-4'>
        <Skeleton className='h-4 w-24' />
        <Skeleton className='h-8 w-full' />
        <Skeleton className='h-6 w-32' />
        <Skeleton className='h-24 w-full rounded-xl' />
        <Skeleton className='h-12 w-full rounded-xl' />
        <Skeleton className='h-12 w-full rounded-xl' />
      </div>
    </div>;
}
export function CartItemSkeleton() {
  return <div className='bg-white rounded-2xl p-5 border border-gray-100 flex gap-4 animate-pulse'>
      <Skeleton className='w-24 h-24 sm:w-28 sm:h-28 rounded-xl shrink-0' />
      <div className='flex-1 space-y-3'>
        <Skeleton className='h-3 w-16' />
        <Skeleton className='h-5 w-3/4' />
        <Skeleton className='h-3 w-1/2' />
        <div className='flex justify-between pt-2'>
          <Skeleton className='h-6 w-20' />
          <Skeleton className='h-8 w-28 rounded-xl' />
        </div>
      </div>
    </div>;
}
export function OrderCardSkeleton() {
  return <div className='bg-white rounded-2xl p-5 border border-gray-100 animate-pulse flex items-center gap-4'>
      <Skeleton className='w-12 h-12 rounded-xl shrink-0' />
      <div className='flex-1 space-y-2'>
        <Skeleton className='h-4 w-32' />
        <Skeleton className='h-3 w-48' />
      </div>
      <div className='text-right space-y-2'>
        <Skeleton className='h-5 w-20' />
        <Skeleton className='h-5 w-16 rounded-full' />
      </div>
    </div>;
}
export function ProfileSkeleton() {
  return <div className='animate-pulse'>
      <div className='bg-[#0A1F44] py-10'>
        <div className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center gap-4'>
          <div className='w-16 h-16 bg-white/20 rounded-2xl' />
          <div className='space-y-2'>
            <div className='h-6 w-40 bg-white/20 rounded' />
            <div className='h-4 w-56 bg-white/20 rounded' />
          </div>
        </div>
      </div>
      <div className='max-w-7xl mx-auto px-4 py-8 grid grid-cols-1 lg:grid-cols-4 gap-8'>
        <div className='space-y-4'>
          <div className='bg-white rounded-2xl p-5 border border-gray-100'>
            <div className='grid grid-cols-2 gap-4'>
              <Skeleton className='h-20 rounded-xl' />
              <Skeleton className='h-20 rounded-xl' />
            </div>
          </div>
          <Skeleton className='h-12 rounded-2xl' />
        </div>
        <div className='lg:col-span-3 space-y-6'>
          <Skeleton className='h-40 rounded-2xl' />
          <Skeleton className='h-60 rounded-2xl' />
        </div>
      </div>
    </div>;
}
export function DashboardTableSkeleton({
  rows = 5,
  cols = 5
}: {
  rows?: number;
  cols?: number;
}) {
  return <div className='animate-pulse'>
      {Array.from({
      length: rows
    }).map((_, i) => <div key={i} className={`flex gap-4 px-4 py-3 ${i !== rows - 1 ? 'border-b border-[#F1F1F1]' : ''}`}>
          {Array.from({
        length: cols
      }).map((_, j) => <div key={j} className='flex-1'>
              <Skeleton className={`h-4 ${j === 0 ? 'w-8 h-8 rounded-full' : j === cols - 1 ? 'w-16' : 'w-full'}`} />
            </div>)}
        </div>)}
    </div>;
}
export function DashboardStatsSkeleton() {
  return <div className='grid grid-cols-2 lg:grid-cols-4 gap-4 animate-pulse'>
      {[...Array(4)].map((_, i) => <div key={i} className='bg-white border border-[#E1E3E5] rounded-2xl p-5'>
          <div className='flex items-center justify-between mb-4'>
            <Skeleton className='w-10 h-10 rounded-xl' />
            <Skeleton className='h-5 w-14 rounded-full' />
          </div>
          <Skeleton className='h-4 w-24 mb-2' />
          <Skeleton className='h-8 w-32' />
        </div>)}
    </div>;
}
export function DashboardProductCardSkeleton() {
  return <div className='bg-white border border-[#E1E3E5] rounded-xl p-4 animate-pulse flex gap-3'>
      <Skeleton className='w-12 h-12 rounded-lg shrink-0' />
      <div className='flex-1 space-y-2'>
        <Skeleton className='h-4 w-3/4' />
        <Skeleton className='h-3 w-1/2' />
        <div className='flex gap-2 pt-1'>
          <Skeleton className='h-5 w-16 rounded-full' />
          <Skeleton className='h-5 w-16 rounded-full' />
        </div>
      </div>
    </div>;
}
export function POSProductCardSkeleton() {
  return <div className='bg-white border border-[#E1E3E5] rounded-xl p-3 animate-pulse'>
      <Skeleton className='w-full aspect-square rounded-lg mb-2' />
      <Skeleton className='h-3 w-2/3 mb-1' />
      <Skeleton className='h-4 w-full mb-2' />
      <div className='flex items-center justify-between'>
        <Skeleton className='h-4 w-14' />
        <Skeleton className='w-7 h-7 rounded-lg' />
      </div>
    </div>;
}
export function POSProductGridSkeleton({
  count = 12
}: {
  count?: number;
}) {
  return <div className='grid grid-cols-2 sm:grid-cols-3 gap-2.5 p-2'>
      {Array.from({
      length: count
    }).map((_, i) => <POSProductCardSkeleton key={i} />)}
    </div>;
}
export function POSOrderRowSkeleton() {
  return <div className='flex items-center gap-3 px-4 py-3.5 border-b border-[#F1F1F1] animate-pulse'>
      <Skeleton className='w-8 h-8 rounded-lg shrink-0' />
      <div className='flex-1 space-y-1.5'>
        <Skeleton className='h-3.5 w-32' />
        <Skeleton className='h-3 w-48' />
      </div>
      <div className='text-right space-y-1.5'>
        <Skeleton className='h-4 w-16' />
        <Skeleton className='h-4 w-20 rounded-full' />
      </div>
    </div>;
}
export function POSCustomerRowSkeleton() {
  return <div className='flex items-center gap-3 px-4 py-3.5 border-b border-[#F1F1F1] animate-pulse'>
      <Skeleton className='w-9 h-9 rounded-full shrink-0' />
      <div className='flex-1 space-y-1.5'>
        <Skeleton className='h-3.5 w-28' />
        <Skeleton className='h-3 w-40' />
      </div>
      <Skeleton className='h-4 w-16' />
    </div>;
}
export function POSAnalyticsSkeleton() {
  return <div className='p-4 space-y-4 animate-pulse'>
      <div className='grid grid-cols-2 gap-3'>
        {[...Array(4)].map((_, i) => <div key={i} className='bg-white border border-[#E1E3E5] rounded-xl p-4'>
            <Skeleton className='h-3 w-20 mb-3' />
            <Skeleton className='h-7 w-28' />
          </div>)}
      </div>
      <div className='bg-white border border-[#E1E3E5] rounded-xl p-4'>
        <Skeleton className='h-4 w-32 mb-4' />
        <Skeleton className='h-[160px] w-full rounded-lg' />
      </div>
      <div className='bg-white border border-[#E1E3E5] rounded-xl p-4 space-y-3'>
        <Skeleton className='h-4 w-32' />
        {[...Array(4)].map((_, i) => <div key={i} className='flex items-center justify-between'>
            <Skeleton className='h-3 w-32' />
            <Skeleton className='h-3 w-16' />
          </div>)}
      </div>
    </div>;
}
