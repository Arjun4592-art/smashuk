'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

export type MailInReview = {
  quote: string
  name: string
  /** e.g. "Badminton Player, Leeds" */
  meta?: string
  rating?: number
}

const AUTOPLAY_MS = 5500
const SWIPE_PX = 40

function initials(name: string) {
  const parts = name
    .replace(/[^A-Za-z\s]/g, ' ')
    .trim()
    .split(/\s+/)
  return ((parts[0]?.[0] ?? '') + (parts[1]?.[0] ?? '')).toUpperCase()
}

/** Shortest circular distance from `current` to `index` (range -n/2 … n/2). */
function circularOffset(index: number, current: number, total: number) {
  let d = index - current
  const half = total / 2
  if (d > half) d -= total
  if (d < -half) d += total
  return d
}

function Chevron({ dir }: { dir: 'left' | 'right' }) {
  return (
    <svg
      width='18'
      height='18'
      viewBox='0 0 24 24'
      fill='none'
      stroke='currentColor'
      strokeWidth='2.4'
      strokeLinecap='round'
      strokeLinejoin='round'
      aria-hidden
    >
      <path d={dir === 'left' ? 'M15 18l-6-6 6-6' : 'M9 18l6-6-6-6'} />
    </svg>
  )
}

export default function MailInReviewsCarousel({
  reviews,
}: {
  reviews: MailInReview[]
}) {
  const total = reviews.length
  const [current, setCurrent] = useState(0)
  const [autoplay, setAutoplay] = useState(true)
  const [paused, setPaused] = useState(false)
  const [reducedMotion, setReducedMotion] = useState(false)
  const touchStartX = useRef<number | null>(null)

  useEffect(() => {
    setReducedMotion(
      window.matchMedia('(prefers-reduced-motion: reduce)').matches,
    )
  }, [])

  const go = useCallback(
    (index: number) => {
      if (total === 0) return
      setCurrent(((index % total) + total) % total)
    },
    [total],
  )

  const manual = (index: number) => {
    setAutoplay(false)
    go(index)
  }

  useEffect(() => {
    if (!autoplay || paused || reducedMotion || total < 2) return
    const t = setTimeout(() => go(current + 1), AUTOPLAY_MS)
    return () => clearTimeout(t)
  }, [autoplay, paused, reducedMotion, current, total, go])

  if (total === 0) return null

  return (
    <div
      className='relative'
      role='region'
      aria-roledescription='carousel'
      aria-label='Customer reviews'
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
      onKeyDown={(e) => {
        if (e.key === 'ArrowLeft') manual(current - 1)
        if (e.key === 'ArrowRight') manual(current + 1)
      }}
    >
      {/* stage — every card sits in the same grid cell and is moved with a
          transform, so the stage height always matches the tallest card */}
      <div
        className='grid overflow-hidden py-8 [--w:80vw] sm:[--w:440px] [--gap:20px] sm:[--gap:28px]'
        style={{
          WebkitMaskImage:
            'linear-gradient(to right, transparent, #000 10%, #000 90%, transparent)',
          maskImage:
            'linear-gradient(to right, transparent, #000 10%, #000 90%, transparent)',
          touchAction: 'pan-y',
        }}
        onTouchStart={(e) => {
          touchStartX.current = e.touches[0].clientX
        }}
        onTouchEnd={(e) => {
          if (touchStartX.current === null) return
          const dx = e.changedTouches[0].clientX - touchStartX.current
          touchStartX.current = null
          if (Math.abs(dx) > SWIPE_PX) manual(current + (dx < 0 ? 1 : -1))
        }}
      >
        {reviews.map((r, i) => {
          const offset = circularOffset(i, current, total)
          const isActive = offset === 0
          const isNear = Math.abs(offset) === 1
          const stars = r.rating ?? 5

          return (
            <article
              key={`${r.name}-${i}`}
              aria-hidden={!isActive}
              aria-label={`Review ${i + 1} of ${total}`}
              onClick={isNear ? () => manual(i) : undefined}
              style={{
                gridArea: '1 / 1',
                width: 'var(--w)',
                justifySelf: 'center',
                transform: `translateX(calc(${offset} * (var(--w) + var(--gap)))) scale(${
                  isActive ? 1 : 0.92
                })`,
                transition: reducedMotion
                  ? 'none'
                  : 'transform 500ms cubic-bezier(.22,.8,.3,1), opacity 500ms ease, filter 500ms ease',
                opacity: isActive ? 1 : isNear ? 0.55 : 0,
                filter: isActive ? 'none' : 'blur(2px)',
                pointerEvents: isActive || isNear ? 'auto' : 'none',
                zIndex: isActive ? 2 : 1,
              }}
              className={`flex flex-col rounded-3xl border p-7 sm:p-8 ${
                isActive
                  ? 'bg-white border-[#0A1F44]/10 shadow-[0_18px_48px_rgba(10,31,68,0.12)]'
                  : 'bg-white/70 border-[#0A1F44]/5 cursor-pointer'
              }`}
            >
              <div
                className='flex gap-1 text-[#F59E0B] mb-5'
                role='img'
                aria-label={`${stars} out of 5 stars`}
              >
                {Array.from({ length: stars }).map((_, s) => (
                  <svg
                    key={s}
                    width='18'
                    height='18'
                    viewBox='0 0 24 24'
                    fill='currentColor'
                    aria-hidden
                  >
                    <path d='M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z' />
                  </svg>
                ))}
              </div>

              <p className='flex-1 text-[#0A1F44]/80 text-[17px] sm:text-lg leading-relaxed mb-7'>
                &ldquo;{r.quote}&rdquo;
              </p>

              <div className='flex items-center gap-3.5'>
                <div className='w-11 h-11 shrink-0 rounded-full bg-[#0A1F44] text-white flex items-center justify-center font-montserrat font-black text-sm'>
                  {initials(r.name)}
                </div>
                <div className='min-w-0'>
                  <p className='font-montserrat font-bold text-[#0A1F44] text-[15px] leading-tight'>
                    {r.name}
                  </p>
                  {r.meta && (
                    <p className='text-gray-500 text-sm mt-0.5'>{r.meta}</p>
                  )}
                </div>
              </div>
            </article>
          )
        })}
      </div>

      {total > 1 && (
        <div className='flex items-center justify-center gap-4 mt-2'>
          <button
            type='button'
            onClick={() => manual(current - 1)}
            aria-label='Previous review'
            className='w-11 h-11 rounded-full bg-white border border-[#0A1F44]/10 text-[#0A1F44] shadow-sm flex items-center justify-center hover:bg-[#E8553A] hover:text-white hover:border-[#E8553A] transition-colors'
          >
            <Chevron dir='left' />
          </button>

          <div className='flex items-center gap-1.5'>
            {reviews.map((r, i) => (
              <button
                key={`${r.name}-dot-${i}`}
                type='button'
                onClick={() => manual(i)}
                aria-label={`Go to review ${i + 1}`}
                aria-current={i === current}
                className={`h-2 rounded-full transition-all duration-300 ${
                  i === current
                    ? 'w-7 bg-[#E8553A]'
                    : 'w-2 bg-[#0A1F44]/15 hover:bg-[#0A1F44]/30'
                }`}
              />
            ))}
          </div>

          <button
            type='button'
            onClick={() => manual(current + 1)}
            aria-label='Next review'
            className='w-11 h-11 rounded-full bg-white border border-[#0A1F44]/10 text-[#0A1F44] shadow-sm flex items-center justify-center hover:bg-[#E8553A] hover:text-white hover:border-[#E8553A] transition-colors'
          >
            <Chevron dir='right' />
          </button>
        </div>
      )}
    </div>
  )
}
