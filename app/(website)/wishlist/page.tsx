'use client';

import Link from 'next/link';
import { useWishlistStore } from '@/store/wishlistStore';
import ProductCard from '@/components/website/ProductCard';
import { HeartIcon, CloseIcon, TrashIcon } from '@/components/ui/Icons';
function GridTexture() {
  return <svg className='absolute inset-0 w-full h-full opacity-[0.06] pointer-events-none' preserveAspectRatio='none' xmlns='http://www.w3.org/2000/svg'>
      {Array.from({
      length: 20
    }).map((_, i) => <line key={'v' + i} x1={`${i * 5.5}%`} y1='0' x2={`${i * 5.5 + 3}%`} y2='100%' stroke='white' strokeWidth='1' />)}
      {Array.from({
      length: 12
    }).map((_, i) => <line key={'h' + i} x1='0' y1={`${i * 9}%`} x2='100%' y2={`${i * 9 + 2}%`} stroke='white' strokeWidth='1' />)}
    </svg>;
}
export default function WishlistPage() {
  const items = useWishlistStore(s => s.items);
  const remove = useWishlistStore(s => s.remove);
  const clear = useWishlistStore(s => s.clear);
  return <div className='min-h-screen bg-[#F2F4F7]'>
      <div className='relative bg-[#0A1F44] py-12 overflow-hidden'>
        <GridTexture />
        <div className='relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8'>
          <p className='text-white/40 text-xs font-mono tracking-widest uppercase mb-4'>
            <Link href='/' className='hover:text-white/70 transition-colors'>
              Home
            </Link>
            &nbsp;/&nbsp;
            <span className='text-white/70'>Wishlist</span>
          </p>
          <div className='flex items-center justify-between flex-wrap gap-3'>
            <div>
              <h1 className='reveal font-montserrat font-black text-3xl sm:text-4xl text-white mb-2'>
                My Wishlist
              </h1>
              <p className='font-lato text-white/70'>
                {items.length} item{items.length !== 1 ? 's' : ''} saved
              </p>
            </div>
            {items.length > 0 && <button type='button' onClick={() => {
            if (window.confirm('Remove all items from your wishlist?')) {
              clear();
            }
          }} className='inline-flex items-center gap-1.5 text-white/70 hover:text-white text-sm font-lato transition-colors'>
                <TrashIcon size={15} />
                Clear All
              </button>}
          </div>
        </div>
      </div>

      <div className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10'>
        {items.length === 0 ? <div className='text-center py-20'>
            <HeartIcon size={48} className='text-gray-200 mx-auto mb-4' />
            <h2 className='font-montserrat font-black text-xl text-[#0A1F44] mb-2'>
              Your wishlist is empty
            </h2>
            <p className='text-gray-500 font-lato text-sm mb-6'>
              Tap the heart icon on any product to save it here.
            </p>
            <Link href='/shop' className='inline-block bg-[#E8553A] hover:bg-[#D4441F] text-white font-montserrat font-bold px-6 py-3 rounded-full transition-colors'>
              Browse Products →
            </Link>
          </div> : <div className='grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6'>
            {items.map(product => <div key={product.id} className='relative group'>
                {}
                <button type='button' onClick={() => remove(product.id)} aria-label={`Remove ${product.name} from wishlist`} title='Remove from wishlist' className='absolute top-3 left-3 z-20 w-8 h-8 rounded-full bg-white/90 backdrop-blur-sm shadow-md border border-[#E5E7EB] flex items-center justify-center text-[#4B5563] hover:text-white hover:bg-[#E8553A] hover:border-[#E8553A] transition-all'>
                  <CloseIcon size={14} />
                </button>
                <ProductCard product={product} />
              </div>)}
          </div>}
      </div>
    </div>;
}
