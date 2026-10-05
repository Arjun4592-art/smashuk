'use client'

import { useEffect, useRef, useState } from 'react'

// Values are 'YYYY-MM-DD' strings in the shop's local time. '' = no limit.
export function toLocalYMD(d: Date): string {
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${d.getFullYear()}-${m}-${day}`
}

function daysAgo(n: number): Date {
  const d = new Date()
  d.setDate(d.getDate() - n)
  return d
}

type Preset = { key: string; label: string; range: () => [string, string] }

const PRESETS: Preset[] = [
  { key: 'all', label: 'All time', range: () => ['', ''] },
  {
    key: 'today',
    label: 'Today',
    range: () => [toLocalYMD(new Date()), toLocalYMD(new Date())],
  },
  {
    key: 'yesterday',
    label: 'Yesterday',
    range: () => [toLocalYMD(daysAgo(1)), toLocalYMD(daysAgo(1))],
  },
  {
    key: '7d',
    label: 'Last 7 days',
    range: () => [toLocalYMD(daysAgo(6)), toLocalYMD(new Date())],
  },
  {
    key: '30d',
    label: 'Last 30 days',
    range: () => [toLocalYMD(daysAgo(29)), toLocalYMD(new Date())],
  },
  {
    key: 'month',
    label: 'This month',
    range: () => {
      const now = new Date()
      return [
        toLocalYMD(new Date(now.getFullYear(), now.getMonth(), 1)),
        toLocalYMD(now),
      ]
    },
  },
]

function short(ymd: string): string {
  return new Date(`${ymd}T00:00:00`).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
  })
}

export default function DateRangeFilter({
  from,
  to,
  onChange,
  className = '',
}: {
  from: string
  to: string
  onChange: (from: string, to: string) => void
  className?: string
}) {
  const [open, setOpen] = useState(false)
  const [draftFrom, setDraftFrom] = useState('')
  const [draftTo, setDraftTo] = useState('')
  const rootRef = useRef<HTMLDivElement>(null)
  const btnRef = useRef<HTMLButtonElement>(null)
  const popRef = useRef<HTMLDivElement>(null)
  // Fixed-position coordinates so the menu is never clipped by a parent
  // with overflow-hidden (like the orders card) or by the screen edge.
  const [pos, setPos] = useState<{
    left: number
    top: number
    maxHeight: number
  } | null>(null)

  const POP_W = 280
  const toggle = () => {
    if (open) {
      setOpen(false)
      return
    }
    const r = btnRef.current?.getBoundingClientRect()
    if (r) {
      const left = Math.max(8, Math.min(r.left, window.innerWidth - POP_W - 8))
      const top = r.bottom + 8
      setPos({
        left,
        top,
        maxHeight: Math.max(240, window.innerHeight - top - 8),
      })
    }
    setOpen(true)
  }

  const active = PRESETS.find((p) => {
    const [f, t] = p.range()
    return f === from && t === to
  })
  const isFiltered = Boolean(from || to)
  const label = active
    ? active.label
    : from && to
      ? from === to
        ? short(from)
        : `${short(from)} – ${short(to)}`
      : from
        ? `From ${short(from)}`
        : `Until ${short(to)}`

  useEffect(() => {
    if (!open) return
    setDraftFrom(from)
    setDraftTo(to)
    const onDown = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    const onScroll = (e: Event) => {
      if (popRef.current?.contains(e.target as Node)) return
      setOpen(false)
    }
    const onResize = () => setOpen(false)
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    window.addEventListener('scroll', onScroll, true)
    window.addEventListener('resize', onResize)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('keydown', onKey)
      window.removeEventListener('scroll', onScroll, true)
      window.removeEventListener('resize', onResize)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  const pick = (f: string, t: string) => {
    onChange(f, t)
    setOpen(false)
  }

  const applyCustom = () => {
    let f = draftFrom
    let t = draftTo
    if (f && t && f > t) [f, t] = [t, f]
    pick(f, t)
  }

  const inputCls =
    'mt-1 w-full px-2 py-1.5 text-[12px] rounded-md border border-[#E1E3E5] bg-white text-[#202223] outline-none focus:border-[#008060]'

  return (
    <div ref={rootRef} className={`relative inline-block ${className}`}>
      <button
        type='button'
        onClick={toggle}
        ref={btnRef}
        aria-haspopup='dialog'
        aria-expanded={open}
        className={`flex items-center gap-2 px-3 py-2 text-[13px] rounded-lg border bg-white cursor-pointer transition-colors hover:border-[#8C9196] ${isFiltered ? 'border-[#008060] text-[#006e52] font-medium' : 'border-[#E1E3E5] text-[#202223]'}`}
      >
        <svg
          width='14'
          height='14'
          viewBox='0 0 24 24'
          fill='none'
          stroke='currentColor'
          strokeWidth='2'
          strokeLinecap='round'
          strokeLinejoin='round'
          aria-hidden='true'
        >
          <rect x='3' y='4' width='18' height='18' rx='2' />
          <path d='M16 2v4M8 2v4M3 10h18' />
        </svg>
        <span>{label}</span>
        <svg
          width='12'
          height='12'
          viewBox='0 0 24 24'
          fill='none'
          stroke='currentColor'
          strokeWidth='2.5'
          strokeLinecap='round'
          strokeLinejoin='round'
          aria-hidden='true'
          className={open ? 'rotate-180' : ''}
        >
          <path d='m6 9 6 6 6-6' />
        </svg>
      </button>

      {open && pos && (
        <div
          ref={popRef}
          role='dialog'
          aria-label='Filter by date'
          className='fixed z-[1000] w-[280px] overflow-y-auto rounded-xl border border-[#E1E3E5] bg-white p-2 shadow-lg'
          style={{ left: pos.left, top: pos.top, maxHeight: pos.maxHeight }}
        >
          <div className='flex flex-col gap-0.5'>
            {PRESETS.map((p) => {
              const selected = active?.key === p.key
              return (
                <button
                  key={p.key}
                  type='button'
                  onClick={() => pick(...p.range())}
                  className={`flex items-center justify-between w-full px-3 py-2 text-left text-[13px] rounded-md border-none cursor-pointer ${selected ? 'bg-[#F1F8F5] text-[#006e52] font-semibold' : 'bg-transparent text-[#202223] hover:bg-[#F6F6F7]'}`}
                >
                  {p.label}
                  {selected && <span aria-hidden='true'>✓</span>}
                </button>
              )
            })}
          </div>

          <div className='mt-2 border-t border-[#E1E3E5] px-2 pt-3 pb-1'>
            <p className='text-[12px] font-medium text-[#6D7175] mb-2'>
              Custom range
            </p>
            <div className='grid grid-cols-2 gap-2'>
              <label className='text-[11.5px] text-[#6D7175]'>
                From
                <input
                  type='date'
                  value={draftFrom}
                  max={draftTo || undefined}
                  onChange={(e) => setDraftFrom(e.target.value)}
                  className={inputCls}
                />
              </label>
              <label className='text-[11.5px] text-[#6D7175]'>
                To
                <input
                  type='date'
                  value={draftTo}
                  min={draftFrom || undefined}
                  onChange={(e) => setDraftTo(e.target.value)}
                  className={inputCls}
                />
              </label>
            </div>
            <div className='mt-3 flex justify-end gap-2'>
              <button
                type='button'
                onClick={() => setOpen(false)}
                className='px-3 py-1.5 text-[12px] text-[#6D7175] hover:text-[#202223] bg-transparent border-none cursor-pointer'
              >
                Cancel
              </button>
              <button
                type='button'
                onClick={applyCustom}
                disabled={!draftFrom && !draftTo}
                className='px-4 py-1.5 text-[12px] font-medium text-white bg-[#008060] hover:bg-[#006e52] rounded-md border-none cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed'
              >
                Apply
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
