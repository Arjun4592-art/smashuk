'use client'

import Link from 'next/link'
import { useWishlistStore } from '@/store/wishlistStore'
import ProductCard from '@/components/website/ProductCard'
import { ChevronRightIcon, HeartIcon, CloseIcon, TrashIcon } from '@/components/ui/Icons'

export default function WishlistPage() {
  const items = useWishlistStore((s) => s.items)
  const remove = useWishlistStore((s) => s.remove)
  const clear = useWishlistStore((s) => s.clear)

  return (
    <div className='min-h-screen bg-[#F2F4F7]'>
      <div className='bg-[#0A1F44] py-10'>
        <div className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8'>
          <div className='flex items-center gap-2 text-white/60 text-sm font-lato mb-3'>
            <Link href='/' className='hover:text-white'>
              Home
            </Link>
            <ChevronRightIcon size={14} />
            <span className='text-white'>Wishlist</span>
          </div>
          <div className='flex items-center justify-between flex-wrap gap-3'>
            <h1 className='font-montserrat font-black text-3xl text-white'>
              My Wishlist
            </h1>
            {items.length > 0 && (
              <button
                type='button'
                onClick={() => {
                  if (window.confirm('Remove all items from your wishlist?')) {
                    clear()
                  }
                }}
                className='inline-flex items-center gap-1.5 text-white/70 hover:text-white text-sm font-lato transition-colors'
              >
                <TrashIcon size={15} />
                Clear All
              </button>
            )}
          </div>
        </div>
      </div>

      <div className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10'>
        {items.length === 0 ? (
          <div className='text-center py-20'>
            <HeartIcon size={48} className='text-gray-200 mx-auto mb-4' />
            <h2 className='font-montserrat font-black text-xl text-[#0A1F44] mb-2'>
              Your wishlist is empty
            </h2>
            <p className='text-gray-500 font-lato text-sm mb-6'>
              Tap the heart icon on any product to save it here.
            </p>
            <Link
              href='/shop'
              className='inline-block bg-[#E8553A] hover:bg-[#D4441F] text-white font-montserrat font-bold px-6 py-3 rounded-full transition-colors'
            >
              Browse Products →
            </Link>
          </div>
        ) : (
          <div className='grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6'>
            {items.map((product) => (
              <div key={product.id} className='relative group'>
                {/* Dedicated remove button — the heart on ProductCard also
                    un-wishlists, but it's easy to miss/mis-tap; this gives
                    people an explicit, unambiguous way to delete an item
                    from this page. */}
                <button
                  type='button'
                  onClick={() => remove(product.id)}
                  aria-label={`Remove ${product.name} from wishlist`}
                  title='Remove from wishlist'
                  className='absolute top-3 left-3 z-20 w-8 h-8 rounded-full bg-white/90 backdrop-blur-sm shadow-md border border-[#E5E7EB] flex items-center justify-center text-[#4B5563] hover:text-white hover:bg-[#E8553A] hover:border-[#E8553A] transition-all'
                >
                  <CloseIcon size={14} />
                </button>
                <ProductCard product={product} />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
