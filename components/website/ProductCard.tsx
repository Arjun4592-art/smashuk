'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { useCartStore } from '@/store/cartStore';
import { useWishlistStore } from '@/store/wishlistStore';
import { formatCurrency, calculateDiscount, stripHtml } from '@/lib/utils';
import type { Product } from '@/types';
import { HeartIcon, CartIcon, StarIcon, CheckIcon } from '@/components/ui/Icons';
import QuickViewModal from '@/components/website/QuickViewModal';
const BADGE_STYLES: Record<string, string> = {
  NEW: 'bg-[#E6F1FB] text-[#185FA5]',
  SALE: 'bg-[#FCEBEB] text-[#A32D2D]',
  BESTSELLER: 'bg-[#FEF3C7] text-[#92400E]',
  LIMITED: 'bg-[#F3E8FF] text-[#6B21A8]'
};
interface ProductCardProps {
  product: Product;
  view?: 'grid' | 'list';
}
export default function ProductCard({
  product,
  view = 'grid'
}: ProductCardProps) {
  const [adding, setAdding] = useState(false);
  const [added, setAdded] = useState(false);
  const [showQuickView, setShowQuickView] = useState(false);
  const addItem = useCartStore(s => s.addItem);
  const wishlisted = useWishlistStore(s => s.isWishlisted(product.id));
  const toggleWishlist = useWishlistStore(s => s.toggle);
  const router = useRouter();
  const hasMultipleVariants = (product.variants?.length ?? 0) > 1;
  const discount = product.originalPrice ? calculateDiscount(product.price, product.originalPrice) : 0;
  const displayBadge = product.badge ?? (discount > 0 ? 'SALE' : null);
  const handleAddToCart = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (adding || added) return;
    if (hasMultipleVariants) {
      toast('Choose a size/option first', {
        icon: '👟'
      });
      router.push(`/shop/${product.slug}`);
      return;
    }
    setAdding(true);
    await new Promise(r => setTimeout(r, 400));
    addItem(product, 1);
    setAdding(false);
    setAdded(true);
    setTimeout(() => setAdded(false), 2000);
  };
  const handleWishlist = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    toggleWishlist(product);
  };
  if (view === 'list') {
    return <Link href={`/shop/${product.slug}`} className='group block'>
        <div className='flex gap-4 bg-white border border-[#E5E7EB] rounded-2xl p-4 hover:border-[#E8553A]/30 hover:shadow-[0_4px_20px_rgba(232,85,58,0.08)] transition-all duration-300'>
          {}
          <div className='relative w-28 h-28 sm:w-36 sm:h-36 rounded-xl overflow-hidden bg-[#F2F4F7] pt-3 shrink-0'>
            <img src={product.images[0]} alt={product.name} className='w-full h-full pt-3 object-cover group-hover:scale-105 transition-transform duration-500' />
            {displayBadge && <span className={`absolute top-2 left-2 text-[9px] font-black px-2 py-0.5 rounded-full font-montserrat tracking-wide ${BADGE_STYLES[displayBadge]}`}>
                {displayBadge}
              </span>}
          </div>

          {}
          <div className='flex-1 min-w-0'>
            <div className='flex items-start justify-between gap-2'>
              <div className='min-w-0'>
                <p className='text-[10px] text-[#E8553A] font-bold font-lato uppercase tracking-wider mb-1'>
                  {product.brand} · {product.sport}
                </p>
                <h3 className='font-montserrat font-bold text-[#0A1F44] text-base leading-snug line-clamp-2 group-hover:text-[#E8553A] transition-colors'>
                  {product.name}
                </h3>
              </div>
              <button onClick={handleWishlist} className='p-1.5 shrink-0 rounded-lg hover:bg-[#E8553A]/8 transition-colors' aria-label='Wishlist'>
                <HeartIcon size={18} filled={wishlisted} className={wishlisted ? 'text-[#E8553A]' : 'text-[#D1D5DB]'} />
              </button>
            </div>

            {}
            <div className='flex items-center gap-1.5 mt-2 mb-3'>
              <div className='flex items-center gap-0.5'>
                {[...Array(5)].map((_, i) => <StarIcon key={i} size={11} filled={i < Math.floor(product.rating)} className={i < Math.floor(product.rating) ? 'text-amber-400' : 'text-[#E5E7EB]'} />)}
              </div>
              <span className='text-[11px] text-[#9CA3AF] font-lato'>
                {product.rating} ({product.reviewCount})
              </span>
            </div>

            {}
            <p className='text-[12px] text-[#4B5563] font-lato line-clamp-2 mb-3 hidden sm:block leading-relaxed'>
              {stripHtml(product.description)}
            </p>

            {}
            <div className='flex items-center justify-between gap-3 flex-wrap'>
              <div className='flex items-center gap-2'>
                <span className='font-montserrat font-black text-lg text-[#0A1F44]'>
                  {formatCurrency(product.price)}
                </span>
                {product.originalPrice && <>
                    <span className='text-sm text-[#9CA3AF] line-through font-lato'>
                      {formatCurrency(product.originalPrice)}
                    </span>
                    <span className='text-[10px] font-black text-[#10B981] bg-[#D1FAE5] px-1.5 py-0.5 rounded-full font-montserrat'>
                      Save {discount}%
                    </span>
                  </>}
              </div>
              <button onClick={handleAddToCart} disabled={!product.inStock} className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-black font-montserrat transition-all duration-200 ${!product.inStock ? 'bg-[#F2F4F7] text-[#9CA3AF] cursor-not-allowed' : added ? 'bg-[#10B981] text-white' : 'bg-[#0A1F44] hover:bg-[#E8553A] text-white shadow-sm'}`}>
                {added ? <CheckIcon size={14} /> : <CartIcon size={14} />}
                {!product.inStock ? 'Out of Stock' : adding ? 'Adding...' : added ? 'Added!' : hasMultipleVariants ? 'Choose Options' : 'Add to Cart'}
              </button>
            </div>
          </div>
        </div>
      </Link>;
  }
  return <>
      <Link href={`/shop/${product.slug}`} className='group block'>
        <div className='bg-white border border-[#E5E7EB] rounded-2xl overflow-hidden hover:border-[#E8553A]/35 hover:shadow-[0_8px_32px_rgba(232,85,58,0.10)] transition-all duration-300 hover:-translate-y-1'>
          {}
          <div className='relative aspect-square bg-[#F2F4F7] overflow-hidden'>
            <img src={product.images[0]} alt={product.name} className='w-full h-full object-cover group-hover:scale-[1.07] transition-transform duration-700' />

            {}
            <div className='absolute inset-0 bg-[#0A1F44]/50 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end justify-center pb-5 gap-3'>
              {}
              <button onClick={e => {
              e.preventDefault();
              e.stopPropagation();
              setShowQuickView(true);
            }} aria-label='Quick view' className='w-10 h-10 bg-white rounded-full flex items-center justify-center text-[#0A1F44] hover:bg-[#E8553A] hover:text-white transition-all shadow-lg translate-y-4 group-hover:translate-y-0 duration-200'>
                <svg width={15} height={15} viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2' strokeLinecap='round' strokeLinejoin='round'>
                  <path d='M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z' />
                  <circle cx='12' cy='12' r='3' />
                </svg>
              </button>

              {}
              <button onClick={handleAddToCart} disabled={!product.inStock} aria-label={hasMultipleVariants ? 'Choose options' : 'Add to cart'} title={hasMultipleVariants ? 'Choose options' : 'Add to cart'} className={`w-10 h-10 rounded-full flex items-center justify-center transition-all shadow-lg translate-y-4 group-hover:translate-y-0 duration-300 ${added ? 'bg-[#10B981] text-white' : 'bg-white text-[#0A1F44] hover:bg-[#E8553A] hover:text-white'}`}>
                {added ? <CheckIcon size={15} /> : <CartIcon size={15} />}
              </button>

              {}
              <button onClick={handleWishlist} aria-label='Wishlist' className='w-10 h-10 bg-white rounded-full flex items-center justify-center transition-all shadow-lg translate-y-4 group-hover:translate-y-0 duration-[400ms] hover:bg-[#E8553A]/10'>
                <HeartIcon size={15} filled={wishlisted} className={wishlisted ? 'text-[#E8553A]' : 'text-[#0A1F44]'} />
              </button>
            </div>

            {}
            {displayBadge && <span className={`absolute top-3 left-3 text-[9px] font-black px-2.5 py-1 rounded-full font-montserrat tracking-wide ${BADGE_STYLES[displayBadge]}`}>
                {displayBadge}
              </span>}

            {}
            {discount > 0 && <span className='absolute top-3 right-3 text-[9px] font-black px-2 py-1 rounded-full bg-[#10B981] text-white font-montserrat'>
                -{discount}%
              </span>}

            {}
            {discount === 0 && <button onClick={handleWishlist} aria-label='Wishlist' className='absolute top-3 right-3 w-8 h-8 bg-white/90 backdrop-blur-sm rounded-full flex items-center justify-center shadow-sm hover:bg-white transition-colors'>
                <HeartIcon size={14} filled={wishlisted} className={wishlisted ? 'text-[#E8553A]' : 'text-[#9CA3AF]'} />
              </button>}

            {}
            {!product.inStock && <div className='absolute inset-0 bg-white/75 flex items-center justify-center'>
                <span className='font-montserrat font-bold text-sm text-[#4B5563] bg-white px-4 py-2 rounded-full border border-[#E5E7EB] shadow-sm'>
                  Out of Stock
                </span>
              </div>}
          </div>

          {}
          <div className='p-4 pb-3'>
            {}
            <div className='flex items-center justify-between mb-1.5'>
              <p className='text-[10px] text-[#E8553A] font-bold font-lato uppercase tracking-wider'>
                {product.brand}
              </p>
              <p className='text-[10px] text-[#9CA3AF] font-lato capitalize'>
                {product.sport}
              </p>
            </div>

            {}
            <div className='relative mb-2.5'>
              <h3 className='peer font-montserrat font-bold text-[#0A1F44] text-[13px] leading-snug truncate group-hover:text-[#E8553A] transition-colors duration-200'>
                {product.name}
              </h3>
              {}
              <div className='pointer-events-none absolute left-0 top-full z-20 mt-1 hidden max-w-[240px] rounded-md bg-[#0A1F44] px-2.5 py-1.5 text-[11px] leading-snug text-white shadow-lg peer-hover:block'>
                {product.name}
              </div>
            </div>

            {}
            <div className='flex items-center gap-1.5 mb-3'>
              <div className='flex items-center gap-0.5'>
                {[...Array(5)].map((_, i) => <StarIcon key={i} size={10} filled={i < Math.floor(product.rating)} className={i < Math.floor(product.rating) ? 'text-amber-400' : 'text-[#E5E7EB]'} />)}
              </div>
              <span className='text-[10px] text-[#9CA3AF] font-lato'>
                ({product.reviewCount})
              </span>
              {product.stock <= 5 && product.inStock && <span className='ml-auto text-[10px] text-[#E8553A] font-bold font-lato'>
                  Only {product.stock} left!
                </span>}
            </div>

            {}
            <div className='flex items-center gap-2 flex-wrap'>
              <span className='font-montserrat font-black text-base text-[#0A1F44]'>
                {formatCurrency(product.price)}
              </span>
              {product.originalPrice && <>
                  <span className='text-xs text-[#9CA3AF] line-through font-lato'>
                    {formatCurrency(product.originalPrice)}
                  </span>
                  <span className='text-[10px] font-black text-[#10B981] bg-[#D1FAE5] px-1.5 py-0.5 rounded-full font-montserrat'>
                    Save £
                    {(product.originalPrice - product.price).toLocaleString('en-GB')}
                  </span>
                </>}
            </div>
          </div>

          {}
          <div className='px-4 pb-4'>
            <button onClick={handleAddToCart} disabled={!product.inStock} className={`w-full py-2.5 rounded-xl text-[13px] font-black font-montserrat transition-all duration-200 flex items-center justify-center gap-2 ${!product.inStock ? 'bg-[#F2F4F7] text-[#9CA3AF] cursor-not-allowed' : added ? 'bg-[#10B981] text-white' : adding ? 'bg-[#0A1F44]/80 text-white' : 'bg-[#0A1F44] hover:bg-[#E8553A] text-white hover:shadow-[0_4px_12px_rgba(232,85,58,0.25)] hover:-translate-y-0.5'}`}>
              {added ? <>
                  <CheckIcon size={14} /> Added to Cart
                </> : adding ? 'Adding...' : !product.inStock ? 'Out of Stock' : hasMultipleVariants ? <>
                  <CartIcon size={14} /> Choose Options
                </> : <>
                  <CartIcon size={14} /> Add to Cart
                </>}
            </button>
          </div>
        </div>
      </Link>
      {showQuickView && <QuickViewModal product={product} onClose={() => setShowQuickView(false)} />}
    </>;
}
