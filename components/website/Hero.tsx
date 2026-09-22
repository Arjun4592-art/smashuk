'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import Link from 'next/link'
import { SPORTS } from '@/lib/constants'
import { useBrandStats } from '@/hooks/useProducts'
import { DEFAULT_HERO_SLIDES, type HeroSlide } from '@/lib/hero-slides-shared'
import {
  ArrowRightIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
} from '@/components/ui/Icons'
type StatSlot =
  'products' | 'brands' | 'rating' | 'delivery' | 'authentic' | 'returns'
const STATIC_STAT_COPY: Record<
  Exclude<StatSlot, 'products' | 'brands' | 'rating'>,
  {
    value: string
    label: string
  }
> = {
  delivery: {
    value: '48hr',
    label: 'Fast Delivery',
  },
  authentic: {
    value: '100%',
    label: 'Authentic',
  },
  returns: {
    value: 'Free',
    label: 'Returns',
  },
}
function slotsFor(slide: HeroSlide): StatSlot[] {
  if (!slide.showStats) return []
  const slots: StatSlot[] = ['products', 'brands']
  if (slide.thirdStat !== 'none') slots.push(slide.thirdStat)
  return slots
}
function buildStats(
  slots: StatSlot[],
  sport: string,
  bySport:
    | Record<
        string,
        {
          productCount: number
          brandCount: number
        }
      >
    | undefined,
  avgRating: number | null | undefined,
  totalProductCount?: number,
  totalBrandCount?: number,
) {
  const sportStats = sport ? bySport?.[sport] : undefined
  const productCount = sportStats?.productCount || totalProductCount
  const brandCount = sportStats?.brandCount || totalBrandCount
  return slots.map((s) => {
    if (s === 'products') {
      return {
        value: productCount ? `${productCount}+` : '—',
        label: sport
          ? `${sport.charAt(0).toUpperCase() + sport.slice(1)} Products`
          : 'Products',
      }
    }
    if (s === 'brands') {
      return {
        value: brandCount ? `${brandCount}+` : '—',
        label: 'Top Brands',
      }
    }
    if (s === 'rating') {
      return {
        value: avgRating ? `${avgRating}★` : '—',
        label: 'Avg Rating',
      }
    }
    return STATIC_STAT_COPY[s]
  })
}
// `slides` come from Dashboard → Marketing → Home Slider (see
// lib/hero-slides.ts). The built-in slides are only a fallback.
export default function Hero({ slides }: { slides?: HeroSlide[] }) {
  const [current, setCurrent] = useState(0)
  const [autoplay, setAutoplay] = useState(true)
  const [isAnimating, setIsAnimating] = useState(false)
  const { data: brandStats } = useBrandStats()
  const SLIDES = useMemo(() => {
    const live = (slides ?? []).filter((s) => s.enabled && s.image)
    return (live.length > 0 ? live : DEFAULT_HERO_SLIDES).map((s) => ({
      ...s,
      stats: buildStats(
        slotsFor(s),
        s.sport,
        brandStats?.bySport,
        brandStats?.avgRating,
        brandStats?.productCount,
        brandStats?.brandCount,
      ),
    }))
  }, [slides, brandStats])
  const total = SLIDES.length
  const goTo = useCallback(
    (index: number) => {
      if (isAnimating) return
      setIsAnimating(true)
      setCurrent(index)
      setTimeout(() => setIsAnimating(false), 600)
    },
    [isAnimating],
  )
  const prev = useCallback(() => {
    setAutoplay(false)
    goTo((current - 1 + total) % total)
  }, [current, total, goTo])
  const next = useCallback(() => {
    goTo((current + 1) % total)
  }, [current, total, goTo])
  useEffect(() => {
    if (!autoplay || total < 2) return
    const interval = setInterval(() => {
      setCurrent((prev) => (prev + 1) % total)
    }, 5000)
    return () => clearInterval(interval)
  }, [autoplay, total])
  const slide = SLIDES[current] ?? SLIDES[0]
  return (
    <section className='relative w-full overflow-hidden bg-[#0A1F44]'>
      {}
      <div className='absolute inset-0 z-0'>
        {SLIDES.map((s, i) => (
          <div
            key={s.id}
            className={`absolute inset-0 transition-opacity duration-700 ${i === current ? 'opacity-100' : 'opacity-0'}`}
          >
            <img
              src={s.image}
              alt={s.heading.split('\n').join(' ')}
              className='w-full h-full object-cover'
            />
            <div className='absolute inset-0 bg-linear-to-r from-[#0A1F44]/92 via-[#0A1F44]/55 to-[#0A1F44]/10' />
          </div>
        ))}
      </div>

      {}
      <div className='relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8'>
        <div className='min-h-[88vh] flex items-center'>
          <div className='w-full lg:w-[58%] py-16'>
            {slide.badge && (
              <div
                key={`badge-${current}`}
                className='inline-flex items-center gap-2 bg-white/12 backdrop-blur-sm border border-white/20 text-white/90 text-sm font-lato px-4 py-2 rounded-full mb-7 animate-fade-in'
              >
                {slide.badge}
              </div>
            )}

            <h1
              key={`heading-${current}`}
              className='font-montserrat font-black text-white mb-5 animate-slide-up tracking-tight'
              style={{
                fontSize: 'clamp(2.8rem, 6vw, 5.2rem)',
                lineHeight: 1.05,
              }}
            >
              {slide.heading.split('\n').map((line, i) => (
                <span key={i} className='block'>
                  {i === 1 ? (
                    <span className='text-[#E8553A]'>{line}</span>
                  ) : (
                    line
                  )}
                </span>
              ))}
            </h1>

            {slide.subheading && (
              <p
                key={`sub-${current}`}
                className='text-white/65 font-lato text-lg mb-9 max-w-[480px] leading-relaxed animate-slide-up'
              >
                {slide.subheading}
              </p>
            )}

            <div
              key={`cta-${current}`}
              className='flex flex-wrap items-center gap-3.5 mb-14 animate-slide-up'
            >
              {slide.ctaLabel && slide.ctaHref && (
                <Link
                  href={slide.ctaHref}
                  className='flex items-center gap-2 bg-[#E8553A] hover:bg-[#D4441F] text-white font-montserrat font-black px-7 py-3.5 rounded-full transition-all duration-200 shadow-lg hover:shadow-[#E8553A]/30 hover:shadow-xl hover:-translate-y-0.5 group'
                >
                  {slide.ctaLabel}
                  <ArrowRightIcon
                    size={16}
                    className='group-hover:translate-x-1 transition-transform'
                  />
                </Link>
              )}
              {slide.secondaryLabel && slide.secondaryHref && (
                <Link
                  href={slide.secondaryHref}
                  className='flex items-center gap-2 bg-white/10 hover:bg-white/20 backdrop-blur-sm text-white font-montserrat font-semibold px-7 py-3.5 rounded-full border border-white/25 transition-all duration-200'
                >
                  {slide.secondaryLabel}
                </Link>
              )}
            </div>

            {slide.stats.length > 0 && (
              <div
                key={`stats-${current}`}
                className='flex items-center gap-0 animate-slide-up'
              >
                {slide.stats.map((stat, i) => (
                  <div
                    key={i}
                    className={`text-center px-6 ${i > 0 ? 'border-l border-white/15' : ''} ${i === 0 ? 'pl-0' : ''}`}
                  >
                    <p className='font-montserrat font-black text-2xl text-[#E8553A] leading-none'>
                      {stat.value}
                    </p>
                    <p className='font-lato text-[11px] text-white/50 mt-1 whitespace-nowrap'>
                      {stat.label}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {}
      {total > 1 && (
        <>
          <div className='absolute top-8 right-8 z-20 hidden lg:flex items-center gap-2'>
            <span className='font-montserrat font-black text-2xl text-white leading-none'>
              {String(current + 1).padStart(2, '0')}
            </span>
            <span className='text-white/30 text-sm font-lato'>/</span>
            <span className='text-white/30 text-sm font-lato'>
              {String(total).padStart(2, '0')}
            </span>
          </div>

          {}
          <div className='absolute right-8 bottom-24 z-20 hidden lg:flex flex-col items-center gap-3'>
            <button
              onClick={prev}
              aria-label='Previous slide'
              className='w-10 h-10 rounded-full bg-white/10 hover:bg-white/25 backdrop-blur-sm border border-white/20 text-white flex items-center justify-center transition-all duration-200'
            >
              <ChevronLeftIcon size={17} />
            </button>

            <div className='flex flex-col items-center gap-2'>
              {SLIDES.map((_, i) => (
                <button
                  key={i}
                  onClick={() => {
                    setAutoplay(false)
                    goTo(i)
                  }}
                  aria-label={`Slide ${i + 1}`}
                  className={`rounded-full transition-all duration-300 ${i === current ? 'h-8 w-2 bg-[#E8553A]' : 'h-2 w-2 bg-white/30 hover:bg-white/60'}`}
                />
              ))}
            </div>

            <button
              onClick={next}
              aria-label='Next slide'
              className='w-10 h-10 rounded-full bg-white/10 hover:bg-white/25 backdrop-blur-sm border border-white/20 text-white flex items-center justify-center transition-all duration-200'
            >
              <ChevronRightIcon size={17} />
            </button>
          </div>
        </>
      )}

      {}
      <div className='relative z-10 border-t border-white/10 bg-[#0A1F44]/75 backdrop-blur-md'>
        <div className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8'>
          <div className='flex items-center gap-2 py-3 overflow-x-auto scrollbar-none'>
            <span className='text-white/30 text-[11px] font-lato uppercase tracking-wider whitespace-nowrap mr-2'>
              Browse:
            </span>
            {SPORTS.map((sport) => (
              <Link
                key={sport.slug}
                href={`/shop?sport=${sport.slug}`}
                prefetch={false}
                className={`flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all duration-200 font-montserrat ${slide.sport === sport.slug ? 'bg-[#E8553A] text-white shadow-md' : 'bg-white/8 text-white/60 hover:bg-white/18 hover:text-white border border-white/10'}`}
              >
                <span>{sport.icon}</span>
                <span>{sport.label}</span>
              </Link>
            ))}
          </div>
        </div>
      </div>

      {}
      {autoplay && total > 1 && (
        <div className='absolute bottom-0 left-0 right-0 z-20 h-[2px] bg-white/10'>
          <div key={current} className='h-full bg-[#E8553A] animate-progress' />
        </div>
      )}
    </section>
  )
}
