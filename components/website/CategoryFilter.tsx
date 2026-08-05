'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { ArrowRightIcon } from '@/components/ui/Icons'

const CATEGORIES = [
  {
    sport: 'badminton',
    icon: '🏸',
    label: 'Badminton',
    image:
      'https://images.unsplash.com/photo-1626224583764-f87db24ac4ea?w=600&q=80',
    count: 120,
    highlight: true,
  },
  {
    sport: 'tennis',
    icon: '🎾',
    label: 'Tennis',
    image:
      'https://images.unsplash.com/photo-1622279457486-62dcc4a431d6?w=600&q=80',
    count: 95,
  },
  {
    sport: 'padel',
    icon: '🏓',
    label: 'Padel',
    image:
      'https://images.unsplash.com/photo-1554068865-24cecd4e34b8?w=600&q=80',
    count: 48,
  },
  {
    sport: 'squash',
    icon: '🥎',
    label: 'Squash',
    image:
      'https://images.unsplash.com/photo-1547347298-4074fc3086f0?w=600&q=80',
    count: 36,
  },
  {
    sport: 'clothing',
    icon: '👕',
    label: 'Clothing',
    image:
      'https://images.unsplash.com/photo-1523381210434-271e8be1f52b?w=600&q=80',
    count: 80,
  },
  {
    sport: 'shoes',
    icon: '👟',
    label: 'Shoes',
    image:
      'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=600&q=80',
    count: 64,
  },
  {
    sport: 'bags',
    icon: '🎒',
    label: 'Racket Bags',
    image:
      'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=600&q=80',
    count: 28,
  },
  {
    sport: 'accessories',
    icon: '🧤',
    label: 'Accessories',
    image:
      'https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=600&q=80',
    count: 52,
  },
]

export default function CategoryFilter() {
  const [hovered, setHovered] = useState<string | null>(null)
  const scrollerRef = useRef<HTMLDivElement>(null)
  const isPausedRef = useRef(false)

  // Continuous auto-slide of the card row. Pauses whenever the pointer is
  // over the row (hover) and resumes once the pointer leaves. Loops back
  // to the start once it reaches the end.
  useEffect(() => {
    const el = scrollerRef.current
    if (!el) return

    let frameId: number
    const speed = 0.6 // px per frame (~36px/s at 60fps)

    const step = () => {
      if (!isPausedRef.current && el) {
        const maxScroll = el.scrollWidth - el.clientWidth
        if (maxScroll > 0) {
          if (el.scrollLeft >= maxScroll - 1) {
            el.scrollLeft = 0
          } else {
            el.scrollLeft += speed
          }
        }
      }
      frameId = requestAnimationFrame(step)
    }
    frameId = requestAnimationFrame(step)

    return () => cancelAnimationFrame(frameId)
  }, [])

  const pause = useCallback(() => {
    isPausedRef.current = true
  }, [])
  const resume = useCallback(() => {
    isPausedRef.current = false
  }, [])

  return (
    <section className='py-16 mt-10 bg-[#F2F4F7]'>
      <div className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8'>
        {/* ── Header ── */}
        <div className='flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-10'>
          <div>
            <p className='text-[10px] font-bold text-[#E8553A] uppercase tracking-[0.22em] font-montserrat mb-2'>
              Browse by Sport
            </p>
            <h2 className='font-montserrat font-black text-3xl sm:text-4xl text-[#0A1F44] tracking-tight leading-none'>
              What Do You Play?
            </h2>
            <p className='text-[#4B5563] font-lato mt-3 max-w-md text-sm leading-relaxed'>
              Badminton to Padel, Rackets to Shoes — premium gear for every
              racket sport and every level.
            </p>
          </div>
          <Link
            href='/shop'
            className='inline-flex items-center gap-2 bg-[#0A1F44] hover:bg-[#E8553A] text-white font-montserrat font-bold px-6 py-3 rounded-full transition-all duration-300 shadow-md hover:-translate-y-0.5 hover:shadow-[#E8553A]/25 hover:shadow-lg shrink-0 text-sm'
          >
            All Products
            <ArrowRightIcon size={14} />
          </Link>
        </div>

        {/* ── Scrollable row ──
            BUG FIX: this used to be a fixed CSS grid (grid-cols-2 sm:3
            lg:4), which wraps to multiple rows and never scrolls — on
            mobile that meant a tall stack of rows instead of a swipeable
            carousel. Now it's a horizontal snap-scroll row at every
            breakpoint: ~2 cards peek on mobile, ~5 on desktop, and the
            rest are reachable by scrolling/swiping. */}
        <div
          ref={scrollerRef}
          onMouseEnter={pause}
          onMouseLeave={resume}
          onTouchStart={pause}
          onTouchEnd={resume}
          className='flex gap-3 sm:gap-4 overflow-x-auto pb-2 -mx-4 px-4 sm:mx-0 sm:px-0 snap-x snap-mandatory scrollbar-none'
        >
          {CATEGORIES.map((cat) => (
            <Link
              key={cat.sport}
              href={`/shop?sport=${cat.sport}`}
              onMouseEnter={() => setHovered(cat.sport)}
              onMouseLeave={() => setHovered(null)}
              className='group relative rounded-2xl overflow-hidden block shrink-0 snap-start w-[46%] sm:w-[31%] lg:w-[23%] xl:w-[19%]'
              style={{ aspectRatio: '3/4' }}
            >
              {/* Background image */}
              <img
                src={cat.image}
                alt={cat.label}
                loading='lazy'
                className='absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-110'
              />

              {/* Dark overlay — stronger at bottom */}
              <div className='absolute inset-0 bg-gradient-to-t from-[#0A1F44]/95 via-[#0A1F44]/40 to-transparent transition-opacity duration-300 group-hover:from-[#0A1F44]' />

              {/* Top row */}
              <div className='absolute top-3 left-3 right-3 flex items-start justify-between'>
                {/* Icon pill */}
                <div className='w-10 h-10 rounded-xl bg-white/15 backdrop-blur-sm flex items-center justify-center border border-white/20 group-hover:bg-[#E8553A]/80 group-hover:border-[#E8553A] transition-all duration-300'>
                  <span className='text-xl leading-none'>{cat.icon}</span>
                </div>

                {/* Popular badge */}
                {cat.highlight && (
                  <span className='bg-[#E8553A] text-white text-[9px] font-black font-montserrat px-2 py-1 rounded-full uppercase tracking-wider'>
                    Popular
                  </span>
                )}
              </div>

              {/* Bottom content */}
              <div className='absolute bottom-0 left-0 right-0 p-4'>
                <h3 className='font-montserrat font-black text-white text-base leading-tight'>
                  {cat.label}
                </h3>
                <p className='text-white/60 text-[11px] font-lato mt-0.5'>
                  {cat.count}+ products
                </p>

                {/* Shop now — slides up on hover */}
                <div
                  className={`flex items-center gap-1.5 mt-3 text-[11px] font-bold font-montserrat text-[#E8553A] transition-all duration-300 ${
                    hovered === cat.sport
                      ? 'opacity-100 translate-y-0'
                      : 'opacity-0 translate-y-2'
                  }`}
                >
                  Shop Now
                  <ArrowRightIcon
                    size={11}
                    className='group-hover:translate-x-1 transition-transform duration-200'
                  />
                </div>
              </div>

              {/* Coral border glow on hover */}
              <div className='absolute inset-0 rounded-2xl ring-0 group-hover:ring-2 group-hover:ring-[#E8553A]/50 transition-all duration-300' />
            </Link>
          ))}
        </div>
      </div>
    </section>
  )
}
