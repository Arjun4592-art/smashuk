'use client';

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { ChevronLeftIcon, ChevronRightIcon } from '@/components/ui/Icons';
import { useSiteReviews } from '@/hooks/useProducts';
export default function ReviewsSlider() {
  const {
    data,
    isLoading
  } = useSiteReviews();
  const reviews = useMemo(() => data ?? [], [data]);
  const [current, setCurrent] = useState(0);
  const [autoplay, setAutoplay] = useState(true);
  const [isAnimating, setIsAnimating] = useState(false);
  const [direction, setDirection] = useState<'left' | 'right'>('right');
  const [visible, setVisible] = useState(true);
  const autoplayRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const total = reviews.length;
  const goTo = useCallback((index: number, dir: 'left' | 'right') => {
    if (isAnimating) return;
    setDirection(dir);
    setIsAnimating(true);
    setVisible(false);
    setTimeout(() => {
      setCurrent(index);
      setVisible(true);
      setIsAnimating(false);
    }, 280);
  }, [isAnimating]);
  const prev = () => {
    setAutoplay(false);
    if (total) goTo((current - 1 + total) % total, 'left');
  };
  const next = useCallback(() => {
    if (total) goTo((current + 1) % total, 'right');
  }, [current, total, goTo]);
  useEffect(() => {
    if (!autoplay || total < 2) return;
    autoplayRef.current = setTimeout(next, 4000);
    return () => {
      if (autoplayRef.current) clearTimeout(autoplayRef.current);
    };
  }, [current, autoplay, next, total]);
  if (!isLoading && total === 0) return null;
  if (isLoading) return null;
  const visibleCards = [reviews[current % total], reviews[(current + 1) % total], reviews[(current + 2) % total]];
  return <section className='py-16 bg-white overflow-hidden'>
      <div className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8'>
        {}
        <div className='flex items-end justify-between mb-10'>
          <div>
            <p className='text-[10px] font-bold text-[#E8553A] uppercase tracking-[0.22em] font-montserrat mb-2'>
              Reviews
            </p>
            <h2 className='font-montserrat font-black text-3xl text-[#0A1F44] tracking-tight'>
              What Athletes Say
            </h2>
          </div>

          {total > 1 && <div className='flex items-center gap-3'>
              {}
              <div className='hidden sm:flex items-center gap-1.5'>
                {reviews.map((_, i) => <button key={i} onClick={() => {
              setAutoplay(false);
              goTo(i, i > current ? 'right' : 'left');
            }} className={`rounded-full transition-all duration-300 ${i === current ? 'w-6 h-2 bg-[#E8553A]' : 'w-2 h-2 bg-[#E5E7EB] hover:bg-[#D1D5DB]'}`} />)}
              </div>

              <button onClick={prev} className='w-9 h-9 rounded-xl bg-[#F2F4F7] hover:bg-[#E8553A] hover:text-white text-[#0A1F44] flex items-center justify-center transition-all duration-200'>
                <ChevronLeftIcon size={16} />
              </button>
              <button onClick={next} className='w-9 h-9 rounded-xl bg-[#0A1F44] hover:bg-[#E8553A] text-white flex items-center justify-center transition-all duration-200'>
                <ChevronRightIcon size={16} />
              </button>
            </div>}
        </div>

        {}
        <div className={`transition-all duration-280 ${visible ? 'opacity-100 translate-x-0' : direction === 'right' ? 'opacity-0 translate-x-8' : 'opacity-0 -translate-x-8'}`}>
          {}
          <div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5'>
            {visibleCards.map((review, i) => <div key={`${review.id}-${i}`} className={`bg-[#F2F4F7] border border-[#E5E7EB] rounded-2xl p-6 hover:border-[#E8553A]/30 hover:shadow-[0_4px_20px_rgba(232,85,58,0.08)] transition-all duration-300 flex flex-col ${i === 1 ? 'hidden sm:flex' : ''} ${i === 2 ? 'hidden lg:flex' : ''} ${i === 1 ? 'sm:scale-[1.02] sm:shadow-md sm:border-[#E8553A]/20 sm:bg-white' : ''}`}>
                {}
                <div className='flex items-center gap-0.5 mb-4'>
                  {[...Array(review.rating)].map((_, j) => <svg key={j} width='14' height='14' viewBox='0 0 24 24' fill='#FBBF24'>
                      <path d='M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z' />
                    </svg>)}
                  <span className='ml-2 text-[11px] font-bold text-amber-500 font-montserrat'>
                    {review.rating}.0
                  </span>
                </div>

                {}
                <p className='font-lato text-[#4B5563] text-[13px] leading-relaxed flex-1 mb-5'>
                  &quot;{review.review}&quot;
                </p>

                {}
                <div className='flex items-center gap-3 pt-4 border-t border-[#E5E7EB]'>
                  <div className='w-10 h-10 bg-[#0A1F44] text-white rounded-full flex items-center justify-center font-montserrat font-black text-xs shrink-0'>
                    {review.avatar}
                  </div>
                  <div className='flex-1 min-w-0'>
                    <p className='font-montserrat font-bold text-[13px] text-[#0A1F44] leading-none'>
                      {review.name}
                    </p>
                    <p className='font-lato text-[11px] text-[#9CA3AF] mt-0.5'>
                      {[review.sport, review.city].filter(Boolean).join(' · ')}
                    </p>
                  </div>
                </div>
              </div>)}
          </div>
        </div>

        {}
        {total > 1 && <div className='flex sm:hidden items-center justify-center gap-1.5 mt-6'>
            {reviews.map((_, i) => <button key={i} onClick={() => {
          setAutoplay(false);
          goTo(i, i > current ? 'right' : 'left');
        }} className={`rounded-full transition-all duration-300 ${i === current ? 'w-6 h-2 bg-[#E8553A]' : 'w-2 h-2 bg-[#E5E7EB]'}`} />)}
          </div>}

        {}
        {autoplay && total > 1 && <div className='mt-8 max-w-xs mx-auto h-[2px] bg-[#E5E7EB] rounded-full overflow-hidden'>
            <div key={current} className='h-full bg-[#E8553A] rounded-full animate-progress' />
          </div>}
      </div>
    </section>;
}
