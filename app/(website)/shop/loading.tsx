import { ProductGridSkeleton } from '@/components/ui/Skeleton';
export default function Loading() {
  return <div className='min-h-screen bg-[#F2F4F7] py-8'>
      <div className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8'>
        <ProductGridSkeleton count={12} columns={3} />
      </div>
    </div>;
}
