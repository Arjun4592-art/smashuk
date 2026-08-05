'use client'
import { useEffect, useRef, useState } from 'react'

interface Props {
  categories: string[]
  selected: string
  onChange: (cat: string) => void
}

export default function CategoryFilter({
  categories,
  selected,
  onChange,
}: Props) {
  const scrollerRef = useRef<HTMLDivElement>(null)
  const [canScrollLeft, setCanScrollLeft] = useState(false)
  const [canScrollRight, setCanScrollRight] = useState(false)

  const all = ['All', ...categories]

  const updateArrows = () => {
    const el = scrollerRef.current
    if (!el) return
    setCanScrollLeft(el.scrollLeft > 4)
    setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 4)
  }

  useEffect(() => {
    updateArrows()
    const el = scrollerRef.current
    if (!el) return
    el.addEventListener('scroll', updateArrows)
    window.addEventListener('resize', updateArrows)
    return () => {
      el.removeEventListener('scroll', updateArrows)
      window.removeEventListener('resize', updateArrows)
    }
  }, [categories.length])

  const scrollBy = (dir: 'left' | 'right') => {
    const el = scrollerRef.current
    if (!el) return
    el.scrollBy({ left: dir === 'left' ? -160 : 160, behavior: 'smooth' })
  }

  return (
    <div className='relative flex items-center'>
      {canScrollLeft && (
        <button
          onClick={() => scrollBy('left')}
          className='absolute left-0 z-10 flex items-center justify-center w-7 h-7 rounded-full shrink-0'
          style={{
            background: '#FFFFFF',
            border: '1px solid #E1E3E5',
            boxShadow: '0 1px 4px rgba(0,0,0,0.08)',
          }}
          aria-label='Scroll categories left'
        >
          <svg width='14' height='14' viewBox='0 0 24 24' fill='none' stroke='#6D7175' strokeWidth='2' strokeLinecap='round' strokeLinejoin='round'>
            <polyline points='15 18 9 12 15 6' />
          </svg>
        </button>
      )}

      <div
        ref={scrollerRef}
        className='flex gap-1.5 overflow-x-auto pb-0.5 scrollbar-hide scroll-smooth'
        style={canScrollLeft || canScrollRight ? { scrollSnapType: 'x proximity' } : undefined}
      >
        {all.map((cat) => {
          const isActive = selected === cat
          return (
            <button
              key={cat}
              onClick={() => onChange(cat)}
              className='px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap shrink-0 border transition-all'
              style={{
                background: isActive ? '#008060' : '#FFFFFF',
                color: isActive ? '#FFFFFF' : '#6D7175',
                borderColor: isActive ? '#008060' : '#E1E3E5',
                scrollSnapAlign: 'start',
              }}
            >
              {cat}
            </button>
          )
        })}
      </div>

      {canScrollRight && (
        <button
          onClick={() => scrollBy('right')}
          className='absolute right-0 z-10 flex items-center justify-center w-7 h-7 rounded-full shrink-0'
          style={{
            background: '#FFFFFF',
            border: '1px solid #E1E3E5',
            boxShadow: '0 1px 4px rgba(0,0,0,0.08)',
          }}
          aria-label='Scroll categories right'
        >
          <svg width='14' height='14' viewBox='0 0 24 24' fill='none' stroke='#6D7175' strokeWidth='2' strokeLinecap='round' strokeLinejoin='round'>
            <polyline points='9 18 15 12 9 6' />
          </svg>
        </button>
      )}
    </div>
  )
}
